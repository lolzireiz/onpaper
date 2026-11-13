/* v4.0: weight trend, calorie coach, muscle heatmap, photo slider, pain flags, deload nudge,
   Sunday recap, milestones and CSV export. */

/* ---------- true weight trend (smoothed, ignores day-to-day water swings) ---------- */
function dailyWeights(list) {
  const by = new Map();
  for (const w of list) { const a = by.get(w.date) || []; a.push(w.weight); by.set(w.date, a); }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, xs]) => ({ date, weight: xs.reduce((a, b) => a + b, 0) / xs.length }));
}
/* Exponential moving average, 10% per day; a gap of n days counts as n steps toward the new weigh-in. */
function weightTrend(list = weighins()) {
  return Store.cached('wtrend:' + list.length + ':' + (list[0]?.date || '') + (list[list.length - 1]?.id || ''), () => {
    const out = new Map(); let t = null, prev = null;
    for (const d of dailyWeights(list)) {
      if (t == null) t = d.weight;
      else { const gap = Math.max(1, daysBetween(prev, d.date)); t += (1 - 0.9 ** gap) * (d.weight - t); }
      out.set(d.date, t); prev = d.date;
    }
    return out;
  });
}
function trendOn(date, list) {
  const tr = weightTrend(list); let v = null;
  for (const [d, t] of tr) { if (d > date) break; v = t; }
  return v;
}
function weeklyAverages(list, n = 6) {
  const out = [], wk0 = weekStart(todayStr());
  for (let i = 0; i < n; i++) {
    const s = addDays(wk0, -7 * i), e = addDays(s, 6), xs = list.filter(w => w.date >= s && w.date <= e).map(w => w.weight);
    if (xs.length) out.push({ s, avg: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length });
  }
  return out.map((w, i) => ({ ...w, d: out[i + 1] ? w.avg - out[i + 1].avg : null }));
}
function weeklyAvgHTML(list) {
  const ws = weeklyAverages(list); if (ws.length < 2) return '';
  return `<section class="card"><h2 class="sec-t">Weekly averages</h2><p class="faint small" style="margin:0">Average of every weigh-in in each week (Mon–Sun). Easier to read than single days.</p>
    <div class="wkavg">${ws.map(w => `<div class="row"><span class="grow">${w.s === weekStart(todayStr()) ? '<b>This week</b>' : 'Week of ' + fmtDate(w.s, { rel: false })}<div class="faint tiny">${plural(w.n, 'weigh-in')}</div></span><b class="rnum">${fw(w.avg)} ${U.wu}</b><span class="rnum small ${w.d == null ? 'faint' : ''}" style="min-width:58px;text-align:right">${w.d == null ? '—' : signed(U.w(w.d))}</span></div>`).join('')}</div></section>`;
}

/* ---------- smart calorie coach ---------- */
const GOAL_RATE = { bulk: 0.35, cut: -0.75, maintain: 0 }; // lb per week
function calorieCoach() {
  return Store.cached('coach', () => {
    const s = S(), all = weighins(), end = todayStr(), from = addDays(end, -21);
    const ws = all.filter(w => w.date >= from);
    if (ws.length < 6 || daysBetween(ws[0].date, ws[ws.length - 1].date) < 12) return { ready: false, why: 'needs about 2 weeks of weigh-ins', have: ws.length };
    const days = [...Array(21)].map((_, i) => addDays(end, -i - 1)).filter(d => (foodDay(d).items || []).length);
    const cals = days.map(d => foodTotals(d).cal).filter(c => c >= 900);
    if (cals.length < 10) return { ready: false, why: 'needs about 10 fully logged food days in the last 3 weeks', have: cals.length };
    const tr = weightTrend(all), t0 = trendOn(ws[0].date, all), t1 = trendOn(ws[ws.length - 1].date, all);
    const span = daysBetween(ws[0].date, ws[ws.length - 1].date), perDay = (t1 - t0) / span;
    const intake = cals.reduce((a, b) => a + b, 0) / cals.length;
    const tdee = intake - perDay * 3500;
    const goal = s.goal || 'bulk', want = GOAL_RATE[goal] ?? 0;
    const rec = Math.round((tdee + want / 7 * 3500) / 50) * 50;
    const cur = s.calTarget || 2500, diff = rec - cur;
    return { ready: true, intake, tdee, rate: perDay * 7, want, rec, cur, diff, goal, days: cals.length, adjust: Math.abs(diff) >= 100, tr };
  });
}
function coachCardHTML() {
  const c = calorieCoach(), s = S();
  if (!c.ready) return `<section class="card"><h2 class="sec-t">Calorie coach</h2><p class="muted small" style="margin:0">Once the app has enough data it will check whether your calorie target actually matches your goal. It ${c.why} (${c.have} so far).</p></section>`;
  const gl = { bulk: 'lean bulk', cut: 'cut', maintain: 'maintenance' }[c.goal] || c.goal;
  return `<section class="card coach"><div class="card-h"><h2 class="sec-t">Calorie coach</h2>${c.adjust ? '<span class="gchip warn">Adjust</span>' : '<span class="gchip ok">On track</span>'}</div>
    <div class="stats"><div class="stat"><span class="k">You eat</span><span class="v">${fmtN(c.intake)}</span><span class="faint tiny">kcal/day avg</span></div><div class="stat"><span class="k">You burn</span><span class="v">≈${fmtN(c.tdee)}</span><span class="faint tiny">kcal/day est.</span></div><div class="stat"><span class="k">Trend</span><span class="v">${signed(U.w(c.rate), 2)}</span><span class="faint tiny">${U.wu}/week</span></div></div>
    <p class="small" style="margin:0">${c.adjust ? `For a ${gl} (${signed(U.w(c.want), 2)} ${U.wu}/week) try <b>${fmtN(c.rec)} kcal</b> a day instead of ${fmtN(c.cur)}.` : `Your ${fmtN(c.cur)} kcal target fits a ${gl}. No change needed.`}</p>
    ${c.adjust ? `<button class="btn block" data-act="coachApply" data-v="${c.rec}">Update target to ${fmtN(c.rec)} kcal</button><button class="linkbtn" data-act="coachInfo" style="align-self:flex-start">How this works</button>` : `<button class="linkbtn" data-act="coachInfo" style="align-self:flex-start">How this works</button>`}
  </section>`;
}
const fmtN = n => Math.round(n).toLocaleString();
A.coachApply = d => { const v = +d.v; saveSettings({ calTarget: v, coachAt: todayStr() }); closeSheet(); toast(`Calorie target is now ${fmtN(v)} kcal`); sparkle($('#view')); };
A.coachInfo = () => {
  const c = calorieCoach();
  openSheet('Calorie coach', `<p class="small">The coach compares what you logged to what the scale actually did.</p>
    <ol class="small" style="padding-left:18px;line-height:1.5"><li>It averages your calories over fully logged days (900+ kcal) in the last 3 weeks.</li><li>It reads your smoothed weight trend, so water swings don't fool it.</li><li>About 3,500 kcal ≈ 1 lb, so the trend tells it how much you really burn.</li><li>Then it adds or removes calories to hit your goal pace (lean bulk +0.35 lb/week, cut −0.75, maintain 0).</li></ol>
    <p class="faint small">Missed logs make you look like you eat less than you do, so the more complete your food log, the better the estimate.${c.ready ? ` Based on ${c.days} logged days.` : ''}</p>`);
};

/* ---------- weekly muscle heatmap ---------- */
const HEAT_MAJOR = ['chest', 'delts', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'lats', 'upper_back', 'traps', 'abs', 'quads', 'hamstrings', 'glutes', 'calves'];
function muscleSets(days = 7) {
  const since = addDays(todayStr(), -(days - 1)), heat = {};
  for (const w of Store.list('workouts')) if (w.date >= since) for (const s of w.sets || []) {
    if (s.warm || s.hit === false) continue; const m = musclesFor(s.ex); if (!m) continue;
    for (const id of m.p) heat[id] = (heat[id] || 0) + 1;
    for (const id of m.s) if (!m.p.has(id)) heat[id] = (heat[id] || 0) + 0.5;
  }
  for (const w of Store.list('workouts')) if (w.date >= since && w.marked) for (const g of w.groups || []) for (const id of (typeof GROUP_IDS !== 'undefined' && GROUP_IDS[g]) || []) heat[id] = (heat[id] || 0) + 8;
  return heat;
}
function heatmapCardHTML() {
  const recent = Store.list('workouts').some(w => w.date >= addDays(todayStr(), -13) && (w.sets || []).length); if (!recent) return '';
  const heat = muscleSets(), sex = S().bodyModel || 'male', mus = { p: new Set(), s: new Set(), heat };
  const skipped = HEAT_MAJOR.filter(m => !heat[m]), light = HEAT_MAJOR.filter(m => heat[m] > 0 && heat[m] < 4);
  const top = Object.entries(heat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Muscles this week</h2><span class="faint small">last 7 days</span></div>
    <div class="heatfig"><div style="--fig-h:250px">${bodySVG('front', sex, mus)}</div><div style="--fig-h:250px">${bodySVG('back', sex, mus)}</div></div>
    <div class="heat-leg"><span><i style="background:#5a2a2e"></i>1–3 sets</span><span><i style="background:#a8323a"></i>4–9</span><span><i style="background:#f0302e"></i>10+</span></div>
    ${top.length ? `<p class="small" style="margin:0">${top.map(([m, v]) => `${MUSCLE_NAMES[m] || m} <b>${trim(v, 1)}</b>`).join(' · ')}</p>` : ''}
    ${skipped.length ? `<p class="small heat-skip" style="margin:0">⚠️ <b>Skipped:</b> ${skipped.map(m => MUSCLE_NAMES[m]).join(', ')}</p>` : '<p class="small" style="margin:0;color:var(--ok)">✓ Every major muscle got work this week.</p>'}
    ${light.length ? `<p class="faint small" style="margin:0">Light (under 4 sets): ${light.map(m => MUSCLE_NAMES[m]).join(', ')}. About 10 sets a week per muscle is a good target for growth.</p>` : ''}
  </section>`;
}

/* ---------- photo compare: slider and fade ---------- */
function photoCompareHTML(a, b, fig) {
  const mode = UI.cmpMode || 'slide';
  const seg = `<div class="seg" style="margin-bottom:8px">${[['side', 'Side by side'], ['slide', 'Slider'], ['fade', 'Fade']].map(([k, l]) => `<button data-act="cmpMode" data-k="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>`;
  if (mode === 'side' || !a || !b) return seg + `<div class="cmp">${fig(a, 'Before')}${fig(b, 'After')}</div>`;
  const pos = UI.cmpPos ?? 50;
  const stack = `<div class="cmp-stack ${mode}" style="--p:${pos}%;--o:${pos / 100}"><img src="${photoSrc(a)}" alt="Before, ${fmtDate(a.date, { rel: false })}"><img class="top" src="${photoSrc(b)}" alt="After, ${fmtDate(b.date, { rel: false })}">${mode === 'slide' ? '<span class="cmp-line"><i>⇔</i></span>' : ''}<span class="cmp-lbl l">${fmtDate(a.date, { rel: false })}${a.time ? ' · ' + fmtTime(a.time) : ''}</span><span class="cmp-lbl r">${fmtDate(b.date, { rel: false })}${b.time ? ' · ' + fmtTime(b.time) : ''}</span></div>
    <input type="range" class="cmp-range" min="0" max="100" value="${pos}" aria-label="${mode === 'slide' ? 'Slide between before and after' : 'Fade between before and after'}">`;
  const pickers = `<div class="cmp cmp-pick">${fig(a, 'Before').replace(/<div class="ph">[\s\S]*?<\/div>/, '')}${fig(b, 'After').replace(/<div class="ph">[\s\S]*?<\/div>/, '')}</div>`;
  return seg + stack + pickers;
}
A.cmpMode = d => { UI.cmpMode = d.k; render(); };
function cmpSet(st, v) { UI.cmpPos = v; st.style.setProperty('--p', v + '%'); st.style.setProperty('--o', v / 100); }
document.addEventListener('input', e => { const r = e.target.closest && e.target.closest('.cmp-range'); if (!r) return; const st = r.previousElementSibling; if (st) cmpSet(st, +r.value); });
document.addEventListener('pointerdown', e => {
  const st = e.target.closest && e.target.closest('.cmp-stack.slide'); if (!st) return;
  const move = ev => { const r = st.getBoundingClientRect(), v = Math.round(clamp((ev.clientX - r.left) / r.width * 100, 0, 100)); cmpSet(st, v); const rg = st.nextElementSibling; if (rg) rg.value = v; };
  move(e); st.setPointerCapture?.(e.pointerId);
  const up = () => { st.removeEventListener('pointermove', move); st.removeEventListener('pointerup', up); st.removeEventListener('pointercancel', up); };
  st.addEventListener('pointermove', move); st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
});

/* ---------- pain flags ---------- */
const PAIN_AREAS = ['Shoulder', 'Elbow', 'Wrist', 'Neck', 'Upper back', 'Lower back', 'Hip', 'Knee', 'Ankle', 'Other'];
const painOf = name => (S().pain || {})[keyOf(name)] || null;
const painDot = name => painOf(name) ? ' <span class="pain-dot" title="Pain flagged" aria-label="pain flagged">⚠️</span>' : '';
function painSwapFor(name) {
  const w = activeWorkout(), gym = w ? gyms().find(g => g.id === w.gymId) || null : activeGym();
  return alternatives(name, gym, w ? sessionNames(w) : []).find(e => !painOf(e.name))?.name || null;
}
function painBarHTML(name) {
  const p = painOf(name); if (!p) return '';
  const alt = painSwapFor(name);
  return `<div class="pain-bar"><span>⚠️ You flagged <b>${esc(p.area.toLowerCase())}</b> pain ${p.date === todayStr() ? 'today' : 'on ' + fmtDate(p.date, { rel: false })}${p.note ? `: “${esc(p.note)}”` : ''}. Go lighter, or swap${alt ? ` to <b>${esc(alt)}</b>` : ''}.</span><div class="pain-act">${activeWorkout() ? `<button class="btn sm" data-act="swapEx" data-ex="${esc(name)}">Swap</button>` : ''}<button class="btn sm ghost" data-act="painClear" data-ex="${esc(name)}">Feels fine now</button></div></div>`;
}
A.painFlag = d => {
  const p = painOf(d.ex) || {}; Sheet.painEx = d.ex;
  openSheet(`Pain: ${d.ex}`, `<p class="muted small" style="margin:0">Flag where it hurts. You'll get a warning and a swap idea every time this exercise comes up.</p>
    <div class="field"><span class="lbl">Where?</span><div class="chips">${PAIN_AREAS.map(a => `<button class="chip" data-act="pick" data-group="painarea" data-value="${a}" aria-pressed="${p.area === a}">${a}</button>`).join('')}</div></div>
    <label class="field"><span class="lbl">Note (optional)</span><input id="pain-note" placeholder="e.g. sharp at the bottom of the rep" value="${esc(p.note || '')}"></label>
    <button class="btn block" data-act="painSave">Save flag</button>${p.area ? `<button class="linkbtn center" data-act="painClear" data-ex="${esc(d.ex)}">Clear flag</button>` : ''}
    <p class="faint tiny">Pain that's sharp, gets worse, or sticks around is worth getting checked out.</p>`);
};
A.painSave = () => {
  const area = picked($('#sheet'), 'painarea'); if (!area) { toast('Pick where it hurts'); return; }
  const o = clone(S().pain || {}); o[keyOf(Sheet.painEx)] = { area, note: ($('#pain-note')?.value || '').trim(), date: todayStr(), name: Sheet.painEx };
  saveSettings({ pain: o }); closeSheet(); toast(`Flagged ${area.toLowerCase()} pain on ${Sheet.painEx}`);
};
A.painClear = d => { const o = clone(S().pain || {}); delete o[keyOf(d.ex)]; saveSettings({ pain: o }); closeSheet(); toast('Pain flag cleared. Glad it feels better.'); };

/* ---------- deload nudge ---------- */
function hardWeeks() {
  const days = gymDays(), wk0 = weekStart(todayStr()), since = S().deloadAt || '';
  const count = wk => { let n = 0; for (let i = 0; i < 7; i++) if (days.has(addDays(wk, i))) n++; return n; };
  let n = count(wk0) >= 3 ? 1 : 0, wk = addDays(wk0, -7), g = 0;
  while (count(wk) >= 3 && addDays(wk, 6) >= since && g++ < 60) { n++; wk = addDays(wk, -7); }
  return n;
}
function stalledLifts() {
  const out = [];
  for (const L of liftIndex().values()) {
    const days = new Set(L.sets.filter(x => !x.warm && x.date >= addDays(todayStr(), -28)).map(x => x.date)), up = [...L.sets].reverse().find(x => x.pr || x.baseline);
    if (days.size >= 3 && up && daysBetween(up.date, todayStr()) >= 21) out.push(L.name);
  }
  return out;
}
function deloadNudge() {
  const s = S(); if (s.deloadUntil && s.deloadUntil >= todayStr()) return null;
  const wks = hardWeeks(), st = stalledLifts();
  if (wks >= 8 || (wks >= 5 && st.length >= 2)) return { wks, st };
  return null;
}
A.deloadSheet = () => {
  const n = deloadNudge() || { wks: hardWeeks(), st: stalledLifts() };
  openSheet('Lighter week', `<p class="small">You've trained hard for <b>${plural(n.wks, 'week')}</b> in a row${n.st.length ? ` and ${n.st.slice(0, 3).join(', ')} ${n.st.length > 1 ? 'have' : 'has'} stalled` : ''}. A planned lighter week lets joints and nerves recover, and lifts usually jump after it.</p>
    <ul class="small" style="padding-left:18px;line-height:1.5"><li>Same exercises, about <b>half the sets</b>.</li><li>About <b>90% of your usual weight</b>, stopping well short of failure.</li><li>Keep eating normally, and keep jumping light.</li></ul>
    <button class="btn block" data-act="deloadStart">Start a lighter week</button><button class="btn ghost block" data-act="deloadSkip">Not now</button>`);
};
A.deloadStart = () => { saveSettings({ deloadAt: todayStr(), deloadUntil: addDays(todayStr(), 6) }); closeSheet(); toast('Lighter week on. Back to normal next week.'); };
A.deloadSkip = () => { saveSettings({ deloadAt: todayStr() }); closeSheet(); toast("OK. You'll get a nudge again in a few weeks."); };
A.deloadEnd = () => { saveSettings({ deloadUntil: null }); toast('Lighter week ended'); };
function deloadBannerHTML() {
  const u = S().deloadUntil; if (!u || u < todayStr()) return '';
  return `<div class="alert"><span class="ai" aria-hidden="true">🔋</span><p><b>Lighter week</b> until ${fmtDay(u)}: about half the sets, ~90% weight.</p><button class="btn sm ghost" data-act="deloadEnd">End</button></div>`;
}

/* ---------- insights from the coach ---------- */
{
  const base = insights;
  insights = function () {
    const out = base(), c = calorieCoach(), dl = deloadNudge(), extra = [];
    if (c.ready && c.adjust && S().coachAt !== todayStr()) extra.push(['🧮', `Try ${fmtN(c.rec)} kcal a day`, `You eat about ${fmtN(c.intake)} and your trend is ${signed(U.w(c.rate), 2)} ${U.wu}/week. ${c.diff > 0 ? 'Eating a bit more' : 'Eating a bit less'} gets you to your goal pace.`, 'coachGo']);
    if (dl) extra.push(['🔋', 'Time for a lighter week', `${plural(dl.wks, 'hard week')} in a row${dl.st.length ? ` and ${plural(dl.st.length, 'lift')} stalled` : ''}. A planned easy week usually brings PRs back.`, 'deloadSheet']);
    if (!extra.length) return out;
    // the coach replaces the generic "eat 150 more" weight-pace tip
    const rest = c.ready && c.adjust ? out.filter(x => !/^(Gaining|Weight is|Losing|Drifting|Holding)/.test(x[1])) : out;
    return [...extra, ...rest].slice(0, 7);
  };
}
A.coachGo = () => { UI.tab = 'body'; UI.bodySub = 'weight'; render(); requestAnimationFrame(() => $('.coach')?.scrollIntoView({ block: 'center', behavior: REDUCED() ? 'auto' : 'smooth' })); };

/* ---------- Sunday recap ---------- */
function recapWeek() { const t = todayStr(), dow = (parseDate(t).getDay() + 6) % 7; return dow === 6 ? weekStart(t) : addDays(weekStart(t), -7); } // Sun: this week, Mon–Sat: last week
function recapData(wk = recapWeek()) {
  const end = addDays(wk, 6), inW = d => d >= wk && d <= end, s = S();
  const wos = Store.list('workouts').filter(w => inW(w.date) && ((w.sets || []).length || w.marked));
  const acts = Store.list('acts').filter(a => inW(a.date));
  let sets = 0; for (const w of wos) for (const x of w.sets || []) if (!x.warm && x.hit !== false) sets++;
  const prs = []; for (const L of liftIndex().values()) for (const x of L.sets) if (x.pr && inW(x.date)) prs.push({ name: L.name, w: x.w, r: x.r });
  const prBest = new Map(); for (const p of prs) { const o = prBest.get(p.name); if (!o || e1rm(p.w, p.r) > e1rm(o.w, o.r)) prBest.set(p.name, p); }
  const goals = {}; const mg = myGoals();
  for (const w of wos) for (const x of w.sets || []) if (!x.warm && x.hit !== false) for (const g of exHelps(x.ex)) goals[g] = (goals[g] || 0) + 1;
  const mine = new Set(mg); for (const a of acts) for (const g of actOf(a).g) if (mine.has(g)) goals[g] = (goals[g] || 0) + 1;
  const all = weighins(), tA = trendOn(addDays(wk, -1), all), tB = trendOn(end, all);
  const fd = [...Array(7)].map((_, i) => addDays(wk, i)).filter(d => d <= todayStr() && (foodDay(d).items || []).length);
  const pHit = fd.filter(d => foodTotals(d).p >= s.proteinTarget).length;
  const js = Store.list('jumps'), wkJ = js.filter(j => inW(j.date)), before = js.filter(j => j.date < wk);
  const bestV = a => Math.max(0, ...a.map(j => j.vert || 0)), bestR = a => Math.max(0, ...a.map(j => j.rim || 0));
  const days = new Set([...wos.map(w => w.date), ...acts.map(a => a.date)]).size;
  return { wk, end, workouts: wos.length, acts: acts.length, days, sets, prs: [...prBest.values()], prCount: prs.length, goals, mg, wChange: tA != null && tB != null ? tB - tA : null, food: fd.length, pHit,
    jumps: wkJ.length, vNow: bestV(wkJ), vBefore: bestV(before), rNow: bestR(wkJ), rBefore: bestR(before), dunk: wantsDunk(), goal: s.weeklyGoal || 4 };
}
function recapRows(r) {
  const rows = [];
  rows.push(['🏋️', 'Gym days', `${r.days} of ${r.goal}${r.days >= r.goal ? ' ✓' : ''}`, `${plural(r.workouts, 'workout')} · ${plural(r.sets, 'work set')}${r.acts ? ` · ${plural(r.acts, 'sport session')}` : ''}`]);
  rows.push(['🏆', 'PRs', r.prCount ? String(r.prCount) : '0', r.prs.length ? r.prs.slice(0, 3).map(p => `${p.name} ${fw(p.w, 0)}×${p.r}`).join(', ') : 'No new PRs this week']);
  if (r.mg.length) rows.push(['🎯', 'Goal work', r.mg.map(g => `${GOALS[g][0]} ${r.goals[g] || 0}`).join('  '), 'Sets and sessions per goal']);
  rows.push(['⚖️', 'Weight trend', r.wChange != null ? `${signed(U.w(r.wChange))} ${U.wu}` : '—', r.wChange != null ? 'Smoothed change over the week' : 'Weigh in a few times a week']);
  rows.push(['🥩', 'Protein goal', r.food ? `${r.pHit} of ${r.food} days` : '—', r.food ? `Days you logged food` : 'No food logged']);
  if (r.dunk) rows.push(['🏀', 'Dunk progress', r.vNow ? `${trim(r.vNow, 1)}″ vert` : r.rNow ? ftin(r.rNow) : '—', r.jumps ? (r.vNow > r.vBefore && r.vBefore ? `+${trim(r.vNow - r.vBefore, 1)}″ over your old best!` : r.rNow > r.rBefore && r.rBefore ? `New best touch, +${trim(r.rNow - r.rBefore, 1)}″` : plural(r.jumps, 'jump test')) : 'No jump tests this week']);
  return rows;
}
function recapCardHTML(full) {
  const r = recapData(), rows = recapRows(r);
  return `<section class="card recap"><div class="card-h"><div>${full ? '' : '<div class="eyebrow">Weekly recap</div>'}<h2 class="sec-t" style="margin:0">${fmtDate(r.wk, { rel: false })} – ${fmtDate(r.end, { rel: false })}</h2></div>${full ? '' : '<button class="iconbtn" data-act="recapHide" aria-label="Hide recap">✕</button>'}</div>
    ${rows.map(([ic, k, v, sub]) => `<div class="row"><span class="ic" aria-hidden="true">${ic}</span><span class="grow"><b>${esc(k)}</b><div class="faint small">${esc(sub)}</div></span><b class="rnum">${esc(v)}</b></div>`).join('')}
    <button class="btn block" data-act="recapShare">Share as image</button></section>`;
}
function recapHomeHTML() {
  const dow = new Date().getDay(), wk = recapWeek();
  const any = Store.list('workouts').length || weighins().length;
  if (!any) return '';
  if ([0, 1, 2].includes(dow) && S().recapSeen !== wk) return recapCardHTML(false);
  return `<button class="linkbtn recap-link" data-act="recapOpen">🗓️ See last week's recap</button>`;
}
A.recapHide = () => { saveSettings({ recapSeen: recapWeek() }); };
A.recapOpen = () => openSheet('Weekly recap', recapCardHTML(true).replace('<section class="card recap">', '<section class="recap">'));
async function recapImage() {
  const r = recapData(), rows = recapRows(r), W = 1080, H = Math.max(1080, 300 + rows.length * 190 + 110), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1b21'); bg.addColorStop(1, '#0c0c0f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3392f5'; g.fillRect(80, 96, 10, 96);
  g.fillStyle = '#fff'; g.font = `800 64px ${F}`; g.fillText('Weekly recap', 116, 150);
  g.fillStyle = '#9a9aa6'; g.font = `500 36px ${F}`; g.fillText(`${fmtDate(r.wk, { rel: false })} – ${fmtDate(r.end, { rel: false })}`, 116, 196);
  let y = 300;
  for (const [ic, k, v, sub] of rows) {
    g.fillStyle = '#17171c'; roundRect(g, 64, y - 76, W - 128, 164, 28); g.fill();
    g.font = `60px ${F}`; g.fillStyle = '#fff'; g.fillText(ic, 100, y + 22);
    g.font = `700 40px ${F}`; g.fillText(k, 200, y - 2);
    g.font = `400 30px ${F}`; g.fillStyle = '#9a9aa6'; g.fillText(fitText(g, sub, 520), 200, y + 44);
    g.font = `800 46px ${F}`; g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(fitText(g, v, 300), W - 100, y + 20); g.textAlign = 'left';
    y += 190;
  }
  g.fillStyle = '#5c5c66'; g.font = `600 32px ${F}`; g.textAlign = 'center'; g.fillText('liftprint', W / 2, H - 60); g.textAlign = 'left';
  return new Promise(res => c.toBlob(res, 'image/png'));
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitText(g, t, max) { if (g.measureText(t).width <= max) return t; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }
A.recapShare = async () => {
  const blob = await recapImage(); if (!blob) { toast("Couldn't make the image"); return; }
  const file = new File([blob], `liftprint-recap-${recapWeek()}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'My week' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  downloadBlob(blob, file.name); toast('Recap image saved');
};
function downloadBlob(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }

/* ---------- milestones ---------- */
function liftTop(name) { const L = liftByKey(keyOf(name)); return L && L.heavy ? L.heavy.w : 0; }
function proteinStreak() { const s = S(); let n = 0, d = todayStr(); if (foodTotals(d).p < s.proteinTarget) d = addDays(d, -1); while (n < 400 && foodTotals(d).p >= s.proteinTarget) { n++; d = addDays(d, -1); } return n; }
function msStats() {
  const wos = Store.list('workouts').filter(w => (w.sets || []).length || w.marked).length; let prs = 0; for (const L of liftIndex().values()) prs += L.prs;
  const js = Store.list('jumps'), v = Math.max(0, ...js.map(j => j.vert || 0)), rim = Math.max(0, ...js.map(j => j.rim || 0)), reach = S().reach || 0;
  return { wos, prs, streak: weekStats().streak, prot: proteinStreak(), wi: weighins().length, v, touch: Math.max(rim, reach && v ? reach + v : 0), goal: S().dunkGoal || 120,
    bench: liftTop('Bench Press'), squat: Math.max(liftTop('Squat'), liftTop('Back Squat')), dl: liftTop('Deadlift'), acts: Store.list('acts').length, photos: Store.list('photos').length };
}
const MILESTONES = [
  ['wo1', '🌱', 'First workout', 'Log your first workout', m => [m.wos, 1]],
  ['wo10', '🔟', '10 workouts', 'Log 10 workouts', m => [m.wos, 10]],
  ['wo25', '💪', '25 workouts', 'Log 25 workouts', m => [m.wos, 25]],
  ['wo50', '🔥', '50 workouts', 'Log 50 workouts', m => [m.wos, 50]],
  ['wo100', '💯', '100 workouts', 'Log 100 workouts', m => [m.wos, 100]],
  ['pr1', '🏅', 'First PR', 'Beat a previous best', m => [m.prs, 1]],
  ['pr25', '🏆', '25 PRs', 'Set 25 personal records', m => [m.prs, 25]],
  ['pr100', '👑', '100 PRs', 'Set 100 personal records', m => [m.prs, 100]],
  ['st4', '📅', '4-week streak', 'Hit your weekly goal 4 weeks in a row', m => [m.streak, 4]],
  ['st12', '🗓️', '12-week streak', 'Hit your weekly goal 12 weeks in a row', m => [m.streak, 12]],
  ['p7', '🥩', 'Protein week', 'Hit protein 7 days in a row', m => [m.prot, 7]],
  ['wi30', '⚖️', '30 weigh-ins', 'Log 30 weigh-ins', m => [m.wi, 30]],
  ['b135', '🏋️', 'Plate bench', 'Bench 135 lb', m => [m.bench, 135]],
  ['b225', '🦍', 'Two-plate bench', 'Bench 225 lb', m => [m.bench, 225]],
  ['s225', '🦵', 'Two-plate squat', 'Squat 225 lb', m => [m.squat, 225]],
  ['s315', '🏗️', 'Three-plate squat', 'Squat 315 lb', m => [m.squat, 315]],
  ['d315', '⛓️', 'Three-plate pull', 'Deadlift 315 lb', m => [m.dl, 315]],
  ['d405', '🐉', 'Four-plate pull', 'Deadlift 405 lb', m => [m.dl, 405]],
  ['v24', '🚀', '24″ vertical', 'Jump 24 inches', m => [m.v, 24]],
  ['v30', '🛸', '30″ vertical', 'Jump 30 inches', m => [m.v, 30]],
  ['rim', '🏀', 'Touch the rim', 'Reach your rim height', m => [m.touch, m.goal]],
  ['dunk', '💥', 'Dunk range', 'Touch 6″ above your rim', m => [m.touch, m.goal + 6]],
  ['act10', '⚽', '10 sport sessions', 'Log 10 sport sessions', m => [m.acts, 10]],
  ['ph5', '📸', 'Photo journal', 'Take 5 progress photos', m => [m.photos, 5]],
];
function checkMilestones() {
  if (!Store.loaded || Store.mode === 'loading' || !S().onboarded) return;
  const m = msStats(), have = S().badges, now = {}, fresh = [];
  for (const [id, ic, name, , f] of MILESTONES) { const [v, t] = f(m); if (v >= t) { now[id] = (have && have[id]) || todayStr(); if (have && !have[id]) fresh.push([ic, name]); } }
  if (!have) { saveSettings({ badges: now }); return; } // first run: earn silently
  if (!fresh.length) return;
  saveSettings({ badges: { ...have, ...now } });
  const [ic, name] = fresh[fresh.length - 1];
  toast(`${ic} Milestone unlocked: ${name}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`);
  if (!REDUCED()) confetti();
  if (typeof sfx === 'function') sfx('pr');
}
{
  const base = changed;
  changed = function () { base(); clearTimeout(checkMilestones.t); checkMilestones.t = setTimeout(checkMilestones, 900); };
}
function milestonesCardHTML() {
  const have = S().badges || {}, m = msStats(), n = MILESTONES.filter(x => have[x[0]]).length;
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Milestones</h2><span class="faint small">${n} of ${MILESTONES.length}</span></div>
    <div class="badges">${MILESTONES.map(x => { const [v, t] = x[4](m); return [x, have[x[0]] ? 2 : Math.min(1, v / t)]; }).sort((a, b) => b[1] - a[1]).slice(0, UI.msAll ? 99 : 8).map(([[id, ic, name, desc, f]]) => { const got = have[id], [v, t] = f(m), pct = Math.min(100, Math.round(v / t * 100));
      return `<button class="badge${got ? ' got' : ''}" data-act="badgeInfo" data-id="${id}" aria-label="${esc(name)}${got ? ', earned' : `, ${pct}%`}"><span class="bi">${ic}</span><span class="bn">${esc(name)}</span>${got ? '' : `<span class="bp"><i style="width:${pct}%"></i></span>`}</button>`; }).join('')}</div>${UI.msAll ? '' : `<button class="linkbtn" data-act="msAll" style="align-self:center">Show all ${MILESTONES.length}</button>`}</section>`;
}
A.msAll = () => { UI.msAll = true; render(); };
A.badgeInfo = d => {
  const x = MILESTONES.find(q => q[0] === d.id); if (!x) return; const [id, ic, name, desc, f] = x, got = (S().badges || {})[id], [v, t] = f(msStats());
  toast(got ? `${ic} ${name}: earned ${fmtDate(got)}` : `${ic} ${desc} (${trim(Math.min(v, t), 1)} / ${trim(t, 1)})`);
};

/* ---------- CSV export ---------- */
const csvCell = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csvOf = rows => rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n';
function csvFiles() {
  const wu = U.wu, out = [];
  const sets = [['date', 'workout', 'exercise', 'set', `weight (${wu})`, 'reps', 'warmup', 'completed', `est 1RM (${wu})`]];
  for (const w of Store.list('workouts').sort((a, b) => a.date.localeCompare(b.date))) { let n = 0; for (const s of w.sets || []) { n++; sets.push([w.date, w.dayName || '', s.ex, n, trim(U.w(+s.w || 0), 1), s.r, s.warm ? 'yes' : '', s.hit === false ? 'no' : 'yes', trim(U.w(e1rm(+s.w || 0, s.r || 1)), 1)]); } }
  out.push(['liftprint-sets.csv', sets]);
  out.push(['liftprint-weighins.csv', [['date', 'time', `weight (${wu})`, `trend (${wu})`, 'body fat %'], ...weighins().map(w => [w.date, w.time || '', trim(U.w(w.weight), 1), trim(U.w(trendOn(w.date, weighins()) || w.weight), 1), w.bf || ''])]]);
  const food = [['date', 'food', 'qty', 'kcal', 'protein g', 'carbs g', 'fat g']];
  for (const d of Store.list('food').sort((a, b) => a.date.localeCompare(b.date))) for (const it of d.items || []) { const q = it.qty || 1; food.push([d.date, it.name, trim(q, 2), Math.round((it.cal || 0) * q), trim((it.p || 0) * q, 1), trim((it.c || 0) * q, 1), trim((it.f || 0) * q, 1)]); }
  out.push(['liftprint-food.csv', food]);
  const acts = [['date', 'activity', 'minutes', `distance (${U.metric ? 'km' : 'mi'})`, 'active kcal', 'avg heart rate']];
  for (const a of Store.list('acts').sort((x, y) => x.date.localeCompare(y.date))) acts.push([a.date, actName(a), a.duration ? trim(a.duration / 60, 1) : '', a.dist ? trim(U.metric ? a.dist * 1.609344 : a.dist, 2) : '', a.activeCal || '', a.avgHr || '']);
  out.push(['liftprint-activities.csv', acts]);
  return out.filter(([, rows]) => rows.length > 1).map(([name, rows]) => new File([csvOf(rows)], name, { type: 'text/csv' }));
}
A.csvExport = async () => {
  const files = csvFiles(); if (!files.length) { toast('Nothing to export yet'); return; }
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: 'Liftprint spreadsheets' }); toast(`Exported ${plural(files.length, 'file')}`); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  for (const f of files) downloadBlob(f, f.name);
  toast(`Downloaded ${plural(files.length, 'CSV file')}`);
};
