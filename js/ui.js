'use strict';
/* v5 layout. Five tabs like the big apps: Today · Train · Food · Progress · You.
   Every tab leads with one clear action, and secondary stuff lives behind a segmented control. */

Object.assign(ICON, {
  progress: svgI('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  you: svgI('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: svgI('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
});
const PROG_TABS = ['lifts', 'body', 'athlete'];
const tabOf = t => PROG_TABS.includes(t) ? 'progress' : t;
const segHTML = (act, opts, cur, cls = '') => `<div class="seg seg-top ${cls}" role="tablist">${opts.map(([k, l]) => `<button role="tab" data-act="${act}" data-k="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;

/* ---------- Progress: Lifts · Weight · Photos · Body · Athlete ---------- */
const progCur = () => UI.tab === 'lifts' ? 'lifts' : UI.tab === 'athlete' ? 'athlete' : UI.bodySub === 'photos' ? 'photos' : UI.bodySub === 'measure' ? 'measure' : 'weight';
const progSeg = () => segHTML('progSub', [['lifts', 'Lifts'], ['weight', 'Weight'], ['photos', 'Photos'], ['measure', 'Body'], ['athlete', 'Athlete']], progCur(), 'seg5');
A.progSub = d => { UI.progLast = d.k; goProg(d.k); };
{
  const lr = Views.lifts.render, bt = Views.body.title, ba = Views.body.actions;
  Views.lifts.title = () => UI.liftKey && liftByKey(UI.liftKey) ? '<h1>Lift</h1>' : '<h1>Progress</h1>';
  Views.lifts.actions = () => `<button class="btn sm" data-act="logPR" data-key="${esc(UI.liftKey || '')}">Log PR</button>`;
  Views.lifts.render = () => { const html = lr(); return UI.liftKey ? html : progSeg() + html; };
  Views.body.title = () => '<h1>Progress</h1>';
  Views.body.render = () => progSeg() + (UI.bodySub === 'measure' ? measureHTML() : UI.bodySub === 'photos' ? photosHTML() : weightHTML());
}
Views.athlete = {
  title() { return '<h1>Progress</h1>'; },
  actions() { return `<button class="btn sm" data-act="logJump">Log jump</button>`; },
  render() { return progSeg() + dunkCardHTML() + dunkProgramHTML(false) + skillsCardHTML(); },
};

/* ---------- Train: Workout · Plan · History ---------- */
A.trainSub = d => { UI.trainSub = d.k; $('#view').scrollTop = 0; render(); };
overviewHTML = function () {
  const w = activeWorkout(), sub = UI.trainSub || 'workout';
  let h = segHTML('trainSub', [['workout', 'Workout'], ['plan', 'Plan'], ['history', 'History']], sub);
  if (sub === 'plan') return h + splitCardHTML() + dunkProgramHTML(true) + mobilityHTML() + gymsCardHTML();
  if (sub === 'history') return h + weekCardHTML() + heatmapCardHTML() + recentWorkoutsHTML();
  h += deloadBannerHTML();
  if (w) h += `<section class="card hero-card"><div class="card-h"><div><div class="eyebrow">In progress</div><h2 class="lift-h" style="font-size:30px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${esc(w.gymName || 'No gym')} · started ${fmtClock(w.startTs)} · ${plural((w.sets || []).length, 'set')}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>`;
  else { h += smartCardHTML(); h += `<details class="card more-start"${smartPlan().ex.length ? '' : ' open'}><summary><b>Pick a different workout</b><span class="faint small">Any day of your split, or an empty workout</span></summary>${startCardHTML().replace(/^<section class="card">/, '<div class="inner-start">').replace(/<\/section>$/, '</div>')}</details>`; }
  const nx = dunkNext(); if (nx) h += dunkProgramHTML(true);
  return h + actsCardHTML();
};

/* ---------- Today ---------- */
function habitStripHTML() {
  const hs = myHabits(), t = todayStr();
  return `<section class="card hab-strip"><div class="card-h"><h2 class="sec-t">Habits</h2><button class="linkbtn" data-act="goYouHabits">See all</button></div><div class="hs-row">${hs.map(h => { const on = habitDone(h, t), st = habitStreak(h); return `<button class="hs${on ? ' on' : ''}" data-act="habitTap" data-id="${h.id}" aria-pressed="${on}" aria-label="${esc(h.n)}"><span class="hs-c">${h.e}</span><span class="tiny">${st ? '🔥' + st : esc(h.s || h.n.split(' ')[0])}</span></button>`; }).join('')}</div></section>`;
}
A.goYouHabits = () => goYou();
Views.home.render = function () {
  const lw = latestWeighin(), s = S(), w = activeWorkout(), hr = new Date().getHours();
  let h = `<div class="hdr-hello"><b>${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}${s.name ? `, ${esc(s.name)}` : ''}</b><span>${fmtDay(todayStr())}</span></div>`;
  h += alertsHTML(lw);
  h += `<section class="card ready-card">${readinessRowHTML()}</section>`;
  if (w) h += `<section class="card hero-card"><div class="card-h"><div><div class="eyebrow">Workout in progress</div><h2 class="lift-h" style="font-size:30px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${plural((w.sets || []).length, 'set')} · started ${fmtClock(w.startTs)}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>`;
  else h += todayCardHTML(lw);
  h += habitStripHTML();
  h += `<div class="tiles">${bwTile(lw)}${weekTile()}${goalsTile()}${big3Tile()}</div>`;
  h += insightsHTML();
  h += recapHomeHTML();
  return h;
};

/* ---------- Food: saved meals + trends ---------- */
{
  const fr = Views.food.render;
  Views.food.render = function () {
    let h = fr();
    const sm = savedMealsHTML();
    if (sm) { const i = h.indexOf('<div class="field"><div class="card-h"><span class="lbl">My foods'); h = i >= 0 ? h.slice(0, i) + sm + h.slice(i) : h + sm; }
    return h + macroTrendsHTML();
  };
}

/* ---------- You ---------- */
Views.you = {
  title() { return '<h1>You</h1>'; },
  actions() { return `<button class="iconbtn" data-act="openSettings" aria-label="Settings">${ICON.gear}</button>`; },
  render() {
    const s = S(), mg = myGoals(), have = s.badges || {}, nB = MILESTONES.filter(x => have[x[0]]).length, lw = latestWeighin(), wk = weekStats();
    const total = Store.list('workouts').filter(w => (w.sets || []).length).length;
    let h = `<section class="card you-hero"><div class="you-av">${esc((s.name || 'You').slice(0, 1).toUpperCase())}</div><div class="grow"><h2 class="lift-h" style="font-size:26px;margin:0">${esc(s.name || 'Your profile')}</h2><p class="muted small" style="margin:2px 0 0">${plural(total, 'workout')} · ${wk.streak ? `${wk.streak}-week streak` : 'no streak yet'}${lw ? ' · ' + fwu(lw.weight) : ''}</p>
      <div class="chips" style="margin-top:8px">${mg.length ? mg.slice(0, 6).map(g => `<span class="gchip">${GOALS[g][0]} ${esc(GOALS[g][1])}</span>`).join('') : ''}<button class="chip" data-act="goalsEditYou">${mg.length ? 'Edit goals' : '+ Pick goals'}</button></div></div></section>`;
    h += habitsCardHTML(true);
    h += milestonesCardHTML().replace('<h2 class="sec-t">Milestones</h2>', `<h2 class="sec-t">Milestones</h2>`);
    h += `<section class="card"><h2 class="sec-t">Appearance</h2>${appearanceHTML()}</section>`;
    const rows = [['⚙️', 'Settings', 'Units, targets, rest timer, alerts', 'openSettings'], ['🔋', 'Readiness check-in', 'Sleep, soreness, energy', 'readyOpen'], ['🗓️', 'Weekly recap', 'Share your week', 'recapOpen'], ['💾', 'Back up now', lastBackup() ? `Last backup ${fmtDate(lastBackup())}` : 'No backup yet', 'backupNow'], ['📄', 'Export CSV', 'Sets, weigh-ins, food, activities', 'csvExport'], ['✨', "What's new", `Version ${APP_VERSION}`, 'whatsNewAll']];
    h += `<section class="card flush list-card">${rows.map(([ic, t, sub, act]) => `<button class="row" data-act="${act}"><span class="li-ic">${ic}</span><span class="grow"><b>${t}</b><div class="faint small">${esc(sub)}</div></span>${ICON.chevR.replace('<svg', '<svg width="16" height="16" style="opacity:.4"')}</button>`).join('')}</section>`;
    return h;
  },
};
A.goalsEditYou = () => A.editGoals({});
A.whatsNewAll = () => openSheet("What's new", CHANGELOG.slice(0, 8).map(([v, xs]) => `<div class="field"><span class="lbl">Version ${v}</span><ul class="small" style="padding-left:18px;margin:0;line-height:1.5">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join(''));
