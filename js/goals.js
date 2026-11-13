'use strict';
/* Goals & interests: what you want to get better at, the sports and life stuff behind it,
   and which exercises help. Exercises that help one of YOUR goals get a badge everywhere. */

const GOALS = {
  // performance
  jump: ['🦘', 'Jump higher'], sprint: ['⚡', 'Run faster'], agility: ['👟', 'Quick feet & agility'], endurance: ['🫁', 'Stamina & endurance'],
  power: ['💥', 'Hit, throw & kick harder'], strength: ['🏋️', 'Raw strength'], relative: ['🤸', 'Pull-ups, push-ups & dips'], grip: ['✊', 'Grip strength'],
  // look
  arms: ['💪', 'Bigger arms'], chest: ['🦍', 'Bigger chest'], vback: ['🦅', 'Wider back'], shoulders: ['🏔️', 'Bigger shoulders'], legs: ['🦵', 'Stronger legs'], glutes: ['🍑', 'Glutes'], core: ['🍫', 'Core & abs'],
  // feel & move
  posture: ['🧍', 'Better posture'], backhealth: ['🦴', 'Healthy back'], injury: ['🛡️', 'Injury-proof joints'], mobility: ['🧘', 'Mobility & flexibility'], balance: ['⚖️', 'Balance'], everyday: ['📦', 'Everyday strength'], longevity: ['❤️', 'Age well'],
};
const GOAL_GROUPS = [['Perform', ['jump', 'sprint', 'agility', 'endurance', 'power', 'strength', 'relative', 'grip']], ['Look', ['arms', 'chest', 'vback', 'shoulders', 'legs', 'glutes', 'core']], ['Feel & move', ['posture', 'backhealth', 'injury', 'mobility', 'balance', 'everyday', 'longevity']]];

/* [id, emoji, label, goals it leans on (most important first)] */
const SPORTS = [
  ['Court & field', [
    ['basketball', '🏀', 'Basketball', ['jump', 'agility', 'sprint', 'injury', 'core']], ['volleyball', '🏐', 'Volleyball', ['jump', 'shoulders', 'agility', 'injury']],
    ['soccer', '⚽', 'Soccer', ['sprint', 'agility', 'endurance', 'injury', 'power']], ['football', '🏈', 'Football', ['power', 'strength', 'sprint', 'legs', 'injury']],
    ['baseball', '⚾', 'Baseball / softball', ['power', 'core', 'sprint', 'injury', 'grip']], ['hockey', '🏒', 'Hockey', ['legs', 'power', 'balance', 'core', 'sprint']],
    ['lacrosse', '🥍', 'Lacrosse', ['sprint', 'agility', 'power', 'endurance']], ['rugby', '🏉', 'Rugby', ['strength', 'power', 'sprint', 'endurance', 'injury']],
    ['cricket', '🏏', 'Cricket', ['power', 'core', 'sprint', 'injury']], ['frisbee', '🥏', 'Ultimate frisbee', ['sprint', 'agility', 'endurance', 'jump']],
  ]],
  ['Racket & club', [
    ['tennis', '🎾', 'Tennis', ['agility', 'power', 'endurance', 'injury']], ['pickleball', '🏓', 'Pickleball / ping-pong', ['agility', 'balance', 'injury', 'longevity']],
    ['badminton', '🏸', 'Badminton', ['agility', 'jump', 'endurance', 'shoulders']], ['golf', '⛳', 'Golf', ['power', 'mobility', 'core', 'backhealth']],
  ]],
  ['Endurance', [
    ['running', '🏃', 'Running', ['endurance', 'injury', 'legs', 'core']], ['track', '🏟️', 'Sprints & track', ['sprint', 'jump', 'power', 'legs']],
    ['cycling', '🚴', 'Cycling', ['endurance', 'legs', 'posture', 'backhealth']], ['swimming', '🏊', 'Swimming', ['endurance', 'shoulders', 'vback', 'mobility']],
    ['rowing', '🚣', 'Rowing', ['endurance', 'vback', 'legs', 'grip']], ['hiking', '🥾', 'Hiking', ['endurance', 'legs', 'balance', 'everyday']],
    ['walking', '🚶', 'Walking', ['longevity', 'endurance', 'balance']],
  ]],
  ['Combat', [
    ['boxing', '🥊', 'Boxing', ['power', 'endurance', 'core', 'agility']], ['mma', '🥋', 'MMA / martial arts', ['power', 'mobility', 'endurance', 'grip', 'balance']],
    ['wrestling', '🤼', 'Wrestling / jiu-jitsu', ['grip', 'strength', 'endurance', 'core']],
  ]],
  ['Gym & strength', [
    ['bodybuilding', '💪', 'Bodybuilding / physique', ['arms', 'chest', 'vback', 'shoulders', 'legs', 'glutes']], ['powerlifting', '🏋️', 'Powerlifting', ['strength', 'core', 'legs', 'grip']],
    ['olylifting', '🏅', 'Olympic lifting', ['power', 'mobility', 'strength', 'jump']], ['crossfit', '🔥', 'CrossFit / Hyrox', ['endurance', 'relative', 'power', 'grip']],
    ['calisthenics', '🤸', 'Calisthenics', ['relative', 'core', 'shoulders', 'mobility']], ['strongman', '🪨', 'Strongman', ['strength', 'grip', 'everyday', 'core']],
  ]],
  ['Board, snow & outdoors', [
    ['skiing', '🎿', 'Skiing / snowboarding', ['legs', 'balance', 'injury', 'core']], ['skate', '🛹', 'Skateboarding', ['balance', 'legs', 'injury', 'jump']],
    ['surfing', '🏄', 'Surfing', ['balance', 'shoulders', 'mobility', 'endurance']], ['climbing', '🧗', 'Climbing / bouldering', ['grip', 'relative', 'vback', 'core']],
    ['parkour', '🧱', 'Parkour', ['jump', 'relative', 'agility', 'injury']],
  ]],
  ['Movement', [
    ['dance', '💃', 'Dance', ['balance', 'mobility', 'endurance', 'legs']], ['yoga', '🧘', 'Yoga / pilates', ['mobility', 'core', 'balance', 'posture']],
  ]],
  ['Life & well-being', [
    ['desk', '🪑', 'Desk job or gaming', ['posture', 'backhealth', 'mobility']], ['physicaljob', '👷', 'Physical job', ['everyday', 'backhealth', 'grip', 'injury']],
    ['parent', '🧒', 'Carrying kids around', ['everyday', 'backhealth', 'core']], ['agewell', '❤️', 'Staying healthy as I age', ['longevity', 'balance', 'mobility', 'injury']],
    ['service', '🎖️', 'Military / police / fire tests', ['endurance', 'relative', 'everyday', 'sprint']], ['lookgood', '😎', 'Looking and feeling good', ['arms', 'chest', 'shoulders', 'glutes']],
  ]],
];
const SPORT = Object.fromEntries(SPORTS.flatMap(([, xs]) => xs.map(([id, e, l, g]) => [id, { e, l, g }])));

/* Main goal (first survey question) → eating plan + goals it suggests */
const MAIN_GOALS = [
  ['muscle', '💪', 'Build muscle', 'Get bigger and look stronger', 'bulk', []], ['strong', '🏋️', 'Get stronger', 'Move more weight', 'bulk', ['strength']],
  ['fat', '🔥', 'Lose fat', 'Lean out, keep the muscle', 'cut', ['endurance']], ['athlete', '⚡', 'Play my sport better', 'Jump, sprint, hit harder', 'maintain', []],
  ['health', '❤️', 'Feel good & stay healthy', 'Move well for life', 'maintain', ['longevity', 'mobility', 'posture']],
];

/* Which goals each exercise helps, strongest first */
const EX_GOALS = {
  'Bench Press': ['chest', 'strength', 'power', 'everyday'], 'Incline Bench Press': ['chest', 'shoulders', 'strength', 'power'], 'Dumbbell Bench Press': ['chest', 'strength', 'everyday'],
  'Incline Dumbbell Press': ['chest', 'shoulders', 'strength'], 'Machine Chest Press': ['chest', 'strength'], 'Smith Incline Press': ['chest', 'shoulders'], 'Smith Bench Press': ['chest', 'strength'], 'Low-to-High Cable Fly': ['chest'], 'Pec Deck Fly': ['chest'], 'Cable Fly': ['chest'],
  'Dips': ['relative', 'chest', 'arms', 'strength'], 'Push-ups': ['relative', 'chest', 'core', 'everyday'],
  'Deadlift': ['strength', 'everyday', 'grip', 'jump', 'backhealth', 'glutes'], 'Pull-ups': ['relative', 'vback', 'grip', 'arms'], 'Chin-ups': ['relative', 'arms', 'vback', 'grip'],
  'Barbell Row': ['vback', 'strength', 'posture', 'grip'], 'Lat Pulldown': ['vback', 'relative', 'posture'], 'Seated Cable Row': ['vback', 'posture', 'backhealth'], 'Dumbbell Row': ['vback', 'posture', 'grip'],
  'T-Bar Row': ['vback', 'strength', 'grip'], 'Chest-Supported Row': ['vback', 'posture'], 'Straight-Arm Pulldown': ['vback', 'core'], 'Back Extension': ['backhealth', 'posture', 'glutes', 'longevity'],
  'Overhead Press': ['shoulders', 'strength', 'core', 'everyday', 'power'], 'Dumbbell Shoulder Press': ['shoulders', 'strength', 'everyday'], 'Machine Shoulder Press': ['shoulders', 'strength'],
  'Lateral Raise': ['shoulders'], 'Cable Lateral Raise': ['shoulders'], 'Rear Delt Fly': ['posture', 'shoulders', 'injury'], 'Face Pull': ['posture', 'injury', 'shoulders', 'backhealth'],
  'Dumbbell Shrug': ['vback', 'grip', 'everyday', 'injury'],
  'Barbell Curl': ['arms', 'grip'], 'EZ-Bar Curl': ['arms'], 'Dumbbell Curl': ['arms'], 'Hammer Curl': ['arms', 'grip', 'everyday'], 'Preacher Curl': ['arms'], 'Cable Curl': ['arms'], 'Incline Dumbbell Curl': ['arms'],
  'Triceps Pushdown': ['arms'], 'Overhead Cable Extension': ['arms'], 'Rope Pushdown': ['arms'], 'Overhead Rope Extension': ['arms'], 'Skull Crushers': ['arms'], 'Close-Grip Bench Press': ['arms', 'chest', 'strength', 'power'], 'Dumbbell Overhead Extension': ['arms'],
  'Squat': ['legs', 'strength', 'jump', 'sprint', 'everyday', 'longevity'], 'Front Squat': ['legs', 'core', 'jump', 'posture', 'mobility'], 'Leg Press': ['legs', 'jump', 'strength'], 'Hack Squat': ['legs', 'jump'],
  'Leg Extension': ['legs', 'injury'], 'Smith Squat': ['legs', 'strength'], 'Bulgarian Split Squat': ['legs', 'balance', 'jump', 'sprint', 'injury', 'glutes'], 'Goblet Squat': ['legs', 'mobility', 'core', 'longevity'],
  'Walking Lunge': ['legs', 'balance', 'glutes', 'sprint', 'everyday'], 'Romanian Deadlift': ['glutes', 'sprint', 'jump', 'backhealth', 'injury'], 'Dumbbell RDL': ['glutes', 'backhealth', 'sprint', 'injury'],
  'Lying Leg Curl': ['sprint', 'injury', 'legs'], 'Seated Leg Curl': ['sprint', 'injury', 'legs'], 'Kettlebell Swing': ['power', 'jump', 'endurance', 'glutes', 'grip', 'backhealth'],
  'Hip Thrust': ['glutes', 'sprint', 'jump', 'power'], 'Machine Hip Thrust': ['glutes', 'sprint', 'jump'], 'Cable Kickback': ['glutes'], 'Hip Abduction': ['glutes', 'balance', 'injury'],
  'Standing Calf Raise': ['jump', 'sprint', 'injury', 'legs'], 'Calf Extension': ['jump', 'sprint', 'legs', 'injury'], 'Dumbbell Standing Calf Raise': ['jump', 'balance', 'sprint', 'injury', 'grip'],
  'Seated Calf Raise': ['endurance', 'injury', 'legs'], 'Leg Press Calf Raise': ['jump', 'sprint', 'legs'], 'Smith Calf Raise': ['jump', 'sprint', 'legs'],
  'Hanging Leg Raise': ['core', 'grip', 'relative'], 'Cable Crunch': ['core'], 'Plank': ['core', 'backhealth', 'posture', 'longevity'], 'Decline Sit-up': ['core'],
  'Farmer Carry': ['grip', 'everyday', 'core', 'posture', 'longevity'], 'Cable Woodchop': ['power', 'core', 'agility'], 'Pallof Press': ['core', 'backhealth', 'balance', 'injury'],
  'Dead Bug': ['core', 'backhealth', 'balance', 'posture'], 'Crunch': ['core'], 'Lying Leg Raise': ['core'], 'Russian Twist': ['core', 'power'], 'Ab Wheel Rollout': ['core', 'backhealth'],
  'Wrist Curl': ['grip', 'arms'], 'Reverse Wrist Curl': ['grip', 'arms', 'injury'], 'Barbell Wrist Curl': ['grip', 'arms'], 'Reverse Curl': ['grip', 'arms'], 'Dead Hang': ['grip', 'relative', 'posture'], 'Plate Pinch': ['grip'],
  'Arnold Press': ['shoulders'], 'Front Raise': ['shoulders'], 'Upright Row': ['shoulders', 'posture'], 'Jump Squat': ['jump', 'power', 'sprint', 'legs'], 'Lateral Bounds': ['agility', 'jump', 'balance', 'injury'],
  'Lateral Lunge': ['agility', 'mobility', 'injury', 'legs', 'balance'], 'Step-up': ['legs', 'balance', 'jump', 'everyday', 'longevity'],
  'Single-Leg RDL': ['balance', 'glutes', 'injury', 'sprint'], 'Tibialis Raise': ['injury', 'sprint', 'jump', 'longevity'],
};
const GROUP_GOALS = { Chest: ['chest'], Back: ['vback'], Shoulders: ['shoulders'], Biceps: ['arms'], Triceps: ['arms'], Quads: ['legs'], Hamstrings: ['legs'], Glutes: ['glutes'], Calves: ['legs'], Core: ['core'] };

const myGoals = () => (S().goals || []).filter(g => GOALS[g]);
const mySports = () => (S().sports || []).filter(s => SPORT[s]);
function exGoalIds(name) { const lib = library().get(keyOf(name)); return EX_GOALS[lib?.name || name] || (lib ? GROUP_GOALS[lib.group] || [] : []); }
/* your goals this exercise helps, in the exercise's own order of strength */
function exHelps(name) { const mine = new Set(myGoals()); return exGoalIds(name).filter(g => mine.has(g)); }
/* your sports this exercise helps (shares one of its 3 strongest goals with the sport's top 4) */
function exSports(name, all = false) { const top = new Set(exGoalIds(name).slice(0, 3)); return (all ? Object.keys(SPORT) : mySports()).filter(s => SPORT[s].g.slice(0, 4).some(g => top.has(g))); }
/* how well an exercise fits a goal list: goals earlier in your list matter more, and so do the exercise's strongest tags */
function goalScore(name, goals) { const tags = exGoalIds(name); return goals.reduce((t, g, i) => { const k = tags.indexOf(g); return k < 0 ? t : t + (goals.length - i + 2) / (1 + k * 0.6); }, 0); }
/* best matches, at most `perGroup` per muscle group so you get a real mix */
function bestForGoals(goals, n = 3, list = [...library().values()], perGroup = 1) {
  const ranked = list.map(e => [e, goalScore(e.name, goals)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const seen = {}, out = []; for (const e of ranked) { if ((seen[e.group] || 0) >= perGroup) continue; seen[e.group] = (seen[e.group] || 0) + 1; out.push(e); if (out.length >= n) break; }
  return out;
}
const goalLbl = g => `${GOALS[g][0]} ${GOALS[g][1]}`;
/* compact badge row: up to `max` of your goals, "+N" for the rest */
function goalBadges(name, max = 2) {
  const h = exHelps(name); if (!h.length) return '';
  return `<span class="gbadges">${h.slice(0, max).map(g => `<span class="gbadge"><i aria-hidden="true">${GOALS[g][0]}</i>${esc(GOALS[g][1])}</span>`).join('')}${h.length > max ? `<span class="gbadge more">+${h.length - max}</span>` : ''}</span>`;
}
const goalDot = name => { const h = exHelps(name); return h.length ? `<span class="gdot" title="Helps: ${esc(h.map(g => GOALS[g][1]).join(', '))}" aria-label="Helps your goals: ${esc(h.map(g => GOALS[g][1]).join(', '))}">${GOALS[h[0]][0]}</span>` : ''; };
/* goals suggested by picked sports + main goal, most-shared first */
function suggestGoals(sports, main) {
  const score = {}; (sports || []).forEach(s => (SPORT[s]?.g || []).forEach((g, i) => { score[g] = (score[g] || 0) + (4 - Math.min(i, 3)); }));
  const mg = MAIN_GOALS.find(m => m[0] === main); (mg ? mg[5] : []).forEach(g => { score[g] = (score[g] || 0) + 6; });
  return Object.keys(score).sort((a, b) => score[b] - score[a]).slice(0, 6);
}
/* should the dunk / vertical tracker show? keep it for anyone who already uses it or hasn't picked goals */
const wantsDunk = () => !S().onboarded || !myGoals().length || myGoals().includes('jump') || mySports().some(s => ['basketball', 'volleyball'].includes(s)) || Store.list('jumps').length > 0;

/* ---------- "Your goals" home card ---------- */
function goalSetsThisWeek() {
  const since = addDays(todayStr(), -6), cnt = {};
  for (const w of Store.list('workouts')) if (w.date >= since) for (const s of w.sets || []) if (!s.warm && s.hit !== false) for (const g of exHelps(s.ex)) cnt[g] = (cnt[g] || 0) + 1;
  const mine = new Set(myGoals()); for (const a of Store.list('acts')) if (a.date >= since) for (const g of actOf(a).g) if (mine.has(g)) cnt[g] = (cnt[g] || 0) + 1;
  return cnt;
}
A.goalsSheet = () => {
  const g = myGoals(), cnt = goalSetsThisWeek(), max = Math.max(1, ...g.map(x => cnt[x] || 0));
  openSheet('Goals this week', `<p class="muted small" style="margin:0">Work sets and sport sessions from the last 7 days that helped each goal. Tap one for exercises.</p>
    <div class="goalrows">${g.map(x => `<button class="goalrow" data-act="goalExercises" data-g="${x}"><span class="ge" aria-hidden="true">${GOALS[x][0]}</span><span class="grow"><span class="gl">${esc(GOALS[x][1])}</span><span class="gbar"><i style="width:${(cnt[x] || 0) / max * 100}%"></i></span></span><span class="gn${cnt[x] ? '' : ' zero'}">${cnt[x] || 0}</span>${ICON.chevR.replace('<svg', '<svg width="16" height="16" style="color:var(--tx3)"')}</button>`).join('')}</div>
    <button class="btn ghost block" data-act="editGoals">Edit goals</button>`, { onMount(L) { if (!REDUCED()) $$('.gbar i', L).forEach((b, i) => b.animate([{ width: '0%' }, { width: b.style.width }], { duration: 600, delay: 120 + i * 40, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })); } });
};
A.goalExercises = d => {
  const g = d.g, gym = activeGym(), all = [...library().values()].filter(e => exGoalIds(e.name).includes(g));
  const top = bestForGoals([g, ...myGoals().filter(x => x !== g)], 3, all.filter(e => available(e.name, gym)));
  const xs = [...top, ...all.filter(e => !top.includes(e)).sort((a, b) => goalScore(b.name, [g, ...myGoals()]) - goalScore(a.name, [g, ...myGoals()]) || (available(b.name, gym) - available(a.name, gym)))];
  const sp = mySports().filter(s => SPORT[s].g.includes(g));
  openSheet(goalLbl(g), `${sp.length ? `<p class="muted small" style="margin:0">Matters for ${sp.map(s => `${SPORT[s].e} ${esc(SPORT[s].l)}`).join(', ')}.</p>` : ''}
    <div class="exlist">${xs.map((e, i) => { const L = liftByKey(keyOf(e.name)), ok = available(e.name, gym); return `<div class="row" style="padding:0;${ok ? '' : 'opacity:.5'}"><button class="grow" style="padding:11px 0;text-align:left" data-act="muscles" data-ex="${esc(e.name)}"><div>${esc(e.name)}${i < top.length ? ' <span class="gbadge toppick">Top pick</span>' : ''}</div><div class="faint small">${L && L.e1Set ? `Your best ${loadTxt(L.e1Set)} × ${L.e1Set.r}` : esc(e.group)}${ok ? '' : ` · not at ${esc(gym?.name || 'this gym')}`}</div></button>${musBtn(e.name)}</div>`; }).join('')}</div>`);
};
