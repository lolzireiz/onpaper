'use strict';
/* ---------- Today screen: a calmer layout you can rearrange. Each block is a card you can hide or move (You → Customize Home). ---------- */
const HOME_CARDS = [
  ['today', 'Today', 'Your checklist: weigh-in, workout, protein'],
  ['coach', 'Assistant', 'Quick questions for your coach'],
  ['ready', 'Readiness', 'Your score, plus nap buttons'],
  ['habits', 'Habits', 'Tap them off for today'],
  ['tiles', 'Stats', 'Bodyweight, this week, goals, Big 3'],
  ['insights', 'Insights', 'What your data is telling you'],
  ['recap', 'Weekly recap', 'Last week at a glance'],
];
const HOME_SIMPLE = ['today', 'coach', 'ready', 'tiles'];
function homeCfg() {
  const s = S(), ids = HOME_CARDS.map(c => c[0]), h = s.home || (s.proInit === 'new' ? { order: ids, off: ids.filter(i => !HOME_SIMPLE.includes(i)) } : { order: ['ready', 'today', 'coach', 'habits', 'tiles', 'insights', 'recap'], off: [] });
  const order = [...(h.order || []).filter(i => ids.includes(i)), ...ids.filter(i => !(h.order || []).includes(i))];
  return { order, off: (h.off || []).filter(i => ids.includes(i)) };
}
function homeAlertsHTML(lw) {
  let h = alertsHTML(lw); const st = proState();
  const trial = st.kind === 'trial' && st.daysLeft <= 2 ? `<div class="alert"><span class="ai" aria-hidden="true">✨</span><p>Your Pro trial ends in <b>${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'}</b></p><button class="btn sm" data-act="pwOpen">See Pro</button></div>` : '';
  const parts = (trial + h.replace(/^<div class="alerts">|<\/div>$/g, '')).split('<div class="alert">').filter(Boolean).map(x => '<div class="alert">' + x);
  if (!parts.length) return '';
  const show = UI.alertsOpen ? parts : parts.slice(0, 1);
  return `<div class="alerts">${show.join('')}${parts.length > 1 ? `<button class="alerts-more" data-act="alertsMore">${UI.alertsOpen ? 'Show less' : `${parts.length - 1} more reminder${parts.length > 2 ? 's' : ''}`}</button>` : ''}</div>`;
}
A.alertsMore = () => { UI.alertsOpen = !UI.alertsOpen; render(); };
Views.home.render = function () {
  const lw = latestWeighin(), s = S(), w = activeWorkout(), hr = new Date().getHours(), cfg = homeCfg();
  const card = {
    coach: () => coachCardHTML(),
    ready: () => `<section class="card ready-card">${readinessRowHTML()}${napFootHTML()}</section>`,
    today: () => w ? '' : todayCardHTML(lw),
    habits: () => habitStripHTML(),
    tiles: () => `<div class="tiles">${bwTile(lw)}${weekTile()}${goalsTile()}${big3Tile()}</div>`,
    insights: () => insightsHTML(),
    recap: () => recapHomeHTML(),
  };
  let h = `<div class="hdr-hello"><b>${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}${s.name ? `, ${esc(s.name)}` : ''}</b><span>${fmtDay(todayStr())}</span></div>`;
  h += typeof recapStripHTML === 'function' ? recapStripHTML() : '';
  h += homeAlertsHTML(lw);
  if (w) h += `<section class="card hero-card"><div class="card-h"><div><div class="eyebrow">Workout in progress</div><h2 class="lift-h" style="font-size:30px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${plural((w.sets || []).length, 'set')} · started ${fmtClock(w.startTs)}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>`;
  for (const id of cfg.order) if (!cfg.off.includes(id)) h += card[id]();
  h += `<button class="home-edit" data-act="homeEdit">${cfg.off.length ? `${cfg.off.length} hidden · ` : ''}Customize this screen</button>`;
  return h;
};
A.homeEdit = () => { openSheet('Customize Home', ''); drawHomeEdit(); };
function drawHomeEdit() {
  const cfg = homeCfg(), name = Object.fromEntries(HOME_CARDS.map(c => [c[0], c]));
  const simple = cfg.off.length === HOME_CARDS.length - HOME_SIMPLE.length && HOME_SIMPLE.every(i => !cfg.off.includes(i));
  sheetBody(`<p class="muted small" style="margin:0 0 10px">Pick what you see on Today and in what order. Nothing is deleted; hidden cards just stay out of the way.</p>
    <div class="seg" style="margin-bottom:12px"><button data-act="homePreset" data-p="simple" aria-pressed="${simple}">Simple</button><button data-act="homePreset" data-p="all" aria-pressed="${!cfg.off.length}">Everything</button></div>
    <div class="he-list">${cfg.order.map((id, i) => { const on = !cfg.off.includes(id); return `<div class="he-row${on ? '' : ' off'}"><label class="grow"><input type="checkbox" data-act="homeTog" data-id="${id}" ${on ? 'checked' : ''}><span><b>${name[id][1]}</b><span class="faint tiny">${name[id][2]}</span></span></label><button class="iconbtn" data-act="homeMove" data-id="${id}" data-d="-1" aria-label="Move ${name[id][1]} up" ${i ? '' : 'disabled'}>${ICON.up}</button><button class="iconbtn" data-act="homeMove" data-id="${id}" data-d="1" aria-label="Move ${name[id][1]} down" ${i < cfg.order.length - 1 ? '' : 'disabled'}>${ICON.down}</button></div>`; }).join('')}</div>
    <button class="btn block" data-act="closeSheet" style="margin-top:12px">Done</button>`);
}
const homeSave = cfg => { saveSettings({ home: cfg }); drawHomeEdit(); };
A.homeTog = d => { const c = homeCfg(); homeSave({ order: c.order, off: c.off.includes(d.id) ? c.off.filter(i => i !== d.id) : [...c.off, d.id] }); };
A.homeMove = d => { const c = homeCfg(), i = c.order.indexOf(d.id), j = i + +d.d; if (j < 0 || j >= c.order.length) return; const o = [...c.order]; [o[i], o[j]] = [o[j], o[i]]; homeSave({ order: o, off: c.off }); };
A.homePreset = d => { const ids = HOME_CARDS.map(c => c[0]); homeSave(d.p === 'simple' ? { order: [...HOME_SIMPLE, ...ids.filter(i => !HOME_SIMPLE.includes(i))], off: ids.filter(i => !HOME_SIMPLE.includes(i)) } : { order: homeCfg().order, off: [] }); };

/* ---------- the Assistant, where you'd look for it: a small card on Today with questions that fit the moment, and a button after a workout ---------- */
function coachPicks() {
  const t = todayStr(), hr = new Date().getHours(), ft = foodTotals(t), s = S(), did = Store.list('workouts').some(w => w.date === t && w.endTs), pLeft = (s.proteinTarget || 0) - ft.p, out = [];
  const add = i => { if (!out.includes(i) && out.length < 3) out.push(i); };
  if (did) add(3); else if (hr < 15) add(0);                    // last workout review, or today's plan
  if (pLeft > 25 && hr >= 10) add(1);                            // what to eat
  if (dailyOf(t).sleep != null || dailyOf(t).soreMap) add(6);    // recovery, once they've checked in
  if (new Date().getDay() <= 1) add(4);                          // week recap on Sunday and Monday
  [0, 1, 2, 5].forEach(add);
  return out;
}
function coachCardHTML() {
  return `<section class="card coach-card"><button class="cc-h" data-act="aiAsk"><span class="cc-ic">${ICON.ai}</span><span class="grow"><b>Ask your coach</b><span>It knows your training, food and recovery</span></span>${isPro() ? ICON.chevR : '<span class="plan-pill pro" style="margin:0">PRO</span>'}</button>
    <div class="cc-chips">${coachPicks().map(i => `<button class="chip" data-act="aiAsk" data-i="${i}">${AI_CMDS[i][0]} ${esc(AI_CMDS[i][1])}</button>`).join('')}</div></section>`;
}
A.aiAsk = d => { if (!proGate('ai')) return; A.aiOpen(); if (d && d.i != null && aiReady()) setTimeout(() => A.aiCmd({ i: d.i }), 260); };
{ const open0 = A.aiOpen; A.aiOpen = (d, el) => { if (isPro() && !S().aiSeen) saveSettings({ aiSeen: 1 }); return open0(d, el); }; }
{ const ss = showSummary; showSummary = function () { const r = ss.apply(this, arguments); try { const b = document.querySelector('#sheet .sheet-b'); if (b && !b.querySelector('.sum-coach')) b.insertAdjacentHTML('beforeend', `<button class="btn ghost block sum-coach" data-act="sumCoach" style="margin-top:8px">${ICON.ai.replace('<svg', '<svg width="18" height="18"')} Review this workout with your coach</button>`); } catch (e) {} return r; }; }
A.sumCoach = () => { closeAllSheets(); setTimeout(() => A.aiAsk({ i: 3 }), 300); };
