# Gear Ledger — MSU.io character stat lookup

A single-page static site. Search a character name, and it:

1. Hits `GET /navigator/api/navigator/search?keyword=…`, keeps only `records[].type === "character"`.
2. Takes that character's `assetKey` and hits `GET /navigator/api/navigator/characters/{assetKey}/info`.
3. Reads `wearing.arcaneSymbols.totalStat` and `apStat.{str,dex,int,luk}.base`.
4. Collects every non-empty `assetKey` under `wearing.equip`.
5. Hits `GET /navigator/api/navigator/items/{assetKey}/info` for each one, in parallel.
6. Sums each item's `stats` object (str/dex/int/luk/pad/mad by `.total`, plus the scalar
   fields like `attackSpeed`, `recoveryHp`, the trait-EXP fields, etc.) into one combined total.
   Potential/bonus-potential lines (`ATT: +12%` etc.) are listed per item instead of summed,
   since they're percentage modifiers, not flat stat points.

Everything runs client-side, in the visitor's browser — there's no backend, build step, or API key.

## Deploy to GitHub Pages

1. Create a new GitHub repo (or use an existing one).
2. Add `index.html` to the repo root (this file's sibling).
3. Push to GitHub.
4. In the repo: **Settings → Pages → Source**, pick the branch (usually `main`) and `/ (root)`, save.
5. GitHub gives you a URL like `https://<username>.github.io/<repo>/` a minute or two later.

No `npm install`, no build — it's one HTML file.

## CORS: msu.io blocks this by default — you need the proxy

Confirmed via HAR: `msu.io`'s API responds `200 OK` but never sends an
`Access-Control-Allow-Origin` header for a `github.io` origin, so the browser fetches the
response and then throws it away before your page's JS can read it (`net::ERR_FAILED`,
empty body). Visiting the API URL directly in your browser works because that's a top-level
navigation — CORS only applies to cross-origin `fetch()`/`XHR` calls made *from* a page's JS.

There's no fix from this page's code alone. `proxy-worker.js` is a small Cloudflare Worker
that sits in between: your page calls the worker, the worker calls msu.io server-to-server
(no CORS involved there), and adds the missing header back on the way out.

**Deploy it (free, ~2 minutes):**
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Worker**.
2. Name it (e.g. `msustat-proxy`), click **Deploy** to scaffold the default worker.
3. Click **Edit code**, paste in `proxy-worker.js`'s contents, click **Deploy** again.
4. Copy the worker's URL — looks like `https://msustat-proxy.<you>.workers.dev`.
5. In `index.html`, find `const PROXY_BASE = ...` near the top of the `<script>` block and set it to:
   `https://msustat-proxy.<you>.workers.dev/?url=`
6. Commit and push. Searches now route through the worker instead of hitting msu.io directly.

The worker only ever forwards to `msu.io` (hard-coded allow-list), so it can't be abused as an
open proxy to other sites.

## Notes / assumptions

- If a search returns more than one `character` record (ambiguous name), the page shows a
  picker instead of guessing.
- Equip slots with no `assetKey` (unminted/non-NFT gear) are skipped — only the item calls the
  spec asked for are made.
- Items that fail to load are shown greyed out with an error, and excluded from the combined
  total (with a note on how many were skipped).
