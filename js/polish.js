'use strict';
/* Everyday polish: directional screen transitions and numbers that glide to their new value, sounds,
   the day-streak flame next to the logo, and the small "Yesterday" recap line on Today. */

/* ======================= motion ======================= */
const TAB_ORDER = ['home', 'train', 'food', 'progress', 'you'];
/* note which way you're moving through the tab bar (app.js owns A.tab, so listen before it runs) */
document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.tab[data-tab]'); if (!t) return; const a = TAB_ORDER.indexOf(tabOf(UI.tab)), b = TAB_ORDER.indexOf(t.dataset.tab); UI.navDir = a >= 0 && b >= 0 && a !== b ? Math.sign(b - a) : 0; }, true);
const MV = { vals: new Map(), rings: new Map() };
/* a stable-ish key for a number on screen: its tab, the label of the card it sits in, and its place in that card */
function mvKey(el, tag) {
  const box = el.closest('.fr, .tile, .stat, .sess-strip, section, .card') || el.parentElement;
  const lbl = box ? (box.querySelector('.fr-l, .k, .sec-t, .eyebrow, h2')?.textContent || box.className) : '';
  const peers = box ? [...box.querySelectorAll(tag === 'r' ? '.pring' : '[data-count]')] : [];
  return `${UI.tab}|${tag}|${lbl.trim().slice(0, 30)}|${peers.indexOf(el)}`;
}
function countFrom(el, a, b, dp, dur = 520) {
  const t0 = performance.now(), fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(a + (b - a) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function motionAfter(view, entered) {
  const red = REDUCED();
  $$('[data-count]', view).forEach(el => {
    const to = +el.dataset.count; if (!isFinite(to)) return;
    const key = mvKey(el, 'n'), prev = MV.vals.get(key); MV.vals.set(key, to);
    if (red || entered || prev === to) return;              // a fresh screen already counts up from 0 (fx.js)
    countFrom(el, prev == null ? 0 : prev, to, +(el.dataset.dp || 0), prev == null ? 750 : 520);
  });
  $$('.pring', view).forEach(r => {
    const c = r.querySelectorAll('circle')[1]; if (!c) return;
    const to = +c.getAttribute('stroke-dashoffset'), full = +c.getAttribute('stroke-dasharray'), key = mvKey(r, 'r'), prev = MV.rings.get(key);
    MV.rings.set(key, to); if (red) return;
    const from = entered || prev == null ? full : prev; if (Math.abs(from - to) < 0.5) return;
    c.style.transition = 'none'; c.setAttribute('stroke-dashoffset', from);
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)'; c.setAttribute('stroke-dashoffset', to); }));
  });
}
{
  const fe = fxEnter;
  fxEnter = function (view) {
    const before = fxLastView, sig = UI.tab + (UI.session ? ':s' : '') + (UI.liftKey || '') + (UI.bodySub || '');
    if (sig !== before) view.style.setProperty('--dx', `${(UI.navDir || 0) * 22}px`);   // only a real screen change sets the direction
    fe(view);
    const entered = fxLastView !== before;
    if (entered && UI.navDir && !REDUCED()) { const t = $('#top .top-l'); if (t) { t.classList.remove('ttl-in'); void t.offsetWidth; t.classList.add('ttl-in'); } }
    UI.navDir = 0;
    motionAfter(view, entered);
    streakAfter();
  };
}

/* ======================= sounds ======================= */
/* Synthesised, short and quiet. Web Audio on iPhone is "ambient" audio: the silent switch mutes it on the speaker,
   but it still plays in earbuds, and it mixes with your music instead of pausing it. We pin that mode explicitly. */
const sfxOn = () => S().sounds !== false && !document.hidden;
function sfx(kind) {
  if (!sfxOn()) return;
  try { if ('audioSession' in navigator && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; } catch (e) {}
  const c = audioCtx(); if (!c) return;
  const t = c.currentTime + 0.01, out = c.createGain(); out.gain.value = 1; out.connect(c.destination);
  const note = (f, at, dur, o = {}) => {
    const osc = c.createOscillator(), g = c.createGain(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur * 0.6);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(o.vol || 0.12, at + (o.att || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g); g.connect(out); osc.start(at); osc.stop(at + dur + 0.03);
  };
  if (kind === 'set') { note(880, t, 0.09, { type: 'triangle', vol: 0.11 }); note(1320, t + 0.05, 0.13, { vol: 0.07 }); }
  else if (kind === 'pop') note(420, t, 0.13, { to: 880, vol: 0.11 });
  else if (kind === 'pr') { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.085, 0.55, { type: 'triangle', vol: 0.12 })); note(2093, t + 0.36, 0.8, { vol: 0.035 }); }
  else if (kind === 'finish') { [392, 493.88, 587.33, 783.99].forEach((f, i) => note(f, t + i * 0.025, 1.4, { vol: 0.065, att: 0.06 })); note(1567.98, t + 0.28, 1, { vol: 0.03, att: 0.05 }); }
  else if (kind === 'streak') { note(659.25, t, 0.16, { type: 'triangle', vol: 0.1 }); note(987.77, t + 0.11, 0.35, { type: 'triangle', vol: 0.1 }); }
}
/* where they play */
{ const cp = celebratePR; celebratePR = function (el) { cp(el); sfx('pr'); }; }
{ const ss = showSummary; showSummary = function (id) { ss(id); sfx('finish'); }; }
{ const af = addFoodItem; addFoodItem = function (...a) { const r = af(...a); sfx('pop'); return r; }; }
{ const ht = A.habitTap; A.habitTap = (d, el) => { const h = myHabits().find(x => x.id === d.id), was = h && habitDone(h, todayStr()); ht(d, el); if (h && !was) sfx('pop'); }; }
{ const st = A.usualStaples; A.usualStaples = (...a) => { st(...a); sfx('pop'); }; }
{ const ap = appearanceHTML; appearanceHTML = function () { const on = S().sounds !== false; return ap() + `<div class="field"><span class="lbl">Sounds</span><div class="seg">${[['on', 'On'], ['off', 'Off']].map(([k, l]) => `<button data-act="setSounds" data-v="${k}" aria-pressed="${(k === 'on') === on}">${l}</button>`).join('')}</div><p class="faint small" style="margin:6px 0 0">Little sounds for sets, PRs, finished workouts and quick adds. They stay quiet on the speaker when your phone is on silent, still play in earbuds, and never pause your music.</p></div>`; }; }
A.setSounds = d => { saveSettings({ sounds: d.v === 'on' }); if (d.v === 'on') setTimeout(() => sfx('pop'), 60); };

/* ======================= day streak ======================= */
/* A day counts if you train (a workout, a marked day or an activity) or hit your protein goal, so rest days can count too. */
function dayDone(d) {
  const act = activeWorkout();
  if (Store.list('workouts').some(w => w.date === d && (!act || w.id !== act.id))) return true;
  if (Store.list('acts').some(a => a.date === d)) return true;
  const p = S().proteinTarget; return !!(p && foodTotals(d).p >= p);
}
function dayStreak() {
  return Store.cached('dstreak:' + todayStr(), () => {
    const t = todayStr(), today = dayDone(t); let n = 0, d = today ? t : addDays(t, -1);
    while (n < 3000 && dayDone(d)) { n++; d = addDays(d, -1); }
    const dates = [...Store.list('workouts').map(w => w.date), ...Store.list('acts').map(a => a.date), ...Store.list('food').map(f => f.date)].filter(Boolean).sort();
    let best = n, run = 0;
    if (dates.length) for (let x = dates[0], g = 0; x <= t && g < 3000; x = addDays(x, 1), g++) { if (dayDone(x)) { run++; best = Math.max(best, run); } else if (x !== t) run = 0; }
    return { n, today, best };
  });
}
function streakPillHTML() {
  const s = dayStreak(); if (s.n < 1) return '';
  return `<button class="streak-pill${s.today ? '' : ' cold'}" data-act="streakOpen" aria-label="${s.n}-day streak${s.today ? '' : ', keep it going today'}"><span class="sp-fl" aria-hidden="true">🔥</span><b>${s.n}</b></button>`;
}
{ const ht = Views.home.title; Views.home.title = () => ht() + streakPillHTML(); }
/* the first time today's day counts: the flame lights up with a little burst */
function streakAfter() {
  const s = dayStreak(); if (!s.today || UI.tab !== 'home') return;
  let seen = ''; try { seen = localStorage.getItem('lp.streakLit') || ''; } catch (e) {}
  if (seen === todayStr()) return;
  try { localStorage.setItem('lp.streakLit', todayStr()); } catch (e) {}
  requestAnimationFrame(() => { const p = $('#top .streak-pill'); if (!p || REDUCED()) return; p.classList.add('lit'); setTimeout(() => p.classList.remove('lit'), 900); confetti({ ...centerOf(p), n: 22, power: 6, small: true, colors: ['#ffb238', '#ff4f6d', '#ffe08a'] }); sfx('streak'); });
}
A.streakOpen = () => {
  const s = dayStreak(), p = S().proteinTarget, t = todayStr();
  const mon = addDays(t, -((parseDate(t).getDay() + 6) % 7) - 28), days = [];
  for (let i = 0; i < 35; i++) days.push(addDays(mon, i));
  openSheet('Day streak', `<div class="stk-hero"><div class="stk-fl${s.today ? '' : ' cold'}" aria-hidden="true">🔥</div><div><b class="stk-n"><span data-count="${s.n}">${s.n}</span> ${s.n === 1 ? 'day' : 'days'}</b><span class="muted small">Best ever: ${s.best} ${s.best === 1 ? 'day' : 'days'}</span></div></div>
    <p class="small ${s.today ? '' : 'stk-warn'}" style="margin:0 0 14px">${s.today ? '✓ Today already counts. Nice.' : `Today doesn't count yet. Train or hit ${p ? `${p} g of protein` : 'your protein goal'} to keep it going.`}</p>
    <div class="stk-cal" role="img" aria-label="Last 5 weeks">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="stk-dw">${x}</span>`).join('')}${days.map(d => `<i class="${d > t ? 'fut' : dayDone(d) ? 'on' : ''}${d === t ? ' now' : ''}" title="${fmtDate(d)}"></i>`).join('')}</div>
    <p class="faint small" style="margin:12px 0 0">A day counts when you train (a workout, a marked day or any activity) or hit your protein goal, so rest days count too when you eat right.</p>`);
  countUps($('#sheet'));
};

/* ======================= yesterday at a glance ======================= */
function recapStripHTML() {
  const t = todayStr(), y = addDays(t, -1), s = S(), ft = foodTotals(y), act = activeWorkout();
  const wos = Store.list('workouts').filter(w => w.date === y && (!act || w.id !== act.id)), acts = Store.list('acts').filter(a => a.date === y), sl = dailyOf(t).sleep;
  const it = [];
  if (ft.cal > 0) {
    const lim = typeof calBudget === 'function' ? calBudget(y).ceiling : s.calTarget, okc = lim && Math.abs(ft.cal - lim) <= lim * 0.1;
    it.push(`<button class="rc" data-act="recapFood">🍽 <b>${fmtN(ft.cal)}</b> kcal${okc ? '<i class="rc-ok" aria-label="on target">✓</i>' : ''}</button>`);
    it.push(`<button class="rc" data-act="recapFood">🥩 <b>${trim(ft.p, 0)}</b> g protein${s.proteinTarget && ft.p >= s.proteinTarget ? '<i class="rc-ok" aria-label="goal hit">✓</i>' : ''}</button>`);
  }
  if (wos.length) it.push(`<button class="rc" data-act="showWorkout" data-id="${wos[0].id}">🏋️ ${esc(wos[0].dayName || (wos[0].marked ? 'Trained' : 'Workout'))}</button>`);
  else if (acts.length) it.push(`<span class="rc">${actOf(acts[0]).e} ${esc(actName(acts[0]))}</span>`);
  else if (ft.cal > 0) it.push('<span class="rc">😌 Rest day</span>');
  if (sl != null) it.push(`<button class="rc" data-act="readyOpen">💤 <b>${fmtSleep(sl)}</b> sleep</button>`);
  const wrap = typeof wrapPillHTML === 'function' ? wrapPillHTML() : '';
  if (typeof calBudget === 'function') { const b = calBudget(t); if (!b.off && b.carry >= 100) it.push(`<button class="rc" data-act="budgetOpen">🏦 <b>+${fmtN(b.carry)}</b> kcal room today</button>`); }
  if (!it.length && !wrap) return '';
  return `<div class="recap-strip" role="group" aria-label="Yesterday at a glance">${it.length ? `<span class="rc-l">Yesterday</span>${it.join('<span class="rc-dot" aria-hidden="true">·</span>')}` : ''}${wrap}</div>`;
}
A.recapFood = () => { UI.foodDate = addDays(todayStr(), -1); UI.navDir = 1; UI.tab = 'food'; $('#view').scrollTop = 0; render(); };
{
  const hr = Views.home.render;
  Views.home.render = function () { const h = hr(), i = h.indexOf('</div>', h.indexOf('class="hdr-hello"')); return i < 0 ? h : h.slice(0, i + 6) + recapStripHTML() + h.slice(i + 6); };
}
PAGES.push(['🔥', 'Day streak', 'streak flame days in a row', () => A.streakOpen()]);
