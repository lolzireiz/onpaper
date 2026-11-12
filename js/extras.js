'use strict';
/* Version + what's new, iCloud/Files backups, Apple Watch reminder, muscle diagrams. */

const APP_VERSION = '2.1';
const CHANGELOG = [
  ['2.1', ['Watch stats on workouts: after you finish, scan your Apple Watch or Fitness summary screenshot (or type it in) to save workout type, time, active and total calories, heart rate and effort.']],
  ['2.0.2', ['Smoother buddy feeding animation.', 'Cleaner scanning messages.']],
  ['2.0.1', ['Label scanning keeps trying automatically when it\'s slow, plus a one-tap "Try again".']],
  ['2.0', ['Realistic anatomy diagrams with real muscle shapes, shading and fibers. Tap Front/Back to zoom.', 'Four new buddies: a cat, bunny, penguin and axolotl. Tap "Change pet" on the Food tab.', 'Label scanning fixed: faster, with a "Test my key" button in Settings.', 'Enter food by grams: set the serving size (like 13 g), type what you ate (like 37 g), and the calories scale automatically.', 'My Foods: tick "Save to My Foods" and the product and its serving size are remembered.', 'Workouts: sets × reps targets, smart weight suggestions from last time, +/- buttons, warm-up sets (never counted as PRs), and rest times that fit the lift.', 'Home: a Today checklist and Insights (bulk pace, strength gains, stalls, protein streaks, goal weight).', 'Dunk progress tracker on the Lifts tab.', 'Undo after deleting things.']],
  ['1.2.2', ['Slimmer, better-proportioned arms on the female diagram.', 'Tap the pencil next to your food buddy\'s name to rename them.']],
  ['1.2.1', ['Fixed the arms on the female muscle diagram.']],
  ['1.2', ['Meet Pebble, your raccoon food buddy! Log food to feed them and they\'ll say something nice. Rename or turn them off in Settings.', 'Much better muscle diagrams for both the male and female figures.']],
  ['1.1', ['Muscle diagrams for every exercise: tap the body icon next to an exercise to see what it works (male or female figure).', 'Back up to iCloud Drive from Settings, with a reminder when it has been a week.', 'Apple Watch reminder when you start a workout.', 'Version number in Settings, and this note after each update.']],
  ['1.0', ['First standalone version.']],
];
function checkVersion() {
  let seen = null; try { seen = localStorage.getItem('onpaper.version'); localStorage.setItem('onpaper.version', APP_VERSION); } catch (e) {}
  if (seen && seen !== APP_VERSION) {
    const notes = CHANGELOG.filter(([v]) => v > seen);
    setTimeout(() => openSheet(`Updated to v${APP_VERSION}`, `${notes.map(([v, items]) => `<div class="field"><span class="lbl">What's new in v${v}</span><ul class="muted" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}<p class="faint small">Your data is untouched. Updates only change the app, never what you've logged.</p><button class="btn block" data-act="closeSheet">Got it</button>`), 500);
  }
}

/* ---------- backups ---------- */
const lastBackup = () => { try { return localStorage.getItem('onpaper.lastBackup'); } catch (e) { return null; } };
const hasData = () => COLLS.some(c => Store.list(c).length);
function backupDue() { const lb = lastBackup(); return hasData() && (!lb || daysBetween(lb, todayStr()) >= 7); }
A.backupNow = async () => {
  const data = { app: 'onpaper', version: APP_VERSION, exported: new Date().toISOString(), settings: S(), ...Object.fromEntries(COLLS.map(c => [c, Store.list(c)])) };
  const name = `onpaper-backup-${todayStr()}.json`, json = JSON.stringify(data);
  const mark = () => { try { localStorage.setItem('onpaper.lastBackup', todayStr()); } catch (e) {} changed(); };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'On Paper backup' });
      mark(); closeSheet(); toast('Backup saved. Nice.'); return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  A.exportData(); mark();
};

/* ---------- muscle diagrams ---------- */
const MUSCLE_NAMES = { chest: 'Chest', delts: 'Front delts', side_delts: 'Side delts', rear_delts: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques', traps: 'Traps', lats: 'Lats', upper_back: 'Upper back', lower_back: 'Lower back', glutes: 'Glutes', abductors: 'Outer hips', quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Inner thighs', calves: 'Calves' };
const EX_MUSCLES = {
  'bench press': ['chest delts triceps'], 'incline bench press': ['chest delts', 'triceps'], 'dumbbell bench press': ['chest', 'delts triceps'], 'incline dumbbell press': ['chest delts', 'triceps'],
  'machine chest press': ['chest', 'delts triceps'], 'smith incline press': ['chest delts', 'triceps'], 'pec deck fly': ['chest', 'delts'], 'cable fly': ['chest', 'delts'], 'dips': ['chest triceps', 'delts'], 'push-ups': ['chest triceps', 'delts abs'],
  'deadlift': ['glutes hamstrings lower_back', 'quads traps lats forearms upper_back'], 'pull-ups': ['lats biceps', 'upper_back rear_delts forearms'], 'barbell row': ['lats upper_back', 'rear_delts biceps lower_back'], 'lat pulldown': ['lats', 'biceps upper_back'],
  'seated cable row': ['upper_back lats', 'rear_delts biceps'], 'dumbbell row': ['lats upper_back', 'biceps rear_delts'], 't-bar row': ['upper_back lats', 'rear_delts biceps lower_back'], 'chest-supported row': ['upper_back lats', 'rear_delts biceps'],
  'straight-arm pulldown': ['lats', 'triceps'], 'back extension': ['lower_back glutes', 'hamstrings'],
  'overhead press': ['delts side_delts triceps', 'traps abs'], 'dumbbell shoulder press': ['delts side_delts', 'triceps traps'], 'machine shoulder press': ['delts side_delts', 'triceps'], 'lateral raise': ['side_delts', 'traps'],
  'cable lateral raise': ['side_delts', 'traps'], 'rear delt fly': ['rear_delts', 'upper_back'], 'face pull': ['rear_delts upper_back', 'traps'], 'dumbbell shrug': ['traps', 'forearms'],
  'barbell curl': ['biceps', 'forearms'], 'ez-bar curl': ['biceps', 'forearms'], 'dumbbell curl': ['biceps', 'forearms'], 'hammer curl': ['biceps forearms'], 'preacher curl': ['biceps', 'forearms'], 'cable curl': ['biceps', 'forearms'], 'incline dumbbell curl': ['biceps', 'forearms'],
  'triceps pushdown': ['triceps'], 'overhead cable extension': ['triceps'], 'skull crushers': ['triceps'], 'close-grip bench press': ['triceps chest', 'delts'], 'dumbbell overhead extension': ['triceps'],
  'squat': ['quads glutes', 'adductors hamstrings lower_back abs'], 'front squat': ['quads', 'glutes abs upper_back'], 'leg press': ['quads glutes', 'adductors hamstrings'], 'hack squat': ['quads', 'glutes adductors'],
  'leg extension': ['quads'], 'smith squat': ['quads glutes', 'adductors hamstrings'], 'bulgarian split squat': ['quads glutes', 'adductors hamstrings abductors'], 'goblet squat': ['quads glutes', 'adductors abs'], 'walking lunge': ['quads glutes', 'hamstrings adductors calves'],
  'romanian deadlift': ['hamstrings glutes', 'lower_back forearms'], 'dumbbell rdl': ['hamstrings glutes', 'lower_back forearms'], 'lying leg curl': ['hamstrings', 'calves'], 'seated leg curl': ['hamstrings', 'calves'], 'kettlebell swing': ['glutes hamstrings', 'lower_back delts abs'],
  'hip thrust': ['glutes', 'hamstrings'], 'machine hip thrust': ['glutes', 'hamstrings'], 'cable kickback': ['glutes', 'hamstrings'], 'hip abduction': ['abductors glutes'],
  'standing calf raise': ['calves'], 'seated calf raise': ['calves'], 'leg press calf raise': ['calves'], 'smith calf raise': ['calves'],
  'hanging leg raise': ['abs', 'obliques forearms'], 'cable crunch': ['abs', 'obliques'], 'plank': ['abs', 'obliques delts'], 'decline sit-up': ['abs', 'obliques'],
};
const GROUP_MUSCLES = { Chest: ['chest', 'delts triceps'], Back: ['lats upper_back', 'biceps rear_delts'], Shoulders: ['delts side_delts', 'triceps'], Biceps: ['biceps', 'forearms'], Triceps: ['triceps'], Quads: ['quads', 'glutes'], Hamstrings: ['hamstrings', 'glutes'], Glutes: ['glutes', 'hamstrings'], Calves: ['calves'], Core: ['abs', 'obliques'] };
function musclesFor(name) {
  const m = EX_MUSCLES[keyOf(name)] || GROUP_MUSCLES[library().get(keyOf(name))?.group] || null;
  if (!m) return null;
  return { p: new Set((m[0] || '').split(' ').filter(Boolean)), s: new Set((m[1] || '').split(' ').filter(Boolean)) };
}
const PRIMARY_RED = '#ff3b3b';
/* Realistic body figures: anatomical muscle paths (see js/anatomy-data.js) with volume shading, fiber texture and glow. */
const SLUG_MUSCLES = { chest: ['chest'], biceps: ['biceps'], triceps: ['triceps'], forearm: ['forearms'], abs: ['abs'], obliques: ['obliques'], trapezius: ['traps'], lats: ['lats'], 'upper-back': ['upper_back'], 'lower-back': ['lower_back'], gluteal: ['glutes', 'abductors'], adductors: ['adductors'], quadriceps: ['quads'], hamstring: ['hamstrings'], calves: ['calves'], tibialis: [] };
const NON_MUSCLE = new Set(['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees']);
const FIBER = { chest: 18, deltoids: 80, biceps: 86, triceps: 86, forearm: 84, abs: 90, obliques: 52, trapezius: 32, lats: 58, 'upper-back': 24, 'lower-back': 90, gluteal: 34, adductors: 80, quadriceps: 84, hamstring: 86, calves: 86, tibialis: 86 };
let bodyUid = 0;
function bodySVG(view, sex, mus) {
  const fig = ANATOMY[sex === 'female' ? 'female' : 'male'][view], u = 'b' + (++bodyUid);
  const [vx, , vw] = fig.vb.split(' ').map(Number), mid = vx + vw / 2;
  const level = (slug) => {
    const ids = slug === 'deltoids' ? (view === 'front' ? ['delts', 'side_delts'] : ['rear_delts', 'side_delts']) : (SLUG_MUSCLES[slug] || []);
    if (ids.some(i => mus.p.has(i))) return 'p'; if (ids.some(i => mus.s.has(i))) return 's'; return 'm';
  };
  const angles = new Set(); let paths = '', glow = '';
  for (const [slug, side, d, box] of fig.parts) {
    if (slug === 'hair') { paths += `<path d="${d}" fill="#1c1c20" stroke="#0b0b0d" stroke-width="2"/>`; continue; }
    if (NON_MUSCLE.has(slug)) { paths += `<path d="${d}" fill="url(#${u}k)" stroke="#0b0b0d" stroke-width="2.5"/>`; continue; }
    const lv = level(slug), cx = box[0] + box[2] / 2, ang = Math.round((FIBER[slug] ?? 80) * (cx < mid ? 1 : -1));
    angles.add(ang);
    const el = `<path d="${d}" fill="url(#${u}${lv})" stroke="#0b0b0d" stroke-width="2.5"/><path d="${d}" fill="url(#${u}f${ang})" pointer-events="none"/>`;
    if (lv === 'p') glow += `<path d="${d}" fill="#ff2a2a"/>`;
    paths += el;
  }
  const rg = (id, stops) => `<radialGradient id="${u}${id}" cx=".38" cy=".3" r=".85">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
  const defs = `<defs>
    ${rg('m', [[0, '#71717c'], [.55, '#45454e'], [1, '#2a2a30']])}
    ${rg('p', [[0, '#ff8a78'], [.5, '#f0302e'], [1, '#9e1018']])}
    ${rg('s', [[0, '#c0585a'], [.55, '#8c2d33'], [1, '#561a1f']])}
    ${rg('k', [[0, '#55555e'], [1, '#2c2c32']])}
    ${[...angles].map(a => `<pattern id="${u}f${a}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(${a})"><line x1="1" y1="0" x2="1" y2="7" stroke="#000" stroke-opacity=".2" stroke-width="1.3"/><line x1="4.5" y1="0" x2="4.5" y2="7" stroke="#fff" stroke-opacity=".05" stroke-width="1"/></pattern>`).join('')}
    <filter id="${u}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <radialGradient id="${u}bg" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#2a2a31" stop-opacity=".9"/><stop offset="1" stop-color="#17171a" stop-opacity="0"/></radialGradient>
  </defs>`;
  const [bx, by, bw, bh] = fig.vb.split(' ').map(Number);
  return `<svg viewBox="${fig.vb}" width="100%" style="max-height:var(--fig-h,340px);display:block;margin:0 auto" role="img" aria-label="${view} view, worked muscles highlighted">${defs}
    <ellipse cx="${bx + bw / 2}" cy="${by + bh * .45}" rx="${bw * .48}" ry="${bh * .5}" fill="url(#${u}bg)"/>
    <ellipse cx="${bx + bw / 2}" cy="${fig.parts.reduce((m, q) => Math.max(m, q[3][1] + q[3][3]), 0) + 6}" rx="${bw * .26}" ry="14" fill="#000" opacity=".5"/>
    <g filter="url(#${u}g)" opacity=".55">${glow}</g>${paths}</svg>`;
}
A.muscles = d => { Sheet.musEx = d.ex; Sheet.musView = 'both'; Sheet.musSex = S().bodyModel || 'male'; openSheet(d.ex, '', {}); drawMuscles(); };
A.musSex = d => { Sheet.musSex = d.s; drawMuscles(); };
A.musView = d => { Sheet.musView = d.v; drawMuscles(); };
function drawMuscles() {
  const mus = musclesFor(Sheet.musEx), sex = Sheet.musSex, v = Sheet.musView || 'both';
  if (!mus) return sheetBody(`<p class="muted">No muscle map for this custom exercise yet. Ask Claude to add it.</p>`);
  const names = set => [...set].map(m => MUSCLE_NAMES[m]).join(', ');
  const fig = (view, label) => `<div><div style="--fig-h:${v === 'both' ? '330px' : '520px'}">${bodySVG(view, sex, mus)}</div><div class="faint tiny" style="text-align:center">${label}</div></div>`;
  sheetBody(`<div class="seg">${[['male', 'Male'], ['female', 'Female']].map(([k, l]) => `<button data-act="musSex" data-s="${k}" aria-pressed="${sex === k}">${l}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:${v === 'both' ? '1fr 1fr' : '1fr'};gap:6px">${v !== 'back' ? fig('front', 'Front') : ''}${v !== 'front' ? fig('back', 'Back') : ''}</div>
    <div class="chips" style="justify-content:center">${[['both', 'Both'], ['front', 'Front'], ['back', 'Back']].map(([k, l]) => `<button class="chip" data-act="musView" data-v="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
    <div class="legend" style="justify-content:center"><span><i style="background:#f0302e;box-shadow:0 0 8px #ff2a2a"></i>Main muscles</span><span><i style="background:#8c2d33"></i>Helping muscles</span></div>
    <p><b>Works:</b> <span class="muted">${esc(names(mus.p))}</span>${mus.s.size ? `<br><b>Helps:</b> <span class="muted">${esc(names(mus.s))}</span>` : ''}</p>`);
}
const BODY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5h14M12 8.5v6M12 14.5l-3 6.5M12 14.5l3 6.5"/></svg>`;
const musBtn = name => `<button class="iconbtn sm" data-act="muscles" data-ex="${esc(name)}" aria-label="Muscles worked by ${esc(name)}" style="color:var(--tx2)">${BODY_ICON}</button>`;
