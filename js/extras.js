'use strict';
/* Version + what's new, iCloud/Files backups, Apple Watch reminder, muscle diagrams. */

const APP_VERSION = '1.2';
const CHANGELOG = [
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
/* Organic body figures: left-half shapes drawn with smooth curves, mirrored; the female figure is a warp of the same shapes. */
function smoothPath(pts, closed = true) {
  const n = pts.length; if (n < 3) return '';
  const P = i => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), t = 0.17;
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + (closed ? 'Z' : '');
}
function femaleWarp([x, y]) {
  const k = [[0, .92], [60, .9], [110, .86], [165, .84], [200, 1.1], [235, 1.1], [270, 1.04], [330, .97], [420, .95]];
  let f = 1; for (let i = 1; i < k.length; i++) if (y <= k[i][0]) { const [y0, f0] = k[i - 1], [y1, f1] = k[i]; f = f0 + (f1 - f0) * (y - y0) / (y1 - y0); break; }
  return [100 - (100 - x) * f, y];
}
const BODY_OUTLINE = [[100, 54], [90, 57], [80, 64], [66, 69], [56, 76], [50, 88], [48, 104], [47, 122], [45, 148], [41, 168], [39, 192], [41, 214], [36, 226], [37, 240], [45, 246], [52, 238], [54, 222], [56, 210], [58, 186], [61, 160], [63, 138], [66, 116], [70, 104], [71, 124], [74, 150], [76, 172], [73, 190], [68, 206], [65, 232], [67, 262], [71, 290], [68, 312], [69, 340], [75, 372], [77, 386], [66, 396], [70, 402], [90, 400], [92, 386], [91, 364], [93, 334], [95, 300], [97, 262], [98, 232], [100, 216]];
const MUSCLE_SHAPES = {
  front: {
    traps: [[95, 58], [84, 63], [72, 69], [86, 71], [96, 66]],
    delts: [[70, 71], [59, 77], [53, 90], [55, 104], [62, 104], [68, 92], [74, 80]],
    side_delts: [[56, 78], [50, 90], [50, 104], [54, 100], [55, 88]],
    chest: [[98, 80], [86, 76], [74, 80], [67, 92], [70, 106], [82, 112], [94, 110], [98, 102]],
    biceps: [[64, 108], [56, 114], [52, 130], [54, 148], [60, 150], [64, 134], [66, 118]],
    forearms: [[58, 156], [50, 162], [44, 182], [44, 206], [51, 208], [56, 188], [60, 168]],
    abs: [[98.5, 116], [90, 118], [88, 140], [88, 164], [91, 186], [98.5, 194]],
    obliques: [[86, 120], [77, 126], [75, 150], [77, 172], [83, 182], [87, 166], [86, 140]],
    quads: [[72, 208], [67, 230], [69, 260], [76, 284], [86, 290], [93, 280], [95, 252], [92, 226], [84, 210]],
    adductors: [[97, 218], [92, 226], [93, 248], [97, 262], [99, 244], [99, 224]],
    calves: [[74, 300], [69, 318], [71, 344], [76, 356], [80, 336], [80, 312]],
  },
  back: {
    traps: [[100, 50], [90, 58], [74, 68], [80, 76], [92, 98], [100, 118]],
    rear_delts: [[72, 70], [60, 76], [53, 90], [55, 104], [63, 102], [70, 90], [75, 80]],
    side_delts: [[56, 78], [50, 90], [50, 104], [54, 100], [55, 88]],
    upper_back: [[89, 82], [79, 80], [73, 92], [78, 104], [89, 104], [92, 94]],
    lats: [[73, 104], [71, 122], [75, 148], [86, 172], [96, 160], [96, 136], [90, 112], [82, 104]],
    lower_back: [[98.5, 138], [92, 144], [90, 166], [93, 188], [98.5, 194]],
    triceps: [[62, 106], [54, 112], [50, 128], [52, 146], [59, 150], [64, 136], [66, 118]],
    forearms: [[58, 156], [50, 162], [44, 182], [44, 206], [51, 208], [56, 188], [60, 168]],
    abductors: [[76, 188], [69, 196], [69, 210], [76, 206], [80, 196]],
    glutes: [[99, 196], [88, 192], [76, 198], [70, 214], [74, 232], [86, 240], [96, 236], [99, 224]],
    hamstrings: [[72, 240], [69, 262], [73, 284], [82, 292], [92, 284], [95, 260], [92, 242], [82, 238]],
    calves: [[74, 298], [68, 316], [70, 342], [77, 360], [85, 354], [90, 330], [88, 306], [81, 296]],
  },
};
function bodySVG(view, sex, mus) {
  const f = sex === 'female', W = pts => f ? pts.map(femaleWarp) : pts;
  const mirror = d => `<g transform="translate(200 0) scale(-1 1)">${d}</g>`;
  const fill = id => mus.p.has(id) ? PRIMARY_RED : mus.s.has(id) ? '#9b3a3f' : '#3c3c44';
  const glow = id => mus.p.has(id) ? ' filter="url(#glow)"' : '';
  const half = smoothPath(W(BODY_OUTLINE), false);
  const outline = half + ' ' + smoothPath(W(BODY_OUTLINE).slice().reverse().map(([x, y]) => [200 - x, y]), false).replace(/^M/, 'L') + 'Z';
  let s = `<defs><linearGradient id="skin" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#303036"/><stop offset="1" stop-color="#25252a"/></linearGradient><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  if (f) s += `<path d="M78 30 Q78 2 100 2 Q122 2 122 30 Q124 52 128 66 Q114 70 100 66 Q86 70 72 66 Q76 52 78 30Z" fill="#1d1d21"/>`;
  s += `<path d="${outline}" fill="url(#skin)" stroke="#0e0e10" stroke-width="1.2"/>`;
  s += `<rect x="92" y="44" width="16" height="16" rx="5" fill="#2c2c31"/><ellipse cx="100" cy="30" rx="${f ? 15 : 16}" ry="${f ? 19 : 20}" fill="#2f2f35" stroke="#0e0e10" stroke-width="1.2"/>`;
  s += f ? `<path d="M85 22 Q100 6 115 22 Q108 14 100 15 Q92 14 85 22Z" fill="#1d1d21"/>` : `<path d="M85 24 Q86 9 100 9 Q114 9 115 24 Q108 16 100 17 Q92 16 85 24Z" fill="#1d1d21"/>`;
  const shapes = MUSCLE_SHAPES[view];
  for (const [id, pts] of Object.entries(shapes)) {
    let p = pts;
    if (f && id === 'chest') p = [[98, 86], [88, 82], [77, 88], [73, 100], [78, 112], [89, 115], [98, 108]];
    const d = `<path d="${smoothPath(W(p))}" fill="${fill(id)}" stroke="#121215" stroke-width="1"${glow(id)}/>`;
    s += d + mirror(d);
  }
  if (view === 'front') { const ln = y => `<path d="M${W([[90, y]])[0][0]} ${y} Q100 ${y + 2} ${W([[110, y]])[0][0]} ${y}" stroke="#121215" stroke-width="1" fill="none"/>`; s += ln(134) + ln(152) + ln(171) + `<line x1="100" y1="116" x2="100" y2="194" stroke="#121215" stroke-width="1"/>`; }
  else s += `<line x1="100" y1="120" x2="100" y2="194" stroke="#121215" stroke-width="1"/>`;
  return `<svg viewBox="30 0 140 408" width="100%" style="max-height:330px" role="img" aria-label="${view} view">${s}</svg>`;
}
A.muscles = d => { Sheet.musEx = d.ex; Sheet.musSex = S().bodyModel || 'male'; openSheet(d.ex, '', {}); drawMuscles(); };
A.musSex = d => { Sheet.musSex = d.s; drawMuscles(); };
function drawMuscles() {
  const mus = musclesFor(Sheet.musEx), sex = Sheet.musSex;
  if (!mus) return sheetBody(`<p class="muted">No muscle map for this custom exercise yet. Tell Claude what it is and it can be added.</p>`);
  const names = set => [...set].map(m => MUSCLE_NAMES[m]).join(', ');
  sheetBody(`<div class="seg">${[['male', 'Male'], ['female', 'Female']].map(([k, l]) => `<button data-act="musSex" data-s="${k}" aria-pressed="${sex === k}">${l}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center"><div>${bodySVG('front', sex, mus)}<div class="faint tiny">Front</div></div><div>${bodySVG('back', sex, mus)}<div class="faint tiny">Back</div></div></div>
    <div class="legend"><span><i style="background:${PRIMARY_RED}"></i>Main muscles</span><span><i style="background:#9b3a3f"></i>Helping muscles</span></div>
    <p><b>Works:</b> <span class="muted">${esc(names(mus.p))}</span>${mus.s.size ? `<br><b>Helps:</b> <span class="muted">${esc(names(mus.s))}</span>` : ''}</p>`);
}
const BODY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5h14M12 8.5v6M12 14.5l-3 6.5M12 14.5l3 6.5"/></svg>`;
const musBtn = name => `<button class="iconbtn sm" data-act="muscles" data-ex="${esc(name)}" aria-label="Muscles worked by ${esc(name)}" style="color:var(--tx2)">${BODY_ICON}</button>`;
