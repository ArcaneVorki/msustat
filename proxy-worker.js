/**
 * Cloudflare Worker: CORS-friendly proxy for the msu.io navigator API.
 *
 * msu.io's API responds fine, but doesn't send an Access-Control-Allow-Origin
 * header for browser requests from arbitrary origins (like a GitHub Pages site),
 * so the browser blocks the response before your page's JS ever sees it.
 * This worker sits in between: your page calls the worker, the worker calls
 * msu.io server-to-server (no CORS involved there), and adds the header back
 * on the way out.
 *
 * Usage from the page:
 *   https://<your-worker>.workers.dev/?url=<url-encoded msu.io API URL>
 *
 * --- Deploy (free, ~2 minutes) ---
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Worker.
 * 2. Give it a name (e.g. "msustat-proxy"), click Deploy to scaffold it.
 * 3. Click "Edit code", replace everything with this file's contents, click Deploy.
 * 4. Copy the worker's URL (looks like https://msustat-proxy.<you>.workers.dev).
 * 5. In index.html, set PROXY_BASE to that URL + "/?url=".
 */

const ALLOWED_ORIGIN = '*'; // tighten to 'https://arcanevorki.github.io' once confirmed working
const ALLOWED_HOSTS = ['msu.io']; // only ever forward to msu.io, nothing else

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const incoming = new URL(request.url);
    const target = incoming.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      return new Response(JSON.stringify({ error: 'Host not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.toString(), {
        headers: { 'Accept': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    });
  },
};
