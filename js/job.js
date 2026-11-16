'use strict';
/* ---------- Physical jobs: log a work shift (laundry route, landscaping, construction, warehouse…) so hard days at work count.
   A watch mostly sees the walking. This estimates the effort from how hard the work is, how long it lasted and how much you moved.
   Shifts live in that day's record (daily.work) and feed training load, readiness and the Assistant. They don't count as gym days. ---------- */
/* effort levels: [label, what it looks like, MET averaged over a whole shift (breaks and driving included, so lower than the peak effort), training-load points per hour] */
const JOB_LVL = [null,
  ['Light', 'On your feet, light loads now and then', 2.5, 1],
  ['Moderate', 'Steady lifting and carrying, 20 to 50 lb', 3.5, 2],
  ['Heavy', 'Heavy loads, digging, hauling most of the day', 5.0, 3.5]];
const JOB_EMOJI = ['🧺', '📦', '🧱', '🌿', '🔨', '🚚', '🪜', '🛠️', '🧹', '🪵', '🍽️', '🏥'];
const myJobs = () => S().jobs || [];
const jobOf = id => myJobs().find(j => j.id === id) || null;
const workOn = date => dailyOf(date).work || [];
function jobCalc(x) {   // x: { hours, lb, handles, effort }
  const bw = (latestWeighin()?.weight || S().lastBw || 170) * LB_KG, L = JOB_LVL[x.effort] || JOB_LVL[2], h = +x.hours || 0;
  return { kcal: Math.round((L[2] - 1) * bw * h), handled: Math.round((+x.lb || 0) * Math.max(1, +x.handles || 1)), load: h * L[3] };
}
/* training-load points from work in the last `days` days (added to gym sets and sport minutes) */
function workLoad(days) { let n = 0; for (let i = 0; i < days; i++) for (const w of workOn(addDays(todayStr(), -i))) n += jobCalc(w).load; return n; }
function workRecent(days = 14) { const out = []; for (let i = 0; i < days; i++) { const d = addDays(todayStr(), -i); for (const w of workOn(d)) out.push({ ...w, date: d }); } return out; }

function jobCardHTML() {
  const jobs = myJobs(); if (!jobs.length) return `<button class="job-invite" data-act="jobEdit"><span aria-hidden="true">🧰</span><span class="grow"><b>Physical job?</b><span>Log work shifts so hard days count</span></span>${ICON.chevR}</button>`;
  const rec = workRecent(7), tot = rec.reduce((a, w) => { const c = jobCalc(w); a.h += +w.hours || 0; a.lb += c.handled; a.k += c.kcal; return a; }, { h: 0, lb: 0, k: 0 });
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Work shifts</h2><button class="btn sm" data-act="jobLog">${ICON.plus.replace('<svg', '<svg width="16" height="16"')} Log</button></div>
    ${jobs.length > 1 ? `<div class="chips scroll">${jobs.map(j => `<button class="chip" data-act="jobLog" data-job="${j.id}"><span aria-hidden="true">${j.e}</span> ${esc(j.name)}</button>`).join('')}</div>` : ''}
    ${rec.length ? `<div class="stats" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="stat"><span class="k">Last 7 days</span><span class="v" style="font-size:22px">${trim(tot.h, 1)}<span class="unit">h</span></span></div><div class="stat"><span class="k">Handled</span><span class="v" style="font-size:22px">${fmtN(Math.round(U.w(tot.lb)))}<span class="unit">${U.wu}</span></span></div><div class="stat"><span class="k">Est. burn</span><span class="v" style="font-size:22px">${fmtN(tot.k)}<span class="unit">kcal</span></span></div></div>
      <div class="actlist">${rec.slice(0, 3).map(w => { const j = jobOf(w.job) || { e: '🧰', name: 'Work' }, c = jobCalc(w); return `<button class="row" data-act="jobLog" data-id="${w.id}" data-date="${w.date}" style="padding-left:0;padding-right:0"><span class="li-ic">${j.e}</span><span class="grow"><b>${esc(j.name)}</b><div class="faint small">${fmtDate(w.date)} · ${trim(w.hours, 1)} h${c.handled ? ` · ${fmtN(Math.round(U.w(c.handled)))} ${U.wu} handled` : ''}</div></span><span class="faint small">≈${fmtN(c.kcal)} kcal</span></button>`; }).join('')}</div>`
      : '<p class="muted small" style="margin:0">Log today\'s shift when you clock out.</p>'}
    <button class="linkbtn" data-act="jobEdit" data-id="${jobs[0].id}" style="align-self:flex-start;font-size:13px;padding:0">${jobs.length > 1 ? 'Edit jobs' : 'Edit job'}</button></section>`;
}

/* ----- log a shift ----- */
A.jobLog = d => {
  const jobs = myJobs(); if (!jobs.length) return A.jobEdit({});
  const date = d.date || todayStr(), old = d.id ? workOn(date).find(w => w.id === d.id) : null, j = jobOf(old ? old.job : d.job) || jobs[0];
  Sheet.job = { id: old ? old.id : null, date, job: j.id, hours: old ? old.hours : j.hours || 8, lb: old ? U.w(old.lb || 0) || '' : '', handles: old ? old.handles : j.handles || 2, effort: old ? old.effort : j.effort || 2 };
  openSheet(old ? 'Edit shift' : 'Log a shift', ''); drawJobLog();
};
function drawJobLog() {
  const J = Sheet.job, jobs = myJobs(), j = jobOf(J.job) || jobs[0];
  sheetBody(`${jobs.length > 1 ? `<div class="chips scroll" style="margin-bottom:10px">${jobs.map(x => `<button class="chip" data-act="jobPickJob" data-job="${x.id}" aria-pressed="${x.id === J.job}">${x.e} ${esc(x.name)}</button>`).join('')}</div>` : `<p class="muted small" style="margin:0 0 10px">${j.e} ${esc(j.name)}</p>`}
    <div class="fields"><div class="field"><label class="lbl" for="jb-date">Day</label><input id="jb-date" type="date" value="${J.date}" max="${todayStr()}"></div>
      <div class="field"><label class="lbl" for="jb-h">Hours worked</label><div class="stepper"><button data-act="step" data-t="jb-h" data-d="-0.5" aria-label="Less">−</button><input id="jb-h" inputmode="decimal" value="${trim(J.hours, 1)}"><button data-act="step" data-t="jb-h" data-d="0.5" aria-label="More">+</button></div></div></div>
    <div class="field"><span class="lbl">How hard was it?</span><div class="seg">${[1, 2, 3].map(n => `<button data-act="jobEffort" data-n="${n}" aria-pressed="${J.effort === n}">${JOB_LVL[n][0]}</button>`).join('')}</div><p class="faint tiny" style="margin:6px 0 0" id="jb-lv">${JOB_LVL[J.effort][1]}</p></div>
    <div class="fields"><div class="field"><label class="lbl" for="jb-lb">Weight moved (${U.wu}, optional)</label><input id="jb-lb" inputmode="decimal" value="${J.lb}" placeholder="e.g. 732"></div>
      <div class="field"><label class="lbl" for="jb-n">Times you lift each load</label><div class="stepper"><button data-act="step" data-t="jb-n" data-d="-1" aria-label="Fewer">−</button><input id="jb-n" inputmode="numeric" value="${J.handles}"><button data-act="step" data-t="jb-n" data-d="1" aria-label="More">+</button></div></div></div>
    <div class="job-out" id="jb-out"></div>
    <button class="btn block" data-act="jobSave">${J.id ? 'Save shift' : 'Log shift'}</button>${J.id ? '<button class="linkbtn" data-act="jobDel" style="display:block;margin:8px auto 0;color:var(--miss)">Delete this shift</button>' : ''}`);
  const live = () => { jobRead(); const c = jobCalc({ ...Sheet.job, lb: U.toLb(num(Sheet.job.lb) || 0) }), o = $('#jb-out'); if (o) o.innerHTML = `<div><b>≈ ${fmtN(c.kcal)}</b><span>active kcal</span></div>${c.handled ? `<div><b>${fmtN(Math.round(U.w(c.handled)))} ${U.wu}</b><span>handled in total</span></div>` : ''}<p>Estimates from your bodyweight, the hours and how hard the work is. Your watch already counts some of this as walking, so don't add the two together.</p>`; };
  $$('#sheet input').forEach(i => i.addEventListener('input', live)); $$('#sheet .stepper button').forEach(b => b.addEventListener('click', () => setTimeout(live, 0))); live();
}
function jobRead() { const J = Sheet.job, v = id => $('#' + id) ? $('#' + id).value : null; if (v('jb-h') != null) { J.hours = Math.max(0, Math.min(24, num(v('jb-h')) || 0)); J.lb = v('jb-lb'); J.handles = Math.max(1, Math.round(num(v('jb-n')) || 1)); J.date = v('jb-date') || J.date; } }
A.jobEffort = d => { jobRead(); Sheet.job.effort = +d.n; drawJobLog(); };
A.jobPickJob = d => { jobRead(); const j = jobOf(d.job); if (j) Object.assign(Sheet.job, { job: j.id, effort: j.effort, handles: j.handles }); drawJobLog(); };
A.jobSave = () => {
  jobRead(); const J = Sheet.job; if (!(J.hours > 0)) return toast('Enter how many hours you worked.', { bad: true });
  const rec = { id: J.id || newId(), job: J.job, hours: J.hours, lb: Math.round(U.toLb(num(J.lb) || 0)), handles: J.handles, effort: J.effort, ts: Date.now() };
  for (let i = 0; i < 14; i++) { const d = addDays(todayStr(), -i), ws = workOn(d); if (ws.some(w => w.id === rec.id) && d !== J.date) putDaily(d, { work: ws.filter(w => w.id !== rec.id) }); }   // moved to another day
  putDaily(J.date, { work: [...workOn(J.date).filter(w => w.id !== rec.id), rec] });
  const c = jobCalc(rec); closeSheet(); toast(`Shift logged · ≈${fmtN(c.kcal)} kcal${c.handled ? ` · ${fmtN(Math.round(U.w(c.handled)))} ${U.wu} handled` : ''}`, { ms: 3200 }); if (!J.id && typeof sfx === 'function') sfx('pop');
};
A.jobDel = () => { const J = Sheet.job, old = workOn(J.date); putDaily(J.date, { work: old.filter(w => w.id !== J.id) }); closeSheet(); toastUndo('Shift deleted', () => putDaily(J.date, { work: old })); };

/* ----- set up / edit a job ----- */
A.jobEdit = d => {
  const j = d.id ? jobOf(d.id) : null; Sheet.jobE = j ? clone(j) : { id: null, name: '', e: '🧺', effort: 2, handles: 2, hours: 8 };
  openSheet(j ? 'Edit job' : 'Add your job', ''); drawJobEdit();
};
function drawJobEdit() {
  const E = Sheet.jobE, jobs = myJobs();
  sheetBody(`${!E.id && !jobs.length ? '<p class="muted small" style="margin:0 0 12px">Set it up once. After that, logging a shift takes a few seconds.</p>' : ''}
    ${E.id && jobs.length > 1 ? `<div class="chips scroll" style="margin-bottom:10px">${jobs.map(x => `<button class="chip" data-act="jobEdit" data-id="${x.id}" aria-pressed="${x.id === E.id}">${x.e} ${esc(x.name)}</button>`).join('')}</div>` : ''}
    <div class="field"><label class="lbl" for="je-name">What's the job?</label><input id="je-name" value="${esc(E.name)}" placeholder="e.g. Laundry route, Landscaping" maxlength="40"></div>
    <div class="field"><span class="lbl">Icon</span><div class="chips">${JOB_EMOJI.map(e => `<button class="chip" data-act="jobEmoji" data-e="${e}" aria-pressed="${E.e === e}" style="font-size:18px;padding:6px 10px">${e}</button>`).join('')}</div></div>
    ${typeof isPro === 'function' && isPro() && typeof aiReady === 'function' && aiReady() ? `<div class="field"><label class="lbl" for="je-desc">Describe a typical day (optional)</label><textarea id="je-desc" rows="2" placeholder="e.g. I pick up laundry bags, carry them to the van, unload into carts, weigh them and shelve them">${esc(E.desc || '')}</textarea><button class="btn ghost sm" data-act="jobSuggest" style="align-self:flex-start;margin-top:6px">✨ Set it up from my description</button><p class="faint small" id="je-why" style="margin:6px 0 0">${esc(E.why || '')}</p></div>` : ''}
    <div class="field"><span class="lbl">How hard is a normal shift?</span><div class="job-lv">${[1, 2, 3].map(n => `<button data-act="jobLevel" data-n="${n}" aria-pressed="${E.effort === n}"><b>${JOB_LVL[n][0]}</b><span>${JOB_LVL[n][1]}</span></button>`).join('')}</div></div>
    <div class="fields"><div class="field"><label class="lbl" for="je-h">Usual hours</label><div class="stepper"><button data-act="step" data-t="je-h" data-d="-0.5" aria-label="Less">−</button><input id="je-h" inputmode="decimal" value="${trim(E.hours, 1)}"><button data-act="step" data-t="je-h" data-d="0.5" aria-label="More">+</button></div></div>
      <div class="field"><label class="lbl" for="je-n">Times you lift each load</label><div class="stepper"><button data-act="step" data-t="je-n" data-d="-1" aria-label="Fewer">−</button><input id="je-n" inputmode="numeric" value="${E.handles}"><button data-act="step" data-t="je-n" data-d="1" aria-label="More">+</button></div></div></div>
    <p class="faint tiny" style="margin:-4px 0 10px">If one bag gets picked up, loaded, unloaded and shelved, that's 4. It turns the weight you moved into the total you actually lifted.</p>
    <button class="btn block" data-act="jobEditSave">${E.id ? 'Save job' : 'Save and log a shift'}</button>
    ${E.id ? `<div style="display:flex;justify-content:center;gap:18px;margin-top:8px"><button class="linkbtn" data-act="jobEdit">+ Add another job</button><button class="linkbtn" data-act="jobRemove" style="color:var(--miss)">Remove this job</button></div>` : ''}`);
}
function jobERead() { const E = Sheet.jobE, v = id => $('#' + id) ? $('#' + id).value : null; if (v('je-name') != null) { E.name = v('je-name').trim(); E.hours = Math.max(0.5, Math.min(24, num(v('je-h')) || 8)); E.handles = Math.max(1, Math.round(num(v('je-n')) || 1)); if (v('je-desc') != null) E.desc = v('je-desc'); } }
A.jobEmoji = d => { jobERead(); Sheet.jobE.e = d.e; drawJobEdit(); };
A.jobLevel = d => { jobERead(); Sheet.jobE.effort = +d.n; drawJobEdit(); };
A.jobSuggest = async (d, el) => {
  jobERead(); const E = Sheet.jobE; if (!(E.desc || '').trim()) return toast('Describe a typical day first.', { bad: true });
  el.disabled = true; el.textContent = 'Thinking…';
  try {
    const o = await Gemini.json(`A person describes their physically demanding job. Classify it for an activity tracker. Reply ONLY with JSON {"name": short job name (max 4 words), "effort": 1|2|3, "handles": integer, "why": one short sentence}. effort: 1 = light (on feet, light loads occasionally), 2 = moderate (steady lifting and carrying of 20-50 lb), 3 = heavy (heavy loads, digging or hauling most of the day). handles = how many separate times each load is lifted or carried from pickup to final drop, counted from their description (1 to 12). Description: ${JSON.stringify(E.desc.slice(0, 600))}`, { kind: 'assist', temp: 0.2 });
    const ef = Math.round(+o.effort), hn = Math.round(+o.handles);
    if (ef >= 1 && ef <= 3) E.effort = ef; if (hn >= 1 && hn <= 12) E.handles = hn; if (!E.name && o.name) E.name = String(o.name).slice(0, 40); E.why = String(o.why || '').slice(0, 160);
  } catch (e) { if (e.code !== 'cancelled') toast(aiErrorText(e) || "Couldn't work that out. Set it by hand below.", { bad: true }); }
  if (Sheet.jobE === E) drawJobEdit();
};
A.jobEditSave = () => {
  jobERead(); const E = Sheet.jobE; if (!E.name) return toast('Give the job a name.', { bad: true });
  const isNew = !E.id, rec = { id: E.id || newId(), name: E.name, e: E.e, effort: E.effort, handles: E.handles, hours: E.hours };
  saveSettings({ jobs: [...myJobs().filter(j => j.id !== rec.id), rec] });
  if (isNew) A.jobLog({ job: rec.id }); else { closeSheet(); toast('Job saved'); }
};
A.jobRemove = async () => { const E = Sheet.jobE; if (!(await ask(`Remove ${E.name}? Shifts you already logged stay.`, { ok: 'Remove', danger: true }))) return; saveSettings({ jobs: myJobs().filter(j => j.id !== E.id) }); closeSheet(); };

/* ----- where it shows up ----- */
{ const ac = actsCardHTML; actsCardHTML = function () { return ac() + jobCardHTML(); }; }
{ const tl = trainingLoad; trainingLoad = function (days) { return tl(days) + workLoad(days); }; }
