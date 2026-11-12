'use strict';
/* Sports & cardio: log any activity (a run, basketball, pickleball, martial arts...) by scanning a watch summary or typing it in.
   Activity days count toward the weekly goal and streak, and sessions count toward the goals they train. */

/* [id, emoji, label, tracks distance, goals it trains, words that identify it in a watch summary] */
const ACTS = [
  ['Cardio', [
    ['run', '🏃', 'Running', 1, ['endurance', 'legs', 'sprint'], /run|jog|treadmill|sprint|track/], ['walk', '🚶', 'Walking', 1, ['longevity', 'endurance'], /walk/], ['hike', '🥾', 'Hiking', 1, ['endurance', 'legs', 'balance'], /hik|trek/],
    ['cycle', '🚴', 'Cycling', 1, ['endurance', 'legs'], /cycl|bik|spin/], ['swim', '🏊', 'Swimming', 1, ['endurance', 'shoulders', 'vback'], /swim/], ['row', '🚣', 'Rowing', 1, ['endurance', 'vback', 'legs'], /row/],
    ['elliptical', '🌀', 'Elliptical', 0, ['endurance'], /ellipt/], ['stairs', '🪜', 'Stair climber', 0, ['endurance', 'legs', 'glutes'], /stair|step/], ['hiit', '🔥', 'HIIT / circuits', 0, ['endurance', 'power', 'relative'], /hiit|interval|cross.?train|circuit|crossfit|hyrox|functional/], ['jumprope', '➰', 'Jump rope', 0, ['endurance', 'agility', 'jump'], /rope|skip/],
  ]],
  ['Team sports', [
    ['basketball', '🏀', 'Basketball', 0, ['jump', 'agility', 'sprint', 'endurance'], /basketball|hoop/], ['football', '🏈', 'Football', 0, ['power', 'sprint', 'agility'], /american football|football/], ['soccer', '⚽', 'Soccer', 1, ['sprint', 'agility', 'endurance'], /soccer|futsal/],
    ['baseball', '⚾', 'Baseball / softball', 0, ['power', 'sprint'], /baseball|softball/], ['volleyball', '🏐', 'Volleyball', 0, ['jump', 'agility', 'shoulders'], /volley/], ['hockey', '🏒', 'Hockey', 0, ['legs', 'power', 'balance'], /hockey/],
    ['lacrosse', '🥍', 'Lacrosse', 0, ['sprint', 'agility', 'endurance'], /lacrosse/], ['rugby', '🏉', 'Rugby', 0, ['strength', 'power', 'endurance'], /rugby/], ['frisbee', '🥏', 'Ultimate frisbee', 0, ['sprint', 'agility', 'endurance'], /frisbee|disc/], ['cricket', '🏏', 'Cricket', 0, ['power', 'sprint'], /cricket/],
  ]],
  ['Racket & club', [
    ['tennis', '🎾', 'Tennis', 0, ['agility', 'power', 'endurance'], /tennis/], ['pickleball', '🏓', 'Pickleball', 0, ['agility', 'balance', 'longevity'], /pickle|paddle|ping|table tennis/], ['badminton', '🏸', 'Badminton', 0, ['agility', 'endurance'], /badminton|squash|racquet/], ['golf', '⛳', 'Golf', 1, ['power', 'mobility', 'longevity'], /golf/],
  ]],
  ['Combat', [
    ['boxing', '🥊', 'Boxing / kickboxing', 0, ['power', 'endurance', 'agility'], /box/], ['martial', '🥋', 'Martial arts', 0, ['power', 'mobility', 'balance', 'endurance'], /martial|karate|taekwondo|judo|mma|muay|kung|tai chi/], ['wrestling', '🤼', 'Wrestling / jiu-jitsu', 0, ['grip', 'strength', 'endurance'], /wrestl|jiu|bjj|grappl/],
  ]],
  ['Outdoors & movement', [
    ['climbing', '🧗', 'Climbing', 0, ['grip', 'relative', 'vback'], /climb|boulder/], ['skiing', '🎿', 'Skiing / snowboarding', 1, ['legs', 'balance'], /ski|snowboard/], ['skate', '🛹', 'Skating', 1, ['balance', 'legs'], /skat/], ['surfing', '🏄', 'Surfing / paddling', 0, ['balance', 'shoulders'], /surf|paddl|kayak/],
    ['dance', '💃', 'Dance', 0, ['balance', 'mobility', 'endurance'], /danc|zumba|barre/], ['yoga', '🧘', 'Yoga / pilates', 0, ['mobility', 'core', 'balance'], /yoga|pilates/], ['stretch', '🤸', 'Stretching / mobility', 0, ['mobility', 'injury'], /stretch|flexib|mobility|cooldown|cool down/], ['other', '⭐', 'Other activity', 0, [], /$^/],
  ]],
];
const ACT = Object.fromEntries(ACTS.flatMap(([, xs]) => xs.map(([id, e, l, dist, g, re]) => [id, { id, e, l, dist, g, re }])));
const SPORT_ACT = { running: 'run', track: 'run', cycling: 'cycle', swimming: 'swim', rowing: 'row', hiking: 'hike', walking: 'walk', mma: 'martial', crossfit: 'hiit', calisthenics: 'hiit' };
const actOf = a => ACT[a.type] || ACT.other;
const actName = a => a.type === 'other' && a.name ? a.name : actOf(a).l;
const actsList = () => Store.list('acts').sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
const durTxt = s => { if (!s) return ''; const m = Math.round(s / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? m % 60 + ' min' : ''}`.trim() : `${m} min`; };
const distTxt = mi => mi ? `${trim(U.metric ? mi * 1.609344 : mi, 2)} ${U.metric ? 'km' : 'mi'}` : '';
const paceTxt = a => { if (!a.dist || !a.duration) return ''; const s = a.duration / (U.metric ? a.dist * 1.609344 : a.dist); return `${Math.floor(s / 60)}:${pad(Math.round(s % 60) % 60)} /${U.metric ? 'km' : 'mi'}`; };
const actLine = a => [durTxt(a.duration), distTxt(a.dist), a.type === 'run' || a.type === 'walk' || a.type === 'hike' ? paceTxt(a) : '', a.activeCal ? `${trim(a.activeCal, 0)} kcal` : a.totalCal ? `${trim(a.totalCal, 0)} kcal` : '', a.avgHr ? `♥ ${trim(a.avgHr, 0)}` : ''].filter(Boolean).join(' · ');
function matchAct(s) { const t = String(s || '').toLowerCase(); if (!t) return null; for (const a of Object.values(ACT)) if (a.re.test(t)) return a.id; return null; }
/* your usual activities first: the sports you picked, then what you log most */
function myActIds() {
  const out = [], add = id => { if (ACT[id] && id !== 'other' && !out.includes(id)) out.push(id); }, cnt = {};
  for (const a of Store.list('acts')) cnt[a.type] = (cnt[a.type] || 0) + 1;
  Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).forEach(add);
  for (const s of mySports()) add(SPORT_ACT[s] || s);
  for (const id of ['run', 'walk', 'basketball', 'cycle']) if (out.length < 5) add(id);
  return out.slice(0, 7);
}
function actsCardHTML() {
  const all = actsList(), since = addDays(todayStr(), -6), wk = all.filter(a => a.date >= since), mins = wk.reduce((t, a) => t + (a.duration || 0), 0) / 60, kcal = wk.reduce((t, a) => t + (a.activeCal || a.totalCal || 0), 0);
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Sports &amp; cardio</h2><button class="btn sm" data-act="actPick">${ICON.plus.replace('<svg', '<svg width="16" height="16"')} Log</button></div>
    <div class="chips scroll">${myActIds().map(id => `<button class="chip" data-act="actNew" data-type="${id}"><span aria-hidden="true">${ACT[id].e}</span> ${esc(ACT[id].l.split(' / ')[0])}</button>`).join('')}<button class="chip" data-act="actPick">More…</button></div>
    ${wk.length ? `<div class="stats"><div class="stat"><span class="k">Last 7 days</span><span class="v" style="font-size:24px">${wk.length}<span class="unit">${wk.length === 1 ? 'session' : 'sessions'}</span></span></div><div class="stat"><span class="k">Time</span><span class="v" style="font-size:24px">${mins >= 60 ? `${Math.floor(mins / 60)}<span class="unit">h</span> ${Math.round(mins % 60)}<span class="unit">min</span>` : `${Math.round(mins)}<span class="unit">min</span>`}</span></div><div class="stat"><span class="k">Burned</span><span class="v" style="font-size:24px">${kcal ? trim(kcal, 0) : '—'}<span class="unit">${kcal ? 'kcal' : ''}</span></span></div></div>` : ''}
    ${all.length ? `<div class="actlist">${all.slice(0, 4).map(actRowHTML).join('')}</div>${all.length > 4 ? `<button class="linkbtn" style="align-self:flex-start;font-size:13px;padding:0" data-act="actAll">See all ${all.length}</button>` : ''}` : `<p class="muted small" style="margin:0">Went for a run or played a game? Log it here${CAP.sample ? ', or scan the summary from your watch' : ''}. It counts toward your week and your goals.</p>`}</section>`;
}
const actRowHTML = a => `<button class="row" data-act="actOpen" data-id="${a.id}" style="padding-left:0;padding-right:0"><span style="font-size:22px;width:30px;text-align:center" aria-hidden="true">${actOf(a).e}</span><div class="grow"><b>${esc(actName(a))}</b><div class="faint small">${esc(fmtDate(a.date))}${actLine(a) ? ' · ' + esc(actLine(a)) : ''}</div></div>${a.effort ? `<span class="small" style="font-weight:700;color:${EFFORT_COL(a.effort)}">${a.effort}</span>` : ''}</button>`;
A.actAll = () => openSheet('Sports & cardio', `<div class="actlist">${actsList().map(actRowHTML).join('')}</div>`);
A.actPick = d => {
  const date = d && d.date || '';
  openSheet('What did you do?', `${CAP.sample ? `<button class="btn block" data-act="actScan">${ICON.camera} Scan a watch summary</button><p class="faint small" style="margin:-6px 0 0;text-align:center">or pick an activity and type it in</p>` : ''}
    ${ACTS.map(([g, xs]) => `<div class="field"><span class="lbl">${g}</span><div class="chips">${xs.map(([id, e, l]) => `<button class="chip" data-act="actNew" data-type="${id}" data-date="${date}"><span aria-hidden="true">${e}</span> ${l}</button>`).join('')}</div></div>`).join('')}`);
};
A.actNew = d => actForm({ type: d.type || 'run', date: d.date || todayStr() });
A.actOpen = d => { const a = Store.docs.acts[d.id]; if (a) actForm({ ...a, id: d.id }); };
A.actScan = () => { Sheet.watchId = 'act'; const i = $('#file-watch'); i.value = ''; i.click(); };
function actFromScan(id, v, url) {
  const type = matchAct(v.type) || 'other', mi = v.dist ? (/k/i.test(v.distUnit || '') ? v.dist / 1.609344 : /^m$|met/i.test(v.distUnit || '') ? v.dist / 1609.344 : v.dist) : null;
  actForm({ type, name: type === 'other' ? v.type : '', date: todayStr(), duration: v.duration, dist: mi, activeCal: v.activeCal, totalCal: v.totalCal, avgHr: v.avgHr, maxHr: v.maxHr, effort: v.effort, src: 'scan', note: '', tip: v.note || 'Check the numbers, then save.' }, url);
}
function actForm(a, imgUrl) {
  Sheet.act = a; const t = ACT[a.type] || ACT.other, d = a.duration || 0, du = U.metric ? 'km' : 'mi';
  const html = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your screenshot" style="max-height:150px">` : ''}${a.tip ? `<p class="tip-line">${esc(a.tip)}</p>` : ''}
    <div class="fields"><div class="field"><label class="lbl" for="ac-t">Activity</label><select id="ac-t" name="atype">${ACTS.map(([g, xs]) => `<optgroup label="${g}">${xs.map(([id, e, l]) => `<option value="${id}" ${id === t.id ? 'selected' : ''}>${e} ${l}</option>`).join('')}</optgroup>`).join('')}</select></div><div class="field"><label class="lbl" for="ac-d">Date</label><input id="ac-d" type="date" name="adate" value="${a.date || todayStr()}" max="${todayStr()}"></div></div>
    <div class="field" id="ac-nw"${t.id === 'other' ? '' : ' hidden'}><label class="lbl" for="ac-n">What was it?</label><input id="ac-n" name="aname" value="${esc(a.name || '')}" placeholder="e.g. Spikeball" autocapitalize="words"></div>
    <div class="field"><span class="lbl" id="ac-dl">Time</span><div class="durin" role="group" aria-labelledby="ac-dl"><label><input name="wdh" inputmode="numeric" maxlength="2" value="${d ? Math.floor(d / 3600) : ''}" placeholder="0" aria-label="Hours"><span>h</span></label><label><input name="wdm" inputmode="numeric" maxlength="2" value="${d ? pad(Math.floor(d % 3600 / 60)) : ''}" placeholder="00" aria-label="Minutes"><span>m</span></label><label><input name="wds" inputmode="numeric" maxlength="2" value="${d ? pad(Math.round(d % 60)) : ''}" placeholder="00" aria-label="Seconds"><span>s</span></label></div></div>
    <div class="field" id="ac-dw"${t.dist || a.dist ? '' : ' hidden'}><label class="lbl" for="ac-di">Distance <span class="faint" id="ac-pace"></span></label><div class="inunit"><input id="ac-di" name="adist" inputmode="decimal" value="${a.dist ? plain(U.metric ? a.dist * 1.609344 : a.dist, 2) : ''}" placeholder="0.0"><span>${du}</span></div></div>
    <div class="fields"><div class="field"><label class="lbl" for="ac-a">Active kcal</label><input id="ac-a" name="aact" inputmode="numeric" value="${a.activeCal ?? ''}"></div><div class="field"><label class="lbl" for="ac-tc">Total kcal</label><input id="ac-tc" name="atot" inputmode="numeric" value="${a.totalCal ?? ''}"></div></div>
    <div class="fields"><div class="field"><label class="lbl" for="ac-h">Avg HR</label><input id="ac-h" name="ahr" inputmode="numeric" value="${a.avgHr ?? ''}" placeholder="bpm"></div><div class="field"><label class="lbl" for="ac-m">Max HR</label><input id="ac-m" name="amax" inputmode="numeric" value="${a.maxHr ?? ''}" placeholder="bpm"></div></div>
    <div class="field"><span class="lbl">Effort <span class="faint" id="wt-el">${a.effort ? `${a.effort} · ${EFFORT(a.effort)}` : '(optional)'}</span></span><div class="effort" role="radiogroup" aria-label="Effort from 1 to 10">${[...Array(10)].map((_, i) => `<button data-act="wEffort" data-n="${i + 1}" aria-pressed="${a.effort === i + 1}" style="--c:${EFFORT_COL(i + 1)}">${i + 1}</button>`).join('')}</div></div>
    <div class="field"><label class="lbl" for="ac-no">Note (optional)</label><input id="ac-no" name="anote" value="${esc(a.note || '')}" placeholder="e.g. 3 pickup games, felt fast"></div>
    <p class="faint small" style="margin:0">Only the activity is required. Add whatever your watch shows.</p>
    <button class="btn block" data-act="actSave">${a.id ? 'Save changes' : 'Save activity'}</button>
    ${a.id ? `<button class="linkbtn danger center" data-act="actDel" data-id="${a.id}">Delete</button>` : CAP.sample && !imgUrl ? `<button class="linkbtn center" data-act="actScan">${ICON.camera.replace('<svg', '<svg width="16" height="16" style="vertical-align:-3px"')} Scan a watch summary instead</button>` : ''}`;
  const title = a.id ? 'Edit activity' : 'Log activity';
  if ($('#sheet').hidden) openSheet(title, html); else { sheetTitle(title); sheetBody(html); }
  const sel = $('#ac-t'), upd = () => { const x = ACT[sel.value]; $('#ac-nw').hidden = sel.value !== 'other'; $('#ac-dw').hidden = !(x.dist || num($('#ac-di').value)); pace(); };
  const pace = () => { const v = actRead(); $('#ac-pace').textContent = v.dist && v.duration ? `· ${paceTxt(v)}` : ''; };
  sel.addEventListener('change', upd); $$('#sheet .durin input, #ac-di').forEach(i => i.addEventListener('input', pace)); pace();
}
function actRead() {
  const n = name => { const v = num(fval(name)); return v != null && v > 0 ? v : null; }, hh = num(fval('wdh')) || 0, mm = num(fval('wdm')) || 0, ss = num(fval('wds')) || 0, di = n('adist'), ef = $('#sheet .effort [aria-pressed="true"]');
  return { type: fval('atype') || 'other', name: fval('aname') || '', date: fval('adate') || todayStr(), bad: mm >= 60 || ss >= 60, duration: hh || mm || ss ? Math.round(hh * 3600 + mm * 60 + ss) : null, dist: di ? (U.metric ? di / 1.609344 : di) : null, activeCal: n('aact'), totalCal: n('atot'), avgHr: n('ahr'), maxHr: n('amax'), effort: ef ? +ef.dataset.n : null, note: fval('anote') || '' };
}
A.actSave = () => {
  const v = actRead(), old = Sheet.act || {};
  if (v.bad) return toast('Minutes and seconds go up to 59.', { bad: true });
  if (v.type === 'other' && !v.name) v.name = 'Activity';
  const { bad, ...rec } = v, id = old.id || newId(), prev = Store.list('acts').filter(a => a.type === v.type && a.id !== id);
  put('acts', id, { ...rec, src: old.src || 'manual', ts: old.ts || Date.now() }); closeSheet();
  const t = ACT[v.type] || ACT.other, longest = v.duration && prev.length >= 2 && v.duration > Math.max(...prev.map(a => a.duration || 0)), far = v.dist && prev.length >= 2 && v.dist > Math.max(...prev.map(a => a.dist || 0));
  if (!old.id && (far || longest)) { toast(`${far ? 'Farthest' : 'Longest'} ${actName(v).toLowerCase()} yet! ${t.e}`, { pr: true, ms: 3600 }); confetti({ n: 20, emoji: t.e, power: 13 }); setTimeout(() => confetti({ n: 60 }), 150); }
  else { toast(old.id ? 'Activity updated' : `${actName(v)} logged ${t.e}`); if (!old.id) confetti({ n: 14, emoji: t.e, power: 11 }); }
};
A.actDel = d => { const a = Store.docs.acts[d.id]; del('acts', d.id); closeSheet(); if (a) toastUndo('Activity deleted', () => put('acts', d.id, a)); };
