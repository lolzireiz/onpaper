'use strict';
/* Workout builder (Pro): describe the session you want, optionally pick a gym, and the coach writes a
   one-off workout from the exercise library: name, exercises, sets, reps and a short cue for each.
   Only library exercises are accepted, and with a gym picked only ones that gym has equipment for. */
const WB = { goal: '', gym: null, mins: 45, busy: false, out: null, err: '', ctl: null, status: '' };
const WB_IDEAS = ['Explosive legs for jumping', 'Bigger bench press', 'Easy recovery day', 'Quick full body', 'Knee-friendly leg day', 'Core and grip'];
const WB_MINS = [30, 45, 60, 75];

PRO_FEATURES.splice(1, 0, ['🛠️', 'Workouts built for you', 'Say what you want to train. Get a full session that fits your gym\'s equipment', 'build']);
PW_TITLES.build = 'A workout written for today';

const wbGym = () => gyms().find(g => g.id === WB.gym) || null;
function wbAllowed(gym) { return [...library().values()].filter(e => available(e.name, gym)); }

function wbFormHTML() {
  const gs = gyms();
  return `<p class="muted small" style="margin:0 0 10px">Say what you want out of this session. Your coach builds it around your gym's equipment, your lifts and how recovered you are.</p>
    <div class="field"><label class="lbl" for="wb-goal">What's this workout for?</label><textarea id="wb-goal" rows="3" maxlength="400" placeholder="e.g. explosiveness for dunking, but easy on my knees">${esc(WB.goal)}</textarea></div>
    <div class="chips scroll" style="margin:-2px 0 12px">${WB_IDEAS.map((t, i) => `<button class="chip" data-act="wbIdea" data-i="${i}">${esc(t)}</button>`).join('')}</div>
    <div class="lbl">Where</div>
    <div class="chips scroll" style="margin-bottom:4px"><button class="chip" data-act="wbGym" data-id="" aria-pressed="${!WB.gym}">Any gym</button>${gs.map(g => `<button class="chip" data-act="wbGym" data-id="${g.id}" aria-pressed="${g.id === WB.gym}">${esc(g.name)}</button>`).join('')}</div>
    <p class="faint tiny" style="margin:0 0 12px">${WB.gym ? 'Only uses equipment this gym has.' : gs.length ? 'General workout. Pick a gym to match its equipment.' : 'General workout. Add a gym on the Train tab to match its equipment.'}</p>
    <div class="lbl">How long</div>
    <div class="chips" style="margin-bottom:14px">${WB_MINS.map(m => `<button class="chip" data-act="wbMins" data-m="${m}" aria-pressed="${m === WB.mins}">${m} min</button>`).join('')}</div>
    ${WB.err ? `<p class="small" style="color:var(--miss);margin:0 0 10px">${esc(WB.err)}</p>` : ''}
    <button class="btn block" data-act="wbGo">✨ Build my workout</button>`;
}
function wbBusyHTML() {
  return `<div class="wb-wait"><div class="spin"></div><b>Building your workout…</b><p class="muted small">${esc(WB.status || 'Looking at your lifts and recovery')}</p><button class="linkbtn" data-act="wbCancel">Cancel</button></div>`;
}
function wbOutHTML() {
  const o = WB.out, g = wbGym(), nSets = o.ex.reduce((a, x) => a + x.sets, 0);
  return `<div class="wb-head"><div class="eyebrow">${g ? esc(g.name) : 'Any gym'} · about ${o.mins} min · ${plural(nSets, 'set')}</div><h2 class="lift-h" style="font-size:30px;margin:2px 0 6px">${esc(o.name)}</h2>${o.why ? `<p class="muted small" style="margin:0">${esc(o.why)}</p>` : ''}</div>
    ${o.warm ? `<div class="wb-warm"><b>Warm-up</b><span>${esc(o.warm)}</span></div>` : ''}
    <div class="wb-list">${o.ex.map((x, i) => `<div class="wb-ex"><span class="wb-n">${i + 1}</span><span class="grow"><b>${esc(x.name)}</b>${x.note ? `<span>${esc(x.note)}</span>` : ''}</span><span class="wb-t rnum">${x.sets}×${esc(x.reps)}${isTimed(x.name) ? 's' : ''}</span>${typeof musBtn === 'function' ? musBtn(x.name) : ''}${o.ex.length > 2 ? `<button class="iconbtn wb-rm" data-act="wbRm" data-i="${i}" aria-label="Remove ${esc(x.name)}">${ICON.x}</button>` : ''}</div>`).join('')}</div>
    ${o.dropped ? `<p class="faint tiny" style="margin:8px 0 0">${plural(o.dropped, 'exercise')} left out because ${g ? "this gym doesn't have the equipment" : "it isn't in the exercise list"}.</p>` : ''}
    <button class="btn block" data-act="wbStart" style="margin-top:14px">${activeWorkout() ? 'Finish your current workout first' : 'Start this workout'}</button>
    <div class="fields" style="margin-top:8px"><button class="btn ghost" data-act="wbSave">Save as a workout day</button><button class="btn ghost" data-act="wbAgain">Change it</button></div>
    <p class="faint tiny" style="text-align:center;margin:10px 0 0">A suggestion, not medical advice. Skip anything that hurts.</p>`;
}
function wbDraw() { sheetTitle(WB.out && !WB.busy ? 'Your workout' : 'Build me a workout'); sheetBody(WB.busy ? wbBusyHTML() : WB.out ? wbOutHTML() : wbFormHTML()); }
const wbRead = () => { const el = $('#wb-goal'); if (el) WB.goal = el.value; };

A.wbOpen = () => {
  if (!proGate('build')) return;
  if (!aiReady()) return toast('Add your AI key in Settings first.', { bad: true });
  WB.err = ''; WB.busy = false; if (WB.gym && !wbGym()) WB.gym = null;
  if (!WB.init) { WB.init = 1; WB.gym = (gyms().find(g => g.id === UI.planGym) || activeGym() || {}).id || null; }
  openSheet('Build me a workout', '', { onClose: () => { if (WB.ctl) WB.ctl.abort(); WB.busy = false; } }); wbDraw();
};
A.wbIdea = d => { WB.goal = WB_IDEAS[+d.i]; WB.err = ''; wbDraw(); };
A.wbGym = d => { wbRead(); WB.gym = d.id || null; wbDraw(); };
A.wbMins = d => { wbRead(); WB.mins = +d.m; wbDraw(); };
A.wbCancel = () => { if (WB.ctl) WB.ctl.abort(); WB.busy = false; wbDraw(); };
A.wbRm = d => { const o = WB.out; if (!o || o.ex.length <= 2) return; o.ex.splice(+d.i, 1); wbDraw(); };
A.wbAgain = () => { WB.out = null; WB.err = ''; wbDraw(); setTimeout(() => $('#wb-goal')?.focus(), 80); };

/* keep only real library exercises this gym can do; tidy sets and reps */
function wbClean(raw, gym) {
  const lib = library(), seen = new Set(), ex = []; let dropped = 0;
  for (const r of Array.isArray(raw && raw.exercises) ? raw.exercises : []) {
    const e = lib.get(keyOf(String(r && r.name || ''))); if (!e || !available(e.name, gym)) { dropped++; continue; }
    if (seen.has(keyOf(e.name))) continue; seen.add(keyOf(e.name));
    const timed = isTimed(e.name), sets = Math.max(1, Math.min(6, Math.round(+r.sets) || 3));
    let [lo, hi] = repRange(String(r.reps == null ? '' : r.reps)); const cap = timed ? 180 : 30;
    lo = Math.max(1, Math.min(cap, lo)); hi = Math.max(lo, Math.min(cap, hi));
    ex.push({ name: e.name, sets, reps: lo === hi ? String(lo) : `${lo}-${hi}`, note: String(r.note || '').replace(/\s+/g, ' ').trim().slice(0, 110) });
    if (ex.length >= 10) break;
  }
  return { name: String(raw && raw.name || 'Custom workout').replace(/\s+/g, ' ').trim().slice(0, 32) || 'Custom workout', why: String(raw && raw.why || '').replace(/\s+/g, ' ').trim().slice(0, 240), warm: String(raw && raw.warmup || '').replace(/\s+/g, ' ').trim().slice(0, 200), mins: Math.max(10, Math.min(120, Math.round(+(raw && raw.minutes)) || WB.mins)), ex, dropped };
}
function wbPrompt(gym) {
  const list = wbAllowed(gym), by = {}; for (const e of list) (by[e.group] = by[e.group] || []).push(e.name + (isTimed(e.name) ? ' (timed, seconds)' : ''));
  return `Build ONE workout for the app's owner.
WHAT THEY ASKED FOR: ${JSON.stringify((WB.goal || '').slice(0, 400))}
TIME AVAILABLE: about ${WB.mins} minutes, including rest between sets.
WHERE: ${gym ? `${gym.name}. The list below is everything this gym can do.` : 'no specific gym, so keep it to common equipment.'}
ALLOWED EXERCISES (use these exact names, nothing else):
${Object.entries(by).map(([g, n]) => `${g}: ${n.join('; ')}`).join('\n')}

RULES: Pick ${WB.mins <= 30 ? '3 to 5' : WB.mins <= 45 ? '4 to 6' : '5 to 8'} exercises that fit the time. Order them the way they should be done (explosive or heaviest first, small isolation and core last). Match sets and reps to the request: power and explosiveness = low reps moved fast with full rest; strength = 3-6 reps; muscle = 6-12; recovery or pain = lighter, higher reps, easy effort, and leave out anything that loads the sore area hard. Use their data below: train around sore muscles, respect any pain flags, account for what they trained in the last few days and for physical work shifts, and lean toward their stated goals. If the request needs something not in the list (sprints, box jumps, stretching), put it in "warmup" as a short instruction instead of in "exercises". If the request is not about training, or asks for something unsafe, return {"error": "one short friendly sentence"}.
Reply ONLY with JSON: {"name": "short workout name, max 4 words", "why": "one or two sentences on why this fits what they asked, using their data", "minutes": number, "warmup": "one short line, optional", "exercises": [{"name": "exact name from the list", "sets": integer 1-6, "reps": "5" or "8-12" (seconds for timed ones), "note": "one short cue: effort, tempo or what to feel, max 12 words"}]}

THEIR DATA:
${aiContext()}`;
}
A.wbGo = async () => {
  wbRead(); const goal = (WB.goal || '').trim();
  if (goal.length < 3) { WB.err = 'Describe what you want from this workout first.'; return wbDraw(); }
  const gym = wbGym(); if (wbAllowed(gym).length < 8) { WB.err = "This gym doesn't have enough equipment saved to build from. Edit the gym or pick Any gym."; return wbDraw(); }
  WB.err = ''; WB.busy = true; WB.status = ''; WB.out = null; WB.ctl = new AbortController(); const ctl = WB.ctl; wbDraw();
  try {
    const raw = await Gemini.json(wbPrompt(gym), { signal: ctl.signal, kind: 'assist', temp: 0.5, system: 'You are the strength coach built into Liftprint, a training tracker. You write safe, sensible workouts for the owner from their own data. No medical diagnosis. Never mention what AI model or company powers you. Reply only with the JSON asked for.', onStatus: t => { WB.status = t; if (WB.busy && WB.ctl === ctl) wbDraw(); } });
    if (WB.ctl !== ctl) return;
    if (raw && raw.error) WB.err = String(raw.error).slice(0, 200);
    else { const o = wbClean(raw, gym); if (o.ex.length < 2) WB.err = "Couldn't build a full workout from that. Try describing it a different way."; else WB.out = o; }
  } catch (e) { if (WB.ctl !== ctl) return; if (e && e.code !== 'cancelled') WB.err = aiErrorText(e) || "Couldn't build that just now. Try again."; }
  WB.busy = false; if ($('#wb-goal') || $('.wb-wait')) wbDraw();
};
A.wbStart = () => {
  const o = WB.out; if (!o) return; if (activeWorkout()) return toast('Finish or discard your current workout first.', { bad: true });
  const gym = wbGym(), targets = {}, notes = {}; for (const x of o.ex) { targets[keyOf(x.name)] = { sets: x.sets, reps: x.reps }; if (x.note) notes[keyOf(x.name)] = x.note; }
  put('workouts', newId(), { date: todayStr(), startTs: Date.now(), gymId: gym?.id || null, gymName: gym?.name || '', dayId: null, dayName: o.name, plan: o.ex.map(x => x.name), targets, notes, built: 1, sets: [] });
  WB.out = null; WB.goal = ''; closeAllSheets();
  UI.session = true; UI.tab = 'train'; $('#view').scrollTop = 0; audioCtx(); wakeLock(); render();
  if (o.warm) toast('Warm-up: ' + o.warm, { ms: 5000 });
};
A.wbSave = () => {
  const o = WB.out; if (!o) return; const days = clone(splitDays()), exT = clone(S().exTargets || {});
  let name = o.name, n = 2; while (days.some(d => keyOf(d.name) === keyOf(name))) name = `${o.name} ${n++}`;
  const groups = [...new Set(o.ex.map(x => library().get(keyOf(x.name))?.group).filter(Boolean))];
  days.push({ id: newId(), name, groups, exercises: o.ex.map(x => x.name) });
  for (const x of o.ex) if (!exT[keyOf(x.name)]) exT[keyOf(x.name)] = { sets: x.sets, reps: x.reps };
  saveSettings({ split: { days }, exTargets: exT }); toast(`Saved "${name}" to your workout days`);
};

/* entry points: under today's smart pick on the Train tab, and at the top of "Add a workout day" */
function wbEntryHTML(cls) {
  return `<button class="wb-entry${cls ? ' ' + cls : ''}" data-act="wbOpen"><span class="wb-ic">✨</span><span class="grow"><b>Build me a workout</b><span>Say what you want to train. Your coach builds it around your gym's equipment</span></span>${isPro() ? ICON.chevR : '<span class="wb-pro">PRO</span>'}</button>`;
}
{ const sm = smartCardHTML; smartCardHTML = function () { return sm() + wbEntryHTML('solo'); }; }
{ const dn = A.dayNew; A.dayNew = d => { dn(d); const b = $('#sheet .sheet-b'); if (b && !b.querySelector('.wb-entry')) b.insertAdjacentHTML('afterbegin', wbEntryHTML()); }; }
