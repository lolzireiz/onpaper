'use strict';
/* Home dashboard + settings. */

Views.home = {
  title() { return '<span class="wordmark">lift<i>print</i></span>'; },
  render() {
    const lw = latestWeighin(), s = S(), w = activeWorkout(), hr = new Date().getHours();
    let h = `<div class="hdr-hello"><b>${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}${s.name ? `, ${esc(s.name)}` : ''}</b><span>${fmtDay(todayStr())}</span></div>`;
    h += alertsHTML(lw);
    if (w) h += `<section class="card"><div class="card-h"><div><div class="eyebrow">Workout in progress</div><h2 class="lift-h" style="font-size:34px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${plural((w.sets || []).length, 'set')} · started ${fmtClock(w.startTs)}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>`;
    else h += todayCardHTML(lw);
    h += `<div class="tiles">${bwTile(lw)}${weekTile()}${goalsTile()}${big3Tile()}</div>`;
    h += insightsHTML();
    h += feedHTML();
    return h;
  },
};
function alertsHTML(lw) {
  const s = S(), out = [], hasAny = lw || Store.list('workouts').length || Store.list('food').length;
  const steps = [[!!lw, 'Log today\'s weight', 'logWeighin', 'Weigh in'], [gyms().length > 0, 'Add your gym and its equipment', 'editGym', 'Add gym'], [splitDays().length > 0, 'Pick your split', 'editSplit', 'Pick split'], [liftList().length > 0, 'Log a PR or two you already have', 'logPR', 'Log PR']];
  const todo = steps.filter(x => !x[0]);
  if (todo.length && (!hasAny || !gyms().length || !splitDays().length)) out.push(['🧰', `<b>Setup ${steps.length - todo.length} of ${steps.length}</b> · ${todo[0][1]}`, todo[0][2], todo[0][3]]);
  const since = lw ? daysBetween(lw.date, todayStr()) : null;
  if (lw && since >= (s.nudgeDays || 3)) out.push(['⚖️', `<b>${since} days</b> since your last weigh-in`, 'logWeighin', 'Weigh in']);
  if (backupDue()) out.push(['💾', lastBackup() ? `Last backup <b>${daysBetween(lastBackup(), todayStr())} days ago</b>` : 'No backup yet. Save one to iCloud.', 'backupNow', 'Back up']);
  return out.length ? `<div class="alerts">${out.map(([ic, t, act, btn]) => `<div class="alert"><span class="ai" aria-hidden="true">${ic}</span><p>${t}</p><button class="btn sm" data-act="${act}">${btn}</button></div>`).join('')}</div>` : '';
}
function setupHTML(lw) {
  const steps = [
    [!!lw, "Log today's weight", 'logWeighin', ''],
    [gyms().length > 0, 'Add your gym and its equipment', 'editGym', ''],
    [splitDays().length > 0, 'Pick your split', 'editSplit', ''],
    [liftList().length > 0, 'Log a PR or two you already have', 'logPR', ''],
  ];
  if (steps.every(s => s[0])) return '';
  return `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">Get set up</h2><div class="checklist">${steps.map(([done, label, act]) => `<button class="row ${done ? 'done' : ''}" data-act="${act}"><span class="dot"></span><b class="grow">${label}</b>${done ? '' : ICON.chevR.replace('<svg', '<svg width="18" height="18" style="color:var(--tx3)"')}</button>`).join('')}</div></section>`;
}
function bwTile(lw) {
  const all = weighins(), from = addDays(todayStr(), -30), recent = all.filter(w => w.date >= from);
  const rate = weeklyRate(all);
  return `<button class="tile" data-act="goTab" data-tab="body" data-sub="weight"><span class="k">Bodyweight</span>${lw ? `<span class="big md"><span data-count="${(+U.w(lw.weight)).toFixed(1)}" data-dp="1">${fw(lw.weight)}</span><span class="unit">${U.wu}</span></span>${spark(recent.map(w => w.weight))}<span class="sub">${rate != null ? `${signed(U.w(rate), 1)} ${U.wu}/week` : fmtDate(lw.date)}</span>` : `<span class="muted small">No weigh-ins yet</span><span class="sub">Tap to log one</span>`}</button>`;
}
function weekTile() {
  const st = weekStats(), t = todayStr();
  const dots = [...Array(7)].map((_, i) => { const d = addDays(st.wk0, i); return `<i class="${st.days.has(d) ? 'on' : ''}${d === t ? ' today' : ''}">${'MTWTFSS'[i]}</i>`; }).join('');
  return `<button class="tile" data-act="goTab" data-tab="train"><span class="k">This week</span><span class="big md">${st.cur}<span class="unit">of ${st.goal}</span></span><div class="weekdots">${dots}</div><span class="sub">${st.streak ? `${plural(st.streak, 'week')} streak` : 'Hit your goal to start a streak'}</span></button>`;
}
function foodTile() {
  const t = foodTotals(todayStr()), s = S();
  return `<button class="tile" data-act="goTab" data-tab="food"><span class="k">Today's food</span><span class="big md"><span data-count="${Math.round(t.cal)}">${trim(t.cal, 0)}</span><span class="unit">kcal</span></span><div class="bar ${t.cal >= s.calTarget ? 'over' : ''}"><i style="width:${clamp(t.cal / s.calTarget * 100, 0, 100)}%"></i></div><div class="bar p ${t.p >= s.proteinTarget ? 'over' : ''}"><i style="width:${clamp(t.p / s.proteinTarget * 100, 0, 100)}%"></i></div><span class="sub">${trim(t.p, 0)} of ${s.proteinTarget} g protein</span></button>`;
}
function goalsTile() {
  const g = myGoals();
  if (!g.length) return `<button class="tile cta" data-act="${S().onboarded && S().onboarded !== 'skipped' ? 'editGoals' : 'startOnboarding'}"><span class="k">Your goals</span><span class="big md" style="font-size:22px;line-height:1.15">Pick what you're training for</span><span class="sub" style="color:#ffc38a">Exercises that help get a badge →</span></button>`;
  const cnt = goalSetsThisWeek(), hit = g.filter(x => cnt[x]).length, show = 5, order = [...g.filter(x => cnt[x]), ...g.filter(x => !cnt[x])];
  return `<button class="tile" data-act="goalsSheet"><span class="k">Goals this week</span><span class="big md"><span data-count="${hit}">${hit}</span><span class="unit">of ${g.length}</span></span><div class="gemos">${order.slice(0, g.length > show + 1 ? show : show + 1).map(x => `<i class="${cnt[x] ? 'on' : 'off'}" title="${esc(GOALS[x][1])}">${GOALS[x][0]}</i>`).join('')}${g.length > show + 1 ? `<i class="more">+${g.length - show}</i>` : ''}</div><span class="sub">${hit === g.length ? 'Every goal trained 🔥' : `${g.length - hit} not trained yet`}</span></button>`;
}
function big3Tile() {
  const b = big3(), lw = latestWeighin();
  return `<button class="tile" data-act="goTab" data-tab="lifts"><span class="k">Big 3 total</span>${b.total ? `<span class="big md">${fw(b.total, 0)}<span class="unit">${U.wu}</span></span><span class="sub">Estimated${lw ? ` · ${trim(b.total / lw.weight, 2)}× bodyweight` : ''}</span>` : `<span class="muted small">Log squat, bench and deadlift to see it</span>`}</button>`;
}
function feedHTML() {
  const items = [];
  for (const L of liftIndex().values()) for (const s of L.sets) if (s.pr || !s.hit) items.push({ s, L });
  items.sort((a, b) => b.s.date.localeCompare(a.s.date) || (b.s.ts || 0) - (a.s.ts || 0));
  if (!items.length) return '';
  return `<section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t">Recent PRs &amp; misses</h2><button class="linkbtn" data-act="goTab" data-tab="lifts">All lifts</button></div>${items.slice(0, 4).map(({ s, L }) => `<button class="row" data-act="openLift" data-key="${esc(L.key)}"><div class="ring ${s.pr ? 'is-pr' : 'is-miss'}"><span>${esc(initials(L.name))}</span></div><div class="grow"><b>${esc(L.name)}</b> ${s.pr ? '<span class="pr">PR</span>' : '<span class="missb">Missed</span>'}<div class="faint small">${s.bwf ? loadTxt(s) : `${fw(s.w)}${s.w ? ' ' + U.wu : ''}`} × ${s.r}${s.bw ? ` · at ${fwu(s.bw.weight)} BW` : ''}</div></div><span class="faint small">${fmtDate(s.date)}</span></button>`).join('')}</section>`;
}
A.goTab = d => { UI.tab = d.tab; if (d.sub) UI.bodySub = d.sub; if (d.tab === 'lifts') UI.liftKey = null; if (d.tab === 'train') UI.session = false; $('#view').scrollTop = 0; render(); };
A.startFromHome = () => { UI.planDay = null; UI.planGym = null; A.startWorkout(); };

/* ---------- settings ---------- */
A.openSettings = () => {
  setTimeout(checkUpdate, 400); prepBackup();
  const s = S(), names = [...new Set([...liftList().map(L => L.name), ...Object.values(s.big3 || {})])];
  const sel = (k, label) => `<div class="field"><label class="lbl" for="b3-${k}">${label}</label><select id="b3-${k}" name="b3${k}">${names.map(n => `<option ${keyOf(n) === keyOf(s.big3?.[k]) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
  openSheet('Settings', `
    <details class="sset" open><summary><span class="si" aria-hidden="true">🎯</span><span class="grow"><b>You &amp; goals</b><span class="faint small">Goals, units, body diagrams</span></span></summary><div class="sset-b">
    <div class="field"><span class="lbl">Your goals</span>${myGoals().length ? `<div class="gbadges" style="margin:0">${myGoals().map(g => `<span class="gbadge"><i aria-hidden="true">${GOALS[g][0]}</i>${esc(GOALS[g][1])}</span>`).join('')}</div>` : '<p class="muted small" style="margin:0">None picked yet. Exercises that help your goals get a badge.</p>'}${mySports().length ? `<p class="faint small" style="margin:6px 0 0">Into: ${mySports().map(x => `${SPORT[x].e} ${esc(SPORT[x].l)}`).join(', ')}</p>` : ''}</div>
    <div class="fields"><button class="btn ghost" data-act="editGoals">${myGoals().length ? 'Edit goals' : 'Pick goals'}</button><button class="btn ghost" data-act="startOnboarding">Redo setup</button></div>
    <div class="field"><span class="lbl">Units</span><div class="seg">${chipSeg('unit', [['imperial', 'lb · in'], ['metric', 'kg · cm']], s.unit)}</div></div>
    <div class="field"><span class="lbl">Muscle diagrams show</span><div class="seg">${chipSeg('bodym', [['male', 'Male body'], ['female', 'Female body']], s.bodyModel || 'male')}</div></div>
    </div></details>
    <details class="sset"><summary><span class="si" aria-hidden="true">🏋️</span><span class="grow"><b>Workouts</b><span class="faint small">Weekly goal, sets, rest, Big 3</span></span></summary><div class="sset-b">
    <div class="field"><span class="lbl">Weekly gym goal (days)</span><div class="seg">${chipSeg('goal', [3, 4, 5, 6, 7].map(n => [n, n]), s.weeklyGoal)}</div></div>
    <div class="field"><span class="lbl">Default sets per exercise</span><div class="seg">${chipSeg('dsets', [2, 3, 4, 5].map(n => [n, n]), s.defaultSets || 3)}</div><p class="faint tiny">Change any single exercise by tapping its target during a workout.</p></div>
    <div class="field"><span class="lbl">Default rest between sets</span><div class="seg">${chipSeg('rest', [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00'], [240, '4:00']], s.restSec)}</div></div>
    <div class="field"><span class="lbl">Remind me to start my watch workout</span><div class="seg">${chipSeg('watch', [['on', 'On'], ['off', 'Off']], s.watchReminder === false ? 'off' : 'on')}</div></div>
    <div class="fields three">${sel('squat', 'Squat')}${sel('bench', 'Bench')}${sel('deadlift', 'Deadlift')}</div>
    <p class="faint small" style="margin-top:-6px">Which of your lifts count toward the Big 3 total.</p>
    </div></details>
    <details class="sset"><summary><span class="si" aria-hidden="true">🍽️</span><span class="grow"><b>Food &amp; weight</b><span class="faint small">Targets, eating plan, buddy, label scanning</span></span></summary><div class="sset-b">
    <div class="field"><span class="lbl">Eating plan</span><div class="seg">${chipSeg('goal2', [['bulk', 'Lean bulk'], ['maintain', 'Maintain'], ['cut', 'Cut']], s.goal || 'bulk')}</div></div>
    <div class="field"><label class="lbl" for="st-gw">Goal bodyweight (${U.wu}, optional)</label><input id="st-gw" name="gweight" inputmode="decimal" value="${s.goalWeight ? plain(U.w(s.goalWeight)) : ''}" placeholder="e.g. 180"></div>
    <div class="fields"><div class="field"><label class="lbl" for="st-cal">Daily calories</label><input id="st-cal" name="cal" inputmode="numeric" value="${s.calTarget}"></div><div class="field"><label class="lbl" for="st-p">Daily protein (g)</label><input id="st-p" name="prot" inputmode="numeric" value="${s.proteinTarget}"></div></div>
    <div class="field"><span class="lbl">Food buddy (a pet you feed by logging food)</span><div class="seg">${chipSeg('buddy', [['on', 'On'], ['off', 'Off']], s.buddy === true ? 'on' : 'off')}</div><input name="buddyname" value="${esc(s.buddyName || 'Pebble')}" aria-label="Buddy's name" placeholder="Buddy's name" style="margin-top:6px"></div>
    <div class="field"><label class="lbl" for="st-gk">AI key (for label scanning)</label><input id="st-gk" name="gkey" type="password" autocomplete="off" value="${esc(geminiKey())}" placeholder="Paste your key"></div>
    <div class="btnrow"><button class="btn ghost" data-act="testGemini">Test my key</button><a class="btn ghost" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Get a free key</a></div><p class="small" id="gk-test" aria-live="polite"></p>
    <details><summary class="faint small">Advanced: model</summary><input id="st-gm" name="gmodel" autocomplete="off" autocapitalize="off" value="${esc(geminiModel())}" placeholder="Automatic (fastest available)" style="margin-top:6px"></details>
    <p class="faint small" style="margin-top:-6px">Your key is saved only on this phone and only sent to Google.</p>
    </div></details>
    <details class="sset"><summary><span class="si" aria-hidden="true">🔔</span><span class="grow"><b>Alerts</b><span class="faint small">Rest alerts, weigh-in reminder</span></span></summary><div class="sset-b">
    ${pushSettingsHTML()}
    <div class="field"><span class="lbl">Remind me to weigh in after</span><div class="seg">${chipSeg('nudge', [[1, '1 day'], [2, '2'], [3, '3'], [5, '5'], [7, '7']], s.nudgeDays)}</div></div>
    </div></details>
    <button class="btn block" data-act="saveSettings">Save settings</button>
    <details class="sset"><summary><span class="si" aria-hidden="true">💾</span><span class="grow"><b>Backup &amp; updates</b><span class="faint small">${lastBackup() ? `Last backup ${fmtDate(lastBackup())}` : 'No backup yet'} · v${APP_VERSION}</span></span></summary><div class="sset-b">
    <div class="field"><span class="lbl">Your data</span><p class="muted small">Everything is saved on this phone only. Back up now and then, and restore it if you switch phones. Progress photos are included.</p></div>
    <button class="btn block" data-act="backupNow">Back up now</button><p class="faint small" style="margin-top:-6px">Then tap <b>Save to Files → iCloud Drive</b>. ${lastBackup() ? `Last backup: ${fmtDate(lastBackup())}.` : 'No backups yet.'}</p><button class="btn ghost block" data-act="importData">Restore from a backup</button>
    <div id="upd-box">${updStatusHTML()}</div>
    </div></details>`);
};
const chipSeg = (group, opts, cur) => opts.map(([v, l]) => `<button data-act="pick" data-group="${group}" data-value="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('');
A.saveSettings = () => {
  const root = $('#sheet'), cal = num(fval('cal')), prot = num(fval('prot'));
  saveSettings({
    unit: picked(root, 'unit') || 'imperial', weeklyGoal: +picked(root, 'goal') || 4, defaultSets: +picked(root, 'dsets') || 3, restSec: +picked(root, 'rest') || 120,
    calTarget: cal > 0 ? Math.round(cal) : S().calTarget, proteinTarget: prot > 0 ? Math.round(prot) : S().proteinTarget, nudgeDays: +picked(root, 'nudge') || 3, goal: picked(root, 'goal2') || 'bulk', goalWeight: num(fval('gweight')) ? U.toLb(num(fval('gweight'))) : null, bodyModel: picked(root, 'bodym') || 'male', watchReminder: picked(root, 'watch') !== 'off', buddy: picked(root, 'buddy') !== 'off', buddyName: fval('buddyname') || 'Pebble',
    big3: { squat: fval('b3squat') || S().big3.squat, bench: fval('b3bench') || S().big3.bench, deadlift: fval('b3deadlift') || S().big3.deadlift },
  });
  try { localStorage.setItem(GEMINI_KEY, fval('gkey')); localStorage.setItem(GEMINI_MODEL, fval('gmodel')); } catch (e) {}
  lsSet(PUSH_ON, picked(root, 'pushon') === 'on' ? '1' : '0');
  refreshCaps(); closeSheet(); toast('Settings saved');
};
A.exportData = json => {
  const data = { app: 'liftprint', exported: new Date().toISOString(), settings: S(), push: { topic: lsGet(PUSH_TOPIC) || '', on: pushOn() }, ...Object.fromEntries(COLLS.map(c => [c, Store.list(c)])) };
  const blob = new Blob([typeof json === 'string' && json ? json : JSON.stringify(data)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `liftprint-backup-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Backup downloaded. Save it to Files or iCloud.');
};
A.importData = () => { const i = $('#file-backup'); i.value = ''; i.click(); };
/* Restore. The picker is a permanent <input> in index.html: iOS home-screen apps drop the
   "file chosen" event for inputs created on the fly. Every step reports back so it never fails silently. */
async function onBackupChosen(f) {
  if (!f) return toast('No file picked.', { bad: true });
  toast('Reading backup…');
  try {
    let text = await f.text(); text = String(text || '').replace(/^﻿/, '').trim();
    if (!text) return toast('That file is empty. Try another backup.', { bad: true });
    let data; try { data = JSON.parse(text); } catch (e) { return toast("That file isn't a Liftprint backup (couldn't read it).", { bad: true }); }
    const looksRight = data && typeof data === 'object' && (['onpaper', 'liftprint'].includes(data.app) || COLLS.some(c => data[c]));
    if (!looksRight) return toast("That file isn't a Liftprint backup.", { bad: true });
    const rows = c => { const v = data[c]; if (Array.isArray(v)) return v.filter(d => d && d.id); if (v && typeof v === 'object') return Object.entries(v).map(([id, d]) => ({ ...d, id })); return []; };
    const counts = Object.fromEntries(COLLS.map(c => [c, rows(c).length])), n = COLLS.reduce((a, c) => a + counts[c], 0);
    const nPhotos = data.photoFiles && typeof data.photoFiles === 'object' ? Object.keys(data.photoFiles).length : 0;
    const parts = [[counts.workouts, 'workout'], [counts.weighins, 'weigh-in'], [counts.food, 'food entr|y|ies'], [counts.body, 'measurement'], [nPhotos, 'photo']].filter(([k]) => k).map(([k, w]) => w.includes('|') ? `${k} ${w.split('|')[0]}${k === 1 ? w.split('|')[1] : w.split('|')[2]}` : plural(k, w));
    const when = String(data.exported || '').slice(0, 10);
    if (!(await ask(`Restore this backup${when ? ` from ${fmtDate(when, { rel: false })}` : ''}? It has ${parts.join(', ') || `${n} ${n === 1 ? 'entry' : 'entries'}`}. Anything already on this phone is kept; matching entries are replaced.`, { ok: 'Restore' }))) return toast('Restore cancelled.');
    if (data.settings && typeof data.settings === 'object') Store.settings = { ...DEFAULTS, ...Store.settings, ...(data.settings.buddy === undefined ? { buddy: true } : {}), ...data.settings };
    for (const c of COLLS) { const m = { ...(Store.docs[c] || {}) }; for (const d of rows(c)) { const { id, ...rest } = d; m[id] = rest; } Store.docs[c] = m; }
    if (data.push && /^onpaper-[a-z0-9]{6,}$/.test(data.push.topic || '')) { lsSet(PUSH_TOPIC, data.push.topic); if (data.push.on) lsSet(PUSH_ON, '1'); }
    if (nPhotos) for (const [k, u] of Object.entries(data.photoFiles)) { try { const bl = dataURLToBlob(u); await IDB.set('photos', k, bl); if (Store.blobs[k]) URL.revokeObjectURL(Store.blobs[k]); Store.blobs[k] = URL.createObjectURL(bl); } catch (e) {} }
    Store.rev++; changed();
    try { await IDB.set('kv', 'state', clone({ v: 1, settings: Store.settings, docs: Store.docs })); }
    catch (e) { return toast("Restored for now, but this phone wouldn't save it. Don't close the app; try again.", { bad: true }); }
    closeSheet(); UI.tab = 'home'; render();
    toast(`Backup restored ✅ ${parts.join(', ') || `${n} ${n === 1 ? 'entry' : 'entries'}`}`);
    setTimeout(() => confetti({ n: 90 }), 300);
  } catch (e) {
    toast(`Couldn't restore: ${(e && e.message) || 'unknown error'}. Try picking the file again.`, { bad: true });
  }
}

function todayCardHTML(lw) {
  const t = todayStr(), wiToday = weighins().filter(w => w.date === t).pop(), nd = nextDay(), g = activeGym();
  const trained = Store.list('workouts').filter(w => w.date === t && ((w.sets || []).length || w.marked));
  const ft = foodTotals(t), s = S();
  const row = (ok, title, sub, btn) => `<div class="row" style="padding:10px 0;min-height:0"><span style="flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;${ok ? 'background:var(--ok);color:#000' : 'border:2px solid var(--s3)'};font-weight:900;font-size:13px">${ok ? '✓' : ''}</span><div class="grow"><b>${title}</b><div class="faint small">${sub}</div></div>${btn || ''}</div>`;
  const plan = nd ? planFor(nd, g).map(p => p.use).filter(Boolean) : [], mg = myGoals(), hits = mg.filter(x => plan.some(n => exHelps(n).includes(x)));
  const doneN = [!!wiToday, trained.length > 0, ft.p >= s.proteinTarget].filter(Boolean).length;
  let h = `<section class="card" style="gap:4px"><div class="card-h"><h2 class="sec-t">Today</h2><span class="today-prog${doneN === 3 ? ' all' : ''}">${doneN === 3 ? 'All done ✓' : `${doneN} of 3 done`}</span></div>`;
  h += row(!!wiToday, 'Weigh-in', wiToday ? `${fwu(wiToday.weight)}${wiToday.time ? ' at ' + fmtTime(wiToday.time) : ''}${wiToday.meal ? ' · ' + mealLabel(wiToday.meal) : ''}` : 'Best first thing in the morning', wiToday ? '' : `<button class="btn sm" data-act="logWeighin">Log</button>`);
  if (trained.length) h += row(true, 'Workout', trained.map(w => w.marked ? 'Gym day' : `${esc(w.dayName || 'Workout')} · ${plural(w.sets.filter(x => !x.warm).length, 'set')}`).join(', '), '');
  else h += row(false, nd ? `Up next: ${esc(nd.name)}` : 'Workout', nd ? esc(plan.slice(0, 4).join(' · ')) + (plan.length > 4 ? ` +${plan.length - 4}` : '') + (hits.length ? `<span class="gline">🎯 ${hits.length === 1 ? `Hits ${GOALS[hits[0]][0]} ${esc(GOALS[hits[0]][1])}` : `Hits ${hits.length} of your goals <span class="gem">${hits.slice(0, 5).map(x => GOALS[x][0]).join('')}</span>`}</span>` : '') : 'Set up your split for a daily plan', nd ? `<button class="btn sm" data-act="startFromHome">Start</button>` : `<button class="btn sm ghost" data-act="editSplit">Set up</button>`);
  h += row(ft.p >= s.proteinTarget, `Protein ${trim(ft.p, 0)} / ${s.proteinTarget} g`, (ft.p >= s.proteinTarget ? 'Goal hit. Nice.' : `${trim(s.proteinTarget - ft.p, 0)} g to go · ${trim(Math.max(0, s.calTarget - ft.cal), 0)} kcal left`) + `<span class="pbar" aria-hidden="true"><i style="width:${clamp(ft.p / (s.proteinTarget || 1) * 100, 0, 100)}%"></i></span>`, `<button class="btn sm ghost" data-act="goTab" data-tab="food">Food</button>`);
  return h + '</section>';
}
function insights() {
  const out = [], s = S(), all = weighins(), rate = weeklyRate(all), goal = s.goal || 'bulk', wu = U.wu;
  if (rate != null) {
    const r = `${signed(U.w(rate), 2)} ${wu}/week`;
    if (goal === 'bulk') {
      if (rate > 0.75) out.push(['⚠️', `Gaining ${r}`, "That's faster than a typical lean bulk (about +0.25 to +0.5 lb a week), so part of it is likely fat. Cutting 150–250 calories a day would slow it down."]);
      else if (rate >= 0.15) out.push(['✅', `Gaining ${r}`, "That's right in a lean-bulk range. Keep it up."]);
      else out.push(['📉', `Weight is flat (${r})`, 'To keep building muscle, try about 150–200 more calories a day and check back in two weeks.']);
    } else if (goal === 'cut') {
      if (rate < -1.25) out.push(['⚠️', `Losing ${r}`, 'That pace makes it harder to keep muscle. Adding back 150–250 calories a day would slow it down.']);
      else if (rate <= -0.4) out.push(['✅', `Losing ${r}`, 'A solid cutting pace that should let you hold on to muscle.']);
      else out.push(['📈', `Weight is barely moving (${r})`, 'For a cut, try about 200 fewer calories a day and check back in two weeks.']);
    } else out.push(Math.abs(rate) < 0.25 ? ['✅', `Holding steady (${r})`, 'Right where maintenance should be.'] : ['↕️', `Drifting ${r}`, `Adjust about ${rate > 0 ? '150 fewer' : '150 more'} calories a day to hold steady.`]);
  } else if (all.length < 6) out.push(['⚖️', 'Keep weighing in', 'After about two weeks of weigh-ins the app can tell you if your weight is moving at the right pace for your goal.']);
  const mg = myGoals();
  if (mg.length) {
    const cnt = goalSetsThisWeek(), miss = mg.find(x => !cnt[x]), gym = activeGym();
    if (miss) { const ex = bestForGoals([miss, ...mg], 2, [...library().values()].filter(e => available(e.name, gym))).map(e => e.name); out.push([GOALS[miss][0], `No ${GOALS[miss][1].toLowerCase()} work yet this week`, ex.length ? `${ex.join(' or ')} would cover it.` : 'Tap to see exercises that help.', 'goalExercises', { g: miss }]); }
  }
  const lw = latestWeighin();
  if (s.goalWeight && rate && lw) { const diff = s.goalWeight - lw.weight; if (Math.abs(diff) > 0.4 && Math.sign(diff) === Math.sign(rate)) { const days = Math.round(diff / rate * 7); if (days < 730) out.push(['🎯', `${fwu(s.goalWeight)} by about ${fmtDate(addDays(todayStr(), days), { rel: false, year: true })}`, `If you keep your current pace of ${signed(U.w(rate), 2)} ${wu}/week.`]); } }
  const since = addDays(todayStr(), -30); let gain = null;
  for (const L of liftIndex().values()) {
    const b4 = L.sets.filter(x => x.hit && !x.warm && x.date < since), aft = L.sets.filter(x => x.hit && !x.warm && x.date >= since);
    if (!b4.length || !aft.length) continue; const b = Math.max(...b4.map(x => x.e1)), a = Math.max(...aft.map(x => x.e1));
    if (a > b && (!gain || (a - b) / b > gain.pct)) gain = { L, g: a - b, pct: (a - b) / b };
  }
  if (gain) out.push(['💪', `${gain.L.name} est. 1RM up ${fw(gain.g, 0)} ${wu} this month`, 'Your biggest strength jump in the last 30 days.']);
  for (const L of liftIndex().values()) {
    const days = new Set(L.sets.filter(x => !x.warm && x.date >= addDays(todayStr(), -28)).map(x => x.date)), lastUp = [...L.sets].reverse().find(x => x.pr || x.baseline);
    if (days.size >= 3 && lastUp && daysBetween(lastUp.date, todayStr()) >= 21) { out.push(['🧱', `${L.name}: no PR in ${Math.floor(daysBetween(lastUp.date, todayStr()) / 7)} weeks`, 'Try a lighter week (about 10% less weight), or switch rep ranges for a few sessions, then build back up.']); break; }
  }
  const logged = [...Array(7)].map((_, i) => addDays(todayStr(), -i - 1)).filter(d => (foodDay(d).items || []).length);
  if (logged.length >= 3) { const hit = logged.filter(d => foodTotals(d).p >= s.proteinTarget).length; out.push([hit >= logged.length - 1 ? '🥩' : '🍗', `Protein goal hit ${hit} of the last ${logged.length} logged days`, hit >= logged.length - 1 ? "That kind of consistency is what builds muscle." : 'An extra shake or a cup of Greek yogurt is an easy ~20–25 g on the short days.']); }
  const st = weekStats(), left = 7 - ((new Date().getDay() + 6) % 7), need = st.goal - st.cur;
  if (need > 0 && need <= left) out.push(['📅', `${plural(need, 'more gym day')} to hit your weekly goal`, `${plural(left, 'day')} left this week, counting today.`]);
  return out.slice(0, 7);
}
A.moreInsights = (d, el) => { const c = el.closest('.ins'); UI.insOpen = !UI.insOpen; const open = UI.insOpen; c.classList.toggle('open', open); el.textContent = open ? 'Show less' : `Show ${$$('.ins-more', c).length} more`; if (open && !REDUCED()) $$('.ins-more', c).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: i * 50, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })); };
function insightsHTML() {
  const xs = insights(); if (!xs.length) return '';
  const one = ([ic, t, d, act, data], i) => { const inner = `<span class="ic" aria-hidden="true">${ic}</span><div class="grow"><b>${esc(t)}</b><div class="muted small">${esc(d)}</div></div>${act ? ICON.chevR.replace('<svg', '<svg width="16" height="16" style="color:var(--tx3);flex:none;align-self:center"') : ''}`; return act ? `<button class="insight${i >= 3 ? ' ins-more' : ''}" data-act="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${inner}</button>` : `<div class="insight${i >= 3 ? ' ins-more' : ''}">${inner}</div>`; };
  return `<section class="card ins${UI.insOpen ? ' open' : ''}" style="gap:0"><h2 class="sec-t" style="margin-bottom:4px">Insights</h2>${xs.map(one).join('')}${xs.length > 3 ? `<button class="linkbtn ins-tog" data-act="moreInsights" style="align-self:flex-start;font-size:13px;padding:8px 0 0">${UI.insOpen ? 'Show less' : `Show ${xs.length - 3} more`}</button>` : ''}</section>`;
}
