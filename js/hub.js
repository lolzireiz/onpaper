'use strict';
/* v5: recovery + readiness, smart next workout, plate/warm-up calculator, workout summary,
   dunk program, mobility routines, habits, saved meals, macro trends, search, themes. */

const dailyOf = (d = todayStr()) => Store.docs.daily?.[d] || { date: d };
const putDaily = (d, patch) => put('daily', d, { ...clone(dailyOf(d)), date: d, ...patch });

/* ======================= themes ======================= */
const ACCENTS = [['#3392f5', 'Blue'], ['#3ccf82', 'Green'], ['#ff7a45', 'Orange'], ['#a970ff', 'Purple'], ['#ff4f8b', 'Pink'], ['#f5b915', 'Gold']];
function applyTheme() {
  const s = S(), r = document.documentElement, th = s.theme || 'dark';
  if (r.dataset.theme !== th) r.dataset.theme = th;
  r.style.setProperty('--accent', s.accent || '#3392f5');
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th === 'light' ? '#f2f2f7' : '#000000';
}
{ const base = render; render = function () { applyTheme(); base(); }; }
A.setTheme = d => { saveSettings({ theme: d.v }); };
A.setAccent = d => { saveSettings({ accent: d.v }); };
function appearanceHTML() {
  const s = S(), th = s.theme || 'dark', ac = s.accent || '#3392f5';
  return `<div class="field"><span class="lbl">Theme</span><div class="seg">${[['dark', 'Dark'], ['oled', 'True black'], ['light', 'Light']].map(([k, l]) => `<button data-act="setTheme" data-v="${k}" aria-pressed="${th === k}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Accent colour</span><div class="swatches">${ACCENTS.map(([c, n]) => `<button class="swatch" data-act="setAccent" data-v="${c}" style="--c:${c}" aria-label="${n}" aria-pressed="${ac === c}"></button>`).join('')}</div></div>`;
}

/* ======================= recovery & readiness ======================= */
const GROUP_IDS = { Chest: ['chest'], Back: ['lats', 'upper_back'], Shoulders: ['delts', 'side_delts', 'rear_delts'], Biceps: ['biceps'], Triceps: ['triceps'], Quads: ['quads'], Hamstrings: ['hamstrings'], Glutes: ['glutes'], Calves: ['calves'], Core: ['abs', 'obliques'] };
/* Fatigue per muscle: each hard set adds 1 (main mover) or 0.5 (helper) and fades with a ~30 hour half-life-ish curve. */
function muscleRecovery() {
  return Store.cached('mrec', () => {
    const now = Date.now(), fat = {};
    for (const w of Store.list('workouts')) {
      const t = w.endTs || w.startTs || parseDate(w.date).getTime() + 18 * 36e5, hrs = (now - t) / 36e5; if (hrs > 120 || hrs < -1) continue;
      const k = Math.exp(-Math.max(0, hrs) / 30);
      for (const s of w.sets || []) { if (s.warm || s.hit === false) continue; const m = musclesFor(s.ex); if (!m) continue; for (const id of m.p) fat[id] = (fat[id] || 0) + k; for (const id of m.s) if (!m.p.has(id)) fat[id] = (fat[id] || 0) + 0.5 * k; }
      if (w.marked) for (const g of w.groups || []) for (const id of GROUP_IDS[g] || []) fat[id] = (fat[id] || 0) + MARK_SETS * k;
    }
    const out = {}; for (const id of Object.keys(MUSCLE_NAMES)) out[id] = Math.round(clamp(100 - (fat[id] || 0) * 11, 0, 100));
    return out;
  });
}
const groupRecovery = g => { const r = muscleRecovery(), ids = GROUP_IDS[g] || []; return ids.length ? Math.round(ids.reduce((a, i) => a + r[i], 0) / ids.length) : 100; };
const MARK_SETS = 8;   // a day marked as trained (no details) counts as about this many hard sets per muscle group
function trainingLoad(days) { // hard sets (+ sport minutes / 10) in the last `days` days
  const since = addDays(todayStr(), -(days - 1)); let n = 0;
  for (const w of Store.list('workouts')) if (w.date >= since) { for (const s of w.sets || []) if (!s.warm && s.hit !== false) n++; if (w.marked) n += (w.groups || []).length ? w.groups.length * MARK_SETS : 15; }
  for (const a of Store.list('acts')) if (a.date >= since) n += (a.duration || 1800) / 600;
  return n;
}
function readiness(date = todayStr()) {
  return Store.cached('ready:' + date, () => {
    const d = dailyOf(date), has = d.sleep != null || d.sore != null || d.energy != null;
    const acute = trainingLoad(3) / 3, chronic = trainingLoad(28) / 28, ratio = chronic > 0.5 ? acute / chronic : 1;
    const load = ratio <= 1.1 ? 30 : Math.max(0, 30 - (ratio - 1.1) * 40);
    const sleep = d.sleep != null ? Math.min(1, d.sleep / 8) * 35 : 26;
    const sore = d.sore != null ? (5 - d.sore) / 4 * 20 : 14;
    const energy = d.energy != null ? (d.energy - 1) / 4 * 15 : 10;
    const score = Math.round(load + sleep + sore + energy);
    const [lbl, tip, col] = score >= 80 ? ['Ready to push', 'Good day to go for PRs.', 'var(--ok)'] : score >= 62 ? ['Train normally', 'Solid day. Stick to the plan.', 'var(--accent)'] : score >= 45 ? ['Go a bit lighter', 'Do the workout but drop a set per exercise, or keep 2–3 reps in the tank.', '#f5b915'] : ['Recover today', 'Mobility, a walk, or a light session will pay off more than grinding.', 'var(--miss)'];
    return { score, lbl, tip, col, has, d, ratio, parts: { load, sleep, sore, energy } };
  });
}
const ring = (pct, col, size = 56, w = 6, inner = '') => { const r = (size - w) / 2, c = 2 * Math.PI * r; return `<span class="pring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--s3)" stroke-width="${w}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(pct, 0, 100) / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><b>${inner}</b></span>`; };
function readinessRowHTML() {
  const r = readiness();
  if (!r.has) return `<button class="ready-row" data-act="readyOpen">${ring(r.score, 'var(--tx3)', 52, 6, '?')}<span class="grow"><span class="eyebrow">Readiness</span><b>How do you feel today?</b><span class="faint small">3 quick taps: sleep, soreness, energy</span></span><span class="btn sm">Check in</span></button>`;
  return `<button class="ready-row" data-act="readyOpen">${ring(r.score, r.col, 52, 6, r.score)}<span class="grow"><span class="eyebrow">Readiness</span><b>${r.lbl}</b><span class="faint small">${esc(r.tip)}</span></span>${ICON.chevR.replace('<svg', '<svg width="16" height="16" style="opacity:.4"')}</button>`;
}
A.readyOpen = () => {
  const r = readiness(), d = r.d, mr = muscleRecovery();
  const grp = Object.keys(GROUP_IDS).map(g => [g, groupRecovery(g)]).sort((a, b) => a[1] - b[1]);
  const chips = (k, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button data-act="pick" data-group="${k}" data-value="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  openSheet('Readiness', `<div class="ready-hero">${ring(r.score, r.col, 110, 10, r.score)}<div><b style="font-size:20px">${r.lbl}</b><p class="muted small" style="margin:4px 0 0">${esc(r.tip)}</p></div></div>
    <div class="field"><span class="lbl">Sleep last night</span>${chips('rsleep', [[5, '≤5h'], [6, '6h'], [7, '7h'], [8, '8h'], [9, '9h+']], d.sleep)}</div>
    <div class="field"><span class="lbl">How sore are you?</span>${chips('rsore', [[1, 'Not'], [2, 'A bit'], [3, 'Sore'], [4, 'Very'], [5, 'Wrecked']], d.sore)}</div>
    <div class="field"><span class="lbl">Energy</span>${chips('renergy', [[1, '😴'], [2, '😕'], [3, '😐'], [4, '🙂'], [5, '⚡']], d.energy)}</div>
    <button class="btn block" data-act="readySave">Save check-in</button>
    <div class="field"><span class="lbl">Muscle recovery</span><div class="recov">${grp.map(([g, v]) => `<div class="recov-r"><span>${g}</span><span class="bar"><i style="width:${v}%;background:${v >= 85 ? 'var(--ok)' : v >= 60 ? '#f5b915' : 'var(--miss)'}"></i></span><b>${v}%</b></div>`).join('')}</div></div>
    <p class="faint tiny">The score mixes your check-in (sleep, soreness, energy) with your training load over the last 3 days compared to your usual. Muscle recovery fades over about 2–3 days after hard sets.</p>`);
};
A.readySave = () => {
  const root = $('#sheet'), sl = picked(root, 'rsleep'), so = picked(root, 'rsore'), en = picked(root, 'renergy');
  if (sl == null && so == null && en == null) { toast('Tap at least one answer'); return; }
  const patch = {}; if (sl != null) patch.sleep = +sl; if (so != null) patch.sore = +so; if (en != null) patch.energy = +en;
  putDaily(todayStr(), patch); closeSheet(); setTimeout(() => toast(`Readiness ${readiness().score}: ${readiness().lbl}`), 50);
};

/* ======================= smart next workout ======================= */
function smartPlan() {
  return Store.cached('smart', () => {
    const r = readiness(), gym = activeGym(), days = splitDays(), wk = muscleSets();
    const lighter = r.score < 62, rest = r.score < 45;
    let name, reason, ex = [], dayId = null;
    if (days.length) {
      const nd = nextDay();
      const scored = days.map(d => { const gs = (d.groups || []).length ? d.groups : [...new Set((d.exercises || []).map(n => library().get(keyOf(n))?.group).filter(Boolean))]; const rec = gs.length ? gs.reduce((a, g) => a + groupRecovery(g), 0) / gs.length : 100; return { d, rec, sc: rec + (d.id === nd?.id ? 12 : 0) }; }).sort((a, b) => b.sc - a.sc);
      const best = scored[0]; dayId = best.d.id; name = best.d.name;
      reason = best.d.id === nd?.id ? `Next in your split · muscles ${Math.round(best.rec)}% recovered` : `${nd ? nd.name + ' muscles are still recovering, so ' : ''}${best.d.name} is fresher (${Math.round(best.rec)}% recovered)`;
      ex = planFor(best.d, gym).filter(p => p.use).map(p => p.use);
    } else {
      const mg = myGoals();
      const gs = Object.keys(GROUP_IDS).map(g => { const ids = GROUP_IDS[g], done = ids.reduce((a, i) => a + (wk[i] || 0), 0) / ids.length; return { g, rec: groupRecovery(g), need: 1 - Math.min(1, done / 10) }; })
        .filter(x => x.rec >= 70).sort((a, b) => b.rec * b.need - a.rec * a.need).slice(0, 3).map(x => x.g);
      const pool = [...library().values()].filter(e => available(e.name, gym) && !painOf(e.name));
      for (const g of gs) { const opts = pool.filter(e => e.group === g); const ranked = mg.length ? [...bestForGoals(mg, 2, opts, 2), ...opts] : opts; const seen = new Set(); for (const e of ranked) { if (seen.size >= 2) break; if (!seen.has(e.name)) { seen.add(e.name); ex.push(e.name); } } }
      const up = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'], lo = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];
      name = !gs.length ? 'Full body' : gs.every(g => up.includes(g)) ? (gs.length === 1 ? gs[0] : gs.length === 2 ? gs.join(' & ') : 'Upper body') : gs.every(g => lo.includes(g) || g === 'Core') ? (gs.length === 1 ? gs[0] : 'Lower body') : 'Full body';
      reason = `${gs.join(', ')}: your freshest muscles that need more work this week`;
    }
    ex = ex.map(n => painOf(n) ? (alternatives(n, gym, ex).find(e => !painOf(e.name))?.name || null) : n).filter(Boolean);
    const targets = {}; for (const n of ex) { const t = tgtFor(n); targets[keyOf(n)] = { sets: lighter ? Math.max(2, t.sets - 1) : t.sets, reps: t.reps }; }
    return { name, reason, ex, targets, dayId, lighter, rest, r };
  });
}
function smartCardHTML() {
  const p = smartPlan(), r = p.r;
  if (!p.ex.length) return '';
  return `<section class="card smart"><div class="card-h"><div><div class="eyebrow">✨ Smart pick for today</div><h2 class="lift-h" style="font-size:28px;margin:2px 0 0">${esc(p.name)}</h2></div>${ring(r.score, r.col, 44, 5, r.score)}</div>
    <p class="muted small" style="margin:0">${esc(p.reason)}${p.lighter ? ' · lighter volume today (readiness ' + r.score + ')' : ''}</p>
    ${p.rest ? `<div class="alert"><span class="ai">🧘</span><p>Readiness is low. A mobility routine might be the better call today.</p><button class="btn sm ghost" data-act="mobOpen" data-id="post">Mobility</button></div>` : ''}
    <div class="smart-ex">${p.ex.map(n => { const t = p.targets[keyOf(n)]; return `<div class="row"><span class="grow">${esc(n)}${goalDot(n)}</span><span class="faint small rnum">${t.sets}×${esc(t.reps)}</span>${musBtn(n)}</div>`; }).join('')}</div>
    <button class="btn block" data-act="smartStart">Start ${esc(p.name)}</button></section>`;
}
A.smartStart = () => {
  const p = smartPlan(), gym = activeGym(), id = newId();
  put('workouts', id, { date: todayStr(), startTs: Date.now(), gymId: gym?.id || null, gymName: gym?.name || '', dayId: p.dayId, dayName: p.name, plan: p.ex, targets: p.targets, sets: [], smart: true });
  UI.session = true; UI.tab = 'train'; $('#view').scrollTop = 0; audioCtx(); wakeLock(); render();
};

/* ======================= plate + warm-up calculator ======================= */
const plateable = name => { const e = library().get(keyOf(name)); return !!e && (e.equip.includes('barbell') || e.equip.includes('smith')) && !bwFactor(name); };
const PLATES = { lb: [45, 35, 25, 10, 5, 2.5], kg: [25, 20, 15, 10, 5, 2.5, 1.25] };
function platesFor(total, bar, unit) {
  let side = (total - bar) / 2; const out = [];
  if (side < 0) return null;
  for (const p of PLATES[unit]) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return { plates: out, left: Math.round(side * 2 * 100) / 100 };
}
function barFor(name) {
  const e = library().get(keyOf(name)), smith = e && e.equip.includes('smith'), s = S(), m = U.metric;
  const saved = smith ? s.smithBar : s.barWeight; return saved != null ? saved : (smith ? (m ? 7 : 15) : (m ? 20 : 45));
}
function warmups(work, bar, unit) {
  const inc = unit === 'kg' ? 2.5 : 5, rd = x => Math.max(bar, Math.floor(x / inc) * inc), out = [];
  if (work - bar < (unit === 'kg' ? 15 : 30)) return bar > 0 && work > bar ? [[bar, 10]] : [];
  if (bar > 0) out.push([bar, 10]);
  for (const [pct, r] of [[0.4, 8], [0.6, 5], [0.75, 3], [0.85, 1]]) { const v = rd(work * pct); if (v > (out[out.length - 1]?.[0] ?? 0) && v < work) out.push([v, r]); }
  return out;
}
const plateColor = p => ({ 45: '#3392f5', 25: '#3ccf82', 35: '#f5b915', 10: '#e8e8ee', 5: '#ff7a45', 2.5: '#a970ff', 20: '#3392f5', 15: '#f5b915', 1.25: '#a970ff' })[p] || '#888';
function plateBarSVG(plates) {
  let x = 150, s = ''; const H = p => 26 + Math.min(p, 45) * 1.6;
  for (const p of plates) { const w = p >= 25 ? 14 : p >= 10 ? 10 : 7, h = H(p); s += `<rect x="${x}" y="${50 - h / 2}" width="${w}" height="${h}" rx="3" fill="${plateColor(p)}"/>`; x += w + 2; }
  return `<svg viewBox="0 0 320 100" width="100%" style="max-width:360px;display:block;margin:0 auto"><rect x="0" y="46" width="320" height="8" rx="4" fill="#8a8a93"/><rect x="138" y="36" width="10" height="28" rx="2" fill="#b0b0b8"/>${s}</svg>`;
}
A.plates = d => {
  const name = d.ex, k = slug(name), unit = U.metric ? 'kg' : 'lb', cur = num($('#sw-' + k)?.value) || 0;
  Sheet.plEx = name; Sheet.plW = cur || (U.metric ? 60 : 135); Sheet.plBar = barFor(name); drawPlates();
};
function drawPlates() {
  const name = Sheet.plEx, unit = U.metric ? 'kg' : 'lb', w = Sheet.plW, bar = Sheet.plBar, e = library().get(keyOf(name)), smith = e && e.equip.includes('smith');
  const pf = platesFor(w, bar, unit), wu = warmups(w, bar, unit), bars = unit === 'kg' ? [20, 15, 10, 7, 0] : [45, 35, 25, 15, 0];
  const body = `<div class="pl-w"><button class="btn ghost pl-step" data-act="plStep" data-d="-${unit === 'kg' ? 2.5 : 5}" aria-label="Less">−</button><b>${trim(w, 2)}<span class="unit">${unit}</span></b><button class="btn ghost pl-step" data-act="plStep" data-d="${unit === 'kg' ? 2.5 : 5}" aria-label="More">+</button></div>
    ${pf ? plateBarSVG(pf.plates) : ''}
    <p class="center" style="margin:0;font-size:17px">${!pf ? 'Less than the bar' : pf.plates.length ? `<b>Each side:</b> ${pf.plates.map(p => trim(p, 2)).join(' + ')}` : 'Just the bar'}</p>
    ${pf && pf.left ? `<p class="faint small center" style="margin:0">${trim(pf.left, 2)} ${unit} can't be made with standard plates.</p>` : ''}
    <div class="field"><span class="lbl">${smith ? 'Smith bar weight' : 'Bar weight'}</span><div class="seg">${bars.map(b => `<button data-act="plBar" data-v="${b}" aria-pressed="${b === bar}">${b || 'None'}</button>`).join('')}</div>${smith ? `<p class="faint tiny">Smith bars are counterbalanced and usually feel like ${unit === 'kg' ? '7–12 kg' : '15–25 lb'}. Check the sticker on yours.</p>` : ''}</div>
    ${wu.length ? `<div class="field"><span class="lbl">Warm-up sets before ${trim(w, 2)} ${unit}</span><div>${wu.map(([v, r], i) => { const p = platesFor(v, bar, unit); return `<div class="row" style="min-height:0;padding:8px 0"><span class="n wu-n">${i + 1}</span><b class="grow">${trim(v, 2)} × ${r}</b><span class="faint small">${p && p.plates.length ? p.plates.map(x => trim(x, 2)).join('+') + ' / side' : 'bar'}</span></div>`; }).join('')}</div>
      ${activeWorkout() ? `<button class="btn block" data-act="plAddWarm">Add these warm-ups to the workout</button>` : ''}</div>` : ''}
    ${activeWorkout() ? `<button class="btn ghost block" data-act="plUse">Use ${trim(w, 2)} ${unit} for my next set</button>` : ''}`;
  if ($('#sheet').hidden) openSheet(`${name}: plates`, body); else { sheetTitle(`${name}: plates`); sheetBody(body); }
}
A.plStep = d => { Sheet.plW = Math.max(0, Sheet.plW + +d.d); drawPlates(); };
A.plBar = d => { Sheet.plBar = +d.v; const e = library().get(keyOf(Sheet.plEx)); saveSettings(e && e.equip.includes('smith') ? { smithBar: +d.v } : { barWeight: +d.v }); drawPlates(); };
A.plUse = () => { const k = slug(Sheet.plEx); closeSheet(); requestAnimationFrame(() => { const i = $('#sw-' + k); if (i) { i.value = plain(Sheet.plW); i.dispatchEvent(new Event('input', { bubbles: true })); } }); };
A.plAddWarm = () => {
  const w = activeWorkout(); if (!w) return; const unit = U.metric ? 'kg' : 'lb', wu = warmups(Sheet.plW, Sheet.plBar, unit);
  const sets = wu.map(([v, r], i) => ({ id: newId(), ex: Sheet.plEx, w: U.toLb(v), r, hit: true, warm: true, ts: Date.now() + i }));
  const others = (w.sets || []).filter(s => keyOf(s.ex) !== keyOf(Sheet.plEx)), mine = (w.sets || []).filter(s => keyOf(s.ex) === keyOf(Sheet.plEx));
  put('workouts', w.id, { ...clone(w), sets: [...others, ...sets, ...mine] }); closeSheet(); toast(`Added ${plural(sets.length, 'warm-up set')}`);
};

/* ======================= workout summary ======================= */
function workoutStats(w) {
  const idx = liftIndex(), sets = (w.sets || []).filter(s => !s.warm && s.hit !== false);
  let vol = 0; const heat = {}, prs = [];
  for (const s of sets) {
    const rec = setRec(idx.get(keyOf(s.ex)), s.id), load = rec ? rec.w : (s.w || 0); vol += load * s.r;
    if (rec?.pr) prs.push({ ex: s.ex, w: load, r: s.r, added: rec.bwf ? s.w : null });
    const m = musclesFor(s.ex); if (m) { for (const id of m.p) heat[id] = (heat[id] || 0) + 3; for (const id of m.s) if (!m.p.has(id)) heat[id] = (heat[id] || 0) + 1.5; }
  }
  const dur = w.endTs && w.startTs && !w.noTime ? Math.round((w.endTs - w.startTs) / 6e4) : null;
  const prev = Store.list('workouts').filter(x => x.id !== w.id && x.date <= w.date && (w.dayId ? x.dayId === w.dayId : x.dayName === w.dayName) && (x.sets || []).length).sort((a, b) => b.date.localeCompare(a.date) || (b.startTs || 0) - (a.startTs || 0))[0];
  let prevVol = null; if (prev) { prevVol = 0; for (const s of prev.sets) if (!s.warm && s.hit !== false) { const rec = setRec(idx.get(keyOf(s.ex)), s.id); prevVol += (rec ? rec.w : s.w || 0) * s.r; } }
  const exN = new Set(sets.map(s => keyOf(s.ex))).size;
  if (prev) { const mine = new Set(sets.map(s => keyOf(s.ex))), theirs = new Set(prev.sets.filter(s => !s.warm).map(s => keyOf(s.ex))), common = [...mine].filter(k => theirs.has(k)).length; if (common < Math.max(1, Math.ceil(Math.max(mine.size, theirs.size) / 2))) prevVol = null; }
  return { vol, heat, prs, dur, sets: sets.length, exN, prev, prevVol };
}
function showSummary(id) {
  const w0 = Store.docs.workouts[id]; if (!w0) return; const w = { ...w0, id }, st = workoutStats(w), wk = weekStats(), sex = S().bodyModel || 'male';
  const dv = st.prevVol ? (st.vol - st.prevVol) / st.prevVol * 100 : null;
  openSheet('Workout complete', `<div class="sum-hero"><div class="sum-emoji">${st.prs.length ? '🏆' : '🔥'}</div><h2 class="lift-h" style="font-size:32px;margin:0">${esc(w.dayName || 'Workout')}</h2><p class="muted small" style="margin:2px 0 0">${fmtDay(w.date)}${w.gymName ? ' · ' + esc(w.gymName) : ''}</p></div>
    <div class="sum-grid">
      <div><span class="k">Time</span><b>${st.dur > 0 ? `<span data-count="${st.dur}">${st.dur}</span><small>min</small>` : '—'}</b></div>
      <div><span class="k">Volume</span><b><span data-count="${Math.round(U.w(st.vol))}">${fmtN(U.w(st.vol))}</span><small>${U.wu}</small></b>${dv != null ? `<span class="${dv >= 0 ? 'up' : 'dn'}">${dv >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(dv))}% vs last time</span>` : ''}</div>
      <div><span class="k">Work sets</span><b><span data-count="${st.sets}">${st.sets}</span></b><span class="faint tiny">${plural(st.exN, 'exercise')}</span></div>
      <div><span class="k">PRs</span><b><span data-count="${st.prs.length}">${st.prs.length}</span></b></div>
    </div>
    ${st.prs.length ? `<div class="sum-prs">${st.prs.map(p => `<div class="row"><span class="pr">PR</span><b class="grow">${esc(p.ex)}</b><span class="rnum">${p.added != null ? (p.added ? '+' + fw(p.added) : 'BW') : fw(p.w)} × ${p.r}</span></div>`).join('')}</div>` : ''}
    <div class="field"><span class="lbl">Muscles worked</span><div class="heatfig"><div style="--fig-h:210px">${bodySVG('front', sex, { p: new Set(), s: new Set(), heat: st.heat })}</div><div style="--fig-h:210px">${bodySVG('back', sex, { p: new Set(), s: new Set(), heat: st.heat })}</div></div></div>
    ${typeof watchSectionHTML === 'function' ? watchSectionHTML(w0, id) : ''}
    <p class="center small" style="margin:0">📅 <b>${wk.cur} of ${wk.goal}</b> gym days this week${wk.streak > 1 ? ` · ${wk.streak}-week streak` : ''}</p>
    ${lastBackup() !== todayStr() ? `<div class="alert bk-row"><span class="ai" aria-hidden="true">💾</span><p>Keep this workout safe</p><button class="btn sm" data-act="backupNow">Back up</button></div>` : ''}
    <div class="fields"><button class="btn ghost" data-act="sumShare" data-id="${id}">Share</button><button class="btn ghost" data-act="showWorkout" data-id="${id}">Details</button></div>
    <button class="btn block" data-act="closeSheet">Done</button>`);
}
A.sumShare = async d => {
  const w0 = Store.docs.workouts[d.id]; if (!w0) return; const w = { ...w0, id: d.id }, st = workoutStats(w), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', ac = S().accent || '#3392f5';
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1d1d24'); bg.addColorStop(1, '#09090b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = ac; g.fillRect(80, 110, 10, 110);
  g.fillStyle = '#fff'; g.font = `800 78px ${F}`; g.fillText(fitText(g, w.dayName || 'Workout', 860), 116, 180);
  g.fillStyle = '#9a9aa6'; g.font = `500 38px ${F}`; g.fillText(fmtDay(w.date), 116, 228);
  const tiles = [["Time", st.dur > 0 ? st.dur + " min" : "—"], ['Volume', fmtN(U.w(st.vol)) + ' ' + U.wu], ['Work sets', String(st.sets)], ['PRs', String(st.prs.length)]];
  tiles.forEach(([k, v], i) => { const x = 64 + (i % 2) * 484, y = 300 + Math.floor(i / 2) * 210; g.fillStyle = '#17171c'; roundRect(g, x, y, 468, 190, 28); g.fill(); g.fillStyle = '#9a9aa6'; g.font = `600 32px ${F}`; g.fillText(k, x + 36, y + 62); g.fillStyle = '#fff'; g.font = `800 64px ${F}`; g.fillText(fitText(g, v, 400), x + 36, y + 146); });
  let y = 780; g.fillStyle = '#fff'; g.font = `700 42px ${F}`; g.fillText(st.prs.length ? 'New PRs' : 'Exercises', 80, y); y += 60;
  const lines = st.prs.length ? st.prs.slice(0, 6).map(p => [p.ex, `${p.added != null ? (p.added ? '+' + fw(p.added) : 'BW') : fw(p.w)} × ${p.r}`]) : [...new Set((w.sets || []).filter(s => !s.warm).map(s => s.ex))].slice(0, 6).map(n => [n, plural((w.sets || []).filter(s => s.ex === n && !s.warm).length, 'set')]);
  for (const [a, b] of lines) { g.font = `500 38px ${F}`; g.fillStyle = '#dcdce2'; g.fillText(fitText(g, a, 640), 80, y); g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `700 38px ${F}`; g.fillText(b, W - 80, y); g.textAlign = 'left'; y += 66; }
  g.fillStyle = '#5c5c66'; g.font = `600 32px ${F}`; g.textAlign = 'center'; g.fillText('liftprint', W / 2, H - 60);
  const blob = await new Promise(res => c.toBlob(res, 'image/png')), file = new File([blob], `liftprint-${w.date}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: w.dayName || 'Workout' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadBlob(blob, file.name); toast('Image saved');
};

/* ======================= dunk program ======================= */
/* 12 weeks, 2 jump sessions a week. Volume builds inside each 4-week block, week 4 of each block is lighter and ends with a vertical test. */
const DRILL = {
  pogo: ['Pogo hops', 'Stiff ankles, bounce fast off the balls of your feet.'], box: ['Box jumps', 'Jump up, land soft and quiet. Step down, don\'t jump down.'], broad: ['Broad jumps', 'Swing the arms, jump far, stick the landing.'],
  slpogo: ['Single-leg pogos', 'Small fast hops on one foot. Each leg.'], tib: ['Tibialis raises', 'Back against a wall, pull your toes up. Bulletproofs shins and knees.'], appsub: ['Approach jumps (80%)', '2–3 step approach, smooth and relaxed. Work the rhythm.'],
  lat: ['Lateral bounds', 'Push sideways off one leg, stick the landing on the other.'], ssj: ['Split-squat jumps', 'Switch legs in the air, land soft.'], sprint: ['Sprints (20 m)', 'Full speed, full rest between.'], calf: ['Single-leg calf raises', 'Slow down, pause at the top.'],
  drop: ['Drop landings (12–18″)', 'Step off a box, land and freeze. Teaches your legs to absorb force.'], depth: ['Depth jumps', 'Step off a 12–18″ box and explode up the instant you land.'], appmax: ['Max approach jumps', 'Full approach, all out. Touch as high as you can. Rest 60–90 s.'],
  slbound: ['Single-leg bounds', 'Big hops on one leg for distance. Each leg.'], tuck: ['Tuck jumps', 'Drive the knees up fast, minimal ground time.'], hurdle: ['Hurdle hops', 'Hop over low hurdles or cones back to back.'], dunk: ['Rim touches / dunk tries', 'Full approach at the rim: touch, then try a tennis ball, then a volleyball, then the real thing.'],
};
const DUNK_PHASES = [
  { n: 'Foundation', d: 'Build springy ankles, landing skill and tendon strength.', A: [['pogo', 3, '20'], ['box', 4, '5'], ['broad', 3, '4'], ['tib', 2, '20']], B: [['slpogo', 2, '10 each'], ['lat', 3, '5 each'], ['appsub', 4, '3'], ['calf', 3, '12 each']] },
  { n: 'Power', d: 'Teach your legs to absorb force and turn it into height.', A: [['drop', 3, '5'], ['box', 4, '4'], ['appmax', 5, '3'], ['tib', 2, '20']], B: [['tuck', 3, '6'], ['slbound', 3, '5 each'], ['ssj', 3, '6'], ['sprint', 4, '1']] },
  { n: 'Peak', d: 'Fast, max-effort jumps. Fewer reps, full rest, try to dunk.', A: [['depth', 4, '4'], ['appmax', 6, '2'], ['hurdle', 3, '5'], ['pogo', 2, '15']], B: [['broad', 3, '3'], ['dunk', 6, '2'], ['slbound', 2, '4 each'], ['sprint', 4, '1']] },
];
function dunkSession(i) { // i = 0..23
  const wk = Math.floor(i / 2), ph = DUNK_PHASES[Math.floor(wk / 4)], wInPh = wk % 4, k = i % 2 ? 'B' : 'A', light = wInPh === 3;
  const mult = [1, 1.15, 1.3, 0.6][wInPh];
  const drills = ph[k].map(([id, sets, reps]) => ({ id, name: DRILL[id][0], cue: DRILL[id][1], sets: Math.max(1, Math.round(sets * mult)), reps }));
  return { i, wk: wk + 1, k, ph, light, test: light && k === 'B', drills };
}
const dunkProg = () => S().dunkProg || null;
function dunkNext() { const p = dunkProg(); if (!p) return null; const done = p.done || {}; for (let i = 0; i < 24; i++) if (!done[i]) return dunkSession(i); return null; }
function dunkProgramHTML(compact) {
  const p = dunkProg();
  if (!p) return `<section class="card prog-card"><div class="card-h"><div><div class="eyebrow">🏀 12-week program</div><h2 class="sec-t" style="margin:0">Dunk program</h2></div></div><p class="muted small" style="margin:0">Two 30-minute jump sessions a week on top of your lifting. Three 4-week blocks (Foundation → Power → Peak), with a vertical test at the end of each block.</p><button class="btn block" data-act="dunkStart">Start the program</button></section>`;
  const nx = dunkNext(), done = Object.keys(p.done || {}).length;
  if (!nx) return `<section class="card prog-card"><h2 class="sec-t">Dunk program 🎉</h2><p class="muted small">You finished all 24 sessions. Test your vertical and see how far you came.</p><div class="fields"><button class="btn" data-act="vertTest">Test vertical</button><button class="btn ghost" data-act="dunkReset">Run it again</button></div></section>`;
  return `<section class="card prog-card"><div class="card-h"><div><div class="eyebrow">🏀 Dunk program · Week ${nx.wk} of 12</div><h2 class="sec-t" style="margin:0">${nx.ph.n} · Session ${nx.k}${nx.light ? ' (lighter)' : ''}</h2></div>${ring(done / 24 * 100, 'var(--accent)', 40, 5, '')}</div>
    ${compact ? '' : `<p class="muted small" style="margin:0">${esc(nx.ph.d)}</p>`}
    <div class="prog-bar">${[...Array(12)].map((_, w) => `<i class="${(p.done || {})[w * 2] && (p.done || {})[w * 2 + 1] ? 'on' : (p.done || {})[w * 2] || (p.done || {})[w * 2 + 1] ? 'half' : ''}${w + 1 === nx.wk ? ' cur' : ''}"></i>`).join('')}</div>
    ${compact ? `<p class="small" style="margin:0">${nx.drills.map(x => x.name).join(' · ')}</p>` : `<div>${nx.drills.map(x => `<div class="row" style="min-height:0;padding:9px 0"><span class="grow"><b>${esc(x.name)}</b><div class="faint small">${esc(x.cue)}</div></span><span class="rnum small">${x.sets} × ${esc(x.reps)}</span></div>`).join('')}</div>`}
    ${nx.test ? '<p class="small" style="margin:0">📏 End of the block: <b>test your vertical</b> after this session.</p>' : ''}
    <div class="fields"><button class="btn" data-act="dunkDo">${compact ? 'Open session' : 'Mark session done'}</button>${compact ? '' : '<button class="btn ghost" data-act="dunkInfo">How it works</button>'}</div></section>`;
}
A.dunkStart = () => { saveSettings({ dunkProg: { start: todayStr(), done: {} } }); toast('Dunk program started. Session A is up first.'); };
A.dunkReset = async () => { if (await ask('Start the dunk program over from week 1?', { ok: 'Start over' })) saveSettings({ dunkProg: { start: todayStr(), done: {} } }); };
A.dunkDo = () => {
  const nx = dunkNext(); if (!nx) return;
  openSheet(`Week ${nx.wk} · Session ${nx.k}`, `<p class="muted small" style="margin:0">${esc(nx.ph.n)}: ${esc(nx.ph.d)} Warm up first (the “Pre-jump warm-up” routine is perfect). Rest 60–90 s between sets. Quality over quantity: stop a set if your jumps get slow.</p>
    <div class="drills">${nx.drills.map((x, i) => `<label class="row drill"><input type="checkbox" class="dchk"><span class="grow"><b>${esc(x.name)}</b> <span class="rnum small">${x.sets} × ${esc(x.reps)}</span><div class="faint small">${esc(x.cue)}</div></span></label>`).join('')}</div>
    <button class="btn ghost block" data-act="mobOpen" data-id="prejump">🧘 Pre-jump warm-up (6 min)</button>
    <button class="btn block" data-act="dunkDone">Session done</button>`);
};
A.dunkDone = () => {
  const nx = dunkNext(); if (!nx) return; const p = clone(dunkProg()); p.done = { ...(p.done || {}), [nx.i]: todayStr() };
  saveSettings({ dunkProg: p });
  put('acts', newId(), { type: 'plyo', date: todayStr(), duration: 1800, src: 'program', note: `Dunk program W${nx.wk}${nx.k}`, ts: Date.now() });
  closeSheet(); if (!REDUCED()) confetti({ n: 80 });
  toast(nx.test ? 'Block done! Now test your vertical 📏' : `Session ${nx.k} done. ${Object.keys(p.done).length} of 24.`);
  if (nx.test) setTimeout(() => A.vertTest && A.vertTest(), 900);
};
A.dunkInfo = () => openSheet('Dunk program', `${DUNK_PHASES.map((ph, i) => `<div class="field"><span class="lbl">Weeks ${i * 4 + 1}–${i * 4 + 4}: ${ph.n}</span><p class="small" style="margin:0">${esc(ph.d)}</p></div>`).join('')}
  <ul class="small" style="padding-left:18px;line-height:1.5"><li>Do sessions A and B on separate days, ideally not the day after heavy legs.</li><li>Weeks 2–3 add volume, week 4 drops it so you're fresh for the vertical test.</li><li>Every session also counts as a sport day toward your weekly goal.</li><li>Any joint pain (knees, shins, Achilles): skip the jumps that day and do the ankle routine instead.</li></ul>
  <button class="linkbtn danger center" data-act="dunkReset">Restart program</button>`);

/* ======================= mobility routines ======================= */
const ROUTINES = {
  prejump: { n: 'Pre-jump warm-up', e: '🔥', d: 'Get hot and springy before jumping or legs.', m: [['Light jog in place', 45, 'Easy pace, loosen up.'], ['Leg swings, front to back', 30, 'Hold something for balance. Left leg.'], ['Leg swings, front to back', 30, 'Right leg.'], ['Leg swings, side to side', 40, '20 s each leg.'], ['Walking lunges with reach', 45, 'Reach overhead as you step.'], ['Ankle pogos', 30, 'Small fast bounces.'], ['Squat to stand', 40, 'Grab your toes, drop the hips, stand up.'], ['A-skips', 40, 'Drive the knee, quick contact.'], ['Build-up jumps', 40, '5 jumps, each a bit higher.']] },
  hips: { n: 'Hips for jumping', e: '🦵', d: 'Open tight hips that kill your jump and squat depth.', m: [['90/90 hip switches', 60, 'Sit tall, rotate knees side to side.'], ['Couch stretch, left', 60, 'Back knee against the couch or wall, squeeze the glute.'], ['Couch stretch, right', 60, 'Same on the other side.'], ['Pigeon, left', 60, 'Front shin across, sink the hips.'], ['Pigeon, right', 60, 'Other side.'], ['Frog stretch', 60, 'Knees wide, rock back slowly.'], ['Deep squat hold', 60, 'Heels down, elbows push the knees out.']] },
  ankles: { n: 'Ankles & calves', e: '🦶', d: 'Better ankle bend = deeper squat and safer landings.', m: [['Knee-to-wall, left', 45, 'Toes a few inches from the wall, knee touches, heel stays down.'], ['Knee-to-wall, right', 45, 'Other side.'], ['Calf stretch on a step, left', 45, 'Let the heel drop.'], ['Calf stretch on a step, right', 45, 'Other side.'], ['Tibialis raises', 40, 'Back on a wall, toes up.'], ['Ankle circles', 40, '20 s each foot, both ways.'], ['Toe walks + heel walks', 40, '20 s each.']] },
  shoulders: { n: 'Shoulders & upper back', e: '💪', d: 'For pressing comfort and posture.', m: [['Arm circles', 30, 'Small to big, both directions.'], ['Doorway chest stretch', 60, 'Forearm on the frame, step through.'], ['Thread the needle, left', 45, 'On all fours, reach under and rotate.'], ['Thread the needle, right', 45, 'Other side.'], ['Wall slides', 45, 'Back and arms against the wall, slide up slowly.'], ['Cat-cow', 45, 'Slow, round and arch.'], ['Child\'s pose with side reach', 60, '30 s each side.']] },
  post: { n: 'Post-workout cooldown', e: '🧘', d: 'Full-body stretch after any session.', m: [['Child\'s pose', 45, 'Breathe slow, sink back.'], ['Hamstring stretch, left', 40, 'Leg up on something low, hinge forward.'], ['Hamstring stretch, right', 40, 'Other side.'], ['Hip flexor lunge, left', 40, 'Squeeze the back glute.'], ['Hip flexor lunge, right', 40, 'Other side.'], ['Figure-4 glute stretch', 60, '30 s each side, on your back.'], ['Doorway chest stretch', 45, 'Open up the chest.'], ['Lying twist', 60, '30 s each side.']] },
};
const routineMin = r => Math.round(r.m.reduce((a, x) => a + x[1], 0) / 60);
function mobilityHTML() {
  const today = dailyOf().mob || [];
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Mobility & stretching</h2><span class="faint small">follow along</span></div>
    <div class="mob-grid">${Object.entries(ROUTINES).map(([id, r]) => `<button class="mob-tile${today.includes(id) ? ' done' : ''}" data-act="mobOpen" data-id="${id}"><span class="mi">${r.e}</span><b>${esc(r.n)}</b><span class="faint tiny">${routineMin(r)} min · ${r.m.length} moves${today.includes(id) ? ' · ✓ today' : ''}</span></button>`).join('')}</div></section>`;
}
const Mob = { t: null };
A.mobOpen = d => {
  const r = ROUTINES[d.id]; if (!r) return; clearInterval(Mob.t);
  Object.assign(Mob, { id: d.id, i: -1, left: 0, paused: false });
  openSheet(r.n, `<p class="muted small" style="margin:0">${esc(r.d)}</p><div>${r.m.map(([n, s, c], i) => `<div class="row" style="min-height:0;padding:8px 0"><span class="n wu-n">${i + 1}</span><span class="grow"><b>${esc(n)}</b><div class="faint small">${esc(c)}</div></span><span class="faint small rnum">${s}s</span></div>`).join('')}</div><button class="btn block" data-act="mobGo">▶ Start · ${routineMin(r)} min</button>`, { onClose: () => clearInterval(Mob.t) });
};
function mobBeep(f = 880, dur = 0.18) { try { const ctx = audioCtx(); if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur + 0.02); } catch (e) {} }
A.mobGo = () => { audioCtx(); Mob.i = -1; mobNext(); clearInterval(Mob.t); Mob.t = setInterval(mobTick, 1000); };
function mobNext() {
  const r = ROUTINES[Mob.id]; Mob.i++; if (Mob.i >= r.m.length) return mobFinish();
  Mob.left = r.m[Mob.i][1]; Mob.total = Mob.left; mobBeep(1100); drawMob();
}
function drawMob() {
  const r = ROUTINES[Mob.id], [n, s, c] = r.m[Mob.i], nx = r.m[Mob.i + 1];
  sheetBody(`<div class="mob-play"><div class="faint small">${Mob.i + 1} of ${r.m.length}</div>${ring((1 - Mob.left / Mob.total) * 100, 'var(--accent)', 190, 12, `<span id="mob-t">${Mob.left}</span>`)}<h2 class="lift-h" style="font-size:26px;margin:0;text-align:center">${esc(n)}</h2><p class="muted center" style="margin:0">${esc(c)}</p>${nx ? `<p class="faint small center" style="margin:0">Next: ${esc(nx[0])}</p>` : ''}
    <div class="mob-dots">${r.m.map((_, i) => `<i class="${i < Mob.i ? 'on' : i === Mob.i ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="fields"><button class="btn ghost" data-act="mobPause">${Mob.paused ? '▶ Resume' : '❚❚ Pause'}</button><button class="btn ghost" data-act="mobSkip">Skip ›</button></div><button class="linkbtn center" data-act="mobFinish">Finish early</button></div>`);
}
function mobTick() {
  if (Mob.paused || $('#sheet').hidden) return; Mob.left--;
  if (Mob.left <= 3 && Mob.left > 0) mobBeep(660, 0.1);
  if (Mob.left <= 0) return mobNext();
  const t = $('#mob-t'); if (t) { t.textContent = Mob.left; const c = $$('.mob-play .pring circle')[1]; if (c) { const len = +c.getAttribute('stroke-dasharray'); c.setAttribute('stroke-dashoffset', len * (Mob.left / Mob.total)); } }
}
A.mobPause = () => { Mob.paused = !Mob.paused; drawMob(); };
A.mobSkip = () => mobNext();
A.mobFinish = () => mobFinish(true);
function mobFinish(early) {
  clearInterval(Mob.t); const r = ROUTINES[Mob.id], cur = dailyOf().mob || [];
  if (!early || Mob.i >= Math.floor(r.m.length / 2)) { if (!cur.includes(Mob.id)) putDaily(todayStr(), { mob: [...cur, Mob.id] }); mobBeep(1320, 0.3); if (!REDUCED()) confetti({ n: 60 }); toast(`${r.e} ${r.n} done`); }
  closeSheet();
}

/* ======================= habits ======================= */
const HABIT_IDEAS = [
  { id: 'sleep', e: '😴', n: 'Sleep 8 hours', s: 'Sleep', auto: 'sleep' }, { id: 'mob', e: '🧘', n: 'Stretch or mobility', s: 'Stretch', auto: 'mob' }, { id: 'protein', e: '🥩', n: 'Hit protein goal', s: 'Protein', auto: 'protein' },
  { id: 'train', e: '🏋️', n: 'Train or play', s: 'Train', auto: 'train' }, { id: 'creatine', e: '💊', n: 'Creatine' }, { id: 'water', e: '💧', n: 'Drink 3 L of water', s: 'Water' },
  { id: 'steps', e: '👟', n: '8k steps' }, { id: 'nosugar', e: '🚫', n: 'No sugary drinks', s: 'No soda' }, { id: 'read', e: '📖', n: 'Read 10 pages' }, { id: 'weigh', e: '⚖️', n: 'Weigh in', s: 'Weigh', auto: 'weigh' },
];
const myHabits = () => (S().habits || HABIT_IDEAS.filter(h => ['sleep', 'mob', 'protein', 'creatine'].includes(h.id))).map(h => ({ ...(HABIT_IDEAS.find(x => x.id === h.id) || {}), ...h }));
function habitDone(h, date) {
  const d = dailyOf(date), man = (d.h || {})[h.id];
  if (man != null) return !!man;
  switch (h.auto) {
    case 'sleep': return d.sleep >= 8;
    case 'mob': return (d.mob || []).length > 0;
    case 'protein': return foodTotals(date).p >= S().proteinTarget;
    case 'train': return gymDays().has(date);
    case 'weigh': return weighins().some(w => w.date === date);
  }
  return false;
}
function habitStreak(h) { let n = 0, d = todayStr(); if (!habitDone(h, d)) d = addDays(d, -1); while (n < 1000 && habitDone(h, d)) { n++; d = addDays(d, -1); } return n; }
function habitsCardHTML(full) {
  const hs = myHabits(), t = todayStr(), n = hs.filter(h => habitDone(h, t)).length;
  return `<section class="card habits"><div class="card-h"><h2 class="sec-t">Habits</h2><span class="faint small">${n} of ${hs.length} today${full ? '' : ' · <button class="linkbtn" data-act="habitsEdit">Edit</button>'}</span></div>
    <div class="hab-list">${hs.map(h => { const done = habitDone(h, t), st = habitStreak(h); return `<button class="hab${done ? ' on' : ''}" data-act="habitTap" data-id="${h.id}" aria-pressed="${done}"><span class="he">${h.e}</span><span class="grow"><b>${esc(h.n)}</b><span class="faint tiny">${st ? `🔥 ${st}-day streak` : h.auto ? 'Checks itself off' : 'Tap when done'}</span></span><span class="hchk">${done ? '✓' : ''}</span></button>`; }).join('')}</div>
    ${full ? `<div class="hab-grid"><span></span>${[...Array(14)].map((_, i) => `<span class="faint tiny">${'MTWTFSS'[(parseDate(addDays(t, i - 13)).getDay() + 6) % 7]}</span>`).join('')}${hs.map(h => `<span class="he">${h.e}</span>${[...Array(14)].map((_, i) => `<i class="${habitDone(h, addDays(t, i - 13)) ? 'on' : ''}"></i>`).join('')}`).join('')}</div><button class="btn ghost block" data-act="habitsEdit">Edit habits</button>` : ''}</section>`;
}
A.habitTap = (d, el) => {
  const h = myHabits().find(x => x.id === d.id); if (!h) return; const t = todayStr(), cur = habitDone(h, t), dd = dailyOf(t);
  putDaily(t, { h: { ...(dd.h || {}), [h.id]: cur ? 0 : 1 } }); if (!cur && el) sparkle(el);
};
A.habitsEdit = () => { Sheet.hab = clone(myHabits()); drawHabEdit(); };
function drawHabEdit() {
  const hs = Sheet.hab, ids = new Set(hs.map(h => h.id));
  const body = `<div>${hs.map((h, i) => `<div class="row"><span class="he">${h.e}</span><span class="grow">${esc(h.n)}${h.auto ? '<div class="faint tiny">Auto</div>' : ''}</span><button class="iconbtn sm" data-act="habDel" data-i="${i}" aria-label="Remove">${ICON.x}</button></div>`).join('')}</div>
    <div class="field"><span class="lbl">Add</span><div class="chips">${HABIT_IDEAS.filter(h => !ids.has(h.id)).map(h => `<button class="chip" data-act="habAdd" data-id="${h.id}">${h.e} ${esc(h.n)}</button>`).join('')}</div></div>
    <div class="fields"><input id="hab-e" placeholder="🙂" maxlength="4" style="max-width:70px;text-align:center"><input id="hab-n" placeholder="Your own habit" autocapitalize="sentences"></div><button class="btn ghost block" data-act="habCustom">Add my own</button>
    <button class="btn block" data-act="habSave">Save</button>`;
  if ($('#sheet').hidden) openSheet('Edit habits', body); else { sheetTitle('Edit habits'); sheetBody(body); }
}
A.habDel = d => { Sheet.hab.splice(+d.i, 1); drawHabEdit(); };
A.habAdd = d => { const h = HABIT_IDEAS.find(x => x.id === d.id); if (h) Sheet.hab.push(h); drawHabEdit(); };
A.habCustom = () => { const n = $('#hab-n').value.trim(); if (!n) return; Sheet.hab.push({ id: 'c' + newId(), e: $('#hab-e').value.trim() || '✅', n }); drawHabEdit(); };
A.habSave = () => { saveSettings({ habits: Sheet.hab }); closeSheet(); toast('Habits saved'); };

/* ======================= saved meals & recipes ======================= */
const savedMeals = () => myFoods().filter(f => f.kind === 'meal');
{
  const base = drawMeal;
  drawMeal = function () {
    base(); const m = Sheet.meal; if (!m) return;
    const save = $('#sheet [data-act=mealSave]'); if (!save || $('#ml-keep')) return;
    save.insertAdjacentHTML('beforebegin', `<div class="ml-save"><label class="row" style="border:0;padding:4px 0;min-height:0;gap:10px;cursor:pointer"><input type="checkbox" id="ml-keep" ${m.keep ? 'checked' : ''} style="width:22px;height:22px;min-height:0;accent-color:var(--accent)"><span class="grow small"><b>Save to my meals</b> so I can log it in one tap</span></label>
      <label class="row" style="border:0;padding:0;min-height:0;gap:10px"><span class="grow small">Recipe? It makes</span><input id="ml-serv" inputmode="decimal" value="${m.servings || 1}" style="max-width:70px;text-align:center"><span class="small">servings</span></label></div>`);
    $('#ml-keep').addEventListener('change', e => { m.keep = e.target.checked; });
    $('#ml-serv').addEventListener('input', e => { m.servings = num(e.target.value) || 1; });
  };
  const baseSave = A.mealSave;
  A.mealSave = () => {
    const m = Sheet.meal; if (!m || !m.parts.length) return baseSave();
    const keep = $('#ml-keep')?.checked, sv = Math.max(1, num($('#ml-serv')?.value) || 1); keepMealName();
    const name = m.name || (m.parts.length === 1 ? m.parts[0].name : 'Meal'), sum = k => Math.round(m.parts.reduce((a, it) => a + (it[k] || 0) * (it.qty || 1), 0) / sv * 10) / 10;
    if (keep) { const ex = myFoods().find(f => f.kind === 'meal' && keyOf(f.name) === keyOf(name)); put('myfoods', ex?.id || newId(), { ...(ex || {}), kind: 'meal', name, serving: sv > 1 ? `1 of ${trim(sv, 1)} servings` : m.parts.map(p => p.name).join(' + ').slice(0, 120), servingSize: 1, servingUnit: 'serving', cal: sum('cal'), p: sum('p'), c: sum('c'), f: sum('f'), parts: clone(m.parts), servings: sv, ts: ex?.ts || Date.now(), lastUsed: Date.now() }); }
    if (sv > 1) {
      addFoodItem({ id: newId(), name, serving: `1 of ${trim(sv, 1)} servings`, servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: sum('cal'), p: sum('p'), c: sum('c'), f: sum('f'), src: 'meal', parts: m.parts, ts: Date.now() });
      Sheet.meal = null; closeSheet(); toast(`1 serving of ${name} logged${keep ? ' and saved' : ''}`); return;
    }
    baseSave(); if (keep) toast(`${name} logged and saved to My meals`);
  };
}
function savedMealsHTML() {
  const ms = savedMeals(); if (!ms.length) return '';
  return `<div class="field"><span class="lbl">My meals & recipes</span><div class="chips scroll">${ms.map(f => `<button class="chip meal-chip" data-act="mealLog" data-id="${f.id}"><b>${esc(f.name)}</b> <span class="faint">${trim(f.cal, 0)} kcal · ${trim(f.p, 0)}p</span></button>`).join('')}</div></div>`;
}
A.mealLog = d => {
  const f = Store.docs.myfoods[d.id]; if (!f) return; const date = UI.foodDate || todayStr(), it = { id: newId(), name: f.name, serving: f.serving, servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: f.cal, p: f.p, c: f.c, f: f.f, src: 'meal', parts: f.parts, myId: d.id, ts: Date.now() };
  const day = foodDay(date); put('food', date, { ...clone(day), date, items: [...(day.items || []), it] }); put('myfoods', d.id, { ...f, lastUsed: Date.now(), uses: (f.uses || 0) + 1 });
  toastUndo(`${f.name} logged`, () => { const dd = foodDay(date); put('food', date, { ...clone(dd), items: (dd.items || []).filter(x => x.id !== it.id) }); });
};

/* ======================= macro trends ======================= */
const MAC = [['p', 'Protein', 4, '#3392f5'], ['c', 'Carbs', 4, '#f5b915'], ['f', 'Fat', 9, '#ff6b8b']];
function macroTrendsHTML() {
  const n = UI.macRange || 7, t = todayStr(), days = [...Array(n)].map((_, i) => addDays(t, i - n + 1)), s = S();
  const rows = days.map(d => ({ d, t: foodTotals(d), logged: (foodDay(d).items || []).length > 0 }));
  const lg = rows.filter(r => r.logged); if (lg.length < 2) return `<section class="card"><h2 class="sec-t">Macro trends</h2><p class="muted small" style="margin:0">Log food on a couple of days to see your calorie and macro trends.</p></section>`;
  const avg = k => lg.reduce((a, r) => a + r.t[k], 0) / lg.length, aCal = avg('cal');
  const W = 340, H = 150, max = Math.max(s.calTarget * 1.15, ...rows.map(r => r.t.cal)), bw = (W - 40) / n, Y = v => H - 18 - v / max * (H - 28);
  let bars = '';
  rows.forEach((r, i) => {
    const x = 38 + i * bw + 1; let y0 = H - 18;
    for (const [k, , kc, col] of MAC) { const h = r.t[k] * kc / max * (H - 28); if (h > 0.5) { bars += `<rect x="${x}" y="${y0 - h}" width="${Math.max(2, bw - 2)}" height="${h}" fill="${col}"${r.logged ? '' : ' opacity=".35"'}><title>${fmtDate(r.d)}: ${trim(r.t[k], 0)} g ${k}</title></rect>`; y0 -= h + (bw > 10 ? 1 : 0); } }
    if (n <= 7) bars += `<text x="${x + bw / 2 - 1}" y="${H - 4}" class="axis" text-anchor="middle">${'SMTWTFS'[parseDate(r.d).getDay()]}</text>`;
  });
  const ty = Y(s.calTarget), split = MAC.map(([k, , kc]) => avg(k) * kc), tot = split.reduce((a, b) => a + b, 0) || 1;
  const src = {}; for (const r of lg) for (const it of foodDay(r.d).items || []) { const k = it.name || 'Food'; src[k] = (src[k] || 0) + (it.cal || 0) * (it.qty || 1); }
  const top = Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 5), sumAll = Object.values(src).reduce((a, b) => a + b, 0) || 1;
  const pHit = lg.filter(r => r.t.p >= s.proteinTarget).length;
  return `<section class="card mac"><div class="card-h"><h2 class="sec-t">Macro trends</h2><div class="chips">${[[7, '7D'], [30, '30D']].map(([v, l]) => `<button class="chip" data-act="macRange" data-v="${v}" aria-pressed="${n === v}">${l}</button>`).join('')}</div></div>
    <div class="stats"><div class="stat"><span class="k">Avg calories</span><span class="v">${fmtN(aCal)}</span><span class="faint tiny">target ${fmtN(s.calTarget)}</span></div><div class="stat"><span class="k">Avg protein</span><span class="v">${trim(avg('p'), 0)}<span class="unit">g</span></span><span class="faint tiny">${pHit} of ${lg.length} days hit</span></div></div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Calories per day split into protein, carbs and fat">${[0, 0.5, 1].map(f => `<line x1="38" x2="${W}" y1="${Y(max * f)}" y2="${Y(max * f)}" class="grid"/><text x="33" y="${Y(max * f) + 4}" class="axis" text-anchor="end">${f ? (Math.round(max * f / 100) / 10) + 'k' : '0'}</text>`).join('')}${bars}<line x1="38" x2="${W}" y1="${ty}" y2="${ty}" stroke="var(--tx2)" stroke-width="1.5" stroke-dasharray="4 4"/><text x="${W - 2}" y="${ty - 4}" class="axis" text-anchor="end">target</text></svg>
    <div class="mac-split"><div class="mac-bar">${MAC.map(([k, , , col], i) => `<i style="width:${split[i] / tot * 100}%;background:${col}"></i>`).join('')}</div><div class="mac-leg">${MAC.map(([k, l, , col], i) => `<span><i style="background:${col}"></i>${l} <b>${trim(avg(k), 0)} g</b> <span class="faint">${Math.round(split[i] / tot * 100)}%</span></span>`).join('')}</div></div>
    <div class="field"><span class="lbl">Where your calories came from</span>${top.map(([nm, c]) => `<div class="src-r"><span class="grow">${esc(nm)}</span><span class="bar"><i style="width:${c / top[0][1] * 100}%"></i></span><b class="rnum">${Math.round(c / sumAll * 100)}%</b></div>`).join('')}</div></section>`;
}
A.macRange = d => { UI.macRange = +d.v; render(); };

/* ======================= global search ======================= */
const PAGES = [
  ['⚖️', 'Weight & trend', 'weight scale weigh bodyweight trend calorie coach', () => goProg('weight')], ['📸', 'Progress photos', 'photo pictures compare slider', () => goProg('photos')], ['📏', 'Measurements', 'waist arms chest measure', () => goProg('measure')],
  ['🏆', 'Lifts & PRs', 'pr lifts big 3 one rep max strength', () => goProg('lifts')], ['🏀', 'Dunk program', 'dunk jump vertical plyo program', () => goProg('athlete')], ['📏', 'Test vertical from video', 'vertical video jump test', () => A.vertTest()],
  ['🧘', 'Mobility routines', 'stretch mobility hips ankles cooldown warm-up', () => goTrain('plan')], ['✅', 'Habits', 'habits streaks creatine water sleep', () => goYou()], ['🏅', 'Milestones', 'badges milestones achievements', () => goYou()],
  ['🔋', 'Readiness check-in', 'recovery readiness sleep sore energy', () => A.readyOpen()], ['🗓️', 'Weekly recap', 'recap week summary share', () => A.recapOpen()], ['📅', 'Workout history', 'history calendar past workouts', () => goTrain('history')],
  ['🗂️', 'Edit split', 'split routine days program', () => A.editSplit()], ['🏋️', 'Gyms & equipment', 'gym equipment machines', () => goTrain('plan')], ['🍽️', 'Build a meal', 'meal recipe build', () => { UI.tab = 'food'; render(); A.mealStart(); }],
  ['📊', 'Macro trends', 'macros protein carbs fat chart', () => { UI.tab = 'food'; render(); setTimeout(() => $('.mac')?.scrollIntoView({ block: 'start' }), 60); }],
  ['🎨', 'Appearance', 'theme dark light black accent colour color', () => goYou()], ['⚙️', 'Settings', 'settings units rest timer targets calories protein alerts', () => A.openSettings()], ['💾', 'Back up', 'backup restore save icloud', () => A.backupNow()], ['📄', 'Export CSV', 'csv export spreadsheet excel', () => A.csvExport()],
];
function goProg(sub) { if (sub === 'lifts') { UI.tab = 'lifts'; UI.liftKey = null; } else if (sub === 'athlete') UI.tab = 'athlete'; else { UI.tab = 'body'; UI.bodySub = sub; } UI.progSub = sub; $('#view').scrollTop = 0; render(); }
function goTrain(sub) { UI.tab = 'train'; UI.session = false; UI.trainSub = sub; $('#view').scrollTop = 0; render(); }
function goYou() { UI.tab = 'you'; $('#view').scrollTop = 0; render(); }
A.search = () => {
  openSheet('Search', `<input id="gs-q" type="search" placeholder="Exercises, foods, workouts, settings…" autocomplete="off" autocapitalize="off" enterkeyhint="search"><div id="gs-r" class="gs-r"></div>`, {
    onMount(L) { const q = $('#gs-q', L); const draw = () => { $('#gs-r', L).innerHTML = searchHTML(q.value); }; q.addEventListener('input', draw); draw(); setTimeout(() => q.focus(), 60); },
  });
};
function searchHTML(q) {
  const k = keyOf(q).trim(), words = k.split(/\s+/).filter(Boolean), hit = s => words.every(w => keyOf(s).includes(w));
  Sheet.gs = [];
  const item = (ic, t, sub, fn) => { Sheet.gs.push(fn); return `<button class="row gs-i" data-act="searchGo" data-i="${Sheet.gs.length - 1}"><span class="gs-ic">${ic}</span><span class="grow"><b>${esc(t)}</b>${sub ? `<div class="faint small">${esc(sub)}</div>` : ''}</span></button>`; };
  if (!words.length) return `<div class="field"><span class="lbl">Jump to</span>${PAGES.slice(0, 8).map(([ic, t, , fn]) => item(ic, t, '', fn)).join('')}</div>`;
  const sec = (t, xs) => xs.length ? `<div class="field"><span class="lbl">${t}</span>${xs.join('')}</div>` : '';
  const pages = PAGES.filter(([, t, kw]) => hit(t + ' ' + kw)).slice(0, 5).map(([ic, t, , fn]) => item(ic, t, '', fn));
  const lifts = liftIndex(), exs = [...library().values()].filter(e => hit(e.name + ' ' + e.group)).slice(0, 8).map(e => { const L = lifts.get(keyOf(e.name)); return item('🏋️', e.name, `${e.group}${L && L.e1 ? ` · est. 1RM ${fw(L.e1, 0)} ${U.wu}` : ''}`, () => L ? (UI.tab = 'lifts', UI.liftKey = L.key, render()) : A.muscles({ ex: e.name })); });
  const seen = new Set(), foods = [...myFoods(), ...recentFoods()].filter(f => { const kk = keyOf(f.name); if (seen.has(kk) || !hit(f.name)) return false; seen.add(kk); return true; }).slice(0, 6).map(f => item(f.kind === 'meal' ? '🍽️' : '🍎', f.name, `${trim(f.cal, 0)} kcal · ${trim(f.p, 0)} g protein · tap to log`, () => { UI.tab = 'food'; render(); f.id && f.kind === 'meal' ? A.mealLog({ id: f.id }) : f.id && Store.docs.myfoods[f.id] ? A.useMyFood({ id: f.id }) : foodForm({ ...clone(f), id: undefined, qty: 1 }); }));
  const wos = Store.list('workouts').filter(w => (w.sets || []).length && hit(`${w.dayName} ${fmtDate(w.date, { rel: false })} ${w.date} ${(w.sets || []).map(s => s.ex).join(' ')}`)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(w => item('📅', `${w.dayName || 'Workout'} · ${fmtDate(w.date, { rel: false })}`, [...new Set(w.sets.map(s => s.ex))].slice(0, 4).join(', '), () => showWorkout(w.id)));
  const acts = Store.list('acts').filter(a => hit(actName(a) + ' ' + a.date)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(a => item(actOf(a).e, `${actName(a)} · ${fmtDate(a.date, { rel: false })}`, a.duration ? `${Math.round(a.duration / 60)} min` : '', () => goTrain('history')));
  const all = sec('Go to', pages) + sec('Exercises', exs) + sec('Foods', foods) + sec('Workouts', wos) + sec('Activities', acts);
  return all || `<p class="muted center">Nothing found for “${esc(q)}”.</p>`;
}
A.searchGo = d => { const fn = Sheet.gs?.[+d.i]; closeSheet(); if (fn) setTimeout(fn, 30); };
