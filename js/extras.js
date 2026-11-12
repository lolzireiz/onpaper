'use strict';
/* Version + what's new, iCloud/Files backups, Apple Watch reminder, muscle diagrams. */

const APP_VERSION = '1.1';
const CHANGELOG = [
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
function bodySVG(view, sex, mus) {
  const f = sex === 'female', sh = f ? 27 : 33, wa = f ? 15.5 : 19, hp = f ? 24 : 21.5;
  const fill = id => mus.p.has(id) ? PRIMARY_RED : mus.s.has(id) ? 'rgba(255,59,59,.45)' : '#36363c';
  const M = (id, el) => el.replace('/>', ` fill="${fill(id)}" stroke="#0b0b0c" stroke-width=".7"/>`);
  const both = s => s + `<g transform="translate(120 0) scale(-1 1)">${s}</g>`;
  const legC = 60 - hp * 0.52, kneeC = 60 - hp * 0.42, ankC = 60 - hp * 0.36;
  const base = '#26262b';
  // silhouette
  let s = '';
  if (f) s += `<path d="M47 18 Q60 0 73 18 L76 46 Q60 50 44 46 Z" fill="#202024"/>`;
  s += `<ellipse cx="60" cy="19" rx="10.5" ry="12.5" fill="${base}"/><rect x="54.5" y="29" width="11" height="10" fill="${base}"/>`;
  s += `<path d="M${60 - sh} 44 Q60 37 ${60 + sh} 44 L${60 + wa} 108 Q${60 + hp + 1} 118 ${60 + hp} 130 L${60 - hp} 130 Q${60 - hp - 1} 118 ${60 - wa} 108 Z" fill="${base}"/>`;
  s += both(`<path d="M${60 - sh} 44 L${60 - sh - 9} 50 L${60 - sh - 13} 96 L${60 - sh - 16} 138 L${60 - sh - 8} 139 L${60 - sh - 3} 97 L${60 - sh + 4} 60 Z" fill="${base}"/><ellipse cx="${60 - sh - 12}" cy="144" rx="4.5" ry="6" fill="${base}"/>`);
  s += both(`<path d="M${60 - hp} 126 L59 128 L${kneeC + 6} 186 L${ankC + 4} 240 L${ankC - 4} 240 L${kneeC - 7} 186 Z" fill="${base}"/><ellipse cx="${ankC}" cy="244" rx="6" ry="3.5" fill="${base}"/>`);
  if (view === 'front') {
    s += both(M('traps', `<ellipse cx="${60 - 9}" cy="42" rx="6" ry="2.6" transform="rotate(-12 51 42)"/>`));
    s += both(M('delts', `<ellipse cx="${60 - sh + 1}" cy="51" rx="6.5" ry="8.5"/>`));
    s += both(M('side_delts', `<ellipse cx="${60 - sh - 5}" cy="50" rx="3" ry="6.5"/>`));
    s += both(M('chest', f ? `<ellipse cx="${60 - sh * 0.45}" cy="61" rx="${sh * 0.42}" ry="9"/>` : `<path d="M59 49 L${60 - sh + 6} 50 Q${60 - sh + 2} 64 ${60 - sh + 8} 70 Q50 72 59 68 Z"/>`));
    s += both(M('biceps', `<ellipse cx="${60 - sh - 5.5}" cy="73" rx="4.6" ry="12" transform="rotate(6 ${60 - sh - 5.5} 73)"/>`));
    s += both(M('forearms', `<ellipse cx="${60 - sh - 10}" cy="116" rx="4" ry="15" transform="rotate(8 ${60 - sh - 10} 116)"/>`));
    s += both(M('abs', `<rect x="52.8" y="72" width="6.6" height="36" rx="3"/>`));
    s += both(M('obliques', `<ellipse cx="${60 - wa + 3.5}" cy="92" rx="3.6" ry="13"/>`));
    s += both(M('quads', `<ellipse cx="${legC - 1}" cy="155" rx="8.8" ry="25" transform="rotate(5 ${legC} 155)"/>`));
    s += both(M('adductors', `<ellipse cx="${60 - 6}" cy="146" rx="3.4" ry="14" transform="rotate(-8 54 146)"/>`));
    s += both(M('calves', `<ellipse cx="${ankC - 2.5}" cy="208" rx="3.5" ry="13"/>`));
  } else {
    s += M('traps', `<path d="M60 33 L${60 - sh * 0.62} 46 L60 82 L${60 + sh * 0.62} 46 Z"/>`);
    s += both(M('rear_delts', `<ellipse cx="${60 - sh + 1}" cy="51" rx="6.5" ry="8.5"/>`));
    s += both(M('side_delts', `<ellipse cx="${60 - sh - 5}" cy="50" rx="3" ry="6.5"/>`));
    s += both(M('upper_back', `<ellipse cx="${60 - sh * 0.48}" cy="60" rx="${sh * 0.2}" ry="7" transform="rotate(20 ${60 - sh * 0.48} 60)"/>`));
    s += both(M('lats', `<path d="M${60 - sh + 4} 58 Q${60 - sh + 2} 82 ${60 - wa + 1} 104 L57 96 L${60 - sh * 0.3} 70 Z"/>`));
    s += both(M('lower_back', `<rect x="53.5" y="90" width="6" height="22" rx="3"/>`));
    s += both(M('triceps', `<ellipse cx="${60 - sh - 5.5}" cy="74" rx="4.8" ry="13" transform="rotate(6 ${60 - sh - 5.5} 74)"/>`));
    s += both(M('forearms', `<ellipse cx="${60 - sh - 10}" cy="116" rx="4" ry="15" transform="rotate(8 ${60 - sh - 10} 116)"/>`));
    s += both(M('abductors', `<ellipse cx="${60 - hp + 3}" cy="122" rx="4" ry="6"/>`));
    s += both(M('glutes', `<ellipse cx="${60 - hp * 0.47}" cy="${f ? 136 : 134}" rx="${hp * 0.47}" ry="${f ? 12 : 10.5}"/>`));
    s += both(M('hamstrings', `<ellipse cx="${legC}" cy="165" rx="7.8" ry="20"/>`));
    s += both(M('calves', `<ellipse cx="${ankC}" cy="205" rx="6.4" ry="15"/>`));
  }
  return `<svg viewBox="0 -2 120 252" width="100%" style="max-height:300px" role="img" aria-label="${view} view">${s}</svg>`;
}
A.muscles = d => { Sheet.musEx = d.ex; Sheet.musSex = S().bodyModel || 'male'; openSheet(d.ex, '', {}); drawMuscles(); };
A.musSex = d => { Sheet.musSex = d.s; drawMuscles(); };
function drawMuscles() {
  const mus = musclesFor(Sheet.musEx), sex = Sheet.musSex;
  if (!mus) return sheetBody(`<p class="muted">No muscle map for this custom exercise yet. Tell Claude what it is and it can be added.</p>`);
  const names = set => [...set].map(m => MUSCLE_NAMES[m]).join(', ');
  sheetBody(`<div class="seg">${[['male', 'Male'], ['female', 'Female']].map(([k, l]) => `<button data-act="musSex" data-s="${k}" aria-pressed="${sex === k}">${l}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center"><div>${bodySVG('front', sex, mus)}<div class="faint tiny">Front</div></div><div>${bodySVG('back', sex, mus)}<div class="faint tiny">Back</div></div></div>
    <div class="legend"><span><i style="background:${PRIMARY_RED}"></i>Main muscles</span><span><i style="background:rgba(255,59,59,.45)"></i>Helping muscles</span></div>
    <p><b>Works:</b> <span class="muted">${esc(names(mus.p))}</span>${mus.s.size ? `<br><b>Helps:</b> <span class="muted">${esc(names(mus.s))}</span>` : ''}</p>`);
}
const BODY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5h14M12 8.5v6M12 14.5l-3 6.5M12 14.5l3 6.5"/></svg>`;
const musBtn = name => `<button class="iconbtn sm" data-act="muscles" data-ex="${esc(name)}" aria-label="Muscles worked by ${esc(name)}" style="color:var(--tx2)">${BODY_ICON}</button>`;
