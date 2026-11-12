'use strict';
/* Home dashboard + settings. */

Views.home = {
  title() { return '<span class="wordmark">on<i>paper</i></span>'; },
  render() {
    const lw = latestWeighin(), s = S(), w = activeWorkout();
    const hasAny = lw || Store.list('workouts').length || Store.list('food').length;
    let h = '';
    if (!hasAny || !gyms().length || !splitDays().length) h += setupHTML(lw);
    const since = lw ? daysBetween(lw.date, todayStr()) : null;
    if (lw && since >= (s.nudgeDays || 3)) h += `<div class="nudge"><p>It's been <b>${since} days</b> since your last weigh-in.</p><button class="btn sm" data-act="logWeighin">Weigh in</button></div>`;
    if (w) h += `<section class="card"><div class="card-h"><div><div class="eyebrow">Workout in progress</div><h2 class="lift-h" style="font-size:34px">${esc(w.dayName || 'Workout')}</h2><p class="muted small">${plural((w.sets || []).length, 'set')} · started ${fmtClock(w.startTs)}</p></div><button class="btn" data-act="resumeWorkout">Resume</button></div></section>`;
    else { const nd = nextDay(), g = activeGym(); if (nd) h += `<section class="card next"><div class="eyebrow">Up next${g ? ' · ' + esc(g.name) : ''}</div><h2>${esc(nd.name)}</h2><p class="muted small">${esc(planFor(nd, g).map(p => p.use).filter(Boolean).slice(0, 5).join(' · '))}</p><button class="btn block" data-act="startFromHome">Start ${esc(nd.name)}</button></section>`; }
    h += `<div class="tiles">${bwTile(lw)}${weekTile()}${foodTile()}${big3Tile()}</div>`;
    h += feedHTML();
    return h;
  },
};
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
  return `<button class="tile" data-act="goTab" data-tab="body" data-sub="weight"><span class="k">Bodyweight</span>${lw ? `<span class="big md">${fw(lw.weight)}<span class="unit">${U.wu}</span></span>${spark(recent.map(w => w.weight))}<span class="sub">${rate != null ? `${signed(U.w(rate), 1)} ${U.wu}/week` : fmtDate(lw.date)}</span>` : `<span class="muted small">No weigh-ins yet</span><span class="sub">Tap to log one</span>`}</button>`;
}
function weekTile() {
  const st = weekStats(), t = todayStr();
  const dots = [...Array(7)].map((_, i) => { const d = addDays(st.wk0, i); return `<i class="${st.days.has(d) ? 'on' : ''}${d === t ? ' today' : ''}">${'MTWTFSS'[i]}</i>`; }).join('');
  return `<button class="tile" data-act="goTab" data-tab="train"><span class="k">This week</span><span class="big md">${st.cur}<span class="unit">of ${st.goal}</span></span><div class="weekdots">${dots}</div><span class="sub">${st.streak ? `${plural(st.streak, 'week')} streak` : 'Hit your goal to start a streak'}</span></button>`;
}
function foodTile() {
  const t = foodTotals(todayStr()), s = S();
  return `<button class="tile" data-act="goTab" data-tab="food"><span class="k">Today's food</span><span class="big md">${trim(t.cal, 0)}<span class="unit">kcal</span></span><div class="bar ${t.cal >= s.calTarget ? 'over' : ''}"><i style="width:${clamp(t.cal / s.calTarget * 100, 0, 100)}%"></i></div><div class="bar p ${t.p >= s.proteinTarget ? 'over' : ''}"><i style="width:${clamp(t.p / s.proteinTarget * 100, 0, 100)}%"></i></div><span class="sub">${trim(t.p, 0)} of ${s.proteinTarget} g protein</span></button>`;
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
  return `<section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t">Recent PRs &amp; misses</h2><button class="linkbtn" data-act="goTab" data-tab="lifts">All lifts</button></div>${items.slice(0, 8).map(({ s, L }) => `<button class="row" data-act="openLift" data-key="${esc(L.key)}"><div class="ring ${s.pr ? 'is-pr' : 'is-miss'}"><span>${esc(initials(L.name))}</span></div><div class="grow"><b>${esc(L.name)}</b> ${s.pr ? '<span class="pr">PR</span>' : '<span class="missb">Missed</span>'}<div class="faint small">${fw(s.w)}${s.w ? ' ' + U.wu : ''} × ${s.r}${s.bw ? ` · at ${fwu(s.bw.weight)} BW` : ''}</div></div><span class="faint small">${fmtDate(s.date)}</span></button>`).join('')}</section>`;
}
A.goTab = d => { UI.tab = d.tab; if (d.sub) UI.bodySub = d.sub; if (d.tab === 'lifts') UI.liftKey = null; if (d.tab === 'train') UI.session = false; $('#view').scrollTop = 0; render(); };
A.startFromHome = () => { UI.planDay = null; UI.planGym = null; A.startWorkout(); };

/* ---------- settings ---------- */
A.openSettings = () => {
  const s = S(), names = [...new Set([...liftList().map(L => L.name), ...Object.values(s.big3 || {})])];
  const sel = (k, label) => `<div class="field"><label class="lbl" for="b3-${k}">${label}</label><select id="b3-${k}" name="b3${k}">${names.map(n => `<option ${keyOf(n) === keyOf(s.big3?.[k]) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
  openSheet('Settings', `
    <div class="field"><span class="lbl">Units</span><div class="seg">${chipSeg('unit', [['imperial', 'lb · in'], ['metric', 'kg · cm']], s.unit)}</div></div>
    <div class="field"><span class="lbl">Weekly gym goal (days)</span><div class="seg">${chipSeg('goal', [3, 4, 5, 6, 7].map(n => [n, n]), s.weeklyGoal)}</div></div>
    <div class="field"><span class="lbl">Default rest between sets</span><div class="seg">${chipSeg('rest', [[60, '1:00'], [90, '1:30'], [120, '2:00'], [180, '3:00'], [240, '4:00']], s.restSec)}</div></div>
    <div class="fields"><div class="field"><label class="lbl" for="st-cal">Daily calories</label><input id="st-cal" name="cal" inputmode="numeric" value="${s.calTarget}"></div><div class="field"><label class="lbl" for="st-p">Daily protein (g)</label><input id="st-p" name="prot" inputmode="numeric" value="${s.proteinTarget}"></div></div>
    <div class="field"><span class="lbl">Remind me to weigh in after</span><div class="seg">${chipSeg('nudge', [[1, '1 day'], [2, '2'], [3, '3'], [5, '5'], [7, '7']], s.nudgeDays)}</div></div>
    <div class="fields three">${sel('squat', 'Squat')}${sel('bench', 'Bench')}${sel('deadlift', 'Deadlift')}</div>
    <p class="faint small" style="margin-top:-6px">Which of your lifts count toward the Big 3 total.</p>
    <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:4px 0">
    <div class="field"><label class="lbl" for="st-gk">Gemini API key (for label scanning)</label><input id="st-gk" name="gkey" type="password" autocomplete="off" value="${esc(geminiKey())}" placeholder="Paste your key from aistudio.google.com"></div>
    <div class="field"><label class="lbl" for="st-gm">Gemini model</label><input id="st-gm" name="gmodel" autocomplete="off" autocapitalize="off" value="${esc(geminiModel())}"></div>
    <p class="faint small" style="margin-top:-6px">The key is saved only on this phone and sent only to Google. Leave the model as is unless scanning says it wasn't found.</p>
    <button class="btn block" data-act="saveSettings">Save settings</button>
    <hr style="border:0;border-top:1px solid var(--line);width:100%;margin:4px 0">
    <div class="field"><span class="lbl">Your data</span><p class="muted small">Everything is saved on this phone only. Download a backup now and then, and restore it if you switch phones. Photos aren't included.</p></div>
    <div class="btnrow"><button class="btn ghost" data-act="exportData">Download backup</button><button class="btn ghost" data-act="importData">Restore backup</button></div>`);
};
const chipSeg = (group, opts, cur) => opts.map(([v, l]) => `<button data-act="pick" data-group="${group}" data-value="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('');
A.saveSettings = () => {
  const root = $('#sheet'), cal = num(fval('cal')), prot = num(fval('prot'));
  saveSettings({
    unit: picked(root, 'unit') || 'imperial', weeklyGoal: +picked(root, 'goal') || 4, restSec: +picked(root, 'rest') || 120,
    calTarget: cal > 0 ? Math.round(cal) : S().calTarget, proteinTarget: prot > 0 ? Math.round(prot) : S().proteinTarget, nudgeDays: +picked(root, 'nudge') || 3,
    big3: { squat: fval('b3squat') || S().big3.squat, bench: fval('b3bench') || S().big3.bench, deadlift: fval('b3deadlift') || S().big3.deadlift },
  });
  try { localStorage.setItem(GEMINI_KEY, fval('gkey')); localStorage.setItem(GEMINI_MODEL, fval('gmodel') || 'gemini-flash-latest'); } catch (e) {}
  refreshCaps(); closeSheet(); toast('Settings saved');
};
A.exportData = () => {
  const data = { app: 'onpaper', exported: new Date().toISOString(), settings: S(), ...Object.fromEntries(COLLS.map(c => [c, Store.list(c)])) };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `onpaper-backup-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Backup downloaded. Save it to Files or iCloud.');
};
A.importData = () => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json,.txt';
  i.onchange = async () => {
    const f = i.files && i.files[0]; if (!f) return;
    let data; try { data = JSON.parse(await f.text()); } catch (e) { return toast("That file isn't an On Paper backup.", { bad: true }); }
    if (!data || data.app !== 'onpaper') return toast("That file isn't an On Paper backup.", { bad: true });
    const n = COLLS.reduce((a, c) => a + (Array.isArray(data[c]) ? data[c].length : 0), 0);
    if (!(await ask(`Restore ${n} entries from ${String(data.exported || '').slice(0, 10) || 'this backup'}? Entries already on this phone are kept; matching ones are replaced.`, { ok: 'Restore' }))) return;
    if (data.settings) Store.settings = { ...Store.settings, ...data.settings };
    for (const c of COLLS) for (const d of (Array.isArray(data[c]) ? data[c] : [])) if (d && d.id) { const { id, ...rest } = d; Store.docs[c] = { ...Store.docs[c], [id]: rest }; }
    changed(); persist(); closeSheet(); toast('Backup restored');
  };
  i.click();
};
