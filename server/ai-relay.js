/* Liftprint AI relay — a Cloudflare Worker.
   Holds the AI key so the app never needs one, and caps how much each phone (and everyone together) can use per day.

   Needs, in the Worker's settings:
     Secret   GEMINI_KEY     your AI key
     Secret   ACCESS_CODES   comma-separated codes allowed to use the relay (e.g. the tester code)
     KV       LP             a KV namespace bound as "LP" (stores the daily counters)
   Optional plain-text variables:
     ALLOW_ORIGIN   the app's address, e.g. https://lolzireiz.github.io   (default: any)
     USER_DAILY     requests per phone per day (default 60)
     GLOBAL_DAILY   requests for everyone per day (default 1500)
*/
const MODELS = new Set(['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']);
const pacificDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const json = (obj, status, cors, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

export default {
  async fetch(req, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type,x-lp-device,x-lp-code', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Expose-Headers': 'x-lp-used,x-lp-limit', 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/v1/ai') return json({ error: { message: 'Not found' } }, 404, cors);

    const codes = String(env.ACCESS_CODES || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const code = (req.headers.get('x-lp-code') || '').trim().toUpperCase();
    if (!codes.length || !codes.includes(code)) return json({ error: { message: 'no_access' } }, 401, cors);

    const device = (req.headers.get('x-lp-device') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (device.length < 8) return json({ error: { message: 'bad_device' } }, 400, cors);
    const model = url.searchParams.get('model') || '';
    if (!MODELS.has(model)) return json({ error: { message: 'model not found' } }, 404, cors);
    if (+(req.headers.get('content-length') || 0) > 8e6) return json({ error: { message: 'too_large' } }, 413, cors);

    const day = pacificDay(), userLimit = +(env.USER_DAILY || 60), globalLimit = +(env.GLOBAL_DAILY || 1500);
    const uKey = `u:${day}:${device}`, gKey = `g:${day}`;
    const [u, g] = (await Promise.all([env.LP.get(uKey), env.LP.get(gKey)])).map(v => +v || 0);
    const quota = { 'x-lp-used': String(u), 'x-lp-limit': String(userLimit) };
    if (u >= userLimit) return json({ error: { message: 'Daily quota reached for this device (quota).' } }, 429, cors, quota);
    if (g >= globalLimit) return json({ error: { message: 'The service is at capacity today (quota).' } }, 429, cors, quota);

    const body = await req.text();
    const up = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const text = await up.text();
    if (up.ok) {   // only answered requests count against the caps
      const ttl = { expirationTtl: 60 * 60 * 48 };
      await Promise.all([env.LP.put(uKey, String(u + 1), ttl), env.LP.put(gKey, String(g + 1), ttl)]);
      quota['x-lp-used'] = String(u + 1);
    }
    return new Response(text, { status: up.status, headers: { 'Content-Type': 'application/json', ...cors, ...quota } });
  },
};
