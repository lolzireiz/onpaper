'use strict';
/* Watch / tracker stats on a workout (any smartwatch or fitness app): scan the summary screenshot or type it in. */

const WATCH_TYPES = ['Traditional Strength Training', 'Functional Strength Training', 'High Intensity Interval Training', 'Core Training', 'Cross Training', 'Basketball', 'Indoor Run', 'Outdoor Run', 'Indoor Walk', 'Outdoor Walk', 'Indoor Cycle', 'Outdoor Cycle', 'Elliptical', 'Stair Stepper', 'Rower', 'Mixed Cardio', 'Hiking', 'Jump Rope', 'Kickboxing', 'Boxing', 'Dance', 'Yoga', 'Pilates', 'Flexibility', 'Cooldown', 'Pool Swim', 'Open Water Swim', 'Soccer', 'Tennis', 'Pickleball', 'Climbing', 'Other'];
const EFFORT = n => n <= 3 ? 'Easy' : n <= 6 ? 'Moderate' : n <= 8 ? 'Hard' : 'All Out';
const EFFORT_COL = n => n <= 3 ? '#3ccf82' : n <= 6 ? '#f5c542' : n <= 8 ? '#ff8a3d' : '#f25454';
const fmtDur = s => { if (!s) return '—'; s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
function parseDur(v) {
  v = String(v || '').trim(); if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(parseFloat(v) * 60);             // plain number = minutes
  const p = v.split(':').map(Number); if (p.some(isNaN)) return null;
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : null;
}
const watchLine = w => w && w.watch ? [w.watch.activeCal ? `${trim(w.watch.activeCal, 0)} active kcal` : '', w.watch.avgHr ? `♥ ${trim(w.watch.avgHr, 0)}` : ''].filter(Boolean).join(' · ') : '';

function watchSectionHTML(w, id) {
  const x = w.watch;
  if (!x) return `<section class="card" style="background:var(--s2);gap:10px"><div><b>⌚ Add your watch stats</b><p class="muted small">Scan the workout summary screenshot from your smartwatch or fitness app, or type the numbers in.</p></div>
    <div class="btnrow">${CAP.sample ? `<button class="btn" data-act="watchScan" data-id="${id}">${ICON.camera} Scan screenshot</button>` : ''}<button class="btn ghost" data-act="watchForm" data-id="${id}" style="background:var(--s3)${CAP.sample ? '' : ';grid-column:1/-1'}">Type it in</button></div>
    ${CAP.sample ? '' : '<p class="faint tiny">Add your AI key in Settings to scan screenshots.</p>'}</section>`;
  const cell = (k, v) => `<div class="stat"><span class="k">${k}</span><span class="v" style="font-size:22px">${v}</span></div>`;
  return `<section class="card" style="background:var(--s2);gap:10px"><div class="card-h"><b>⌚ ${esc(x.type || 'Watch stats')}</b><button class="linkbtn" style="padding:0;font-size:14px" data-act="watchForm" data-id="${id}">Edit</button></div>
    <div class="stats">${cell('Time', fmtDur(x.duration))}${cell('Active kcal', x.activeCal ? trim(x.activeCal, 0) : '—')}${cell('Total kcal', x.totalCal ? trim(x.totalCal, 0) : '—')}${cell('Avg heart rate', x.avgHr ? `${trim(x.avgHr, 0)}<span class="unit">bpm</span>` : '—')}${cell('Max heart rate', x.maxHr ? `${trim(x.maxHr, 0)}<span class="unit">bpm</span>` : '—')}${cell('Effort', x.effort ? `<span style="color:${EFFORT_COL(x.effort)}">${x.effort}</span><span class="unit">${EFFORT(x.effort)}</span>` : '—')}</div></section>`;
}

A.watchScan = d => { Sheet.watchId = d.id; const i = $('#file-watch'); i.value = ''; i.click(); };
const PROMPT_WATCH = `This is a screenshot of a workout summary from a smartwatch or fitness app (any brand: Apple, Garmin, Fitbit, Samsung, Whoop, Polar, Coros, etc.). Read the values exactly as shown.
Reply with only JSON: {"type": "workout type as shown, e.g. Traditional Strength Training or Outdoor Run or Basketball", "duration_seconds": 0, "distance": 0, "distance_unit": "mi", "active_cal": 0, "total_cal": 0, "avg_hr": 0, "max_hr": 0, "effort": 0, "note": ""}
- duration_seconds: the workout time / duration (e.g. 1:02:15 is 3735). Not elapsed time if both are shown.
- active_cal: active calories (kcal). total_cal: total calories (kcal).
- avg_hr: average heart rate in BPM. max_hr: the highest heart rate if shown, otherwise null.
- distance: the distance covered if shown, with distance_unit "mi", "km" or "m"; otherwise null for both.
- effort: an effort / exertion rating from 1 to 10 if shown, otherwise null.
Use null for anything that isn't shown. "note" is one short sentence about anything unclear, or "".
If the image is not a workout summary, reply {"type": null, "note": "<what you see instead>"}.`;
async function onWatchPhoto(file) {
  const id = Sheet.watchId; if (!file || !id || !CAP.sample) return;
  const blob = await toJpeg(file, 1500, 0.85), url = URL.createObjectURL(blob);
  const ctl = aiWorking('Reading your screenshot', url, 'Reading your workout…');
  try {
    const o = await CAP.sample.json(PROMPT_WATCH, { images: [blob], signal: ctl.signal, onStatus: t => { Sheet.aiLabel = t; } });
    clearInterval(Sheet.aiTick); if (ctl.signal.aborted) return;
    if (!o || !o.type && !o.active_cal && !o.duration_seconds) return sheetBody(`<img class="prev-img" src="${url}" alt="Your screenshot"><p class="tip-line">${esc(o?.note || "That doesn't look like a workout summary.")}</p><button class="btn block" data-act="watchScan" data-id="${id}">Try another screenshot</button><button class="btn ghost block" data-act="watchForm" data-id="${id}">Type it in</button>`);
    const n = v => { const x = num(v); return x != null && x > 0 ? x : null; };
    (id === 'act' ? actFromScan : watchForm)(id, { type: o.type || '', dist: n(o.distance), distUnit: o.distance_unit || '', duration: n(o.duration_seconds), activeCal: n(o.active_cal), totalCal: n(o.total_cal), avgHr: n(o.avg_hr), maxHr: n(o.max_hr), effort: n(o.effort) ? clamp(Math.round(o.effort), 1, 10) : null, src: 'scan', note: o.note || '' }, url);
  } catch (e) {
    clearInterval(Sheet.aiTick); const msg = aiErrorText(e); if (msg == null) return;
    sheetBody(`<img class="prev-img" src="${url}" alt="Your screenshot"><p class="tip-line">${esc(msg)}${e && e.message ? `<br><span class="faint tiny">${esc(errCode(e))}</span>` : ''}</p><button class="btn block" data-act="watchRetry">Try again</button><button class="btn ghost block" data-act="watchForm" data-id="${id}">Type it in</button>`);
    Sheet.watchFile = file;
  }
}
A.watchRetry = () => { if (Sheet.watchFile) onWatchPhoto(Sheet.watchFile); };
A.watchForm = d => d.id === 'act' ? actForm({ type: 'run', date: todayStr() }) : watchForm(d.id);
function watchForm(id, vals, imgUrl) {
  const w = Store.docs.workouts[id]; if (!w) return;
  const x = vals || w.watch || { type: 'Traditional Strength Training' }; Sheet.watchId = id; Sheet.watchSrc = x.src || 'manual';
  const types = WATCH_TYPES.includes(x.type) || !x.type ? WATCH_TYPES : [x.type, ...WATCH_TYPES];
  const html = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your screenshot" style="max-height:160px">` : ''}
    ${x.note ? `<p class="tip-line">${esc(x.note)}</p>` : imgUrl ? '<p class="tip-line">Check the numbers, then save.</p>' : ''}
    <div class="field"><label class="lbl" for="wt-t">Workout type</label><select id="wt-t" name="wtype">${types.map(t => `<option ${t === x.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="field"><span class="lbl" id="wt-dl">Time</span><div class="durin" role="group" aria-labelledby="wt-dl"><label><input name="wdh" inputmode="numeric" maxlength="2" value="${x.duration ? Math.floor(x.duration / 3600) : ''}" placeholder="0" aria-label="Hours"><span>h</span></label><label><input name="wdm" inputmode="numeric" maxlength="2" value="${x.duration ? pad(Math.floor(x.duration % 3600 / 60)) : ''}" placeholder="00" aria-label="Minutes"><span>m</span></label><label><input name="wds" inputmode="numeric" maxlength="2" value="${x.duration ? pad(Math.round(x.duration % 60)) : ''}" placeholder="00" aria-label="Seconds"><span>s</span></label></div></div>
    <div class="fields"><div class="field"><label class="lbl" for="wt-a">Active kcal</label><input id="wt-a" name="wact" inputmode="numeric" value="${x.activeCal ?? ''}"></div><div class="field"><label class="lbl" for="wt-tc">Total kcal</label><input id="wt-tc" name="wtot" inputmode="numeric" value="${x.totalCal ?? ''}"></div></div>
    <div class="fields"><div class="field"><label class="lbl" for="wt-h">Avg HR</label><input id="wt-h" name="whr" inputmode="numeric" value="${x.avgHr ?? ''}" placeholder="bpm"></div><div class="field"><label class="lbl" for="wt-m">Max HR</label><input id="wt-m" name="wmax" inputmode="numeric" value="${x.maxHr ?? ''}" placeholder="bpm"></div></div>
    <div class="field"><span class="lbl">Effort <span class="faint" id="wt-el">${x.effort ? `${x.effort} · ${EFFORT(x.effort)}` : '(optional)'}</span></span><div class="effort" role="radiogroup" aria-label="Effort from 1 to 10">${[...Array(10)].map((_, i) => `<button data-act="wEffort" data-n="${i + 1}" aria-pressed="${x.effort === i + 1}" style="--c:${EFFORT_COL(i + 1)}">${i + 1}</button>`).join('')}</div></div>
    <button class="btn block" data-act="watchSave">Save watch stats</button>
    ${w.watch ? `<button class="linkbtn danger center" data-act="watchRemove">Remove watch stats</button>` : `<button class="linkbtn center" data-act="showWorkout" data-id="${id}">Back</button>`}`;
  if ($('#sheet').hidden) openSheet('Watch stats', html); else { sheetTitle('Watch stats'); sheetBody(html); }
}
document.addEventListener('input', e => { const i = e.target; if (!i.closest || !i.closest('.durin')) return; i.value = i.value.replace(/\D/g, '').slice(0, 2); if (i.value.length === 2 && i.name !== 'wds') { const n = i.closest('label').nextElementSibling?.querySelector('input'); if (n) { n.focus(); n.select(); } } });
A.wEffort = (d, el) => { const on = el.getAttribute('aria-pressed') === 'true'; $$('#sheet .effort button').forEach(b => b.setAttribute('aria-pressed', 'false')); if (!on) el.setAttribute('aria-pressed', 'true'); const n = +d.n; $('#wt-el').textContent = on ? '(optional)' : `${n} · ${EFFORT(n)}`; };
A.watchSave = () => {
  const id = Sheet.watchId, w = Store.docs.workouts[id]; if (!w) return closeSheet();
  const n = name => { const v = num(fval(name)); return v != null && v > 0 ? v : null; };
  const hh = num(fval('wdh')) || 0, mm = num(fval('wdm')) || 0, ss = num(fval('wds')) || 0;
  if (hh < 0 || mm < 0 || ss < 0 || mm >= 60 || ss >= 60) return toast('Minutes and seconds go up to 59.', { bad: true });
  const dur = hh || mm || ss ? Math.round(hh * 3600 + mm * 60 + ss) : null;
  const ef = $('#sheet .effort [aria-pressed="true"]');
  const watch = { type: fval('wtype'), duration: dur, activeCal: n('wact'), totalCal: n('wtot'), avgHr: n('whr'), maxHr: n('wmax'), effort: ef ? +ef.dataset.n : null, src: Sheet.watchSrc || 'manual' };
  put('workouts', id, { ...clone(w), watch }); toast('Watch stats saved ⌚'); showWorkout(id);
};
A.watchRemove = () => { const id = Sheet.watchId, w = Store.docs.workouts[id]; if (!w) return; const old = w.watch; const nw = clone(w); delete nw.watch; put('workouts', id, nw); showWorkout(id); toastUndo('Watch stats removed', () => put('workouts', id, { ...clone(Store.docs.workouts[id]), watch: old })); };
