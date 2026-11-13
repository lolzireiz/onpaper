'use strict';
/* Liftprint: core utilities, data store, shared stats, UI primitives and charts. */

/* ---------- small utilities ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateStr(new Date());
const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const parseDate = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return dateStr(d); };
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clone = o => JSON.parse(JSON.stringify(o ?? null));
const keyOf = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
const slug = n => keyOf(n).replace(/[^a-z0-9]+/g, '-') || 'x';
const initials = n => String(n || '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function fmtDate(s, { rel = true, year } = {}) {
  if (!s) return '';
  const t = todayStr();
  if (rel && s === t) return 'Today';
  if (rel && s === addDays(t, -1)) return 'Yesterday';
  const d = parseDate(s);
  const showYear = year ?? d.getFullYear() !== new Date().getFullYear();
  return `${MON[d.getMonth()]} ${d.getDate()}${showYear ? ', ' + d.getFullYear() : ''}`;
}
const fmtDay = s => `${DOW[parseDate(s).getDay()]}, ${fmtDate(s, { rel: false })}`;
function fmtTime(t) { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${pad(m)}${ap}`; }
const fmtClock = ts => { const d = new Date(ts); return fmtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`); };
const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
function trim(v, dp = 1) { if (v == null || !Number.isFinite(v)) return '—'; const p = 10 ** dp; return (Math.round(v * p) / p).toLocaleString('en-US', { maximumFractionDigits: dp }); }
const plain = (v, dp = 1) => v == null || !Number.isFinite(v) ? '' : String(Math.round(v * 10 ** dp) / 10 ** dp);
const signed = (v, dp = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + trim(Math.abs(v), dp);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* ---------- units (stored as lb and inches) ---------- */
const LB_KG = 0.45359237, IN_CM = 2.54;
const U = {
  get metric() { return Store.settings.unit === 'metric'; },
  get wu() { return this.metric ? 'kg' : 'lb'; },
  get lu() { return this.metric ? 'cm' : 'in'; },
  w(lb) { return lb == null ? null : this.metric ? lb * LB_KG : lb; },
  toLb(v) { return v == null ? null : Math.round((this.metric ? v / LB_KG : v) * 1000) / 1000; },
  l(i) { return i == null ? null : this.metric ? i * IN_CM : i; },
  toIn(v) { return v == null ? null : Math.round((this.metric ? v / IN_CM : v) * 1000) / 1000; },
};
const fw = (lb, dp = 1) => lb === 0 ? 'BW' : trim(U.w(lb), dp);
const fwu = (lb, dp = 1) => lb === 0 ? 'Bodyweight' : `${trim(U.w(lb), dp)} ${U.wu}`;

/* ---------- data store ---------- */
const COLLS = ['weighins', 'workouts', 'body', 'photos', 'food', 'gyms', 'myfoods', 'jumps', 'skills', 'acts', 'daily'];
const DEFAULTS = {
  unit: 'imperial', weeklyGoal: 4, restSec: 120, calTarget: 2500, proteinTarget: 160, nudgeDays: 3,
  activeGym: null, split: null, defaultSets: 3, exTargets: {}, bodyModel: 'male', watchReminder: true, customEx: [], buddy: false, goals: [], sports: [], big3: { squat: 'Squat', bench: 'Bench Press', deadlift: 'Deadlift' },
};
const Store = {
  mode: 'loading', note: '', loaded: false, rev: 0,
  settings: { ...DEFAULTS }, docs: Object.fromEntries(COLLS.map(c => [c, {}])),
  refs: {}, memo: {}, blobs: {},
  list(c) { return this.cached('list:' + c, () => Object.entries(this.docs[c] || {}).map(([id, d]) => ({ ...d, id }))); },
  cached(k, fn) { const m = this.memo[k]; if (m && m.rev === this.rev) return m.v; const v = fn(); this.memo[k] = { rev: this.rev, v }; return v; },
};
const S = () => Store.settings;
let CAP = { sample: null, sampleImages: false, imageTypes: null, assets: null };

async function initStore() {
  let db = null, user = null;
  if (window.claude && typeof window.claude.use === 'function') {
    try { [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); } catch (e) { db = null; }
  }
  if (!db) return startMemory('Preview mode: nothing you enter here is saved. Open this app from claude.ai while signed in to save your data.');
  let id = null;
  try { id = user ? await user.id() : null; } catch (e) { id = null; }
  if (!id) return startMemory("Couldn't confirm your account, so nothing is being saved. Reload while signed in to Claude.");
  Store.mode = 'db';
  const base = `data/users/${id}`;
  Store.refs.settings = db.doc(`${base}/settings`);
  const log = db.doc(`${base}/log`);
  for (const c of COLLS) Store.refs[c] = log.collection(c);
  const pending = new Set(['settings', ...COLLS]);
  const timer = setTimeout(() => {
    if (pending.size) { Store.loaded = true; Store.note = "Your data is slow to load, so some of it may be missing for now. It'll fill in when the connection catches up."; changed(); }
  }, 10000);
  const done = k => { if (pending.delete(k) && !pending.size) { clearTimeout(timer); Store.loaded = true; Store.note = ''; } };
  Store.refs.settings.onSnapshot(snap => {
    Store.settings = { ...DEFAULTS, ...(snap.exists ? clone(snap.data()) : {}) };
    if (!snap.metadata.fromCache) done('settings');
    changed();
  }, err => { done('settings'); dbError(err); });
  for (const c of COLLS) {
    Store.refs[c].onSnapshot(snap => {
      const m = {}; for (const d of snap.docs) m[d.id] = d.data();
      Store.docs[c] = m;
      if (!snap.metadata.fromCache) done(c);
      changed();
    }, err => { done(c); dbError(err); });
  }
}
function startMemory(note) {
  Store.mode = 'memory'; Store.loaded = true; Store.note = note;
  const demo = window.__DEMO;
  if (demo) { Store.settings = { ...DEFAULTS, ...demo.settings }; for (const c of COLLS) Store.docs[c] = demo.docs?.[c] || {}; Store.note = 'Preview with sample data. Nothing here is saved.'; }
  changed();
}
function dbError(e) {
  if (e?.code === 'revoked') Store.note = 'This app lost access to your saved data. Reload the page to reconnect.';
  else Store.note = "Can't reach your saved data right now. What you see may be out of date.";
  changed();
}
const queues = {};
function enqueue(key, fn) { const p = (queues[key] || Promise.resolve()).catch(() => {}).then(fn); queues[key] = p; return p; }
async function attemptWrite(fn) {
  try { await fn(); } catch (e) {
    if (e?.code === 'unavailable') {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 900));
      try { await fn(); return; } catch (e2) { e = e2; }
    }
    writeFailed(e);
  }
}
function writeFailed(e) {
  const c = e?.code;
  toast(c === 'quota_exceeded' ? 'Storage is full. Delete some old entries and try again.'
    : c === 'invalid_argument' ? "Couldn't save: this account can't write to the app."
    : c === 'revoked' ? 'Saving stopped because access to this app changed. Reload to reconnect.'
    : "Couldn't save that. Check your connection and try again.", { bad: true, ms: 4200 });
}
function put(c, id, data) {
  data = clone(data); delete data.id;
  Store.docs[c] = { ...Store.docs[c], [id]: data }; changed();
  if (Store.mode !== 'db') return Promise.resolve();
  return enqueue(c + '/' + id, () => attemptWrite(() => Store.refs[c].doc(id).set(data)));
}
function del(c, id) {
  const m = { ...Store.docs[c] }; delete m[id]; Store.docs[c] = m; changed();
  if (Store.mode !== 'db') return Promise.resolve();
  return enqueue(c + '/' + id, () => attemptWrite(() => Store.refs[c].doc(id).delete()));
}
function saveSettings(patch) {
  Store.settings = { ...Store.settings, ...clone(patch) }; changed();
  if (Store.mode !== 'db') return Promise.resolve();
  return enqueue('settings', () => attemptWrite(() => Store.refs.settings.set(clone(Store.settings))));
}

/* ---------- bodyweight ---------- */
const MEALS = [['fasted', '8+ hrs (fasted)'], ['4-8', '4–8 hrs'], ['2-4', '2–4 hrs'], ['lt2', 'Under 2 hrs']];
const mealLabel = m => (MEALS.find(x => x[0] === m) || [])[1] || '';
const wiX = w => parseDate(w.date).getTime() + (w.time ? (+w.time.slice(0, 2) * 60 + +w.time.slice(3, 5)) * 6e4 : 8 * 36e5);
function weighins() {
  return Store.cached('weighins', () => Store.list('weighins').filter(w => w.weight > 0)
    .sort((a, b) => (a.date + (a.time || '08:00')).localeCompare(b.date + (b.time || '08:00')) || (a.ts || 0) - (b.ts || 0)));
}
const isMorningFasted = w => w.meal === 'fasted' && (!w.time || w.time < '11:00');
function bwOn(date) {
  const ws = weighins(); let lo = 0, hi = ws.length - 1, ans = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (ws[m].date <= date) { ans = ws[m]; lo = m + 1; } else hi = m - 1; }
  return ans;
}
const latestWeighin = () => { const ws = weighins(); return ws[ws.length - 1] || null; };
function avgWindow(list, date, days = 7) {
  const from = addDays(date, -(days - 1)); const xs = list.filter(w => w.date >= from && w.date <= date).map(w => w.weight);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
function weeklyRate(list, days = 28) {
  const end = todayStr(), from = addDays(end, -days); const pts = list.filter(w => w.date >= from);
  if (pts.length < 3 || daysBetween(pts[0].date, pts[pts.length - 1].date) < 7) return null;
  const xs = pts.map(w => wiX(w) / 864e5), ys = pts.map(w => w.weight);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let n = 0, d = 0; xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); d += (x - mx) ** 2; });
  return d ? (n / d) * 7 : null;
}

/* ---------- lifts and PRs (rep-max rule) ---------- */
const e1rm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
function bestAtLeast(best, r) { let b = null; for (const k in best) if (+k >= r && (!b || best[k].w > b.w)) b = best[k]; return b; }
function allSets() {
  return Store.cached('sets', () => {
    const out = [];
    for (const w of Store.list('workouts')) for (const s of (w.sets || [])) out.push({ ...s, date: w.date, wid: w.id, quick: !!w.quick });
    out.sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
    return out;
  });
}
/* Bodyweight exercises: share of bodyweight moved (common estimates). Load = share × bodyweight + added weight (total of both dumbbells). */
const BW_FACTOR = { 'pull-ups': 1, 'chin-ups': 1, 'dips': 1, 'push-ups': 0.64, 'dumbbell standing calf raise': 1, 'bulgarian split squat': 0.85, 'walking lunge': 0.85, 'goblet squat': 0.85, 'hanging leg raise': 0.35, 'back extension': 0.5, 'decline sit-up': 0.5, 'jump squat': 0.85, 'lateral bounds': 0.85, 'lateral lunge': 0.85, 'step-up': 0.85 };
function bwFactor(name) { const k = keyOf(name), o = (S().bwOverride || {})[k]; return o != null ? +o : (BW_FACTOR[k] || 0); }
const setBw = s => s.bwt || bwOn(s.date)?.weight || S().lastBw || 0;
const loadTxt = rec => rec.bwf ? `${rec.added ? '+' + fw(rec.added) : 'BW'}${rec.w ? ` <span class="faint">≈${fw(rec.w, 0)}</span>` : ''}` : `${fw(rec.w)}`;
function liftIndex() {
  return Store.cached('lifts', () => {
    const map = new Map();
    for (const s of allSets()) {
      const k = keyOf(s.ex); if (!k) continue;
      let L = map.get(k);
      if (!L) { L = { key: k, name: s.ex, sets: [], best: {}, e1: 0, e1Set: null, heavy: null, last: null, prs: 0, hits: 0 }; map.set(k, L); }
      L.name = s.ex;
      const r = Math.max(1, Math.round(s.r || 1)), bwf = bwFactor(s.ex), added = +s.w || 0, w = bwf ? Math.round((bwf * setBw(s) + added) * 10) / 10 : added;
      const prevBest = bestAtLeast(L.best, r);
      const rec = { ...s, r, w, added, bwf, e1: e1rm(w, r), prevBest, bw: bwOn(s.date), hit: s.hit !== false, warm: !!s.warm }; L.bwf = bwf;
      if (rec.hit && !rec.warm) {
        if (!L.hits) rec.baseline = true;
        else if (w > (prevBest ? prevBest.w : -1) + 1e-9) { rec.pr = true; L.prs++; }
        L.hits++;
        if (!L.best[r] || w > L.best[r].w) L.best[r] = rec;
        if (rec.e1 > L.e1) { L.e1 = rec.e1; L.e1Set = rec; }
        if (!L.heavy || w > L.heavy.w || (w === L.heavy.w && r > L.heavy.r)) L.heavy = rec;
      }
      L.sets.push(rec); L.last = rec;
    }
    return map;
  });
}
const liftList = () => [...liftIndex().values()].sort((a, b) => (b.last.date.localeCompare(a.last.date)) || (b.last.ts || 0) - (a.last.ts || 0));
const liftByKey = k => liftIndex().get(k) || null;
const setRec = (L, id) => L ? L.sets.find(s => s.id === id) : null;
const ratio = (w, bw) => bw && w ? trim(w / bw.weight, 2) + '×' : '';
function prDesc(rec) {
  const reps = rec.r === 1 ? 'New 1-rep max' : `New ${rec.r}-rep max`;
  return rec.prevBest ? `${reps} (was ${fw(rec.prevBest.w)}${rec.prevBest.r !== rec.r ? ' ×' + rec.prevBest.r : ''})` : reps;
}

/* ---------- workouts, streaks ---------- */
function activeWorkout() {
  const now = Date.now();
  return Store.list('workouts').filter(w => !w.quick && !w.marked && !w.endTs && w.startTs && now - w.startTs < 16 * 36e5)
    .sort((a, b) => b.startTs - a.startTs)[0] || null;
}
const gymDays = () => Store.cached('gymdays', () => { const s = new Set(); for (const w of Store.list('workouts')) if ((w.sets || []).length || w.marked) s.add(w.date); for (const a of Store.list('acts')) s.add(a.date); return s; });
const weekStart = s => { const d = parseDate(s); return addDays(s, -((d.getDay() + 6) % 7)); };
function weekStats() {
  const days = gymDays(), goal = S().weeklyGoal || 4, wk0 = weekStart(todayStr());
  const count = wk => { let n = 0; for (let i = 0; i < 7; i++) if (days.has(addDays(wk, i))) n++; return n; };
  const cur = count(wk0); let streak = cur >= goal ? 1 : 0, wk = addDays(wk0, -7), guard = 0;
  while (count(wk) >= goal && guard++ < 600) { streak++; wk = addDays(wk, -7); }
  return { cur, goal, streak, wk0, days };
}

/* ---------- UI state + rendering ---------- */
const UI = { tab: 'home', bodySub: 'weight', liftKey: null, liftFilter: 'key', session: false, weightRange: '3M', weightFilter: 'all', foodDate: null, calMonth: null, measureKey: 'waist', planDay: null, planGym: null, photoPose: 'Front', cmpA: null, cmpB: null };
const Views = {};
const A = {};          // click / change actions
const Sheet = {};      // state for the open sheet
let renderQueued = false;
function changed() { Store.rev++; scheduleRender(); }
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); }); }
function render() {
  const view = $('#view'), v = Views[UI.tab];
  const keep = {}; $$('[data-keep]', view).forEach(i => { if (i.id) keep[i.id] = i.value; });
  const act = document.activeElement, focusId = act && view.contains(act) ? act.id : null;
  let sel = null; try { if (focusId && act.selectionStart != null) sel = [act.selectionStart, act.selectionEnd]; } catch (e) {}
  Charts.list = [];
  const ready = Store.mode !== 'loading' && Store.loaded;
  view.innerHTML = ready ? v.render() + (typeof APP_VERSION !== 'undefined' ? `<footer class="ver-foot">Liftprint v${APP_VERSION}</footer>` : '') : `<div class="loading"><div class="thinking">Loading your data…</div></div>`;
  for (const [id, val] of Object.entries(keep)) { const el = document.getElementById(id); if (el && el.dataset.keep !== undefined) el.value = val; }
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({ preventScroll: true }); try { if (sel) el.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
  $('#top').innerHTML = `<div class="top-l">${v.title()}</div><div class="top-r">${ready && v.actions ? v.actions() : ''}<button class="iconbtn" data-act="search" aria-label="Search">${ICON.search}</button></div>`;
  $$('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === tabOf(UI.tab) ? 'page' : 'false'));
  $('#banner').innerHTML = (typeof updBannerHTML === 'function' ? updBannerHTML() : '') + (Store.note ? `<div class="banner">${esc(Store.note)}</div>` : '');
  mountCharts();
  if (typeof fxEnter === 'function') fxEnter(view);
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const f = A[el.dataset.act]; if (!f) return;
  e.preventDefault(); f(el.dataset, el, e);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && A[el.dataset.change]) A[el.dataset.change](el.dataset, el, e); });
A.pick = (d, el) => { const root = el.closest('[data-root]') || el.parentElement; $$(`[data-group="${d.group}"]`, root).forEach(x => x.setAttribute('aria-pressed', String(x === el))); };
A.toggle = (d, el) => el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
const picked = (root, group) => $(`[data-group="${group}"][aria-pressed="true"]`, root)?.dataset.value ?? null;
const pickedAll = (root, group) => $$(`[data-group="${group}"][aria-pressed="true"]`, root).map(x => x.dataset.value);
const chip = (label, group, value, on, act = 'pick') => `<button type="button" class="chip" data-act="${act}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${!!on}">${label}</button>`;
const fval = name => { const el = $(`#sheet [name="${name}"]`); return el ? el.value.trim() : ''; };

/* ---------- sheets, dialogs, toasts ---------- */
function openSheet(title, body, { onMount, onClose } = {}) {
  const L = $('#sheet');
  Sheet.onClose = onClose || null;
  L.innerHTML = `<div class="scrim" data-act="closeSheet"></div><section class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab" aria-hidden="true"></div><header class="sheet-h"><h2 id="sheet-title">${esc(title)}</h2><button class="iconbtn" data-act="closeSheet" aria-label="Close">${ICON.x}</button></header><div class="sheet-b" data-root>${body}</div></section>`;
  L.hidden = false; void L.offsetWidth; L.classList.add('open');
  if (onMount) onMount(L);
  return L;
}
const sheetBody = html => { const b = $('#sheet .sheet-b'); if (b) { b.innerHTML = html; b.scrollTop = 0; } };
const sheetTitle = t => { const h = $('#sheet-title'); if (h) h.textContent = t; };
/* Peek: open a sheet on top of the current one (e.g. an exercise's info from inside the split editor).
   Closing it brings back the sheet underneath exactly as it was, typed values and all. */
Sheet.stack = [];
function peekSheet(open) {
  const L = $('#sheet');
  if (L.hidden || !L.classList.contains('open')) return open();
  const b = $('.sheet-b', L);
  Sheet.stack.push({ nodes: [...L.childNodes], onClose: Sheet.onClose, scroll: b ? b.scrollTop : 0 });
  Sheet.onClose = null; L.replaceChildren(); open(); Sheet.peeking = Sheet.stack.length;
}
function closeSheet() {
  const L = $('#sheet'); if (L.hidden) return;
  if (Sheet.stack.length && Sheet.peeking === Sheet.stack.length) {
    const f = Sheet.onClose, prev = Sheet.stack.pop(); Sheet.onClose = null; if (f) f();
    L.replaceChildren(...prev.nodes); Sheet.onClose = prev.onClose; Sheet.peeking = Sheet.stack.length || 0;
    const b = $('.sheet-b', L); if (b) b.scrollTop = prev.scroll; return;
  }
  Sheet.stack = []; Sheet.peeking = 0;
  L.classList.remove('open'); const f = Sheet.onClose; Sheet.onClose = null; if (f) f();
  setTimeout(() => { if (!L.classList.contains('open')) { L.hidden = true; L.innerHTML = ''; } }, 240);
}
A.closeSheet = closeSheet;
function closeAllSheets() { Sheet.stack = []; Sheet.peeking = 0; closeSheet(); }
function ask(msg, { ok = 'OK', danger = false, cancel = 'Cancel' } = {}) {
  return new Promise(res => {
    const L = $('#dialog');
    L.innerHTML = `<div class="scrim"></div><div class="dlg" role="alertdialog" aria-modal="true"><p>${esc(msg)}</p><div class="dlg-b"><button class="btn ghost" id="dlg-no">${esc(cancel)}</button><button class="btn ${danger ? 'danger-fill' : ''}" id="dlg-yes">${esc(ok)}</button></div></div>`;
    L.hidden = false;
    const done = v => { L.hidden = true; L.innerHTML = ''; res(v); };
    $('#dlg-no', L).onclick = () => done(false); $('#dlg-yes', L).onclick = () => done(true); $('.scrim', L).onclick = () => done(false);
    $('#dlg-yes', L).focus();
  });
}
function toastUndo(msg, undo, ms = 5000) {
  const t = $('#toast'); t.className = 'toast'; t.innerHTML = `<span>${esc(msg)}</span><button class="toast-undo">Undo</button>`;
  t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); setTimeout(() => toast('Restored'), 200); };
  void t.offsetWidth; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
let toastT;
function toast(msg, { pr = false, bad = false, ms = 2800 } = {}) {
  const t = $('#toast'); t.className = 'toast' + (pr ? ' pr' : '') + (bad ? ' bad' : '');
  t.textContent = msg; void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- charts (hand-drawn SVG, one y-axis, scrub to read values) ---------- */
const Charts = { list: [] };
function chartSlot(id, cfg) { Charts.list.push({ id, cfg }); return `<div class="chart" id="ch-${id}" style="height:${cfg.h || 190}px" role="img" aria-label="${esc(cfg.label || 'Chart')}"></div>`; }
function mountCharts() { for (const { id, cfg } of Charts.list) { const el = document.getElementById('ch-' + id); if (el) drawChart(el, cfg); } }
window.addEventListener('resize', () => { clearTimeout(Charts.rt); Charts.rt = setTimeout(mountCharts, 150); });
function niceScale(min, max, n = 4) {
  if (!(max > min)) { const p = Math.abs(min) * 0.04 || 1; min -= p; max += p; }
  const raw = (max - min) / n, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}
function drawChart(el, cfg) {
  const W = Math.max(240, el.clientWidth), H = cfg.h || 190, m = { l: 42, r: 12, t: 10, b: 24 };
  const all = cfg.series.flatMap(s => s.pts);
  if (!all.length) { el.innerHTML = `<div class="chart-empty">${esc(cfg.empty || 'No data yet')}</div>`; return; }
  let x0 = cfg.x0 ?? Math.min(...all.map(p => p.x)), x1 = cfg.x1 ?? Math.max(...all.map(p => p.x));
  if (x1 - x0 < 6 * 864e5) { const c = (x0 + x1) / 2; x0 = c - 3 * 864e5; x1 = c + 3 * 864e5; }
  let inr = all.filter(p => p.x >= x0 && p.x <= x1); if (!inr.length) inr = all;
  const ymin = Math.min(...inr.map(p => p.y)), ymax = Math.max(...inr.map(p => p.y)), py = (ymax - ymin) * 0.1;
  const { lo, hi, ticks } = niceScale(ymin - py, ymax + py, cfg.ticks || 4);
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = y => m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b);
  const yf = cfg.yFmt || (v => trim(v, 1));
  const gid = 'g' + Math.random().toString(36).slice(2, 8);
  let out = `<defs><linearGradient id="${gid}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient><linearGradient id="${gid}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb238"/><stop offset=".5" stop-color="#ff4f6d"/><stop offset="1" stop-color="#b13dff"/></linearGradient><clipPath id="${gid}c"><rect x="${m.l - 6}" y="0" width="${W - m.l - m.r + 12}" height="${H - m.b + 6}"/></clipPath></defs>`;
  for (const t of ticks) out += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${m.l - 8}" y="${Y(t) + 4}" class="axis" text-anchor="end">${yf(t)}</text>`;
  const nX = Math.max(2, Math.min(4, Math.floor((W - m.l - m.r) / 80))), span = x1 - x0, long = span > 300 * 864e5;
  for (let i = 0; i <= nX; i++) {
    const x = x0 + span * i / nX, d = new Date(x);
    const lbl = long ? `${MON[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` : `${MON[d.getMonth()]} ${d.getDate()}`;
    out += `<text x="${X(x)}" y="${H - 6}" class="axis" text-anchor="${i === 0 ? 'start' : i === nX ? 'end' : 'middle'}">${lbl}</text>`;
  }
  let body = '';
  for (const s of cfg.series) {
    const pts = [...s.pts].sort((a, b) => a.x - b.x); if (!pts.length) continue;
    const col = s.color || 'var(--accent)';
    if (s.type === 'line' || s.type === 'step') {
      let d = '';
      pts.forEach((p, i) => {
        if (!i) d += `M${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`;
        else if (s.type === 'step') d += `H${X(p.x).toFixed(1)}V${Y(p.y).toFixed(1)}`;
        else d += `L${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`;
      });
      if (s.type === 'step' && s.extend) d += `H${X(x1).toFixed(1)}`;
      if (s.area && pts.length > 1) body += `<path d="${d}V${H - m.b}H${X(pts[0].x).toFixed(1)}Z" fill="url(#${gid}a)"/>`;
      body += `<path d="${d}" class="ln" style="stroke:${col}"/>`;
      if (s.end) { const p = pts.filter(p => p.x <= x1).pop(); if (p) body += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" style="fill:${col};stroke:var(--s1);stroke-width:2"/>`; }
    } else if (s.type === 'dots') {
      for (const p of pts) body += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${s.r || 3}" style="fill:${col};opacity:${s.op ?? 1}"/>`;
    } else if (s.type === 'rings') {
      for (const p of pts) body += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${s.r || 4.5}" style="fill:var(--s1);stroke:${col};stroke-width:2"/>`;
    } else if (s.type === 'pr') {
      for (const p of pts) body += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${s.r || 5}" fill="url(#${gid}p)" style="stroke:var(--s1);stroke-width:2"/>`;
    }
  }
  out += `<g clip-path="url(#${gid}c)">${body}</g><line class="xh" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><circle class="xm" r="5" visibility="hidden"/>`;
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out}</svg><div class="tip" hidden></div>`;
  const svg = el.firstChild, tip = el.lastChild, xh = svg.querySelector('.xh'), xm = svg.querySelector('.xm');
  const sp = (cfg.scrubPts || cfg.series[cfg.scrub ?? 0].pts).filter(p => p.x >= x0 - 1 && p.x <= x1 + 1);
  const show = ev => {
    if (!sp.length) return;
    const r = svg.getBoundingClientRect(), px = ev.clientX - r.left; let best = null, bd = 1e9;
    for (const p of sp) { const dd = Math.abs(X(p.x) - px); if (dd < bd) { bd = dd; best = p; } }
    const cx = X(best.x), cy = Y(best.y);
    xh.setAttribute('x1', cx); xh.setAttribute('x2', cx); xh.setAttribute('visibility', 'visible');
    xm.setAttribute('cx', cx); xm.setAttribute('cy', cy); xm.setAttribute('visibility', 'visible');
    tip.innerHTML = cfg.tip ? cfg.tip(best) : `<b>${yf(best.y)}</b> · ${fmtDate(dateStr(new Date(best.x)))}`;
    tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = clamp(cx - tw / 2, 0, W - tw) + 'px';
  };
  const hide = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); xm.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide); svg.addEventListener('pointercancel', hide);
}
function spark(vals, w = 120, h = 36) {
  if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1, iw = w - 4;
  const pts = vals.map((v, i) => [i / (vals.length - 1) * iw, h - 4 - (v - mn) / sp * (h - 8)]);
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3"/></svg>`;
}
const legend = items => `<div class="legend">${items.map(([cls, style, label]) => `<span><i class="${cls}" style="${style}"></i>${esc(label)}</span>`).join('')}</div>`;

/* ---------- images ---------- */
async function toJpeg(file, max = 1600, q = 0.85) {
  try {
    const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', q));
  } catch (e) { return file; }
}

/* ---------- icons ---------- */
const svgI = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const ICON = {
  home: svgI('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>'),
  train: svgI('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  food: svgI('<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2 1.2-3 3.6-3 7v3h3"/>'),
  lifts: svgI('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/>'),
  body: svgI('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0"/><path d="m12 9.5 1.2-2"/>'),
  gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
  x: svgI('<path d="M6 6l12 12M18 6 6 18"/>'),
  dots: svgI('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  camera: svgI('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  chevL: svgI('<path d="m15 5-7 7 7 7"/>'),
  chevR: svgI('<path d="m9 5 7 7-7 7"/>'),
  up: svgI('<path d="m6 15 6-6 6 6"/>'),
  down: svgI('<path d="m6 9 6 6 6-6"/>'),
  spark: svgI('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};
