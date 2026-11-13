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
  else { h += smartCardHTML(); h += `<details class="card more-start"${smartPlan().ex.length && !UI.moreStart ? '' : ' open'}><summary><b>Pick a different workout</b><span class="faint small">Any day of your split, or an empty workout</span></summary>${startCardHTML().replace('<button class="btn block" data-act="startWorkout">', '<button class="btn ghost block" data-act="dayNew">' + ICON.plus + ' Add a workout day</button><button class="btn ghost block" data-act="pastStart">🗓️ Log a past workout</button><button class="btn block" data-act="startWorkout">').replace(/^<section class="card">/, '<div class="inner-start">').replace(/<\/section>$/, '</div>')}</details>`; }
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

/* ---------- log a workout for a past day ---------- */
A.pastStart = d => {
  if (activeWorkout()) { closeSheet(); toast('Finish or discard the workout in progress first.', { bad: true }); return; }
  const days = splitDays(), y = addDays(todayStr(), -1), date = d && d.date && d.date < todayStr() ? d.date : y;
  const body = `<p class="muted small" style="margin:0">Log sets for a day you already trained. They count on that date for your calendar, streaks and PRs.</p>
    <div class="field"><label class="lbl" for="past-d">Date</label><input id="past-d" type="date" value="${date}" max="${y}"></div>
    <div class="field"><span class="lbl">Which workout?</span><div class="chips">${days.map(x => `<button class="chip" data-act="pick" data-group="pastday" data-value="${x.id}">${esc(x.name)}</button>`).join('')}<button class="chip" data-act="pick" data-group="pastday" data-value="" aria-pressed="${days.length ? 'false' : 'true'}">Empty workout</button></div></div>
    <button class="btn block" data-act="pastGo">Start logging</button>`;
  if ($('#sheet').hidden) openSheet('Log a past workout', body); else { sheetTitle('Log a past workout'); sheetBody(body); }
};
A.pastGo = () => {
  const date = $('#past-d').value, dayId = picked($('#sheet'), 'pastday');
  if (!date || date >= todayStr()) { toast('Pick a day before today.', { bad: true }); return; }
  const day = splitDays().find(x => x.id === dayId) || null, gym = activeGym(), plan = day ? planFor(day, gym).filter(p => p.use).map(p => p.use) : [];
  put('workouts', newId(), { date, past: true, startTs: Date.now(), gymId: gym?.id || null, gymName: gym?.name || '', dayId: day?.id || null, dayName: day?.name || 'Workout', plan, sets: [] });
  closeSheet(); UI.session = true; UI.tab = 'train'; $('#view').scrollTop = 0; render(); toast(`Logging for ${fmtDay(date)}`);
};
{
  const sh = sessionHTML;
  sessionHTML = function (w) { const h = sh(w); return w.past ? `<div class="alert past-bar"><span class="ai" aria-hidden="true">🗓️</span><p>Logging a past workout for <b>${fmtDay(w.date)}</b>. Sets count on that day.</p></div>` + h : h; };
  const cd = A.calDay;
  A.calDay = d => { cd(d); if (d.date < todayStr() && !$('#sheet').hidden && !$('#sheet [data-act=pastStart]')) { const b = $('#sheet .sheet-b'); if (b) b.insertAdjacentHTML('beforeend', `<button class="btn block${b.querySelector('.row') ? ' ghost' : ''}" data-act="pastStart" data-date="${d.date}">🏋️ Log a workout for this day</button>`); } };
}

/* ---------- "I trained, but no details": mark a day with what you worked ---------- */
A.markDay = d => {
  const date = d.date || todayStr(), days = splitDays(); Sheet.mark = { date, groups: new Set(), dayId: null, dayName: '' };
  const body = `<p class="muted small" style="margin:0">Don't remember the exercises or weights? Just say what you trained on <b>${fmtDay(date)}</b>. It counts as a gym day, and recovery and Smart pick will know those muscles are worked.</p>
    ${days.length ? `<div class="field"><span class="lbl">Which day of your split?</span><div class="chips">${days.map(x => `<button class="chip" data-act="markSplit" data-id="${x.id}" aria-pressed="false">${esc(x.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><span class="lbl">Muscles you trained</span><div class="chips" id="mark-g">${GROUPS.map(g => `<button class="chip" data-act="markGroup" data-g="${g}" aria-pressed="false">${g}</button>`).join('')}</div></div>
    <button class="btn block" data-act="markSave">Save</button>`;
  if ($('#sheet').hidden) openSheet('Mark as trained', body); else { sheetTitle('Mark as trained'); sheetBody(body); }
};
A.markSplit = (d, el) => {
  const day = splitDays().find(x => x.id === d.id); if (!day) return; const on = el.getAttribute('aria-pressed') !== 'true';
  $$('#sheet [data-act=markSplit]').forEach(b => b.setAttribute('aria-pressed', String(b === el && on)));
  Sheet.mark.dayId = on ? day.id : null; Sheet.mark.dayName = on ? day.name : '';
  const gs = (day.groups || []).length ? day.groups : [...new Set((day.exercises || []).map(n => library().get(keyOf(n))?.group).filter(Boolean))];
  Sheet.mark.groups = new Set(on ? gs : []); $$('#mark-g .chip').forEach(b => b.setAttribute('aria-pressed', String(Sheet.mark.groups.has(b.dataset.g))));
};
A.markGroup = (d, el) => { const g = Sheet.mark.groups; if (g.has(d.g)) g.delete(d.g); else g.add(d.g); el.setAttribute('aria-pressed', String(g.has(d.g))); };
A.markSave = () => {
  const m = Sheet.mark, groups = [...m.groups], t = parseDate(m.date).getTime() + 17 * 36e5, name = m.dayName || (groups.length ? groups.slice(0, 3).join(' & ') : 'Gym day');
  put('workouts', newId(), { date: m.date, marked: true, sets: [], groups, dayId: m.dayId, dayName: name, startTs: t, endTs: t + 36e5, ts: Date.now() });
  closeAllSheets(); toast(`${fmtDate(m.date)}: ${name} marked ✓`);
};
{
  const ps = A.pastStart;
  A.pastStart = d => { ps(d); const b = $('#sheet .sheet-b'); if (b && $('#past-d')) { b.insertAdjacentHTML('beforeend', `<button class="linkbtn center" data-act="markFromPast">Don't remember the details? Just mark it as trained</button>`); } };
  A.markFromPast = () => A.markDay({ date: $('#past-d')?.value || addDays(todayStr(), -1) });
}

document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('more-start')) UI.moreStart = e.target.open; }, true);

/* cache the heavier derived data per data revision (insights + Big 3 scan every set) */
{ const ins = insights; insights = () => Store.cached('insights:' + todayStr(), ins); }
{ const b3 = big3; big3 = () => Store.cached('big3', b3); }
