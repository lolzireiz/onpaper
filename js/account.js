'use strict';
/* Accounts and cloud sync (optional). Sign in with email and password; after that everything except progress photos
   is copied to the account and kept in step across devices. The app still works fully offline and signed out.
   Server: Supabase. One table, `docs` (user_id, coll, id, data, deleted, updated_at), each row readable only by its owner.
   Sync is state-based: a "shadow" remembers what was last synced for every record, so any change made by any part
   of the app is noticed, with no need to hook each write. Conflicts: whichever device changed a record since its
   last sync wins; untouched records take the account's version. */
const SB_URL = 'https://jvpgdhblwbfkxtdadrab.supabase.co', SB_KEY = 'sb_publishable_CFc95Kcoo6jU8xvEaqkJug_itWw1jH9';
const AC_KEY = 'lp.auth', AC_CUR = 'lp.syncCursor', AC_SHADOW = 'syncShadow';
/* progress photos sync only once the account's photo storage is confirmed working, so another device never gets photo entries without the pictures */
const acColls = () => Acct.photosOK ? COLLS : COLLS.filter(c => c !== 'photos');
const Acct = { photosOK: false, busy: false, step: 'email', email: '', err: '', sending: false, last: 0, syncErr: '', pending: null, t: null };
const acGet = () => { try { return JSON.parse(localStorage.getItem(AC_KEY) || 'null'); } catch (e) { return null; } };
const acSet = v => { try { v ? localStorage.setItem(AC_KEY, JSON.stringify(v)) : localStorage.removeItem(AC_KEY); } catch (e) {} };
const acOn = () => !!acGet();

async function sbCall(path, { method = 'GET', body, token, headers = {} } = {}) {
  let r; try { r = await fetch(SB_URL + path, { method, headers: { apikey: SB_KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined }); }
  catch (e) { throw { code: 'offline', message: 'No connection' }; }
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  if (!r.ok) throw { code: r.status, message: (j && (j.msg || j.message || j.error_description || j.error)) || `Error ${r.status}` };
  return j;
}
function acStore(j) { const a = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: j.user && j.user.id || (acGet() || {}).uid, email: j.user && j.user.email || (acGet() || {}).email }; acSet(a); return a; }
async function acToken() {
  let a = acGet(); if (!a) throw { code: 'signed_out' };
  if (a.exp - 60000 > Date.now()) return a.access;
  try { a = acStore(await sbCall('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: a.refresh } })); return a.access; }
  catch (e) { if (e.code === 'offline') throw e; acSet(null); acRowDraw(); toast('Your sign-in expired. Sign in again to keep syncing.', { bad: true }); throw { code: 'signed_out' }; }
}

/* ---------- sync ---------- */
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { if (v[k] !== undefined) o[k] = canon(v[k]); return o; }, {}) : v;
function acHash(v) { const s = JSON.stringify(canon(v)); let h = 5381, g = 52711; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h = (h * 33 ^ c) >>> 0; g = (g * 31 + c) >>> 0; } return h.toString(36) + g.toString(36) + s.length.toString(36); }
function acLocal() {
  const m = new Map(); for (const c of acColls()) for (const [id, d] of Object.entries(Store.docs[c] || {})) m.set(c + '/' + id, { c, id, data: d });
  m.set('_settings/main', { c: '_settings', id: 'main', data: Store.settings }); for (const v of m.values()) v.h = acHash(v.data); return m;
}
async function acPull(token, since) {
  const out = []; for (let off = 0; off < 60000; off += 1000) {
    const rows = await sbCall(`/rest/v1/docs?select=coll,id,data,deleted,updated_at&order=updated_at.asc,coll.asc,id.asc&limit=1000&offset=${off}${since ? '&updated_at=gte.' + encodeURIComponent(since) : ''}`, { token });
    out.push(...(rows || [])); if (!rows || rows.length < 1000) break;
  } return out;
}
async function acPush(token, rows) { for (let i = 0; i < rows.length; i += 150) await sbCall('/rest/v1/docs?on_conflict=user_id,coll,id', { method: 'POST', token, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows.slice(i, i + 150) }); }
function acApply(c, id, data) { if (c === '_settings') Store.settings = { ...DEFAULTS, ...clone(data || {}) }; else if (acColls().includes(c)) Store.docs[c] = { ...Store.docs[c], [id]: clone(data) }; }
function acRemove(c, id) { if (c === '_settings' || !acColls().includes(c)) return; const m = { ...Store.docs[c] }; delete m[id]; Store.docs[c] = m; }
const acHasData = () => ['workouts', 'food', 'weighins'].some(c => Object.keys(Store.docs[c] || {}).length);

async function syncNow(opt = {}) {
  const a = acGet(); if (!a || Acct.busy || Store.mode !== 'local' || !Store.loaded) return null;
  Acct.busy = true; Acct.syncErr = ''; acRowDraw(); let res = { up: 0, down: 0 };
  try {
    const token = await acToken(); await acPhotoProbe(token, a.uid);
    let shadow = await IDB.get('kv', AC_SHADOW); const first = !shadow || shadow.__uid !== a.uid; if (first) shadow = { __uid: a.uid };
    if (shadow.__photos) Acct.photosOK = true;   // once photos have synced on this device they always do, so none are ever skipped
    const full = first || !!opt.full || (Acct.photosOK && !shadow.__photos); if (Acct.photosOK) shadow.__photos = '1'; const colls = acColls();
    const remote = await acPull(token, full ? null : localStorage.getItem(AC_CUR)), local = acLocal(); let touched = false, cursor = first ? null : localStorage.getItem(AC_CUR);
    for (const r of remote) if (!cursor || r.updated_at > cursor) cursor = r.updated_at;
    let mode = 'normal';
    if (first) {
      const live = remote.filter(r => !r.deleted && r.coll !== '_settings').length;
      mode = !live ? 'merge' : !acHasData() ? 'cloud' : opt.choice;
      if (!mode) { Acct.busy = false; Acct.pending = { live }; acChoose(live); acRowDraw(); return null; }
    }
    if (mode === 'cloud') {   // take the account's copy wholesale
      for (const c of colls) Store.docs[c] = {};
      for (const r of remote) { const k = r.coll + '/' + r.id; if (r.deleted || (r.coll !== '_settings' && !colls.includes(r.coll))) continue; acApply(r.coll, r.id, r.data); shadow[k] = acHash(r.data); res.down++; }
      touched = true;
    } else {
      for (const r of remote) {
        if (r.coll !== '_settings' && !colls.includes(r.coll)) continue;
        const k = r.coll + '/' + r.id, L = local.get(k), was = shadow[k], rh = r.deleted ? null : acHash(r.data);
        if (r.deleted) { if (L && L.h === was) { acRemove(r.coll, r.id); local.delete(k); delete shadow[k]; touched = true; res.down++; } else if (!L) delete shadow[k]; continue; }
        if (!L) { if (was && !first) continue; /* deleted here since last sync: the delete wins */ acApply(r.coll, r.id, r.data); shadow[k] = rh; touched = true; res.down++; continue; }
        if (L.h === rh) { shadow[k] = rh; continue; }
        if (!first && L.h === was) { acApply(r.coll, r.id, r.data); shadow[k] = rh; local.set(k, { ...L, data: r.data, h: rh }); touched = true; res.down++; }
        /* otherwise this device changed it too: keep ours, it is pushed below */
      }
    }
    if (touched) { Store.rev++; changed(); acPersistRaw(); }
    const now = touched ? acLocal() : local, rows = [];
    for (const [k, L] of now) if (shadow[k] !== L.h) rows.push({ coll: L.c, id: L.id, data: canon(L.data), deleted: false });
    for (const k of Object.keys(shadow)) if (k.slice(0, 2) !== '__' && !now.has(k)) { const i = k.indexOf('/'); if (k.slice(0, i) !== '_settings' && !colls.includes(k.slice(0, i))) continue; rows.push({ coll: k.slice(0, i), id: k.slice(i + 1), data: null, deleted: true }); }
    if (rows.length) { await acPush(token, rows); for (const r of rows) { const k = r.coll + '/' + r.id; if (r.deleted) delete shadow[k]; else shadow[k] = now.get(k).h; } res.up = rows.length; }
    await IDB.set('kv', AC_SHADOW, shadow); if (cursor) localStorage.setItem(AC_CUR, cursor);
    Acct.last = Date.now(); Acct.pending = null;
    if (Acct.photosOK) acPhotoSync(token, a.uid);   // pictures follow in the background
    if (touched && S().onboarded && typeof obClose === 'function' && !$('#onboard').hidden) obClose();
  } catch (e) { res = null; if (e && e.code !== 'signed_out') Acct.syncErr = e.code === 'offline' ? 'Offline. Will sync when you are back online.' : `Sync problem (${e.code}): ${String(e.message || '').slice(0, 140)}`; }
  Acct.busy = false; acRowDraw(); return res;
}
/* ---------- progress photo files (Supabase Storage, private bucket "photos", one folder per account) ---------- */
async function acPhotoProbe(token, uid) {
  if (Acct.photosOK || Acct.probed && Date.now() - Acct.probed < 600000) return; Acct.probed = Date.now();
  try { await sbCall('/storage/v1/object/list/photos', { method: 'POST', token, body: { prefix: uid, limit: 1 } }); Acct.photosOK = true; } catch (e) { Acct.photosOK = false; }
}
async function acPhotoSync(token, uid) {
  if (Acct.photoBusy) return; Acct.photoBusy = true; let got = 0; const stat = { want: 0, here: 0, up: 0, down: 0, err: '' }; Acct.photoStat = stat;
  try {
    let st = await IDB.get('kv', 'syncPhotos'); if (!st || st.__uid !== uid) st = { __uid: uid, ids: {} };
    const want = new Set(Store.list('photos').map(p => p.assetId || p.local).filter(Boolean)), have = new Set(await IDB.keys('photos'));
    stat.want = want.size; stat.here = [...want].filter(i => have.has(i)).length;
    const base = `${SB_URL}/storage/v1/object`, hdr = { apikey: SB_KEY, Authorization: 'Bearer ' + token };
    for (const id of want) {
      if (have.has(id)) { if (st.ids[id]) continue;
        const blob = await IDB.get('photos', id); if (!blob) continue;
        const r = await fetch(`${base}/photos/${uid}/${id}`, { method: 'POST', headers: { ...hdr, 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob }); if (r.ok) { st.ids[id] = 1; stat.up++; } else { stat.err = `upload ${r.status}: ${(await r.text()).slice(0, 90)}`; if (r.status === 404) break; }
      } else {
        const r = await fetch(`${base}/authenticated/photos/${uid}/${id}`, { headers: hdr }); if (!r.ok) { stat.err = `download ${r.status}: ${(await r.text()).slice(0, 90)}`; continue; }
        const blob = await r.blob(); await IDB.set('photos', id, blob); if (Store.blobs[id]) URL.revokeObjectURL(Store.blobs[id]); Store.blobs[id] = URL.createObjectURL(blob); st.ids[id] = 1; got++; stat.down++; stat.here++;
      }
    }
    for (const id of Object.keys(st.ids)) if (!want.has(id)) {   // photo deleted (here or on another device): drop the file everywhere
      try { await fetch(`${base}/photos/${uid}/${id}`, { method: 'DELETE', headers: hdr }); } catch (e) {}
      if (have.has(id)) { try { await IDB.del('photos', id); } catch (e) {} if (Store.blobs[id]) { URL.revokeObjectURL(Store.blobs[id]); delete Store.blobs[id]; } }
      delete st.ids[id];
    }
    await IDB.set('kv', 'syncPhotos', st);
  } catch (e) { stat.err = 'photo sync stopped: ' + String(e && e.message || e).slice(0, 90); }
  Acct.photoBusy = false; if (got) { Store.rev++; changed(); } acRowDraw();
}
async function acPhotoWipe(token, uid) {   // before deleting the account
  try { const st = await IDB.get('kv', 'syncPhotos'); const ids = new Set([...(st && st.__uid === uid ? Object.keys(st.ids) : []), ...Store.list('photos').map(p => p.assetId || p.local).filter(Boolean)]);
    for (const id of ids) await fetch(`${SB_URL}/storage/v1/object/photos/${uid}/${id}`, { method: 'DELETE', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } }); } catch (e) {}
}
/* saving to the phone also queues a sync a few seconds later */
const acPersistRaw = persist;
persist = function () { acPersistRaw(); if (acOn()) { clearTimeout(Acct.t); Acct.t = setTimeout(() => syncNow(), 4000); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && acOn() && Date.now() - Acct.last > 60000) setTimeout(() => syncNow(), 800); });
window.addEventListener('online', () => { if (acOn()) syncNow(); });
setTimeout(() => { if (acOn()) syncNow(); }, 1800);

function acChoose(n) {
  openSheet('Your account already has data', `<p class="muted small" style="margin:0 0 14px">This phone has data and your account has ${plural(n, 'saved record')} too. What should happen?</p>
    <button class="btn block" data-act="acChoice" data-c="merge">Combine them</button><p class="faint tiny" style="margin:6px 0 14px">Keeps everything from both. Where the same entry differs, this phone's version is kept.</p>
    <button class="btn ghost block" data-act="acChoice" data-c="cloud">Replace this phone with my account</button><p class="faint tiny" style="margin:6px 0 0">This phone's entries are removed and the account's are loaded. </p>`);
}
A.acChoice = async d => { if (d.c === 'cloud' && !await ask("Replace this phone's data with your account's? This can't be undone.", { ok: 'Replace', danger: true })) return; closeSheet(); const r = await syncNow({ choice: d.c }); if (r) toast('Synced with your account'); };

/* ---------- sign in: email + password (one form signs in, or creates the account if the email is new) ---------- */
function acSheetHTML() {
  const err = Acct.err ? `<p class="small" style="color:var(--miss);margin:0 0 10px">${esc(Acct.err)}</p>` : '';
  return `<p class="muted small" style="margin:0 0 12px">Sign in to keep your data safe in your account and load it on any device.</p>
    <div class="field"><label class="lbl" for="ac-email">Email</label><input id="ac-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" placeholder="you@example.com" value="${esc(Acct.email)}"></div>
    <div class="field"><label class="lbl" for="ac-pass">Password</label><input id="ac-pass" type="password" autocomplete="current-password" placeholder="At least 8 characters"></div>${err}
    <button class="btn block" data-act="acGo" data-m="in"${Acct.sending ? ' disabled' : ''}>${Acct.sending === 'in' ? 'Signing in…' : 'Sign in'}</button>
    <button class="btn ghost block" data-act="acGo" data-m="new" style="margin-top:8px"${Acct.sending ? ' disabled' : ''}>${Acct.sending === 'new' ? 'Creating…' : 'Create account'}</button>
    <p class="faint tiny" style="text-align:center;margin:12px 0 0">By continuing you agree to the <button class="linkbtn" data-act="legalOpen" data-doc="terms" style="padding:0;font-size:inherit">Terms</button> and <button class="linkbtn" data-act="legalOpen" data-doc="privacy" style="padding:0;font-size:inherit">Privacy Policy</button>. Forgot your password? Email ${typeof LEGAL_EMAIL === 'string' ? esc(LEGAL_EMAIL) : 'support'}.</p>`;
}
const acSheetDraw = () => { if ($('#ac-email') || Acct.open) { const pw = $('#ac-pass')?.value || ''; sheetBody(acSheetHTML()); const el = $('#ac-pass'); if (el) el.value = pw; } };
A.acOpen = () => { Acct.err = ''; Acct.sending = false; Acct.open = true; const ob = $('#onboard'); document.body.classList.toggle('sheet-top', !!ob && !ob.hidden); openSheet('Sign in', acSheetHTML(), { onClose: () => { Acct.open = false; document.body.classList.remove('sheet-top'); } }); setTimeout(() => $('#ac-email')?.focus(), 150); };
A.acGo = async d => {
  const email = ($('#ac-email')?.value || '').trim().toLowerCase(), password = $('#ac-pass')?.value || '', make = d.m === 'new'; Acct.email = email;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { Acct.err = 'Enter a valid email address.'; return acSheetDraw(); }
  if (password.length < 8) { Acct.err = 'Use a password with at least 8 characters.'; return acSheetDraw(); }
  Acct.err = ''; Acct.sending = d.m; acSheetDraw(); let j = null;
  try {
    j = make ? await sbCall('/auth/v1/signup', { method: 'POST', body: { email, password } }) : await sbCall('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    if (!j || !j.access_token) { j = null; Acct.err = make ? 'Account created. Check your email to confirm it, then sign in.' : "Couldn't sign in. Try again."; }
  } catch (e) {
    const m = String(e.message || '');
    Acct.err = e.code === 'offline' ? 'No connection. Try again when you are online.' : e.code === 429 ? 'Too many tries. Wait a minute and try again.'
      : make ? (/already|registered|exists/i.test(m) ? 'That email already has an account. Tap Sign in instead.' : `Couldn't create the account. ${m}`)
      : (/invalid|credentials/i.test(m) ? 'Wrong email or password. New here? Tap Create account.' : /confirm/i.test(m) ? 'Confirm your email first (check your inbox), then sign in.' : `Couldn't sign in. ${m}`);
  }
  Acct.sending = false; if (!j) return acSheetDraw();
  acStore(j); Acct.open = false; closeSheet(); toast(make ? 'Account created' : 'Signed in'); acRowDraw();
  const r = await syncNow(); if (r) toast(r.down ? `Loaded your account (${plural(r.down, 'record')})` : 'Your data is now backed up to your account'); else if (Acct.syncErr) toast(Acct.syncErr, { bad: true });
};
A.acSync = async () => { const r = await syncNow({ full: true });   /* the button re-reads the whole account, so nothing can be missed */
  try { const rows = await sbCall('/rest/v1/docs?select=id&coll=eq.photos&deleted=eq.false', { token: await acToken() }); Acct.srvPhotos = (rows || []).length; } catch (e) { Acct.srvPhotos = '?'; }
  acRowDraw(); if (r) toast('Synced'); else if (Acct.syncErr) toast(Acct.syncErr, { bad: true }); };
A.acSignOut = async () => {
  if (!await ask('Sign out? Your data stays on this phone but stops syncing.', { ok: 'Sign out' })) return;
  const a = acGet(); try { if (a) await sbCall('/auth/v1/logout', { method: 'POST', token: a.access }); } catch (e) {}
  acSet(null); try { await IDB.del('kv', AC_SHADOW); await IDB.del('kv', 'syncPhotos'); localStorage.removeItem(AC_CUR); } catch (e) {} Acct.photosOK = false; Acct.probed = 0; acRowDraw(); toast('Signed out');
};
A.acDelete = async () => {
  if (!await ask('Delete your account and everything stored in it? Data on this phone stays until you erase it. This cannot be undone.', { ok: 'Delete account', danger: true })) return;
  try { const tk = await acToken(); if (Acct.photosOK) await acPhotoWipe(tk, acGet().uid); await sbCall('/rest/v1/rpc/delete_me', { method: 'POST', token: tk, body: {} }); } catch (e) { return toast("Couldn't delete the account. Try again, or email support.", { bad: true }); }
  acSet(null); try { await IDB.del('kv', AC_SHADOW); localStorage.removeItem(AC_CUR); } catch (e) {} acRowDraw(); toast('Account deleted');
};

/* ---------- Settings row ---------- */
function acRowHTML() {
  const a = acGet();
  if (!a) return `<button class="plan-row" id="st-ac" data-act="acOpen"><span class="pro-ic">☁️</span><span class="grow"><b>Sign in</b><span>Back up your data and load it on any device</span></span>${ICON.chevR}</button>`;
  const line = Acct.busy ? 'Syncing…' : Acct.syncErr ? esc(Acct.syncErr) : Acct.last ? `Synced ${new Date(Acct.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Signed in';
  return `<details class="sset" id="st-ac"><summary><span class="si" aria-hidden="true">☁️</span><span class="grow"><b>${esc(a.email || 'Your account')}</b><span class="faint small"${Acct.syncErr ? ' style="color:var(--miss)"' : ''}>${line}</span></span></summary><div class="sset-b">
    <p class="muted small" style="margin:0 0 10px">Everything you log is saved to your account and kept in step across your devices. ${Acct.photosOK ? 'Progress photos are included.' : 'Progress photos stay on this phone for now.'}</p>
    <p class="faint tiny" style="margin:-4px 0 10px">Status: ${Store.list('photos').length} photo entries here, ${Acct.srvPhotos == null ? '?' : Acct.srvPhotos} in account · ${Acct.photoStat ? `${Acct.photoStat.here} of ${Acct.photoStat.want} pictures on this device · sent ${Acct.photoStat.up}, received ${Acct.photoStat.down}${Acct.photoStat.err ? ' · ' + esc(Acct.photoStat.err) : ''}` : 'pictures not checked yet'} · photo storage ${Acct.photosOK ? 'on' : 'off'}</p>
    <div class="fields"><button class="btn" data-act="acSync">Sync now</button><button class="btn ghost" data-act="acSignOut">Sign out</button></div>
    <button class="linkbtn" data-act="acDelete" style="color:var(--miss);margin-top:10px;font-size:13px">Delete my account</button></div></details>`;
}
function acRowDraw() { const el = $('#st-ac'); if (el) { const open = el.tagName === 'DETAILS' && el.open; el.outerHTML = acRowHTML(); const n = $('#st-ac'); if (open && n && n.tagName === 'DETAILS') n.open = true; } }
{ const os = A.openSettings; A.openSettings = d => { os(d); const b = $('#sheet .sheet-b'); if (b && !$('#st-ac')) b.insertAdjacentHTML('afterbegin', acRowHTML()); }; }
