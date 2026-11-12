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
const geminiKey = () => { try { return localStorage.getItem(GEMINI_KEY) || ''; } catch (e) { return ''; } };
const geminiModel = () => { try { return localStorage.getItem(GEMINI_MODEL) || 'gemini-flash-latest'; } catch (e) { return 'gemini-flash-latest'; } };
const blobB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });
const Gemini = {
  async json(prompt, { images = [], signal } = {}) {
    const key = geminiKey(); if (!key) throw { code: 'no_key' };
    const parts = [{ text: prompt }];
    for (const b of [].concat(images)) parts.push({ inline_data: { mime_type: b.type || 'image/jpeg', data: await blobB64(b) } });
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`, {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } }),
      });
    } catch (e) { if (e && e.name === 'AbortError') throw { code: 'cancelled' }; throw { code: 'offline' }; }
    if (!r.ok) { const t = await r.text().catch(() => ''); throw { code: r.status === 429 ? 'rate_limited' : (r.status === 400 || r.status === 401 || r.status === 403) && /key/i.test(t) ? 'bad_key' : r.status === 404 ? 'bad_model' : 'upstream_error', message: t.slice(0, 300) }; }
    const j = await r.json();
    const txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!txt) throw { code: j.promptFeedback?.blockReason ? 'refused' : 'empty_completion' };
    try { return JSON.parse(txt); } catch (e) { const m = txt.match(/[\[{][\s\S]*[\]}]/); if (m) { try { return JSON.parse(m[0]); } catch (e2) {} } throw { code: 'invalid_json' }; }
  },
};
function refreshCaps() { CAP.assets = LocalAssets; CAP.sample = geminiKey() ? Gemini : null; CAP.sampleImages = !!CAP.sample; }
