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

## If searches fail immediately

The browser calls `msu.io`'s API directly from JavaScript running on your GitHub Pages domain.
If `msu.io` doesn't send permissive CORS headers for that origin, the browser will block the
response and the page will show a connection error. That's a server-side setting on msu.io's
end, not something fixable from this page's code — the workaround is routing requests through
a small proxy/serverless function you control that forwards to the same API and adds the
`Access-Control-Allow-Origin` header.

## Notes / assumptions

- If a search returns more than one `character` record (ambiguous name), the page shows a
  picker instead of guessing.
- Equip slots with no `assetKey` (unminted/non-NFT gear) are skipped — only the item calls the
  spec asked for are made.
- Items that fail to load are shown greyed out with an error, and excluded from the combined
  total (with a note on how many were skipped).
