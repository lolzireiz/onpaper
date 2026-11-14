'use strict';
/* Progress extras: the trophy wall (every PR, newest first, with a shareable PR card), PR predictions from your
   estimated-1RM trend, and the story-style monthly wrap. */

const LP_ARCS = ["M396.1 574.8 A120.0 134.4 0 1 1 627.9 574.8", "M364.8 635.2 A170.0 190.4 0 0 1 572.9 362.2", "M619.0 392.0 A170.0 190.4 0 0 1 659.2 635.2", "M343.5 698.4 A220.0 246.4 0 0 1 359.2 362.8", "M415.6 318.5 A220.0 246.4 0 0 1 680.5 698.4", "M331.3 764.7 A270.0 302.4 0 1 1 721.8 349.7", "M764.1 431.6 A270.0 302.4 0 0 1 692.7 764.7", "M323.9 830.0 A320.0 358.4 0 0 1 381.8 212.6", "M478.6 183.6 A320.0 358.4 0 0 1 700.1 830.0"];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = ym => MONTHS[+ym.slice(5, 7) - 1];
const curYM = () => todayStr().slice(0, 7);
const prevYM = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const repsTxt = (s, name) => `${s.bwf ? (s.added ? '+' + fw(s.added) : 'BW') : fw(s.w)}${s.bwf || !s.w ? '' : ' ' + (name ? wuEx(name) : U.wu)} × ${s.r}`;

/* ======================= trophy wall ======================= */
function prEvents() {
  return Store.cached('prEvents', () => {
    const m = new Map();
    for (const L of liftIndex().values()) for (const s of L.sets) if (s.pr) {
      const k = L.key + '|' + s.date, cur = m.get(k);
      if (!cur) m.set(k, { L, s, more: 0 }); else { cur.more++; if (s.e1 > cur.s.e1) cur.s = s; }
    }
    return [...m.values()].sort((a, b) => b.s.date.localeCompare(a.s.date) || b.s.e1 - a.s.e1);
  });
}
const prSetCount = (ym) => { let n = 0; for (const L of liftIndex().values()) for (const s of L.sets) if (s.pr && (!ym || s.date.startsWith(ym))) n++; return n; };
A.trophies = () => {
  const ev = prEvents(), ym = curYM(), lifts = new Set(ev.map(e => e.L.key)).size, fc = forecasts().slice(0, 3);
  let h = `<div class="tw-stats"><div><b>${prSetCount()}</b><span>PRs</span></div><div><b>${prSetCount(ym)}</b><span>this month</span></div><div><b>${lifts}</b><span>lifts improved</span></div></div>`;
  if (fc.length) h += `<div class="field"><span class="lbl">🔮 Coming up</span>${fc.map(forecastRowHTML).join('')}</div>`;
  if (!ev.length) h += '<p class="muted small">No PRs yet. Beat your best weight for any number of reps and it lands here.</p>';
  let lastM = '';
  for (const e of ev.slice(0, 200)) {
    const m = e.s.date.slice(0, 7); if (m !== lastM) { h += `<span class="lbl tw-m">${monthName(m)} ${m.slice(0, 4)}</span>`; lastM = m; }
    h += `<button class="row tw-r" data-act="prCard" data-k="${esc(e.L.key)}" data-id="${e.s.id}"><span class="tw-ic" aria-hidden="true">🏆</span><div class="grow"><b>${esc(e.L.name)}</b><div class="faint small">${esc(repsTxt(e.s, e.L.name))} · ${esc(prDesc(e.s).replace(/^New /, 'new '))}${e.more ? ` · +${e.more} more` : ''}</div></div><span class="faint small">${fmtDate(e.s.date)}</span></button>`;
  }
  openSheet('🏆 Trophy wall', h);
};
/* the PR card: a share-ready image */
A.prCard = async d => {
  const L = liftByKey(d.k), s = L && L.sets.find(x => x.id === d.id); if (!s) return;
  const open = () => openSheet('PR card', `<div class="prc-wrap"><div class="prc-img thinking" style="aspect-ratio:4/5"></div></div><div class="btnrow" style="margin-top:12px"><button class="btn" data-act="prShare" data-k="${esc(d.k)}" data-id="${d.id}">Share</button><button class="btn ghost" data-act="openLift" data-key="${esc(d.k)}">Open lift</button></div>`);
  $('#sheet .tw-r') ? peekSheet(open) : open();
  const blob = await prImage(L, s); if (!blob) return;
  const url = URL.createObjectURL(blob), box = $('#sheet .prc-img'); if (box) { box.classList.remove('thinking'); box.innerHTML = `<img src="${url}" alt="PR card: ${esc(L.name)} ${esc(repsTxt(s, L.name))}">`; }
};
A.prShare = async d => {
  const L = liftByKey(d.k), s = L && L.sets.find(x => x.id === d.id); if (!s) return;
  const blob = await prImage(L, s), file = new File([blob], `liftprint-pr-${slug(L.name)}-${s.date}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `${L.name} PR` }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadBlob(blob, file.name); toast('Image saved');
};
function drawMark(g, cx, cy, size, alpha = 1) {
  const sc = size / 864; g.save(); g.globalAlpha = alpha; g.translate(cx - 512 * sc, cy - 512 * sc); g.scale(sc, sc);
  const gr = g.createLinearGradient(100, 100, 900, 900); gr.addColorStop(0, '#ffb238'); gr.addColorStop(.5, '#ff4f6d'); gr.addColorStop(1, '#b13dff');
  g.strokeStyle = gr; g.lineWidth = 40; g.lineCap = 'round'; g.shadowColor = 'rgba(255,79,109,.55)'; g.shadowBlur = 30;
  for (const p of LP_ARCS) g.stroke(new Path2D(p));
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.translate(512, 546);
  for (const [x, y, w, h, r] of [[-150, -11, 300, 22, 11], [-112, -62, 34, 124, 12], [-150, -44, 28, 88, 10], [78, -62, 34, 124, 12], [122, -44, 28, 88, 10]]) { roundRect(g, x, y, w, h, r); g.fill(); }
  g.restore();
}
function drawStar(g, x, y, r, col) { g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * .12, -r * .12, r, 0); g.quadraticCurveTo(r * .12, r * .12, 0, r); g.quadraticCurveTo(-r * .12, r * .12, -r, 0); g.quadraticCurveTo(-r * .12, -r * .12, 0, -r); g.fill(); g.restore(); }
async function prImage(L, s) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const bg = g.createRadialGradient(W / 2, H * .36, 40, W / 2, H * .45, H * .8); bg.addColorStop(0, '#2a1834'); bg.addColorStop(.55, '#0e0b12'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(140, 0, W - 140, 0); gr.addColorStop(0, '#ffb238'); gr.addColorStop(.5, '#ff4f6d'); gr.addColorStop(1, '#b13dff');
  drawMark(g, W / 2, 300, 300);
  [[190, 210, 26], [880, 260, 34], [930, 470, 18], [140, 470, 20], [770, 120, 16]].forEach(([x, y, r], i) => drawStar(g, x, y, r, ['#ffb238', '#ff4f6d', '#b13dff', '#ff8a5c', '#ffd27a'][i]));
  g.textAlign = 'center';
  g.fillStyle = gr; g.font = `800 46px ${F}`; g.fillText('N E W   P R', W / 2, 560);
  g.fillStyle = '#fff'; g.font = `800 76px ${F}`; g.fillText(fitText(g, L.name, W - 140), W / 2, 660);
  g.fillStyle = gr; g.font = `900 150px ${F}`; g.fillText(fitText(g, repsTxt(s, L.name), W - 120), W / 2, 830);
  g.fillStyle = '#d6d6de'; g.font = `500 40px ${F}`; g.fillText(fitText(g, prDesc(s), W - 160), W / 2, 910);
  if (!s.bwf) { g.fillStyle = '#9a9aa6'; g.font = `500 36px ${F}`; g.fillText(`Estimated 1-rep max ${fw(s.e1, 0)} ${U.wu}`, W / 2, 970); }
  g.fillStyle = '#9a9aa6'; g.font = `500 34px ${F}`; g.fillText(fmtDay(s.date), W / 2, 1030);
  g.font = `800 52px ${F}`; const wl = g.measureText('lift').width, wp = g.measureText('print').width, x0 = W / 2 - (wl + wp) / 2;
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('lift', x0, H - 90); g.fillStyle = gr; g.fillText('print', x0 + wl, H - 90);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

/* ======================= PR predictions ======================= */
/* Straight-line fit of your best estimated 1RM per session over the last 10 weeks, then: how long until the next round
   number at that pace. Needs 3+ sessions over 2+ weeks, and it says so when you're holding steady. */
const MILES_LB = [95, 135, 155, 185, 205, 225, 245, 275, 295, 315, 335, 365, 385, 405, 455, 495, 545, 585, 635, 675, 725];
const MILES_KG = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 220, 240, 260, 280, 300];
function liftForecast(L) {
  if (!L || L.bwf || !L.e1) return null;
  return Store.cached('fc:' + L.key, () => {
    const since = addDays(todayStr(), -70), by = new Map();
    for (const s of L.sets) if (s.hit && !s.warm && s.date >= since && s.r <= 12 && s.w > 0) by.set(s.date, Math.max(by.get(s.date) || 0, s.e1));
    const pts = [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, e]) => [daysBetween(since, d), e]);
    if (pts.length < 3 || pts[pts.length - 1][0] - pts[0][0] < 14) return { need: true, n: pts.length };
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    const b = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / (pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) || 1), perWk = b * 7;
    const span = Math.round((pts[n - 1][0] - pts[0][0]) / 7);
    if (perWk < 0.3) return { flat: true, perWk, span };
    const cur = U.w(L.e1), db = dbKind(L.name), st = U.metric ? (cur < 30 ? 2.5 : 5) : (cur < 60 ? 5 : 10);
    const target = db ? Math.floor(cur / st + 1) * st : ((U.metric ? MILES_KG : MILES_LB).find(m => m > cur + 0.5) ?? Math.ceil((cur + 1) / 25) * 25);   // dumbbells: the next dumbbell up
    const weeks = (U.toLb(target) - L.e1) / perWk; if (weeks > 52) return { far: true, perWk, span, target };
    return { perWk, span, target, weeks, date: addDays(todayStr(), Math.round(weeks * 7)) };
  });
}
const weeksTxt = w => w < 1.5 ? 'about a week' : w < 8.5 ? `about ${Math.round(w)} weeks` : `about ${Math.round(w / 4.35)} months`;
function forecasts() {
  return Store.cached('forecasts', () => liftList().map(L => ({ L, f: liftForecast(L) })).filter(x => x.f && x.f.weeks != null).sort((a, b) => a.f.weeks - b.f.weeks));
}
function forecastRowHTML({ L, f }) {
  return `<button class="row fc-r" data-act="openLift" data-key="${esc(L.key)}"><div class="grow"><b>${esc(L.name)}</b><div class="faint small">${fw(L.e1, 0)} → <b>${f.target} ${wuEx(L.name)}</b> est. 1RM</div></div><div class="rnum"><b>${weeksTxt(f.weeks).replace('about ', '~')}</b><div class="faint tiny">+${trim(U.w(f.perWk), 1)} ${U.wu}/wk</div></div></button>`;
}
function forecastCardHTML(L) {
  const f = liftForecast(L); if (!f) return '';
  let body;
  if (f.need) body = `Log this lift in ${3 - Math.min(2, f.n)} more session${3 - Math.min(2, f.n) === 1 ? '' : 's'} over at least 2 weeks and you'll get a prediction here.`;
  else if (f.flat) body = `Holding steady over the last ${f.span} weeks, so there's no trend to project yet. Add a little weight or a rep and it'll show up.`;
  else if (f.far) body = `You're climbing about ${trim(U.w(f.perWk), 1)} ${U.wu} a week. At that pace ${f.target} ${U.wu} is more than a year out.`;
  else body = `At your current pace (+${trim(U.w(f.perWk), 1)} ${U.wu} a week over the last ${f.span} weeks), your estimated 1RM reaches <b>${f.target} ${wuEx(L.name)}</b> in ${weeksTxt(f.weeks)}, around ${fmtDate(f.date)}.`;
  return `<section class="card fc-card"><div class="card-h"><h2 class="sec-t" style="margin:0">🔮 Prediction</h2></div><p class="small" style="margin:6px 0 0">${body}</p><p class="faint tiny" style="margin:6px 0 0">Based on your best set each session. Progress usually slows as you get stronger, so treat it as a target, not a promise.</p></section>`;
}
{
  const ld = liftDetailHTML;
  liftDetailHTML = function (L) { const h = ld(L), mark = '<section class="card"><h2 class="sec-t">Estimated 1RM over time'; const i = h.indexOf(mark); return i < 0 ? h : h.slice(0, i) + forecastCardHTML(L) + h.slice(i); };
}

/* ======================= lifts page: entry points ======================= */
{
  const ll = liftsListHTML;
  liftsListHTML = function () {
    const ev = prSetCount(), ym = curYM(), fc = forecasts().slice(0, 3), has = Store.list('workouts').some(w => w.date.startsWith(ym));
    let h = `<div class="pg-tiles"><button class="tile" data-act="trophies"><span class="k">🏆 Trophy wall</span><span class="v">${ev}<span class="unit">PRs</span></span><span class="faint small">${prSetCount(ym)} this month</span></button>
      <button class="tile" data-act="wrapOpen" data-m="${has ? ym : prevYM(ym)}"><span class="k">📅 Monthly wrap</span><span class="v" style="font-size:22px">${monthName(has ? ym : prevYM(ym))}</span><span class="faint small">${has ? 'so far' : 'tap to replay'}</span></button></div>`;
    if (fc.length) h += `<section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t" style="margin:0">🔮 Coming up</h2><span class="faint small">at your current pace</span></div>${fc.map(forecastRowHTML).join('')}</section>`;
    return h + ll();
  };
}

/* ======================= monthly wrap ======================= */
const VOL_THINGS = [['grand pianos', 'a grand piano', 1000], ['cars', 'a car', 4000], ['elephants', 'an elephant', 13000], ['school buses', 'a school bus', 25000], ['semi trucks', 'a loaded semi truck', 80000], ['blue whales', 'a blue whale', 300000]];
function volCompare(lb) {
  const t = [...VOL_THINGS].reverse().find(x => lb >= x[2]) || VOL_THINGS[0], n = lb / t[2];
  return n < 1.15 ? `about the weight of ${t[1]}` : `like lifting ${n < 10 ? trim(n, 1) : Math.round(n)} ${t[0]}`;
}
function monthStats(ym) {
  const inM = d => d && d.startsWith(ym), act = activeWorkout(), t = todayStr();
  const wos = Store.list('workouts').filter(w => inM(w.date) && (!act || w.id !== act.id)), acts = Store.list('acts').filter(a => inM(a.date));
  const days = new Set([...wos.map(w => w.date), ...acts.map(a => a.date)]);
  let vol = 0, sets = 0; const grp = {}, names = {};
  for (const w of wos) {
    if (w.dayName) names[w.dayName] = (names[w.dayName] || 0) + 1;
    for (const s of w.sets || []) {
      if (s.warm || s.hit === false) continue; sets++; vol += (+s.w || 0) * (+s.r || 0);
      const m = musclesFor(s.ex); if (m) for (const [g, ids] of Object.entries(GROUP_IDS)) if (ids.some(id => m.p.has(id))) grp[g] = (grp[g] || 0) + 1;
    }
  }
  const prs = prEvents().filter(e => inM(e.s.date)), prN = prSetCount(ym);
  const ws = weighins().filter(w => inM(w.date)), w0 = ws[0], w1 = ws[ws.length - 1];
  const wk = {}; for (const d of days) { const mon = addDays(d, -((parseDate(d).getDay() + 6) % 7)); wk[mon] = (wk[mon] || 0) + 1; }
  const bestWk = Object.entries(wk).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const fdays = Store.list('food').filter(f => inM(f.date) && f.date <= t).map(f => [f.date, foodTotals(f.date)]).filter(([, x]) => x.cal >= 900);
  const pt = S().proteinTarget, avgCal = fdays.length ? fdays.reduce((a, [, x]) => a + x.cal, 0) / fdays.length : null, pHit = fdays.filter(([, x]) => pt && x.p >= pt).length;
  const sleeps = Store.list('daily').filter(x => inM(x.date) && x.sleep != null).map(x => x.sleep), avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  const topG = Object.entries(grp).sort((a, b) => b[1] - a[1]).slice(0, 4), fav = Object.entries(names).sort((a, b) => b[1] - a[1])[0];
  return { ym, wos, acts, days: days.size, vol, sets, prs, prN, w0, w1, bestWk, fdays: fdays.length, avgCal, pHit, avgSleep, topG, fav, sofar: ym === curYM() };
}
function wrapSlides(m) {
  const mn = monthName(m.ym), sl = [];
  sl.push(`<div class="ws-c"><div class="ws-mark">${typeof LP_MARK === 'string' ? LP_MARK.replace('data-act="logoTap" ', '') : ''}</div><p class="ws-k">${m.sofar ? 'So far this month' : 'Your month in lifting'}</p><h1 class="ws-big gtxt">${mn}</h1><p class="ws-sub">Tap to see how it went.</p></div>`);
  if (m.days) sl.push(`<div class="ws-c"><p class="ws-k">You showed up</p><h1 class="ws-big"><span data-count="${m.days}">${m.days}</span> <small>days</small></h1><p class="ws-sub">${plural(m.wos.length, 'workout')}${m.acts.length ? ` and ${m.acts.length} ${m.acts.length === 1 ? 'activity' : 'activities'}` : ''}${m.bestWk && m.bestWk[1] > 1 ? `. Best week: ${fmtDate(m.bestWk[0])} with ${m.bestWk[1]} days.` : '.'}</p>${m.fav ? `<p class="ws-note">Most done: ${esc(m.fav[0])} (${m.fav[1]}×)</p>` : ''}</div>`);
  if (m.vol > 0) sl.push(`<div class="ws-c"><p class="ws-k">Total weight moved</p><h1 class="ws-big gtxt"><span data-count="${Math.round(U.w(m.vol))}">${fmtN(U.w(m.vol))}</span> <small>${U.wu}</small></h1><p class="ws-sub">That's ${volCompare(m.vol)}.</p><p class="ws-note">${fmtN(m.sets)} working sets</p></div>`);
  if (m.prN) sl.push(`<div class="ws-c"><p class="ws-k">New personal records</p><h1 class="ws-big gtxt"><span data-count="${m.prN}">${m.prN}</span> <small>PR${m.prN === 1 ? '' : 's'}</small></h1><div class="ws-list">${[...new Map(m.prs.slice().sort((a, b) => b.s.e1 - a.s.e1).map(e => [e.L.key, e])).values()].slice(0, 3).map(e => `<div><b>${esc(e.L.name)}</b><span>${esc(repsTxt(e.s, e.L.name))}</span></div>`).join('')}</div></div>`);
  if (m.topG.length) { const mx = m.topG[0][1]; sl.push(`<div class="ws-c"><p class="ws-k">What you trained most</p><div class="ws-bars">${m.topG.map(([g, n]) => `<div><span>${g}</span><i style="--w:${n / mx * 100}%"></i><b>${n}</b></div>`).join('')}</div><p class="ws-note">working sets per muscle group</p></div>`); }
  if (m.w0 && m.w1 && m.w0 !== m.w1) { const dw = m.w1.weight - m.w0.weight, goal = S().goal; sl.push(`<div class="ws-c"><p class="ws-k">Bodyweight</p><h1 class="ws-big ws-mid">${fw(m.w0.weight)} → ${fw(m.w1.weight)} <small>${U.wu}</small></h1><p class="ws-sub">${dw >= 0 ? '+' : '−'}${trim(Math.abs(U.w(dw)), 1)} ${U.wu} this month${goal === 'bulk' && dw > 0 ? '. Lean bulk on track 💪' : goal === 'cut' && dw < 0 ? '. Cut on track 🔥' : ''}.</p></div>`); }
  if (m.fdays) sl.push(`<div class="ws-c"><p class="ws-k">Fuel</p><h1 class="ws-big"><span data-count="${Math.round(m.avgCal)}">${fmtN(m.avgCal)}</span> <small>kcal a day</small></h1><p class="ws-sub">Protein goal hit on ${m.pHit} of ${m.fdays} logged days.</p>${m.avgSleep ? `<p class="ws-note">Average sleep ${fmtSleep(Math.round(m.avgSleep * 4) / 4)}</p>` : ''}</div>`);
  sl.push(`<div class="ws-c"><p class="ws-k">${m.sofar ? 'Keep it going' : `That was ${mn}`}</p><h1 class="ws-big gtxt">${m.sofar ? 'More to come' : `On to ${MONTHS[(+m.ym.slice(5, 7)) % 12]}`}</h1><div class="btnrow" style="justify-content:center;margin-top:18px"><button class="btn" data-act="wrapShare" data-m="${m.ym}">Share my month</button></div></div>`);
  return sl;
}
const Wrap = { i: 0, n: 0, t: null, paused: false, ym: '' };
A.wrapOpen = d => {
  const ym = d.m || curYM(), m = monthStats(ym), sl = wrapSlides(m);
  closeAllSheets(); $('#wrap')?.remove();
  try { localStorage.setItem('lp.wrapSeen', ym); } catch (e) {}
  const el = document.createElement('div'); el.id = 'wrap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${monthName(ym)} wrap`);
  el.innerHTML = `<div class="wr-bars">${sl.map(() => '<i><b></b></i>').join('')}</div><button class="wr-x" data-act="wrapClose" aria-label="Close">${ICON.x}</button>${sl.map((h, i) => `<section class="wr-s" data-i="${i}" style="--hue:${[285, 330, 18, 265, 205, 170, 300, 240][i % 8]}">${h}</section>`).join('')}`;
  document.body.appendChild(el); Object.assign(Wrap, { i: -1, n: sl.length, ym });
  let down = 0;
  el.addEventListener('pointerdown', () => { down = Date.now(); Wrap.paused = true; el.classList.add('held'); });
  el.addEventListener('pointerup', e => { Wrap.paused = false; el.classList.remove('held'); if (Date.now() - down > 350 || e.target.closest('button')) return; wrapGo(Wrap.i + (e.clientX < innerWidth * 0.3 ? -1 : 1)); });
  el.addEventListener('pointercancel', () => { Wrap.paused = false; el.classList.remove('held'); });
  requestAnimationFrame(() => { el.classList.add('open'); wrapGo(0); });
};
function wrapGo(i) {
  const el = $('#wrap'); if (!el) return;
  if (i >= Wrap.n) return A.wrapClose(); i = Math.max(0, i);
  Wrap.i = i; clearInterval(Wrap.t);
  $$('.wr-s', el).forEach((s, k) => s.classList.toggle('on', k === i));
  $$('.wr-bars i', el).forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.toggle('cur', k === i); });
  const s = $$('.wr-s', el)[i]; countUps(s);
  let t = 0; const dur = i === Wrap.n - 1 ? 0 : 5600, bar = $$('.wr-bars i b', el)[i]; if (bar) bar.style.width = '0%';
  if (dur) Wrap.t = setInterval(() => { if (Wrap.paused || document.hidden) return; t += 50; if (bar) bar.style.width = Math.min(100, t / dur * 100) + '%'; if (t >= dur) wrapGo(i + 1); }, 50);
  else if (bar) bar.style.width = '100%';
  if (i === Wrap.n - 1 && !REDUCED()) confetti({ n: 70, power: 11 });
}
A.wrapClose = () => { clearInterval(Wrap.t); const el = $('#wrap'); if (!el) return; el.classList.remove('open'); setTimeout(() => el.remove(), 300); };
A.wrapShare = async d => {
  const m = monthStats(d.m), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const bg = g.createRadialGradient(W / 2, 260, 40, W / 2, 500, 1100); bg.addColorStop(0, '#2a1834'); bg.addColorStop(.55, '#0e0b12'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gr = g.createLinearGradient(100, 0, W - 100, 0); gr.addColorStop(0, '#ffb238'); gr.addColorStop(.5, '#ff4f6d'); gr.addColorStop(1, '#b13dff');
  drawMark(g, W / 2, 200, 200); g.textAlign = 'center';
  g.fillStyle = '#9a9aa6'; g.font = `600 40px ${F}`; g.fillText(m.sofar ? 'MY MONTH SO FAR' : 'MY MONTH IN LIFTING', W / 2, 390);
  g.fillStyle = gr; g.font = `900 120px ${F}`; g.fillText(`${monthName(m.ym)}`, W / 2, 510);
  const tiles = [['Days trained', String(m.days)], ['Weight moved', `${fmtN(U.w(m.vol))} ${U.wu}`], ['PRs', String(m.prN)], [m.avgCal ? 'Avg calories' : 'Working sets', m.avgCal ? fmtN(m.avgCal) : fmtN(m.sets)]];
  tiles.forEach(([k, v], i) => { const x = 70 + (i % 2) * 480, y = 580 + Math.floor(i / 2) * 230; g.fillStyle = 'rgba(255,255,255,.06)'; roundRect(g, x, y, 460, 205, 30); g.fill(); g.textAlign = 'left'; g.fillStyle = '#9a9aa6'; g.font = `600 32px ${F}`; g.fillText(k, x + 36, y + 64); g.fillStyle = '#fff'; g.font = `800 66px ${F}`; g.fillText(fitText(g, v, 400), x + 36, y + 150); });
  g.textAlign = 'center'; if (m.prs.length) { g.fillStyle = '#d6d6de'; g.font = `500 36px ${F}`; const top = m.prs.slice().sort((a, b) => b.s.e1 - a.s.e1)[0]; g.fillText(fitText(g, `Top PR: ${top.L.name} ${repsTxt(top.s, top.L.name)}`, W - 140), W / 2, 1110); }
  g.font = `800 52px ${F}`; const wl = g.measureText('lift').width, wp = g.measureText('print').width, x0 = W / 2 - (wl + wp) / 2;
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('lift', x0, H - 90); g.fillStyle = gr; g.fillText('print', x0 + wl, H - 90);
  const blob = await new Promise(res => c.toBlob(res, 'image/png')), file = new File([blob], `liftprint-${m.ym}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `${monthName(m.ym)} in lifting` }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadBlob(blob, file.name); toast('Image saved');
};
/* early in a month, last month's wrap shows up as a small pill on Today until you've watched it */
function wrapPillHTML() {
  const t = todayStr(), ym = prevYM(curYM()); if (+t.slice(8, 10) > 7) return '';
  let seen = ''; try { seen = localStorage.getItem('lp.wrapSeen') || ''; } catch (e) {}
  if (seen >= ym || !Store.list('workouts').some(w => w.date.startsWith(ym))) return '';
  return `<button class="rc rc-wrap" data-act="wrapOpen" data-m="${ym}">🎁 Your ${monthName(ym)} wrap</button>`;
}
PAGES.push(['🏆', 'Trophy wall', 'trophy trophies prs personal records wall', () => A.trophies()], ['📅', 'Monthly wrap', 'monthly wrap recap month story review', () => A.wrapOpen({})], ['🔮', 'PR predictions', 'prediction forecast when will i hit 225 coming up', () => { UI.tab = 'lifts'; UI.liftKey = null; render(); }]);

