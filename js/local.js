'use strict';
/* Standalone build: everything is saved on this device (IndexedDB). Label reading uses your own Gemini key. */

const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('onpaper', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos'); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async op(store, mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => { const tx = d.transaction(store, mode); const st = tx.objectStore(store); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); });
  },
  get(store, k) { return this.op(store, 'readonly', s => s.get(k)); },
  set(store, k, v) { return this.op(store, 'readwrite', s => s.put(v, k)); },
  del(store, k) { return this.op(store, 'readwrite', s => s.delete(k)); },
  keys(store) { return this.op(store, 'readonly', s => s.getAllKeys()); },
};

let saveT = null, saving = Promise.resolve();
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const snap = { v: 1, settings: Store.settings, docs: Store.docs };
    saving = saving.then(() => IDB.set('kv', 'state', clone(snap))).catch(() => toast("Couldn't save to this phone's storage.", { bad: true }));
  }, 150);
}
window.addEventListener('pagehide', () => { if (saveT) { clearTimeout(saveT); IDB.set('kv', 'state', clone({ v: 1, settings: Store.settings, docs: Store.docs })); } });

async function initStore() {
  try {
    const snap = await IDB.get('kv', 'state');
    if (snap) { Store.settings = { ...DEFAULTS, ...(snap.settings || {}) }; for (const c of COLLS) Store.docs[c] = (snap.docs && snap.docs[c]) || {}; }
    for (const k of await IDB.keys('photos')) { const b = await IDB.get('photos', k); if (b) Store.blobs[k] = URL.createObjectURL(b); }
    Store.mode = 'local'; Store.note = '';
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  } catch (e) {
    Store.mode = 'memory'; Store.note = "This browser won't let the app save data (private browsing?). Entries will be lost when you close it.";
  }
  Store.loaded = true; changed();
}
function put(c, id, data) { data = clone(data); delete data.id; Store.docs[c] = { ...Store.docs[c], [id]: data }; changed(); persist(); return Promise.resolve(); }
function del(c, id) { const m = { ...Store.docs[c] }; delete m[id]; Store.docs[c] = m; changed(); persist(); return Promise.resolve(); }
function saveSettings(patch) { Store.settings = { ...Store.settings, ...clone(patch) }; changed(); persist(); return Promise.resolve(); }

/* photos: same interface the app used for uploads, stored on-device */
const LocalAssets = {
  async upload(blob) { const id = newId(); await IDB.set('photos', id, blob); Store.blobs[id] = URL.createObjectURL(blob); return { id }; },
  async delete(id) { await IDB.del('photos', id); if (Store.blobs[id]) URL.revokeObjectURL(Store.blobs[id]); delete Store.blobs[id]; return { deleted: true }; },
};

/* Gemini: same .json(prompt, {images, signal}) interface the food screen uses */
const GEMINI_KEY = 'onpaper.geminiKey', GEMINI_MODEL = 'onpaper.geminiModel';
const geminiKey = () => { try { return (localStorage.getItem(GEMINI_KEY) || '').replace(/[^\x21-\x7E]/g, ''); } catch (e) { return ''; } };
const geminiModel = () => { try { const m = (localStorage.getItem(GEMINI_MODEL) || '').trim(); return m === 'gemini-flash-latest' ? '' : m; } catch (e) { return ''; } };
const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
const blobB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
const Gemini = {
  workingModel: null,
  async call(model, body, signal) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort('timeout'), 50000);
    const onAbort = () => ctl.abort('cancel'); if (signal) signal.addEventListener('abort', onAbort);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey())}`, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body });
      const t = await r.text();
      if (!r.ok) { let msg = t; try { msg = JSON.parse(t).error.message; } catch (e) {} throw { code: r.status === 429 ? 'rate_limited' : r.status === 404 ? 'bad_model' : /api key|API_KEY|permission/i.test(msg) ? 'bad_key' : 'upstream_error', message: `${r.status}: ${String(msg).slice(0, 220)}` }; }
      return JSON.parse(t);
    } catch (e) {
      if (e && e.code) throw e;
      if (signal && signal.aborted) throw { code: 'cancelled' };
      if (ctl.signal.aborted) throw { code: 'timeout', message: 'No answer after 50 seconds.' };
      throw { code: 'offline', message: String(e && (e.message || e)).slice(0, 200) };
    } finally { clearTimeout(timer); if (signal) signal.removeEventListener('abort', onAbort); }
  },
  async json(prompt, { images = [], signal } = {}) {
    if (!geminiKey()) throw { code: 'no_key' };
    const parts = [{ text: prompt }];
    for (const b of [].concat(images)) parts.push({ inline_data: { mime_type: b.type || 'image/jpeg', data: await blobB64(b) } });
    const body = JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
    const custom = geminiModel(), models = custom ? [custom] : (this.workingModel ? [this.workingModel, ...GEMINI_MODELS.filter(m => m !== this.workingModel)] : GEMINI_MODELS);
    let last;
    for (const m of models) {
      try {
        const j = await this.call(m, body, signal); this.workingModel = m;
        const txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        if (!txt) throw { code: j.promptFeedback?.blockReason ? 'refused' : 'empty_completion' };
        try { return JSON.parse(txt); } catch (e) { const mm = txt.match(/[\[{][\s\S]*[\]}]/); if (mm) { try { return JSON.parse(mm[0]); } catch (e2) {} } throw { code: 'invalid_json' }; }
      } catch (e) { last = e; if (e.code !== 'bad_model') throw e; }
    }
    throw last;
  },
};
function refreshCaps() { CAP.assets = LocalAssets; CAP.sample = geminiKey() ? Gemini : null; CAP.sampleImages = !!CAP.sample; }
A.testGemini = async (d, el) => {
  const keyIn = $('#st-gk'); if (keyIn) { try { localStorage.setItem(GEMINI_KEY, keyIn.value.trim()); } catch (e) {} refreshCaps(); }
  const out = $('#gk-test'); if (!out) return;
  if (!geminiKey()) { out.textContent = 'Paste your key first.'; return; }
  el.disabled = true; out.innerHTML = '<span class="thinking">Testing…</span>';
  const t0 = Date.now();
  try { await Gemini.json('Reply with only this JSON: {"ok": true}'); out.innerHTML = `<span style="color:var(--ok)">✓ Works!</span> <span class="faint">${esc(Gemini.workingModel)} answered in ${((Date.now() - t0) / 1000).toFixed(1)}s.</span>`; }
  catch (e) { out.innerHTML = `<span style="color:var(--miss)">✗ ${esc(aiErrorText(e) || 'Stopped')}</span>${e.message ? `<br><span class="faint">${esc(e.message)}</span>` : ''}`; }
  el.disabled = false;
};
