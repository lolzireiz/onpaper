'use strict';
/* Train: equipment, exercise library, gyms, split, workout sessions, rest timer, calendar. */

const GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
const EQUIP = [
  ['Free weights', [['barbell', 'Barbell + plates'], ['rack', 'Squat / power rack'], ['bench', 'Flat bench'], ['incline', 'Incline / adjustable bench'], ['db', 'Dumbbells'], ['ez', 'EZ curl bar'], ['kb', 'Kettlebells']]],
  ['Machines', [['smith', 'Smith machine'], ['legpress', 'Leg press'], ['hack', 'Hack squat'], ['legext', 'Leg extension'], ['legcurl', 'Leg curl'], ['chestpress', 'Chest press machine'], ['shoulderpress', 'Shoulder press machine'], ['pecdeck', 'Pec deck / rear delt'], ['calf', 'Calf raise machine'], ['hipthrust', 'Hip thrust machine'], ['abductor', 'Hip abductor / adductor'], ['tbar', 'T-bar row'], ['preacher', 'Preacher bench']]],
  ['Cables & stations', [['cable', 'Cable station'], ['lat', 'Lat pulldown'], ['row', 'Seated cable row'], ['pullup', 'Pull-up bar'], ['dip', 'Dip station'], ['ghd', 'Back extension / GHD']]],
];
const EQ_IDS = EQUIP.flatMap(g => g[1].map(e => e[0]));
const EQ_LABEL = Object.fromEntries(EQUIP.flatMap(g => g[1]));
const BASIC_EQ = ['barbell', 'rack', 'bench', 'incline', 'db', 'pullup'];
const LIBRARY = [
  ['Bench Press', 'Chest', ['barbell', 'bench']], ['Incline Bench Press', 'Chest', ['barbell', 'incline']], ['Dumbbell Bench Press', 'Chest', ['db', 'bench']],
  ['Incline Dumbbell Press', 'Chest', ['db', 'incline']], ['Machine Chest Press', 'Chest', ['chestpress']], ['Smith Incline Press', 'Chest', ['smith', 'incline']], ['Smith Bench Press', 'Chest', ['smith', 'bench']],
  ['Pec Deck Fly', 'Chest', ['pecdeck']], ['Cable Fly', 'Chest', ['cable']], ['Low-to-High Cable Fly', 'Chest', ['cable']], ['Dips', 'Chest', ['dip']], ['Push-ups', 'Chest', []],
  ['Deadlift', 'Back', ['barbell']], ['Pull-ups', 'Back', ['pullup']], ['Chin-ups', 'Back', ['pullup']], ['Barbell Row', 'Back', ['barbell']], ['Lat Pulldown', 'Back', ['lat']],
  ['Seated Cable Row', 'Back', ['row']], ['Dumbbell Row', 'Back', ['db', 'bench']], ['T-Bar Row', 'Back', ['tbar']], ['Chest-Supported Row', 'Back', ['db', 'incline']],
  ['Straight-Arm Pulldown', 'Back', ['cable']], ['Back Extension', 'Back', ['ghd']],
  ['Overhead Press', 'Shoulders', ['barbell', 'rack']], ['Dumbbell Shoulder Press', 'Shoulders', ['db']], ['Machine Shoulder Press', 'Shoulders', ['shoulderpress']],
  ['Lateral Raise', 'Shoulders', ['db']], ['Cable Lateral Raise', 'Shoulders', ['cable']], ['Rear Delt Fly', 'Shoulders', ['pecdeck']], ['Face Pull', 'Shoulders', ['cable']], ['Dumbbell Shrug', 'Shoulders', ['db']],
  ['Barbell Curl', 'Biceps', ['barbell']], ['EZ-Bar Curl', 'Biceps', ['ez']], ['Dumbbell Curl', 'Biceps', ['db']], ['Hammer Curl', 'Biceps', ['db']],
  ['Preacher Curl', 'Biceps', ['preacher', 'ez']], ['Cable Curl', 'Biceps', ['cable']], ['Incline Dumbbell Curl', 'Biceps', ['db', 'incline']],
  ['Triceps Pushdown', 'Triceps', ['cable']], ['Overhead Cable Extension', 'Triceps', ['cable']], ['Rope Pushdown', 'Triceps', ['cable']], ['Overhead Rope Extension', 'Triceps', ['cable']], ['Skull Crushers', 'Triceps', ['ez', 'bench']],
  ['Close-Grip Bench Press', 'Triceps', ['barbell', 'bench']], ['Dumbbell Overhead Extension', 'Triceps', ['db']],
  ['Squat', 'Quads', ['barbell', 'rack']], ['Front Squat', 'Quads', ['barbell', 'rack']], ['Leg Press', 'Quads', ['legpress']], ['Hack Squat', 'Quads', ['hack']],
  ['Leg Extension', 'Quads', ['legext']], ['Smith Squat', 'Quads', ['smith']], ['Bulgarian Split Squat', 'Quads', ['db', 'bench']], ['Goblet Squat', 'Quads', ['db']], ['Walking Lunge', 'Quads', ['db']],
  ['Romanian Deadlift', 'Hamstrings', ['barbell']], ['Dumbbell RDL', 'Hamstrings', ['db']], ['Lying Leg Curl', 'Hamstrings', ['legcurl']], ['Seated Leg Curl', 'Hamstrings', ['legcurl']], ['Kettlebell Swing', 'Hamstrings', ['kb']],
  ['Hip Thrust', 'Glutes', ['barbell', 'bench']], ['Machine Hip Thrust', 'Glutes', ['hipthrust']], ['Cable Kickback', 'Glutes', ['cable']], ['Hip Abduction', 'Glutes', ['abductor']],
  ['Standing Calf Raise', 'Calves', ['calf']], ['Calf Extension', 'Calves', ['calf']], ['Dumbbell Standing Calf Raise', 'Calves', ['db']], ['Seated Calf Raise', 'Calves', ['calf']], ['Leg Press Calf Raise', 'Calves', ['legpress']], ['Smith Calf Raise', 'Calves', ['smith']],
  ['Hanging Leg Raise', 'Core', ['pullup']], ['Cable Crunch', 'Core', ['cable']], ['Plank', 'Core', []], ['Decline Sit-up', 'Core', ['bench']],
  ['Farmer Carry', 'Core', ['db']], ['Cable Woodchop', 'Core', ['cable']], ['Pallof Press', 'Core', ['cable']], ['Dead Bug', 'Core', []],
  ['Jump Squat', 'Quads', []], ['Lateral Bounds', 'Quads', []], ['Lateral Lunge', 'Quads', ['db']], ['Step-up', 'Quads', ['db', 'bench']],
  ['Single-Leg RDL', 'Hamstrings', ['db']], ['Tibialis Raise', 'Calves', []],
].map(([name, group, equip]) => ({ name, group, equip }));
const TEMPLATES = {
  ppl: { label: 'Push / Pull / Legs', days: [
    { name: 'Push', groups: ['Chest', 'Shoulders', 'Triceps'], ex: ['Bench Press', 'Incline Dumbbell Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Triceps Pushdown', 'Overhead Cable Extension'] },
    { name: 'Pull', groups: ['Back', 'Biceps'], ex: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Face Pull', 'Dumbbell Curl', 'Hammer Curl'] },
    { name: 'Legs', groups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], ex: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Lying Leg Curl', 'Leg Extension', 'Standing Calf Raise'] }] },
  ul: { label: 'Upper / Lower', days: [
    { name: 'Upper', groups: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'], ex: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Dumbbell Curl', 'Triceps Pushdown'] },
    { name: 'Lower', groups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], ex: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Lying Leg Curl', 'Standing Calf Raise'] }] },
  bro: { label: 'Body part split', days: [
    { name: 'Chest', groups: ['Chest'], ex: ['Bench Press', 'Incline Dumbbell Press', 'Machine Chest Press', 'Cable Fly', 'Dips'] },
    { name: 'Back', groups: ['Back'], ex: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row'] },
    { name: 'Shoulders', groups: ['Shoulders'], ex: ['Overhead Press', 'Lateral Raise', 'Rear Delt Fly', 'Face Pull', 'Dumbbell Shrug'] },
    { name: 'Arms', groups: ['Biceps', 'Triceps'], ex: ['Barbell Curl', 'Close-Grip Bench Press', 'Hammer Curl', 'Triceps Pushdown', 'Preacher Curl', 'Overhead Cable Extension'] },
    { name: 'Legs', groups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'], ex: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Lying Leg Curl', 'Standing Calf Raise'] }] },
  full: { label: 'Full body', days: [
    { name: 'Full Body A', groups: ['Quads', 'Chest', 'Back', 'Shoulders'], ex: ['Squat', 'Bench Press', 'Barbell Row', 'Lateral Raise', 'Dumbbell Curl'] },
    { name: 'Full Body B', groups: ['Hamstrings', 'Back', 'Shoulders', 'Chest'], ex: ['Deadlift', 'Overhead Press', 'Pull-ups', 'Incline Dumbbell Press', 'Triceps Pushdown'] }] },
};

function library() {
  return Store.cached('lib', () => {
    const m = new Map(); for (const e of LIBRARY) m.set(keyOf(e.name), e);
    for (const c of S().customEx || []) if (!m.has(keyOf(c.name))) m.set(keyOf(c.name), { name: c.name, group: c.group || 'Other', equip: [], custom: true });
    return m;
  });
}
const gyms = () => Store.list('gyms').sort((a, b) => (a.ts || 0) - (b.ts || 0));
const activeGym = () => { const gs = gyms(); return gs.find(g => g.id === S().activeGym) || gs[0] || null; };
function available(name, gym) { if (!gym) return true; const e = library().get(keyOf(name)); return !e || e.equip.every(q => (gym.equip || []).includes(q)); }
const splitDays = () => (S().split && S().split.days) || [];
function nextDay() {
  const days = splitDays(); if (!days.length) return null;
  const last = Store.list('workouts').filter(w => w.dayId && !w.quick).sort((a, b) => (b.startTs || 0) - (a.startTs || 0))[0];
  const i = last ? days.findIndex(d => d.id === last.dayId) : -1;
  return days[(i + 1) % days.length];
}
function alternatives(name, gym, exclude = []) {
  const e = library().get(keyOf(name)); const grp = e ? e.group : null; const ex = new Set(exclude.map(keyOf));
  return [...library().values()].filter(x => x.group === grp && !ex.has(keyOf(x.name)) && available(x.name, gym));
}
function planFor(day, gym) {
  const used = [];
  return (day.exercises || []).map(name => {
    if (available(name, gym)) { used.push(name); return { name, use: name }; }
    const alt = alternatives(name, gym, [...day.exercises, ...used])[0];
    if (alt) used.push(alt.name);
    return { name, use: alt ? alt.name : null, swapped: true };
  });
}
function lastSessionSets(name, excludeWid) {
  const k = keyOf(name);
  const ws = Store.list('workouts').filter(w => w.id !== excludeWid && (w.sets || []).some(s => keyOf(s.ex) === k)).sort((a, b) => b.date.localeCompare(a.date) || (b.startTs || 0) - (a.startTs || 0));
  if (!ws.length) return null;
  return { date: ws[0].date, sets: ws[0].sets.filter(s => keyOf(s.ex) === k) };
}

/* ---------- view ---------- */
Views.train = {
  title() { const w = activeWorkout(); return UI.session && w ? `<h1>${esc(w.dayName || 'Workout')}</h1>` : '<h1>Train</h1>'; },
  actions() { return UI.session && activeWorkout() ? `<button class="btn sm" data-act="finishWorkout">Finish</button>` : ''; },
  render() { const w = activeWorkout(); if (UI.session && w) return sessionHTML(w); UI.session = false; return overviewHTML(); },
};
function overviewHTML() {
  const w = activeWorkout();
  let h = w ? `<section class="card"><div class="card-h"><div><div class="eyebrow">In progress</div><h2 class="lift-h" style="font-size:34px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${esc(w.gymName || 'No gym')} · started ${fmtClock(w.startTs)} · ${plural((w.sets || []).length, 'set')}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>` : startCardHTML();
  return deloadBannerHTML() + h + actsCardHTML() + heatmapCardHTML() + weekCardHTML() + splitCardHTML() + gymsCardHTML() + recentWorkoutsHTML();
}
function startCardHTML() {
  const days = splitDays(), gs = gyms(), nd = nextDay();
  const day = days.find(d => d.id === UI.planDay) || nd, gym = gs.find(g => g.id === UI.planGym) || activeGym();
  let h = `<section class="card"><h2 class="sec-t">Start a workout</h2>`;
  if (days.length) h += `<div class="chips scroll">${days.map(d => `<button class="chip" data-act="planDay" data-id="${d.id}" aria-pressed="${d.id === day?.id}">${esc(d.name)}${d.id === nd?.id ? ' <span class="faint">· next</span>' : ''}</button>`).join('')}</div>`;
  else h += `<p class="muted small" style="margin:0">No split yet. Get a plan for each gym day:</p><div class="fields"><button class="btn" data-act="buildProgram">✨ Build one for me</button><button class="btn ghost" data-act="editSplit">Make my own</button></div>`;
  if (gs.length > 1) h += `<div class="chips scroll">${gs.map(g => `<button class="chip" data-act="planGym" data-id="${g.id}" aria-pressed="${g.id === gym?.id}">${esc(g.name)}</button>`).join('')}</div>`;
  else if (!gs.length) h += `<p class="muted small">Add your gym so the plan only uses equipment it has. <button class="linkbtn" data-act="editGym">Add gym</button></p>`;
  if (day) {
    const plan = planFor(day, gym);
    h += `<div class="plan">${plan.map(p => {
      const last = p.use ? lastSessionSets(p.use) : null;
      const lastTxt = last ? `${fw(last.sets[0].w)}×${last.sets[0].r}` : '';
      const tg = tgtFor(p.use || p.name);
      if (!p.swapped) return `<div class="row"><span class="grow">${esc(p.name)}${goalDot(p.name)}${painDot(p.name)} <span class="faint small">${tg.sets}×${esc(tg.reps)}</span></span><span class="faint small rnum">${lastTxt}</span>${musBtn(p.name)}</div>`;
      return `<div class="row"><span class="grow">${p.use ? `<s>${esc(p.name)}</s> → ${esc(p.use)}` : `<s>${esc(p.name)}</s>`}<div class="faint small">${p.use ? 'Swapped: not at this gym' : 'Skipped: nothing similar at this gym'}</div></span><span class="faint small rnum">${lastTxt}</span></div>`;
    }).join('')}</div>`;
  }
  h += `<button class="btn block" data-act="startWorkout">${day ? 'Start ' + esc(day.name) : 'Start empty workout'}${gym ? ` <span style="opacity:.75;font-weight:500">at ${esc(gym.name)}</span>` : ''}</button></section>`;
  return h;
}
function weekCardHTML() {
  const st = weekStats(), m = UI.calMonth || todayStr().slice(0, 7), [y, mo] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1), off = (first.getDay() + 6) % 7, nDays = new Date(y, mo, 0).getDate(), t = todayStr();
  let cells = '', count = 0;
  for (let i = 0; i < off; i++) cells += '<span></span>';
  for (let d = 1; d <= nDays; d++) {
    const ds = `${y}-${pad(mo)}-${pad(d)}`, on = st.days.has(ds); if (on) count++;
    cells += `<button data-act="calDay" data-date="${ds}" class="${on ? 'gym' : ''}${ds === t ? ' today' : ''}${ds > t ? ' fut' : ''}" aria-label="${fmtDay(ds)}${on ? ', gym day' : ''}">${d}</button>`;
  }
  return `<section class="card"><div class="cal-top"><div class="stat"><span class="k">This week</span><span class="big">${st.cur}<span class="unit">of ${st.goal} days</span></span></div><div class="stat" style="text-align:right"><span class="k">Week streak</span><span class="big">${st.streak}</span></div></div>
  <div class="cal-nav"><button class="iconbtn sm" data-act="calMove" data-d="-1" aria-label="Previous month">${ICON.chevL}</button><b>${MONTH[mo - 1]} ${y}</b><button class="iconbtn sm" data-act="calMove" data-d="1" aria-label="Next month">${ICON.chevR}</button></div>
  <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<div class="cal-h">${d}</div>`).join('')}${cells}</div>
  <p class="faint small">${plural(count, 'active day')} in ${MONTH[mo - 1]}. Workouts and sports both count. A week counts toward your streak when you hit ${st.goal} days. Tap a day to see it or add to it.</p></section>`;
}
function splitCardHTML() {
  const days = splitDays();
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Your split</h2><button class="linkbtn" data-act="editSplit">${days.length ? 'Edit' : 'Set up'}</button></div>
  ${days.length ? `<ol class="split">${days.map((d, i) => `<li><span class="n">${i + 1}</span><div class="grow"><b>${esc(d.name)}</b><div class="faint small">${esc((d.exercises || []).slice(0, 4).join(' · '))}${(d.exercises || []).length > 4 ? ` +${d.exercises.length - 4}` : ''}</div></div></li>`).join('')}</ol><p class="faint small">Days rotate in order. Up next is the day after your last workout.</p>`
    : `<p class="muted small">Start from Push / Pull / Legs or another template, then change each day's exercises.</p>`}</section>`;
}
function gymsCardHTML() {
  const gs = gyms(), ag = activeGym();
  return `<section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t">Gyms</h2><button class="linkbtn" data-act="editGym">+ Add gym</button></div>
  ${gs.length ? gs.map(g => `<div class="row"><button class="radio" data-act="setGym" data-id="${g.id}" aria-pressed="${g.id === ag?.id}" aria-label="Train at ${esc(g.name)} by default"></button><div class="grow"><b>${esc(g.name)}</b><div class="faint small">${(g.equip || []).length} of ${EQ_IDS.length} equipment types${g.id === ag?.id ? ' · default' : ''}</div></div><button class="linkbtn" data-act="editGym" data-id="${g.id}">Edit</button></div>`).join('')
    : `<p class="muted small" style="padding-bottom:14px">Save each gym you go to with the equipment it has. Exercises that need missing equipment never get suggested there.</p>`}</section>`;
}
function recentWorkoutsHTML() {
  const ws = Store.list('workouts').filter(w => !w.quick && (w.sets || []).length && (w.endTs || w.id !== activeWorkout()?.id)).sort((a, b) => b.date.localeCompare(a.date) || (b.startTs || 0) - (a.startTs || 0)).slice(0, 6);
  if (!ws.length) return '';
  const idx = liftIndex();
  return `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">Recent workouts</h2>${ws.map(w => {
    const prs = (w.sets || []).filter(s => setRec(idx.get(keyOf(s.ex)), s.id)?.pr).length;
    return `<button class="row" data-act="showWorkout" data-id="${w.id}"><div class="grow"><b>${esc(w.dayName || 'Workout')}</b>${prs ? ` <span class="pr">${prs} PR${prs > 1 ? 's' : ''}</span>` : ''}<div class="faint small">${fmtDate(w.date)}${w.gymName ? ' · ' + esc(w.gymName) : ''} · ${plural(w.sets.length, 'set')}${w.watch ? ' · ⌚ ' + esc(watchLine(w)) : ''}</div></div><span class="faint">${ICON.chevR.replace('<svg', '<svg width="18" height="18"')}</span></button>`;
  }).join('')}</section>`;
}

/* ---------- session ---------- */
function sessionNames(w) { const names = [...(w.plan || [])]; for (const s of w.sets || []) if (!names.some(n => keyOf(n) === keyOf(s.ex))) names.push(s.ex); return names; }
function sessionHTML(w) {
  const mins = Math.max(0, Math.round((Date.now() - w.startTs) / 6e4));
  let h = `<p class="muted small">${esc(w.gymName || 'No gym')} · ${mins} min · ${plural((w.sets || []).length, 'set')}</p>`;
  for (const n of sessionNames(w)) h += exBlockHTML(w, n);
  h += `<button class="btn ghost block" data-act="addExercise">${ICON.plus} Add exercise</button><button class="linkbtn danger center" data-act="discardWorkout">Discard workout</button>`;
  return h;
}
const COMPOUND = new Set(['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Machine Chest Press', 'Smith Incline Press', 'Smith Bench Press', 'Dips', 'Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Dumbbell Row', 'T-Bar Row', 'Chest-Supported Row', 'Overhead Press', 'Dumbbell Shoulder Press', 'Machine Shoulder Press', 'Close-Grip Bench Press', 'Squat', 'Front Squat', 'Leg Press', 'Hack Squat', 'Smith Squat', 'Bulgarian Split Squat', 'Goblet Squat', 'Walking Lunge', 'Romanian Deadlift', 'Dumbbell RDL', 'Hip Thrust', 'Machine Hip Thrust'].map(keyOf));
const isCompound = n => COMPOUND.has(keyOf(n));
const defaultTarget = n => ({ sets: S().defaultSets || 3, reps: isCompound(n) ? '6-8' : '8-12' });
const tgtFor = n => ({ ...defaultTarget(n), ...((S().exTargets || {})[keyOf(n)] || {}) });
const exTarget = (w, n) => tgtFor(n);
const repRange = r => { const m = String(r || '').match(/(\d+)\s*[-–to]+\s*(\d+)/); if (m) return [+m[1], +m[2]]; const n = parseInt(r, 10); return n ? [n, n] : [8, 12]; };
function weightStep(name) { const e = library().get(keyOf(name)); if (bwFactor(name) && e && (e.equip || []).includes('db')) return U.metric ? 4 : 10; const lower = e && ['Quads', 'Hamstrings', 'Glutes'].includes(e.group) && !(e.equip || []).includes('db'); return U.metric ? (lower ? 5 : 2.5) : (lower ? 10 : 5); }
function suggestion(w, name) {
  const t = exTarget(w, name), [lo, hi] = repRange(t.reps), prev = lastSessionSets(name, w.id); if (!prev) return null;
  const work = prev.sets.filter(s => !s.warm && s.hit !== false); if (!work.length) return null;
  const top = Math.max(...work.map(s => s.w || 0)), at = work.filter(s => (s.w || 0) === top), best = Math.max(...at.map(s => s.r));
  const missedTop = prev.sets.some(s => !s.warm && s.hit === false && (s.w || 0) >= top);
  if (top > 0 && !missedTop && at.every(s => s.r >= hi)) { const nw = top + U.toLb(weightStep(name)); return { w: nw, r: lo, why: `You hit ${hi}+ reps on every set at ${fw(top)} last time, so go up to ${fw(nw)}.` }; }
  const r = Math.min(hi, best + 1);
  return { w: top, r, why: top ? `Stay at ${fw(top)} and aim for ${r} reps (best last time: ${best}). Hit ${hi} on every set and the app will bump the weight.` : `Aim for ${r} reps.` };
}
function exBlockHTML(w, name) {
  const k = slug(name), all = (w.sets || []).filter(s => keyOf(s.ex) === keyOf(name)), L = liftByKey(keyOf(name));
  const work = all.filter(s => !s.warm && s.hit !== false), t = exTarget(w, name), done = work.length >= t.sets;
  const prev = lastSessionSets(name, w.id), sug = !all.length ? suggestion(w, name) : null, last = all[all.length - 1];
  const pre = last ? { w: last.w, r: last.r } : sug ? sug : prev ? { w: prev.sets.filter(s => !s.warm)[0]?.w ?? prev.sets[0].w, r: prev.sets[0].r } : null;
  const step = weightStep(name), bwf = bwFactor(name), bwNow = latestWeighin()?.weight || S().lastBw || 0;
  const editing = done && UI.unlocked && UI.unlocked.has(keyOf(name));
  if (done && !editing) {
    return `<section class="exb done locked${UI.justDone === keyOf(name) ? ' just-done' : ''}" aria-label="${esc(name)}, finished"><header class="exb-h"><div class="grow"><h3><span style="color:var(--ok)">✓</span> ${esc(name)}</h3><span class="faint small">${work.length}/${t.sets} sets done · locked</span></div><button class="btn ghost sm" data-act="unlockEx" data-ex="${esc(name)}" aria-label="Edit ${esc(name)}">✎ Edit</button></header>
    <div class="schips">${all.map(s => { const rec = setRec(L, s.id); return `<span class="schip${s.warm ? ' w' : ''}${s.hit === false ? ' x' : ''}">${s.warm ? '<i>W</i>' : ''}${bwf ? (s.w ? '+' + fw(s.w) : 'BW') : fw(s.w)}×${s.r}${rec?.pr ? ' <b class="pr">PR</b>' : ''}${s.hit === false ? ' ✗' : ''}</span>`; }).join('')}</div></section>`;
  }
  return `<section class="exb${done ? ' done' : ''}${editing ? ' editing' : ''}${UI.justDone === keyOf(name) ? ' just-done' : ''}"><header class="exb-h"><div class="grow"><h3>${done ? '<span style="color:var(--ok)">✓</span> ' : ''}${esc(name)}</h3><button class="faint small" style="text-align:left;padding:2px 0" data-act="editTarget" data-ex="${esc(name)}" aria-label="Change target for ${esc(name)}">Target <u style="text-decoration-style:dotted;text-underline-offset:3px">${t.sets} × ${esc(t.reps)}</u> · <b style="color:${done ? 'var(--ok)' : 'var(--tx2)'}">${work.length}/${t.sets} sets</b> ✎</button>${exHelps(name).length ? `<div>${goalBadges(name)}</div>` : ''}</div>${musBtn(name)}<button class="iconbtn sm" data-act="exMenu" data-ex="${esc(name)}" aria-label="Options for ${esc(name)}">${ICON.dots}</button></header>
  ${painBarHTML(name)}
  ${editing ? `<div class="unlock-bar"><span>✎ Editing a finished exercise</span><button class="btn sm" data-act="lockEx" data-ex="${esc(name)}">Done</button></div>` : ''}
  ${prev ? `<p class="faint small">Last time (${fmtDate(prev.date)}): ${prev.sets.map(s => `${s.warm ? '<span style="opacity:.6">' : ''}${fw(s.w)}×${s.r}${s.hit === false ? '✗' : ''}${s.warm ? '</span>' : ''}`).join(', ')}</p>` : ''}
  ${sug ? `<p class="small" style="background:rgba(51,146,245,.12);color:#9cc8ff;border-radius:10px;padding:8px 10px"><b>Try ${fw(sug.w)} × ${sug.r}.</b> ${esc(sug.why)}</p>` : ''}
  ${all.length ? `<ol class="sets">${all.map((s, j) => { const rec = setRec(L, s.id); return `<li class="${UI.justSet === s.id ? 'just' : ''}"><button class="setrow" data-act="editSet" data-wid="${w.id}" data-sid="${s.id}"><span class="n">${s.warm ? 'W' : j + 1 - all.slice(0, j).filter(x => x.warm).length}</span><span class="v grow">${bwf ? `${s.w ? '+' + fw(s.w) : 'BW'} <span class="faint">${s.w ? U.wu : ''}</span> × ${s.r} <span class="faint small">≈${fw(bwf * (s.bwt || bwNow) + (s.w || 0), 0)} ${U.wu}</span>` : `${fw(s.w)} <span class="faint">${s.w ? U.wu : ''}</span> × ${s.r}`}</span>${rec?.pr ? '<span class="pr">PR</span>' : ''}${s.hit === false ? '<span class="missb">Missed</span>' : ''}${s.warm ? '<span class="baseb">Warm-up</span>' : ''}</button></li>`; }).join('')}</ol>` : ''}
  <div class="addset2"><div class="stepper"><button data-act="step" data-t="sw-${k}" data-d="-${step}" aria-label="Less weight">−</button><input id="sw-${k}" data-keep inputmode="decimal" value="${pre ? plain(U.w(pre.w)) : ''}" placeholder="${bwf ? '+' + U.wu : U.wu}" aria-label="${bwf ? 'Added weight (both dumbbells together)' : 'Weight'} in ${U.wu} for ${esc(name)}"><button data-act="step" data-t="sw-${k}" data-d="${step}" aria-label="More weight">+</button></div><span class="x">×</span><div class="stepper"><button data-act="step" data-t="sr-${k}" data-d="-1" aria-label="One less rep">−</button><input id="sr-${k}" data-keep inputmode="numeric" value="${pre ? pre.r : ''}" placeholder="reps" aria-label="Reps for ${esc(name)}"><button data-act="step" data-t="sr-${k}" data-d="1" aria-label="One more rep">+</button></div></div>
  ${bwf ? `<div class="bwrow"><label class="faint small" for="sb-${k}">Bodyweight</label><input id="sb-${k}" data-keep inputmode="decimal" value="${bwNow ? plain(U.w(bwNow)) : ''}" placeholder="${U.wu}" aria-label="Your bodyweight in ${U.wu}"><span class="faint small">${U.wu} · weight box = <b>both dumbbells</b> total</span><span class="est" id="est-${k}" data-f="${bwf}">${estTxt(bwf, bwNow ? U.w(bwNow) : 0, pre ? U.w(pre.w) : 0)}</span></div>` : ''}
  <div class="addset-b"><button class="missbtn" id="swu-${k}" data-act="toggle" aria-pressed="false">Warm-up</button><button class="missbtn" id="sh-${k}" data-act="toggle" aria-pressed="false">Missed</button><button class="btn" data-act="logSet" data-ex="${esc(name)}">Log set ${Math.min(work.length + 1, 99)}${work.length < t.sets ? ` of ${t.sets}` : ''}</button></div></section>`;
}
A.unlockEx = d => { UI.unlocked = UI.unlocked || new Set(); UI.unlocked.add(keyOf(d.ex)); UI.justDone = null; render(); const b = [...$$('.exb.editing')].find(x => x.querySelector(`[data-ex="${CSS.escape(d.ex)}"]`)); if (b && !REDUCED()) b.animate([{ opacity: .4, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
A.lockEx = d => { if (UI.unlocked) UI.unlocked.delete(keyOf(d.ex)); render(); };
A.editTarget = d => {
  const t = tgtFor(d.ex); Sheet.tgtEx = d.ex;
  openSheet(`Target: ${d.ex}`, `<div class="field"><span class="lbl">Working sets</span><div class="stepper" style="max-width:220px"><button data-act="step" data-t="tg-s" data-d="-1" aria-label="One fewer set">−</button><input id="tg-s" inputmode="numeric" value="${t.sets}" aria-label="Sets"><button data-act="step" data-t="tg-s" data-d="1" aria-label="One more set">+</button></div></div>
    <div class="field"><label class="lbl" for="tg-r">Rep range</label><input id="tg-r" value="${esc(t.reps)}" placeholder="8-12"><div class="chips" style="margin-top:6px">${['3-5', '5-8', '6-8', '8-10', '8-12', '10-15', '12-15'].map(r => `<button class="chip" data-act="tgReps" data-r="${r}">${r}</button>`).join('')}</div></div>
    <p class="faint small">Saved for ${esc(d.ex)} in every workout from now on, including your split.</p>
    <button class="btn block" data-act="saveTarget">Save</button>`);
};
A.tgReps = d => { const i = $('#tg-r'); if (i) i.value = d.r; };
A.saveTarget = () => {
  const n = Sheet.tgtEx; if (!n) return closeSheet();
  const sets = clamp(Math.round(num($('#tg-s').value) || 3), 1, 12), reps = ($('#tg-r').value || '').trim().replace(/\s+/g, '') || defaultTarget(n).reps;
  const all = clone(S().exTargets || {}), dft = defaultTarget(n);
  if (sets === dft.sets && reps === dft.reps) delete all[keyOf(n)]; else all[keyOf(n)] = { sets, reps };
  saveSettings({ exTargets: all }); closeSheet(); toast(`${n}: ${sets} × ${reps} saved`);
};
A.step = d => { const el = $('#' + d.t); if (!el) return; const v = Math.max(0, (num(el.value) || 0) + (+d.d)); el.value = plain(v, 2); el.dispatchEvent(new Event('input', { bubbles: true })); };
function estTxt(f, bwDisp, addDisp) { return bwDisp ? `≈ <b>${trim(f * bwDisp + (addDisp || 0), 0)} ${U.wu}</b> total${f < 1 ? ` <span class="faint">(${Math.round(f * 100)}% of bodyweight + weight)</span>` : ''}` : 'Enter bodyweight'; }
document.addEventListener('input', e => {
  const id = e.target.id || ''; if (!/^s[wb]-/.test(id)) return;
  const k = id.slice(3), est = document.getElementById('est-' + k); if (!est) return;
  est.innerHTML = estTxt(+est.dataset.f, num($('#sb-' + k)?.value) || 0, num($('#sw-' + k)?.value) || 0);
});
A.resumeWorkout = () => { UI.session = true; UI.tab = 'train'; $('#view').scrollTop = 0; wakeLock(); render(); };
A.planDay = d => { UI.planDay = d.id; render(); };
A.planGym = d => { UI.planGym = d.id; render(); };
A.setGym = d => saveSettings({ activeGym: d.id });
A.startWorkout = () => {
  const days = splitDays(), gs = gyms();
  const day = days.find(d => d.id === UI.planDay) || nextDay(), gym = gs.find(g => g.id === UI.planGym) || activeGym();
  const pf = day ? planFor(day, gym).filter(p => p.use) : [], plan = pf.map(p => p.use);
  const id = newId();
  put('workouts', id, { date: todayStr(), startTs: Date.now(), gymId: gym?.id || null, gymName: gym?.name || '', dayId: day?.id || null, dayName: day?.name || 'Workout', plan, sets: [] });
  UI.session = true; UI.tab = 'train'; UI.planDay = null; $('#view').scrollTop = 0; audioCtx(); wakeLock(); render();
  if (S().watchReminder !== false) toast('⌚ Start a strength workout on your watch too', { ms: 4000 });
};
A.logSet = d => {
  const w = activeWorkout(); if (!w) return;
  const k = slug(d.ex), wIn = num($('#sw-' + k)?.value), r = Math.round(num($('#sr-' + k)?.value) || 0);
  if (UI.unlocked && UI.unlocked.size) UI.unlocked = new Set([...UI.unlocked].filter(x => x === keyOf(d.ex)));
  if (!r || r < 1) { toast('Enter how many reps you did.', { bad: true }); $('#sr-' + k)?.focus(); return; }
  const hit = $('#sh-' + k)?.getAttribute('aria-pressed') !== 'true', warm = $('#swu-' + k)?.getAttribute('aria-pressed') === 'true';
  const lb = U.toLb(wIn || 0), L = liftByKey(keyOf(d.ex)), bwf = bwFactor(d.ex), bwIn = num($('#sb-' + k)?.value), bwt = bwf ? (bwIn ? U.toLb(bwIn) : (latestWeighin()?.weight || S().lastBw || 0)) : 0;
  if (bwf && !bwt) { toast('Enter your bodyweight so the app can estimate the load.', { bad: true }); $('#sb-' + k)?.focus(); return; }
  const eff = bwf ? bwf * bwt + lb : lb;
  const prev = L ? bestAtLeast(L.best, r) : null, isPR = hit && !warm && L && L.hits > 0 && eff > (prev ? prev.w : -1) + 1e-9;
  const set = { id: newId(), ex: d.ex, w: lb, r, hit, ts: Date.now() }; if (warm) set.warm = true; if (bwf) set.bwt = bwt;
  if (bwf && bwIn && Math.abs(bwt - (S().lastBw || 0)) > 0.05 && !latestWeighin()) saveSettings({ lastBw: bwt });
  UI.justSet = set.id; clearTimeout(UI.justT); UI.justT = setTimeout(() => { UI.justSet = UI.justDone = null; }, 1200);
  const btnEl = d && document.querySelector(`.exb [data-act=logSet][data-ex="${CSS.escape(d.ex)}"]`);
  put('workouts', w.id, { ...clone(w), sets: [...(w.sets || []), set] });
  if (isPR) setTimeout(() => celebratePR(btnEl), 60); else sparkle(btnEl);
  if (isPR) toast(`PR! ${d.ex}: ${r === 1 ? 'new 1-rep max' : `new ${r}-rep max`}, ${bwf ? `≈${fw(eff, 0)} ${U.wu} total` : fwu(lb)}`, { pr: true, ms: 3600 });
  const base = S().restSec || 120, rest = warm ? 60 : isCompound(d.ex) ? (r <= 6 ? Math.max(base, 180) : base) : Math.max(60, Math.min(base, 90));
  const names = sessionNames(activeWorkout() || w), doneSets = n => [...(w.sets || []), set].filter(s => keyOf(s.ex) === keyOf(n) && !s.warm && s.hit !== false).length;
  const nextEx = doneSets(d.ex) >= exTarget(w, d.ex).sets ? (names.find(n => doneSets(n) < exTarget(w, n).sets) || d.ex) : d.ex;
  startRest(rest, nextEx);
  const t = exTarget(w, d.ex), doneNow = (w.sets || []).filter(s => keyOf(s.ex) === keyOf(d.ex) && !s.warm && s.hit !== false).length + (hit && !warm ? 1 : 0);
  if (doneNow === t.sets) { UI.justDone = keyOf(d.ex); scheduleRender(); if (!isPR) { toast(`${d.ex} done: ${t.sets} working sets ✓`); setTimeout(() => sparkle(btnEl, ['#3ccf82', '#9ff0c4', '#ffffff']), 120); } }
};
A.addExercise = () => {
  const w = activeWorkout(); if (!w) return;
  const gym = gyms().find(g => g.id === w.gymId) || null;
  openExercisePicker(name => { const cur = activeWorkout(); if (!cur) return; if (sessionNames(cur).some(n => keyOf(n) === keyOf(name))) return; put('workouts', cur.id, { ...clone(cur), plan: [...(cur.plan || []), name] }); }, gym, sessionNames(w));
};
A.exMenu = d => {
  const w = activeWorkout(); if (!w) return;
  const has = (w.sets || []).some(s => keyOf(s.ex) === keyOf(d.ex));
  const f = bwFactor(d.ex);
  openSheet(d.ex, `<div class="field"><span class="lbl">Counts your bodyweight?</span><div class="chips">${[[0, 'No'], [0.5, '50%'], [0.64, '64%'], [0.85, '85%'], [1, '100%']].map(([v, l]) => `<button class="chip" data-act="setBwf" data-ex="${esc(d.ex)}" data-f="${v}" aria-pressed="${Math.abs(f - v) < 0.001}">${l}</button>`).join('')}</div><p class="faint tiny">For moves like pull-ups or dumbbell calf raises: you enter the added weight, and the app adds that share of your bodyweight to estimate the total load (and judges PRs on it).</p></div><div class="fields"><button class="btn ghost" data-act="moveEx" data-ex="${esc(d.ex)}" data-d="-1" ${sessionNames(w).findIndex(n => keyOf(n) === keyOf(d.ex)) <= 0 ? 'disabled' : ''}>↑ Move up</button><button class="btn ghost" data-act="moveEx" data-ex="${esc(d.ex)}" data-d="1" ${sessionNames(w).findIndex(n => keyOf(n) === keyOf(d.ex)) >= sessionNames(w).length - 1 ? 'disabled' : ''}>↓ Move down</button></div><button class="btn ghost block" data-act="swapEx" data-ex="${esc(d.ex)}">Swap for another exercise</button><button class="btn ghost block" data-act="painFlag" data-ex="${esc(d.ex)}">${painOf(d.ex) ? '⚠️ Edit pain flag' : '⚠️ Flag pain'}</button><button class="btn ghost block" data-act="openLift" data-key="${esc(keyOf(d.ex))}">See history and PRs</button><button class="linkbtn danger center" data-act="removeEx" data-ex="${esc(d.ex)}">${has ? 'Remove (and its sets)' : 'Remove from this workout'}</button>`);
};
A.setBwf = d => { const o = clone(S().bwOverride || {}); o[keyOf(d.ex)] = +d.f; saveSettings({ bwOverride: o }); closeSheet(); toast(+d.f ? `${d.ex} now counts ${Math.round(d.f * 100)}% of bodyweight` : `${d.ex} uses weight only`); };
A.moveEx = d => {
  const w = activeWorkout(); if (!w) return; const names = sessionNames(w), i = names.findIndex(n => keyOf(n) === keyOf(d.ex)), j = i + (+d.d);
  if (i < 0 || j < 0 || j >= names.length) return; [names[i], names[j]] = [names[j], names[i]];
  put('workouts', w.id, { ...clone(w), plan: names }); A.exMenu({ ex: d.ex });
  requestAnimationFrame(() => { const b = [...$$('.exb')].find(x => x.querySelector(`[data-ex="${CSS.escape(d.ex)}"]`)); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
};
A.swapEx = d => {
  const w = activeWorkout(); if (!w) return; const gym = gyms().find(g => g.id === w.gymId) || null;
  openExercisePicker(name => {
    const cur = activeWorkout(); if (!cur) return;
    const plan = (cur.plan || []).map(n => keyOf(n) === keyOf(d.ex) ? name : n);
    const sets = (cur.sets || []).map(s => keyOf(s.ex) === keyOf(d.ex) ? { ...s, ex: name } : s);
    put('workouts', cur.id, { ...clone(cur), plan, sets });
  }, gym, sessionNames(w), alternatives(d.ex, gym, sessionNames(w)).map(e => e.name));
};
A.removeEx = async d => {
  const w = activeWorkout(); if (!w) return;
  const has = (w.sets || []).some(s => keyOf(s.ex) === keyOf(d.ex));
  if (has && !(await ask(`Remove ${d.ex} and the sets you logged for it?`, { ok: 'Remove', danger: true }))) return;
  closeSheet();
  const cur = activeWorkout(); if (!cur) return;
  put('workouts', cur.id, { ...clone(cur), plan: (cur.plan || []).filter(n => keyOf(n) !== keyOf(d.ex)), sets: (cur.sets || []).filter(s => keyOf(s.ex) !== keyOf(d.ex)) });
};
A.finishWorkout = async () => {
  const w = activeWorkout(); if (!w) return;
  if (!(w.sets || []).length) {
    if (await ask('No sets logged yet. Discard this workout?', { ok: 'Discard', danger: true })) { del('workouts', w.id); UI.session = false; A.restSkip(); render(); }
    return;
  }
  put('workouts', w.id, { ...clone(w), endTs: Date.now() });
  UI.session = false; UI.unlocked = null; A.restSkip(); releaseWake(); render(); prepBackup(); showWorkout(w.id, true); setTimeout(() => { confetti({ n: 120 }); countUps($('#sheet')); }, 250);
};
A.discardWorkout = async () => {
  const w = activeWorkout(); if (!w) return;
  if (!(await ask(`Discard this workout${(w.sets || []).length ? ` and its ${plural(w.sets.length, 'set')}` : ''}?`, { ok: 'Discard', danger: true }))) return;
  del('workouts', w.id); UI.session = false; UI.unlocked = null; A.restSkip(); releaseWake(); render();
};
A.showWorkout = d => showWorkout(d.id);
function showWorkout(id, justFinished = false) {
  const w = Store.docs.workouts[id]; if (!w) return;
  const idx = liftIndex(), sets = w.sets || [], groups = {};
  for (const s of sets) (groups[s.ex] = groups[s.ex] || []).push(s);
  const vol = sets.filter(s => s.hit !== false && !s.warm).reduce((a, s) => a + (s.w || 0) * s.r, 0);
  const prs = sets.filter(s => setRec(idx.get(keyOf(s.ex)), s.id)?.pr);
  const dur = w.endTs && w.startTs ? Math.round((w.endTs - w.startTs) / 6e4) : null;
  openSheet(justFinished ? 'Workout saved' : (w.dayName || 'Workout'), `
    <p class="muted">${fmtDay(w.date)}${w.gymName ? ' · ' + esc(w.gymName) : ''}</p>
    <div class="stats">${dur != null ? `<div class="stat"><span class="k">Time</span><span class="v">${dur}<span class="unit">min</span></span></div>` : ''}<div class="stat"><span class="k">Sets</span><span class="v" data-count="${sets.length}">${sets.length}</span></div><div class="stat"><span class="k">Volume</span><span class="v"><span data-count="${(U.w(vol) / 1000).toFixed(1)}" data-dp="1">${trim(U.w(vol) / 1000, 1)}</span>k<span class="unit">${U.wu}</span></span></div></div>
    ${justFinished && lastBackup() !== todayStr() ? `<div class="alert bk-row"><span class="ai" aria-hidden="true">💾</span><p>Keep this workout safe</p><button class="btn sm" data-act="backupNow">Back up</button></div>` : ''}
    ${watchSectionHTML(w, id)}
    ${prs.length ? `<div class="note" style="background:none;padding:0"><span class="pr">${prs.length} PR${prs.length > 1 ? 's' : ''}</span> ${prs.map(s => `${esc(s.ex)} ${fw(s.w)}×${s.r}`).join(', ')}</div>` : ''}
    <div>${Object.entries(groups).map(([ex, ss]) => `<div class="pastex"><div class="pastex-h"><b>${esc(ex)}</b>${activeWorkout()?.id === id ? '' : `<button class="linkbtn" data-act="addPastSet" data-wid="${id}" data-ex="${esc(ex)}">+ Add set</button>`}</div><div class="schips">${ss.map(s => `<button class="schip${s.warm ? ' w' : ''}${s.hit === false ? ' x' : ''}" data-act="editSet" data-wid="${id}" data-sid="${s.id}" data-back="1" aria-label="Edit set ${fw(s.w)} by ${s.r}">${s.warm ? '<i>W</i>' : ''}${fw(s.w)}×${s.r}${setRec(idx.get(keyOf(s.ex)), s.id)?.pr ? ' <b class="pr">PR</b>' : ''}${s.hit === false ? ' ✗' : ''}</button>`).join('')}</div></div>`).join('') + (Object.keys(groups).length ? '<p class="faint small" style="margin:6px 0 0">Tap a set to fix it.</p>' : '') || '<p class="muted">Marked as a gym day.</p>'}</div>
    <button class="linkbtn danger center" data-act="deleteWorkout" data-id="${id}">Delete this workout</button>`);
}
A.deleteWorkout = d => {
  const w = Store.docs.workouts[d.id]; if (!w) return; del('workouts', d.id); closeSheet();
  toastUndo(`Deleted ${w.dayName || 'workout'}`, () => put('workouts', d.id, w));
};
A.calMove = d => { const m = UI.calMonth || todayStr().slice(0, 7); const [y, mo] = m.split('-').map(Number); const dt = new Date(y, mo - 1 + (+d.d), 1); UI.calMonth = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`; render(); };
A.calDay = d => {
  const ws = Store.list('workouts').filter(w => w.date === d.date && ((w.sets || []).length || w.marked)), as = actsList().filter(a => a.date === d.date);
  if (ws.length === 1 && !ws[0].marked && !as.length) return showWorkout(ws[0].id);
  const future = d.date > todayStr();
  openSheet(fmtDay(d.date), `${ws.map(w => w.marked ? `<div class="row"><div class="grow"><b>Gym day</b><div class="faint small">Marked without sets</div></div><button class="linkbtn danger" data-act="unmarkDay" data-id="${w.id}">Remove</button></div>` : `<button class="row" data-act="showWorkout" data-id="${w.id}"><div class="grow"><b>${esc(w.dayName || 'Workout')}</b><div class="faint small">${plural(w.sets.length, 'set')}</div></div></button>`).join('')}
  ${as.length ? `<div class="actlist">${as.map(actRowHTML).join('')}</div>` : ''}
  ${!ws.length && !as.length ? `<p class="muted">${future ? "This day hasn't happened yet." : 'Nothing logged on this day.'}</p>` : ''}
  ${future ? '' : `<button class="btn block ${ws.length || as.length ? 'ghost' : ''}" data-act="actPick" data-date="${d.date}">Log a sport or cardio session</button>`}
  ${!future && !ws.some(w => w.marked) ? `<button class="btn block ghost" data-act="markDay" data-date="${d.date}">Mark as a gym day</button>` : ''}`);
};
A.markDay = d => { put('workouts', newId(), { date: d.date, marked: true, sets: [], ts: Date.now() }); closeSheet(); toast(`${fmtDate(d.date)} marked as a gym day`); };
A.unmarkDay = d => { del('workouts', d.id); closeSheet(); };

/* ---------- exercise picker ---------- */
function openExercisePicker(onPick, gym, exclude = [], suggested = []) {
  Sheet.pick = onPick; Sheet.pickGym = gym; Sheet.pickExclude = exclude.map(keyOf); Sheet.pickSuggested = suggested;
  openSheet('Choose exercise', `<input id="ex-q" placeholder="Search or type a new exercise" autocomplete="off" autocapitalize="words"><div id="ex-list" class="exlist"></div>`, {
    onMount(L) { const q = $('#ex-q', L); const draw = () => { $('#ex-list', L).innerHTML = exListHTML(q.value); }; q.addEventListener('input', draw); draw(); },
  });
}
function exListHTML(q) {
  const gym = Sheet.pickGym, ex = new Set(Sheet.pickExclude), qq = keyOf(q);
  const all = [...library().values()].filter(e => !ex.has(keyOf(e.name)) && (!qq || keyOf(e.name).includes(qq) || keyOf(e.group).includes(qq)));
  const avail = all.filter(e => available(e.name, gym)), missing = qq ? all.filter(e => !available(e.name, gym)) : [];
  const row = (e, dim) => `<div class="row" style="padding:0;${dim ? 'opacity:.5' : ''}"><button class="grow" style="padding:12px 0;text-align:left" data-act="pickEx" data-name="${esc(e.name)}">${esc(e.name)}${painDot(e.name)}<div class="faint small">${esc(e.equip.map(q => EQ_LABEL[q]).join(', ') || (e.custom ? 'Custom' : 'No equipment'))}</div>${goalBadges(e.name)}</button>${musBtn(e.name)}</div>`;
  let h = '';
  if (qq && !library().has(qq)) h += `<button class="row" data-act="newEx" data-name="${esc(q.trim())}"><span class="grow"><b>Add “${esc(q.trim())}”</b><div class="faint small">New custom exercise</div></span>${ICON.plus.replace('<svg', '<svg width="20" height="20"')}</button>`;
  if (!qq && Sheet.pickSuggested.length) h += `<div class="grp">Suggested swaps</div>` + Sheet.pickSuggested.map(n => row(library().get(keyOf(n)) || { name: n, equip: [] })).join('');
  if (!qq && myGoals().length) { const mine = bestForGoals(myGoals(), 8, avail, 2); if (mine.length) h += `<div class="grp">🎯 For your goals</div>` + mine.map(e => row(e)).join(''); }
  for (const g of [...GROUPS, 'Other']) { const xs = avail.filter(e => e.group === g); if (xs.length) h += `<div class="grp">${g}</div>${xs.map(e => row(e)).join('')}`; }
  if (missing.length) h += `<div class="grp">Not at ${esc(gym?.name || 'this gym')}</div>${missing.map(e => row(e, true)).join('')}`;
  return h || `<p class="muted" style="padding:16px 0">No matches.</p>`;
}
A.pickEx = d => { const f = Sheet.pick; closeSheet(); if (f) f(d.name); };
A.newEx = d => {
  const name = d.name.replace(/\s+/g, ' ').trim(); if (!name) return;
  if (!library().has(keyOf(name))) saveSettings({ customEx: [...(S().customEx || []), { name, group: 'Other' }] });
  A.pickEx({ name });
};

/* ---------- gyms ---------- */
A.editGym = d => {
  const g = d.id ? Store.docs.gyms[d.id] : null, sel = new Set(g ? g.equip || [] : EQ_IDS);
  openSheet(g ? 'Edit gym' : 'Add a gym', `
    <div class="field"><label class="lbl" for="gy-n">Gym name</label><input id="gy-n" name="name" value="${esc(g?.name || '')}" placeholder="e.g. Campus rec center" autocapitalize="words"></div>
    <div class="chips"><button class="chip" data-act="gymPreset" data-p="all">Everything</button><button class="chip" data-act="gymPreset" data-p="basic">Basic / home gym</button><button class="chip" data-act="gymPreset" data-p="none">Clear all</button></div>
    ${EQUIP.map(([grp, items]) => `<div class="field"><span class="lbl">${grp}</span><div class="chips">${items.map(([id, l]) => `<button class="chip eq" data-act="toggle" data-group="eq" data-value="${id}" aria-pressed="${sel.has(id)}">${esc(l)}</button>`).join('')}</div></div>`).join('')}
    <p class="faint small">Highlighted equipment is available. Anything you turn off is never suggested when you train here.</p>
    <button class="btn block" data-act="saveGym" data-id="${d.id || ''}">Save gym</button>
    ${g ? `<button class="linkbtn danger center" data-act="deleteGym" data-id="${d.id}">Delete gym</button>` : ''}`);
};
A.gymPreset = d => { const set = d.p === 'all' ? EQ_IDS : d.p === 'basic' ? BASIC_EQ : []; $$('#sheet [data-group="eq"]').forEach(b => b.setAttribute('aria-pressed', String(set.includes(b.dataset.value)))); };
A.saveGym = d => {
  const name = fval('name'); if (!name) { toast('Give the gym a name.', { bad: true }); $('#gy-n').focus(); return; }
  const id = d.id || newId(), old = Store.docs.gyms[id];
  put('gyms', id, { ...(old || { ts: Date.now() }), name, equip: pickedAll($('#sheet'), 'eq') });
  if (!S().activeGym || !gyms().some(g => g.id === S().activeGym)) saveSettings({ activeGym: id });
  closeSheet(); toast(d.id ? 'Gym updated' : `${name} saved`);
};
A.deleteGym = async d => {
  const g = Store.docs.gyms[d.id]; if (!g || !(await ask(`Delete ${g.name}? Past workouts keep their history.`, { ok: 'Delete', danger: true }))) return;
  del('gyms', d.id); if (S().activeGym === d.id) saveSettings({ activeGym: null }); closeSheet();
};

/* ---------- split editor ---------- */
A.editSplit = () => { Sheet.split = clone(splitDays()); Sheet.exT = clone(S().exTargets || {}); openSheet('Your split', '', {}); drawSplit(); };
function drawSplit() {
  const days = Sheet.split; sheetTitle('Your split');
  sheetBody(`<div class="field"><span class="lbl">Start from a template</span><div class="chips"><button class="chip" data-act="buildProgram" style="box-shadow:inset 0 0 0 1px rgba(255,120,110,.5)">✨ Built for me</button>${Object.entries(TEMPLATES).map(([k, t]) => `<button class="chip" data-act="splitTemplate" data-t="${k}">${t.label}</button>`).join('')}</div></div>
    ${days.length ? `<div>${days.map((d, i) => `<div class="row"><span class="n" style="width:26px;height:26px;border-radius:8px;background:var(--s2);display:grid;place-items:center;font-weight:700;font-size:13px;color:var(--tx2)">${i + 1}</span><button class="grow" data-act="splitDay" data-i="${i}" style="text-align:left"><b>${esc(d.name)}</b><div class="faint small">${plural((d.exercises || []).length, 'exercise')}</div></button><div class="reorder"><button class="iconbtn sm" data-act="splitMove" data-i="${i}" data-d="-1" aria-label="Move ${esc(d.name)} up" ${i === 0 ? 'disabled style="opacity:.3"' : ''}>${ICON.up}</button><button class="iconbtn sm" data-act="splitMove" data-i="${i}" data-d="1" aria-label="Move ${esc(d.name)} down" ${i === days.length - 1 ? 'disabled style="opacity:.3"' : ''}>${ICON.down}</button><button class="iconbtn sm" data-act="splitDel" data-i="${i}" aria-label="Delete ${esc(d.name)}">${ICON.x}</button></div></div>`).join('')}</div>` : '<p class="muted small">No days yet. Pick a template or add a day.</p>'}
    <button class="btn ghost block" data-act="splitAdd">${ICON.plus} Add a day</button>
    <div class="field"><span class="lbl">Or add a ready-made day</span><div class="chips">${DAY_PRESETS.map((p, i) => `<button class="chip" data-act="splitPreset" data-i="${i}">${ICON.plus.replace('<svg', '<svg width="14" height="14"')} ${esc(p.name)}</button>`).join('')}</div></div>
    <button class="btn block" data-act="splitSave">Save split</button>`);
}
A.splitTemplate = async d => {
  if (Sheet.split.length && !(await ask(`Replace your current days with ${TEMPLATES[d.t].label}?`, { ok: 'Replace' }))) return;
  Sheet.split = TEMPLATES[d.t].days.map(x => ({ id: newId(), name: x.name, groups: [...x.groups], exercises: [...x.ex] })); drawSplit();
};
A.splitMove = d => { const i = +d.i, j = i + (+d.d), a = Sheet.split; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; drawSplit(); };
A.splitDel = async d => { const day = Sheet.split[+d.i]; if (await ask(`Delete ${day.name} from your split?`, { ok: 'Delete', danger: true })) { Sheet.split.splice(+d.i, 1); drawSplit(); } };
A.splitAdd = () => { Sheet.split.push({ id: newId(), name: `Day ${Sheet.split.length + 1}`, groups: [], exercises: [] }); drawDay(Sheet.split.length - 1); };
A.splitDay = d => drawDay(+d.i);
/* Ready-made days: [exercise, sets, reps]. Adding one also sets those sets × reps targets. */
const DAY_PRESETS = [
  { name: 'Chest & Triceps', groups: ['Chest', 'Triceps', 'Shoulders'], ex: [['Smith Incline Press', 3, '6-10'], ['Smith Bench Press', 3, '6-10'], ['Dips', 3, '8-12'], ['Pec Deck Fly', 2, '10-15'], ['Cable Fly', 2, '12-15'], ['Overhead Rope Extension', 3, '10-15'], ['Rope Pushdown', 3, '10-15'], ['Cable Lateral Raise', 3, '12-20']] },
];
A.splitPreset = d => {
  const p = DAY_PRESETS[+d.i]; if (!p) return;
  Sheet.split.push({ id: newId(), name: p.name, groups: [...p.groups], exercises: p.ex.map(x => x[0]) });
  for (const [n, sets, reps] of p.ex) Sheet.exT[keyOf(n)] = { sets, reps };
  drawDay(Sheet.split.length - 1); toast(`Added ${p.name}. Tap Done, then Save split.`);
};
A.splitSave = () => { if (Sheet.di != null && $('#dn')) keepDayName(); saveSettings({ split: { days: Sheet.split }, exTargets: Sheet.exT }); closeSheet(); toast('Split saved'); };
function drawDay(i) {
  Sheet.di = i; const d = Sheet.split[i]; sheetTitle(d.name || 'Day');
  const inDay = new Set((d.exercises || []).map(keyOf));
  const opts = [...library().values()].filter(e => (d.groups || []).includes(e.group) && !inDay.has(keyOf(e.name)));
  sheetBody(`<button class="back" data-act="dayDone">${ICON.chevL.replace('<svg', '<svg width="18" height="18"')} All days</button>
    <div class="field"><label class="lbl" for="dn">Day name</label><input id="dn" name="dayname" value="${esc(d.name)}" autocapitalize="words"></div>
    <div class="field"><span class="lbl">Muscle groups</span><div class="chips">${GROUPS.map(g => `<button class="chip" data-act="dayGroup" data-g="${g}" aria-pressed="${(d.groups || []).includes(g)}">${g}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Exercises, in order · sets × reps target</span>${(d.exercises || []).length ? `<div>${d.exercises.map((n, j) => `<div class="row" style="padding:6px 0;min-height:0"><span class="grow">${esc(n)}</span><span class="tgt-edit"><input class="tgt" data-j="${j}" data-f="sets" value="${({ ...defaultTarget(n), ...(Sheet.exT[keyOf(n)] || {}) }).sets}" inputmode="numeric" aria-label="Sets for ${esc(n)}">×<input class="tgt" data-j="${j}" data-f="reps" value="${esc(({ ...defaultTarget(n), ...(Sheet.exT[keyOf(n)] || {}) }).reps)}" aria-label="Reps for ${esc(n)}"></span>${musBtn(n)}<div class="reorder"><button class="iconbtn sm" data-act="dayExMove" data-j="${j}" data-d="-1" aria-label="Move ${esc(n)} up">${ICON.up}</button><button class="iconbtn sm" data-act="dayExMove" data-j="${j}" data-d="1" aria-label="Move ${esc(n)} down">${ICON.down}</button><button class="iconbtn sm" data-act="dayExDel" data-j="${j}" aria-label="Remove ${esc(n)}">${ICON.x}</button></div></div>`).join('')}</div>` : '<p class="muted small">None yet. Add some below.</p>'}</div>
    <div class="field"><span class="lbl">Add exercises${(d.groups || []).length ? '' : ' (pick muscle groups first, or search)'}</span><div class="chips">${opts.map(e => `<button class="chip" data-act="dayExAdd" data-name="${esc(e.name)}">${ICON.plus.replace('<svg', '<svg width="14" height="14"')} ${esc(e.name)}</button>`).join('')}<button class="chip" data-act="dayExSearch">Search all…</button></div></div>
    <button class="btn block" data-act="dayDone">Done</button>`);
}
const keepDayName = () => {
  const day = Sheet.split[Sheet.di]; if (!day) return; const v = $('#dn')?.value.trim(); if (v) day.name = v;
  $$('#sheet .tgt').forEach(i => { const n = day.exercises[+i.dataset.j]; if (!n) return; const k = keyOf(n), t = { ...defaultTarget(n), ...(Sheet.exT[k] || {}) }; if (i.dataset.f === 'sets') t.sets = clamp(Math.round(num(i.value) || t.sets), 1, 12); else t.reps = (i.value || '').trim().replace(/\s+/g, '') || t.reps; const dft = defaultTarget(n); if (t.sets === dft.sets && t.reps === dft.reps) delete Sheet.exT[k]; else Sheet.exT[k] = t; });
};
A.dayGroup = d => { keepDayName(); const day = Sheet.split[Sheet.di]; day.groups = day.groups || []; const i = day.groups.indexOf(d.g); if (i >= 0) day.groups.splice(i, 1); else day.groups.push(d.g); drawDay(Sheet.di); };
A.dayExAdd = d => { keepDayName(); const day = Sheet.split[Sheet.di]; day.exercises = [...(day.exercises || []), d.name]; drawDay(Sheet.di); };
A.dayExDel = d => { keepDayName(); Sheet.split[Sheet.di].exercises.splice(+d.j, 1); drawDay(Sheet.di); };
A.dayExMove = d => { keepDayName(); const a = Sheet.split[Sheet.di].exercises, i = +d.j, j = i + (+d.d); if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; drawDay(Sheet.di); };
A.dayDone = () => { keepDayName(); drawSplit(); };
A.dayExSearch = () => {
  keepDayName(); const split = Sheet.split, di = Sheet.di;
  openExercisePicker(name => { Sheet.split = split; Sheet.di = di; openSheet('Your split', ''); const day = split[di]; if (!day.exercises.some(n => keyOf(n) === keyOf(name))) day.exercises.push(name); drawDay(di); }, null, split[di].exercises);
  Sheet.onClose = null;
};

/* ---------- rest timer (sound + flash while the app is open) ---------- */
const Rest = { end: 0, total: 0, t: null, ctx: null, nodes: [] };
function audioCtx() { try { Rest.ctx = Rest.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (Rest.ctx.state === 'suspended') Rest.ctx.resume(); } catch (e) {} return Rest.ctx; }
function clearBeeps() { Rest.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); Rest.nodes = []; }
function scheduleBeeps() {
  clearBeeps(); const ctx = Rest.ctx; if (!ctx) return;
  const at = ctx.currentTime + Math.max(0, (Rest.end - Date.now()) / 1000);
  [0, 0.3, 0.6].forEach((o, i) => {
    const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = 'sine'; osc.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, at + o); g.gain.exponentialRampToValueAtTime(0.4, at + o + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + o + 0.24);
    osc.connect(g); g.connect(ctx.destination); osc.start(at + o); osc.stop(at + o + 0.26); Rest.nodes.push(osc);
  });
}
function startRest(sec, next) {
  audioCtx(); Rest.total = sec || S().restSec || 120; Rest.end = Date.now() + Rest.total * 1000; Rest.next = next || ''; scheduleBeeps(); pushScheduleRest(Rest.total, Rest.next); saveRest();
  if (!pushOn() && !lsGet('onpaper.pushHint')) { lsSet('onpaper.pushHint', '1'); setTimeout(() => toast('Want rest alerts on your lock screen & watch? Turn them on in Settings ⚙️', { ms: 5200 }), 900); }
  startRestUI();
}
function startRestUI() {
  const el = $('#rest');
  el.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" style="stroke:var(--s3)"/><circle id="rest-arc" cx="18" cy="18" r="15" style="stroke:var(--accent)" stroke-dasharray="94.2" stroke-dashoffset="0" stroke-linecap="round"/></svg><span class="rt" id="rest-t" aria-live="off">0:00</span><button class="rb" data-act="restAdd" data-s="-15" aria-label="15 seconds less">−15</button><button class="rb" data-act="restAdd" data-s="15" aria-label="15 seconds more">+15</button><button class="rb" data-act="restSkip">Skip</button>`;
  el.hidden = false; clearInterval(Rest.t); Rest.t = setInterval(tickRest, 250); tickRest();
}
function tickRest() {
  if (!Rest.end) return;
  const left = (Rest.end - Date.now()) / 1000;
  if (left <= 0) return finishRest();
  const s = Math.ceil(left); $('#rest-t').textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
  $('#rest-arc').setAttribute('stroke-dashoffset', (94.2 * (1 - left / Math.max(Rest.total, left))).toFixed(1));
}
function finishRest() {
  clearInterval(Rest.t); Rest.end = 0; Push.at = 0; saveRest(); $('#rest').hidden = true;
  const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {}
  toast('Rest is up. Next set!');
}
A.restAdd = d => { if (!Rest.end) return; Rest.end = Math.max(Date.now() + 1000, Rest.end + (+d.s) * 1000); Rest.total = Math.max(Rest.total, (Rest.end - Date.now()) / 1000); scheduleBeeps(); tickRest(); clearTimeout(Rest.pushT); Rest.pushT = setTimeout(() => Rest.end && pushScheduleRest((Rest.end - Date.now()) / 1000, Rest.next), 700); saveRest(); };
A.restSkip = () => { clearTimeout(Rest.pushT); if (Rest.end) pushCancel(); Rest.end = 0; saveRest(); clearBeeps(); clearInterval(Rest.t); Rest.end = 0; const el = $('#rest'); if (el) el.hidden = true; };
let wakeSentinel = null;
async function wakeLock() { try { if (navigator.wakeLock && !wakeSentinel) { wakeSentinel = await navigator.wakeLock.request('screen'); wakeSentinel.addEventListener('release', () => { wakeSentinel = null; }); } } catch (e) { wakeSentinel = null; } }
function releaseWake() { try { wakeSentinel && wakeSentinel.release(); } catch (e) {} wakeSentinel = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && UI.session && activeWorkout()) wakeLock(); });
