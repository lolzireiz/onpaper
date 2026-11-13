'use strict';
/* Naps: log as many as you like, or run a nap timer. They lift today's readiness, but realistically:
   - You don't sleep the whole time you lie down. In a lab study, a 45-min nap chance gave ~30 min of actual sleep,
     so the first ~8 min don't count and ~90% of the rest does.
   - Short naps give the biggest lift per minute (10–20 min already restores a lot of alertness after a short night);
     longer naps help more but with diminishing returns. Past one full sleep cycle (~90 min), extra sleep counts half.
   - A nap can make up at most ~60% of what a short night cost you. It never equals a full night.
   - Well-rested? You still get a small lift (up to +3).
   - The lift fades: full for ~6 h after you wake, then down to half by ~10 h, and nothing carries to tomorrow. */

const NAP_ONSET = 8, NAP_EFF = 0.9, NAP_CYCLE = 85, NAP_TAU = 32, NAP_MAXFRAC = 0.6, NAP_REST = 3;
const napAsleep = m => Math.max(0, m - NAP_ONSET) * NAP_EFF;
const napEq = m => { const a = napAsleep(m); return Math.min(a, NAP_CYCLE) + Math.max(0, a - NAP_CYCLE) * 0.5; };
const napEnd = n => n.start + n.mins * 6e4;
const fmtMinsH = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r} min`; };
function napFade(n, now) { const hrs = (now - napEnd(n)) / 36e5; return hrs <= 6 ? 1 : hrs >= 10 ? 0.5 : 1 - (hrs - 6) / 8; }
function napBoost(d, sleepPts, now = Date.now()) {
  const naps = (d.naps || []).filter(n => n.mins > 0); if (!naps.length) return { pts: 0, tip: '', why: '', naps };
  const live = !d.date || d.date === todayStr();
  let eq = 0, fw = 0;
  for (const n of naps) { const e = napEq(n.mins); eq += e; fw += e * (live ? napFade(n, now) : 1); }
  const fade = eq ? fw / eq : 1, faded = fade < 0.99;   // how much of the lift is left, weighted by each nap's size
  const missing = Math.max(0, 30 - sleepPts), frac = NAP_MAXFRAC * (1 - Math.exp(-eq / NAP_TAU));
  const pts = (missing * frac + NAP_REST * (1 - missing / 30) * Math.min(1, eq / 40)) * fade;
  const total = naps.reduce((a, n) => a + n.mins, 0), last = naps.reduce((a, n) => napEnd(n) > napEnd(a) ? n : a);
  let tip = '';
  if (live && last.mins > 25 && now - napEnd(last) < 30 * 6e4 && now >= napEnd(last)) tip += ' Just up from a nap? Give it about 30 minutes before training so the grogginess wears off.';
  else if (naps.some(n => new Date(n.start).getHours() >= 16) && live) tip += ' Late naps can make it harder to fall asleep tonight.';
  const why = `${fmtMinsH(total)} · ${missing < 3 ? 'small lift' : `${Math.round(frac * 100)}% of lost sleep`}${faded ? ' · fading' : ''}`;
  return { pts, tip, why, naps, eq, frac, faded };
}

/* ---------- Today: a row under readiness ---------- */
function napFootHTML() {
  const run = S().napStart, naps = dailyOf().naps || [];
  if (run) return `<div class="nap-foot nap-run"><span class="nap-z" aria-hidden="true">😴</span><span class="grow"><b>Napping</b><span class="faint small">since ${fmtClock(run)} · <span data-nap-tick>${fmtMinsH((Date.now() - run) / 6e4)}</span></span></span><button class="btn sm" data-act="napUp">I'm up</button></div>`;
  const r = readiness(), tot = naps.reduce((a, n) => a + n.mins, 0);
  return `<div class="nap-foot"><button class="chip nap-chip" data-act="napOpen">😴 ${naps.length ? 'Log another nap' : 'Log a nap'}</button><button class="chip nap-chip" data-act="napStart">⏱ Start nap timer</button>${naps.length ? `<span class="faint small nap-sum">${fmtMinsH(tot)} today · +${Math.round(r.parts.nap)}</span>` : ''}</div>`;
}
/* keep the running timer ticking while the app is open */
setInterval(() => { const run = S().napStart; if (!run) return; $$('[data-nap-tick]').forEach(e => { e.textContent = fmtMinsH((Date.now() - run) / 6e4); }); }, 30000);

/* ---------- check-in sheet: naps section ---------- */
function napSectionHTML() {
  const run = S().napStart, naps = (dailyOf().naps || []).slice().sort((a, b) => a.start - b.start);
  return `<div class="field"><div class="card-h"><span class="lbl">Naps today</span>${naps.length ? `<span class="faint small">${fmtMinsH(naps.reduce((a, n) => a + n.mins, 0))} total</span>` : ''}</div>
    ${naps.map(n => `<button class="row nap-r" data-act="napOpen" data-id="${n.id}"><span aria-hidden="true">😴</span><span class="grow"><b>${fmtMinsH(n.mins)}</b><span class="faint small"> · ${fmtClock(n.start)} – ${fmtClock(napEnd(n))}</span></span><span class="faint small">Edit</span></button>`).join('')}
    ${run ? `<div class="nap-foot nap-run" style="margin:4px 0 0"><span class="nap-z" aria-hidden="true">😴</span><span class="grow"><b>Napping</b><span class="faint small">since ${fmtClock(run)}</span></span><button class="btn sm" data-act="napUp">I'm up</button></div>`
      : `<div class="chips" style="margin-top:${naps.length ? 6 : 0}px"><button class="chip" data-act="napOpen">+ ${naps.length ? 'Another nap' : 'Add a nap'}</button><button class="chip" data-act="napStart">⏱ Start nap timer</button></div>`}</div>`;
}

/* ---------- the nap sheet ---------- */
const NAP_CHIPS = [20, 30, 45, 60, 90, 120];
A.napOpen = d => {
  const ex = d.id ? (dailyOf().naps || []).find(n => n.id === d.id) : null, now = new Date();
  const wake = ex ? new Date(napEnd(ex)) : now;
  Sheet.nap = { id: ex?.id || null, mins: ex?.mins ?? (+d.mins || 45), wake: `${String(wake.getHours()).padStart(2, '0')}:${String(wake.getMinutes()).padStart(2, '0')}` };
  const fromCheckin = !!$('#sheet .ready-hero');
  const open = () => openSheet(ex ? 'Edit nap' : 'Log a nap', '', { onClose: () => setTimeout(() => { if (Sheet.rd && $('#sheet .ready-hero')) drawReady(); }, 0) });
  fromCheckin ? peekSheet(open) : open(); drawNap();
};
function napDraft() {
  const N = Sheet.nap, [h, m] = N.wake.split(':').map(Number), w = new Date(); w.setHours(h, m, 0, 0);
  if (w.getTime() > Date.now() + 6e4) w.setTime(Date.now());   // can't wake up in the future
  return { id: N.id || newId(), start: w.getTime() - N.mins * 6e4, mins: N.mins };
}
function napNote(m) {
  if (m < 10) return 'Under 10 minutes is mostly falling asleep, so it barely counts.';
  if (m <= 25) return 'Power nap: a quick alertness boost and you wake up without much grogginess.';
  if (m <= 60) return 'Long enough to reach deep sleep. Good for recovery, but you may feel groggy for up to 30 minutes after.';
  if (m <= 100) return 'About one full sleep cycle (~90 min). The most a nap can give, usually with less grogginess.';
  return 'Past one full cycle, extra time adds less, and a long nap can push back tonight’s sleep.';
}
function drawNap() {
  const N = Sheet.nap, d = dailyOf(), nap = napDraft(), others = (d.naps || []).filter(n => n.id !== N.id);
  const before = readinessFrom({ ...d, naps: others }), after = readinessFrom({ ...d, naps: [...others, nap] }), diff = after.score - before.score;
  const late = new Date(nap.start).getHours() >= 16, noSleep = d.sleep == null;
  sheetBody(`<div class="nap-dur"><button class="btn ghost pl-step" data-act="napStep" data-d="-5" aria-label="5 minutes less">−</button><div class="nap-big"><b>${fmtMinsH(N.mins)}</b><span class="faint small">nap</span></div><button class="btn ghost pl-step" data-act="napStep" data-d="5" aria-label="5 minutes more">+</button></div>
    <div class="chips nap-chips">${NAP_CHIPS.map(m => `<button class="chip" data-act="napSet" data-v="${m}" aria-pressed="${N.mins === m}">${fmtMinsH(m)}</button>`).join('')}</div>
    <div class="field" style="margin-top:12px"><label class="lbl" for="nap-w">Woke up at</label><input id="nap-w" type="time" value="${N.wake}"></div>
    <p class="faint small" style="margin:-4px 0 12px">${fmtClock(nap.start)} – ${fmtClock(napEnd(nap))}. ${esc(napNote(N.mins))}${late ? ' Napping after about 4 pm can make it harder to fall asleep tonight.' : ''}</p>
    <div class="nap-prev">${ring(before.score, 'var(--tx3)', 54, 6, before.score)}<span class="nap-arrow" aria-hidden="true">→</span>${ring(after.score, after.col, 54, 6, after.score)}<div class="grow"><b>${diff > 0 ? `+${diff} readiness` : 'About the same'}</b><span class="faint small">${diff > 0 ? esc(after.lbl) : before.parts.sleep >= 29 ? 'You slept well, so there’s little to make up.' : 'Too short to count for much.'}</span></div></div>
    ${noSleep ? '<p class="faint tiny" style="margin:6px 0 0">You haven’t logged last night’s sleep, so this assumes an average night. Add it in your check-in for a truer number.</p>' : ''}
    <button class="btn block" style="margin-top:14px" data-act="napSave">${N.id ? 'Save changes' : 'Save nap'}</button>
    ${N.id ? '<button class="linkbtn danger center" style="width:100%;text-align:center" data-act="napDel">Delete this nap</button>' : `<button class="btn ghost block" style="margin-top:8px" data-act="napStart">⏱ Start a nap timer instead</button>`}
    <details class="nap-how"><summary class="faint small">How naps count</summary><p class="faint small">Naps help, but not like a full night. The first ~8 minutes are usually spent falling asleep. Short naps give the biggest lift per minute, and longer ones add less and less. A nap can make up at most about 60% of what a short night cost you. If you slept well you still get a small lift (up to +3). The boost lasts about 6 hours after you wake, fades to half by about 10 hours, and is gone by tomorrow. Sleep studies suggest 20–90 minutes, ideally between 1 and 4 pm.</p></details>`);
  const w = $('#nap-w'); if (w) w.addEventListener('change', () => {
    if (!w.value) return; const [h, m] = w.value.split(':').map(Number), t = new Date(); t.setHours(h, m, 0, 0);
    if (t.getTime() > Date.now() + 6e4) { const n = new Date(); N.wake = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; toast('That’s later than now, so it’s set to now'); } else N.wake = w.value;
    drawNap();
  });
}
A.napStep = d => { Sheet.nap.mins = clamp(Sheet.nap.mins + +d.d, 5, 300); drawNap(); };
A.napSet = d => { Sheet.nap.mins = +d.v; drawNap(); };
function saveNap(nap) {
  const date = todayStr(), naps = (dailyOf(date).naps || []).filter(n => n.id !== nap.id);
  const r0 = readiness().score; putDaily(date, { naps: [...naps, nap].sort((a, b) => a.start - b.start) });
  return [r0, readiness().score];
}
A.napSave = () => {
  const nap = napDraft(), editing = !!Sheet.nap.id, [a, b] = saveNap(nap); closeSheet();
  toast(editing ? 'Nap updated' : `😴 ${fmtMinsH(nap.mins)} nap logged · readiness ${a === b ? b : `${a} → ${b}`}`);
};
A.napDel = () => {
  const id = Sheet.nap.id, old = (dailyOf().naps || []).find(n => n.id === id); if (!old) return;
  putDaily(todayStr(), { naps: (dailyOf().naps || []).filter(n => n.id !== id) }); closeSheet();
  toastUndo('Nap deleted', () => saveNap(old));
};

/* ---------- nap timer ---------- */
A.napStart = () => {
  saveSettings({ napStart: Date.now() });
  if ($('#sheet .nap-dur')) closeSheet(); else if (Sheet.rd && $('#sheet .ready-hero')) drawReady();
  toast('😴 Sleep well. Tap “I’m up” when you wake.');
};
A.napUp = () => {
  const st = S().napStart; if (!st) return;
  const mins = Math.round((Date.now() - st) / 6e4); saveSettings({ napStart: null });
  if (mins < 3) { toast('That was under 3 minutes, so it wasn’t saved'); if (Sheet.rd && $('#sheet .ready-hero')) drawReady(); return; }
  if (mins > 240) {   // probably forgot to stop it: let them fix the length
    const now = new Date(); Sheet.nap = { id: null, mins: 90, wake: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
    const open = () => openSheet('How long did you nap?', ''); $('#sheet .ready-hero') ? peekSheet(open) : open(); drawNap();
    toast(`The timer ran ${fmtMinsH(mins)}. Set how long you actually slept.`); return;
  }
  const nap = { id: newId(), start: st, mins }, [a, b] = saveNap(nap);
  if (Sheet.rd && $('#sheet .ready-hero')) drawReady();
  toastUndo(`😴 ${fmtMinsH(mins)} nap logged · readiness ${a === b ? b : `${a} → ${b}`}`, () => { putDaily(todayStr(), { naps: (dailyOf().naps || []).filter(n => n.id !== nap.id) }); });
};
PAGES.push(['😴', 'Log a nap', 'nap naps nap timer sleep rest readiness power nap', () => A.napOpen({})]);
