'use strict';
/* Body: weigh-ins (time of day, hours since last meal, body fat %), measurements, progress photos. */

const MEASURES = [['waist', 'Waist'], ['chest', 'Chest'], ['arms', 'Arms (flexed)'], ['shoulders', 'Shoulders'], ['thighs', 'Thighs'], ['calves', 'Calves'], ['neck', 'Neck'], ['hips', 'Hips']];
const RANGES = [['1M', 30], ['3M', 91], ['6M', 182], ['1Y', 365], ['All', 0]];
const POSES = ['Front', 'Side', 'Back'];

Views.body = {
  title() { return '<h1>Body</h1>'; },
  actions() {
    if (UI.bodySub === 'measure') return `<button class="btn sm" data-act="logMeasure">Log</button>`;
    if (UI.bodySub === 'photos') return `<button class="btn sm" data-act="pickPhoto">${ICON.camera} Add</button>`;
    return `<button class="btn sm" data-act="logWeighin">Weigh in</button>`;
  },
  render() {
    const seg = `<div class="seg">${[['weight', 'Weight'], ['measure', 'Measurements'], ['photos', 'Photos']].map(([k, l]) => `<button data-act="bodySub" data-k="${k}" aria-pressed="${UI.bodySub === k}">${l}</button>`).join('')}</div>`;
    return seg + (UI.bodySub === 'measure' ? measureHTML() : UI.bodySub === 'photos' ? photosHTML() : weightHTML());
  },
};
A.bodySub = d => { UI.bodySub = d.k; render(); };

/* ---------- weight ---------- */
function weightHTML() {
  const all = weighins();
  if (!all.length) return `<div class="empty"><p>Log your first weigh-in. Recording the time and how long since you ate makes the trend a lot more reliable.</p><button class="btn" data-act="logWeighin">Log a weigh-in</button></div>`;
  const list = UI.weightFilter === 'fasted' ? all.filter(isMorningFasted) : all;
  const days = (RANGES.find(r => r[0] === UI.weightRange) || RANGES[1])[1];
  const from = days ? addDays(todayStr(), -days) : (list[0] || all[0]).date;
  const inR = list.filter(w => w.date >= from);
  const last = list[list.length - 1], avg7 = last ? avgWindow(list, last.date) : null, rate = weeklyRate(list);
  const first = inR[0], change = first && last ? last.weight - first.weight : null;
  const tr = weightTrend(list), avgPts = inR.map(w => ({ x: wiX(w), y: U.w(tr.get(w.date) ?? w.weight), w })), trNow = last ? tr.get(last.date) : null;
  const bfs = all.filter(w => w.bf > 0), lastBf = bfs[bfs.length - 1];
  const tip = p => `<b>${fw(p.w.weight)} ${U.wu}</b> · trend ${fw(tr.get(p.w.date) ?? p.w.weight)}<br>${fmtDate(p.w.date)}${p.w.time ? ' ' + fmtTime(p.w.time) : ''}${p.w.meal ? ' · ' + mealLabel(p.w.meal) : ''}`;
  let h = `<section class="card">
    <div class="card-h" style="align-items:flex-end"><div class="stat"><span class="k">Latest · ${last ? fmtDate(last.date) : '—'}</span><span class="big">${last ? fw(last.weight) : '—'}<span class="unit">${U.wu}</span></span></div>
    <div class="stat" style="text-align:right"><span class="k">True weight (trend)</span><span class="v">${trNow ? fw(trNow) : '—'}</span><span class="faint tiny">7-day avg ${avg7 ? fw(avg7) : '—'}</span></div></div>
    <div class="stats"><div class="stat"><span class="k">Change (${UI.weightRange})</span><span class="v">${change != null && inR.length > 1 ? signed(U.w(change)) : '—'}</span></div><div class="stat"><span class="k">Per week</span><span class="v">${rate != null ? signed(U.w(rate), 2) : '—'}</span></div><div class="stat"><span class="k">${lastBf ? 'Lean mass' : 'Weigh-ins'}</span><span class="v">${lastBf ? fw(lastBf.weight * (1 - lastBf.bf / 100)) : inR.length}</span></div></div>
    <div class="chips">${RANGES.map(([k]) => `<button class="chip" data-act="wRange" data-k="${k}" aria-pressed="${UI.weightRange === k}">${k}</button>`).join('')}</div>
    <div class="seg"><button data-act="wFilter" data-k="all" aria-pressed="${UI.weightFilter !== 'fasted'}">All weigh-ins</button><button data-act="wFilter" data-k="fasted" aria-pressed="${UI.weightFilter === 'fasted'}">Morning, fasted only</button></div>
    ${chartSlot('weight', { h: 200, x0: parseDate(from).getTime(), x1: Date.now(), label: 'Bodyweight over time with smoothed trend line', empty: UI.weightFilter === 'fasted' ? 'No morning fasted weigh-ins in this range yet.' : 'No weigh-ins in this range.', series: [{ type: 'dots', pts: inR.map(w => ({ x: wiX(w), y: U.w(w.weight), w })), color: 'var(--tx3)', r: 3 }, { type: 'line', pts: avgPts, area: true, end: true }], scrubPts: inR.map(w => ({ x: wiX(w), y: U.w(w.weight), w })), tip })}
    ${legend([['', 'background:var(--tx3)', 'Each weigh-in'], ['l', 'background:var(--accent)', 'Trend (smooths out water swings)']])}
    ${UI.weightFilter === 'fasted' ? '<p class="faint small">Only weigh-ins before 11am marked 8+ hours since your last meal. These swing the least day to day.</p>' : ''}
  </section>`;
  h += coachCardHTML() + weeklyAvgHTML(list);
  if (bfs.length >= 2) h += `<section class="card"><h2 class="sec-t">Body fat %</h2>${chartSlot('bf', { h: 140, label: 'Body fat percent over time', series: [{ type: 'line', pts: bfs.map(w => ({ x: wiX(w), y: w.bf, w })), end: true }], yFmt: v => trim(v, 1) + '%', tip: p => `<b>${trim(p.w.bf, 1)}%</b> · ${fmtDate(p.w.date)} · lean ${fw(p.w.weight * (1 - p.w.bf / 100))} ${U.wu}` })}<p class="faint small">Lean mass = bodyweight × (1 − body fat %). If it climbs while body fat holds steady, you're adding muscle.</p></section>`;
  const rows = list.slice().reverse().slice(0, 60);
  h += `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">Entries</h2>${rows.map((w, i) => {
    const prev = rows[i + 1]; const dlt = prev ? w.weight - prev.weight : null;
    return `<button class="row" data-act="logWeighin" data-id="${w.id}"><div class="grow"><b>${fmtDate(w.date)}</b><div class="faint small">${[w.time ? fmtTime(w.time) : '', mealLabel(w.meal) ? mealLabel(w.meal) + ' since eating' : '', w.bf ? trim(w.bf, 1) + '% fat' : ''].filter(Boolean).join(' · ') || 'No details'}</div></div><div class="rnum"><b>${fw(w.weight)}</b> <span class="faint small">${U.wu}</span><div class="faint tiny">${dlt != null ? signed(U.w(dlt)) : ''}</div></div></button>`;
  }).join('')}</section>`;
  return h;
}
A.wRange = d => { UI.weightRange = d.k; render(); };
A.wFilter = d => { UI.weightFilter = d.k; render(); };
A.logWeighin = d => {
  const w = d.id ? Store.docs.weighins[d.id] : null, last = latestWeighin();
  openSheet(w ? 'Edit weigh-in' : 'Weigh in', `
    <div class="field"><label class="lbl" for="wi-w">Weight (${U.wu})</label><input id="wi-w" class="huge" name="w" inputmode="decimal" autocomplete="off" value="${w ? plain(U.w(w.weight)) : ''}" placeholder="${last ? plain(U.w(last.weight)) : '0.0'}"></div>
    <div class="fields"><div class="field"><label class="lbl" for="wi-d">Date</label><input id="wi-d" type="date" name="date" value="${w ? w.date : todayStr()}" max="${todayStr()}"></div><div class="field"><label class="lbl" for="wi-t">Time</label><input id="wi-t" type="time" name="time" value="${w ? (w.time || '') : nowTime()}"></div></div>
    <div class="field"><span class="lbl">Time since your last meal</span><div class="chips">${MEALS.map(([k, l]) => chip(l, 'meal', k, w ? w.meal === k : false, 'mealPick')).join('')}</div></div>
    <div class="field"><label class="lbl" for="wi-bf">Body fat % <span class="faint">(optional, from a smart scale or calipers)</span></label><input id="wi-bf" name="bf" inputmode="decimal" value="${w?.bf ?? ''}" placeholder="e.g. 14.5"></div>
    <p class="tip-line">Most consistent: right after you wake up and use the bathroom, before you eat or drink.</p>
    <button class="btn block" data-act="saveWeighin" data-id="${d.id || ''}">Save weigh-in</button>
    ${w ? `<button class="linkbtn danger center" data-act="deleteWeighin" data-id="${d.id}">Delete</button>` : ''}`, { onMount(L) { if (!w) setTimeout(() => $('#wi-w', L)?.focus(), 280); } });
};
A.mealPick = (d, el) => { const on = el.getAttribute('aria-pressed') === 'true'; A.pick(d, el); if (on) el.setAttribute('aria-pressed', 'false'); };
A.saveWeighin = d => {
  const v = num(fval('w')); if (!v || v <= 0) { toast('Enter your weight.', { bad: true }); $('#wi-w').focus(); return; }
  const bf = num(fval('bf'));
  if (bf != null && (bf < 2 || bf > 70)) return toast('Body fat % should be between 2 and 70.', { bad: true });
  const id = d.id || newId(), old = Store.docs.weighins[id];
  put('weighins', id, { date: fval('date') || todayStr(), time: fval('time') || null, weight: U.toLb(v), meal: picked($('#sheet'), 'meal'), bf: bf || null, ts: old?.ts || Date.now() });
  closeSheet(); toast(d.id ? 'Weigh-in updated' : `Logged ${trim(v, 1)} ${U.wu}`); if (!d.id) sparkle(null, ['#3392f5', '#3ccf82', '#ffffff']);
};
A.deleteWeighin = d => { const w = Store.docs.weighins[d.id]; del('weighins', d.id); closeSheet(); if (w) toastUndo('Weigh-in deleted', () => put('weighins', d.id, w)); };

/* ---------- measurements ---------- */
function measureHTML() {
  const list = Store.list('body').sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
  if (!list.length) return `<div class="empty"><p>Track tape measurements over time. Waist going down while arms and chest go up is a good sign on a lean bulk.</p><button class="btn" data-act="logMeasure">Log measurements</button></div>`;
  const series = k => list.filter(e => e[k] > 0);
  const key = UI.measureKey, s = series(key), lbl = (MEASURES.find(m => m[0] === key) || [])[1];
  let h = `<section class="card"><div class="mgrid">${MEASURES.map(([k, l]) => {
    const xs = series(k); if (!xs.length) return '';
    const lastV = xs[xs.length - 1][k], d0 = xs.length > 1 ? lastV - xs[0][k] : null;
    return `<button data-act="mKey" data-k="${k}" aria-pressed="${key === k}"><span class="k">${l}</span><span class="v">${trim(U.l(lastV), 1)}<span class="unit">${U.lu}</span></span><span class="faint tiny">${d0 != null ? `${signed(U.l(d0))} since ${fmtDate(xs[0].date)}` : 'First entry'}</span></button>`;
  }).join('')}</div></section>`;
  h += `<section class="card"><h2 class="sec-t">${esc(lbl || '')}</h2>${chartSlot('measure', { h: 160, label: `${lbl} over time`, empty: `No ${String(lbl).toLowerCase()} measurements yet.`, series: [{ type: 'line', pts: s.map(e => ({ x: parseDate(e.date).getTime(), y: U.l(e[key]), e })), end: true }, { type: 'dots', pts: s.map(e => ({ x: parseDate(e.date).getTime(), y: U.l(e[key]) })), r: 3.5 }], yFmt: v => trim(v, 1), tip: p => `<b>${trim(p.y, 1)} ${U.lu}</b> · ${fmtDate(p.e.date)}` })}</section>`;
  h += `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">Check-ins</h2>${list.slice().reverse().map(e => `<button class="row" data-act="logMeasure" data-id="${e.id}"><div class="grow"><b>${fmtDate(e.date)}</b><div class="faint small">${MEASURES.filter(([k]) => e[k] > 0).map(([k, l]) => `${l.split(' ')[0]} ${trim(U.l(e[k]), 1)}`).join(' · ')}</div></div></button>`).join('')}</section>`;
  return h;
}
A.mKey = d => { UI.measureKey = d.k; render(); };
A.logMeasure = d => {
  const e = d.id ? Store.docs.body[d.id] : null;
  openSheet(e ? 'Edit measurements' : 'Log measurements', `
    <div class="field"><label class="lbl" for="ms-d">Date</label><input id="ms-d" type="date" name="date" value="${e ? e.date : todayStr()}" max="${todayStr()}"></div>
    <div class="fields">${MEASURES.map(([k, l]) => `<div class="field"><label class="lbl" for="ms-${k}">${l} (${U.lu})</label><input id="ms-${k}" name="${k}" inputmode="decimal" value="${e && e[k] ? plain(U.l(e[k])) : ''}"></div>`).join('')}</div>
    <p class="tip-line">Fill in only what you measured. Measure at the same spot each time, relaxed except arms.</p>
    <button class="btn block" data-act="saveMeasure" data-id="${d.id || ''}">Save</button>
    ${e ? `<button class="linkbtn danger center" data-act="deleteMeasure" data-id="${d.id}">Delete</button>` : ''}`);
};
A.saveMeasure = d => {
  const rec = { date: fval('date') || todayStr(), ts: Date.now() }; let n = 0;
  for (const [k] of MEASURES) { const v = num(fval(k)); if (v > 0) { rec[k] = U.toIn(v); n++; } }
  if (!n) return toast('Enter at least one measurement.', { bad: true });
  put('body', d.id || newId(), rec); closeSheet(); toast('Measurements saved');
};
A.deleteMeasure = async d => { if (await ask('Delete this check-in?', { ok: 'Delete', danger: true })) { del('body', d.id); closeSheet(); } };

/* ---------- progress photos ---------- */
const photoSrc = p => Store.blobs[p.assetId || p.local] || '';
function photosHTML() {
  const list = Store.list('photos').sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0));
  const canUpload = true;
  if (!list.length) return `<div class="empty"><p>Add progress photos to compare side by side over time. Same spot, same light and same pose works best.</p>${canUpload ? `<button class="btn" data-act="pickPhoto">${ICON.camera} Add a photo</button>` : '<p class="faint small">Photo uploads are only available to the app owner.</p>'}</div>`;
  const pose = UI.photoPose, ofPose = list.filter(p => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date));
  const a = ofPose.find(p => p.id === UI.cmpA) || ofPose[0], b = ofPose.find(p => p.id === UI.cmpB) || ofPose[ofPose.length - 1];
  const fig = (p, which) => {
    if (!p) return `<figure><div class="ph">No ${pose.toLowerCase()} photo yet</div></figure>`;
    const bw = bwOn(p.date);
    return `<figure><div class="ph"><img src="${photoSrc(p)}" alt="${pose} photo from ${fmtDate(p.date, { rel: false })}"></div><select aria-label="${which} photo date" data-change="cmpPick" data-which="${which}">${ofPose.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${fmtDate(x.date, { rel: false, year: true })}</option>`).join('')}</select><figcaption>${bw ? `${fwu(bw.weight)}` : 'No weigh-in yet'}</figcaption></figure>`;
  };
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Compare</h2><div class="chips">${POSES.map(p => `<button class="chip" data-act="photoPose" data-p="${p}" aria-pressed="${pose === p}">${p}</button>`).join('')}</div></div>
    ${photoCompareHTML(a, b, fig)}
    ${a && b && a.id !== b.id ? `<p class="faint small center">${daysBetween(a.date, b.date)} days apart${bwOn(a.date) && bwOn(b.date) ? ` · ${signed(U.w(bwOn(b.date).weight - bwOn(a.date).weight))} ${U.wu}` : ''}</p>` : ''}</section>
    <div class="photos">${list.map(p => `<button data-act="viewPhoto" data-id="${p.id}"><img loading="lazy" src="${photoSrc(p)}" alt="${esc(p.pose)} photo, ${fmtDate(p.date, { rel: false })}"><span class="cap">${fmtDate(p.date)} · ${esc(p.pose)}</span></button>`).join('')}</div>
    <p class="faint small">Photos are saved only on this phone. They aren't uploaded anywhere and aren't included in backups.</p>`;
}
A.photoPose = d => { UI.photoPose = d.p; UI.cmpA = UI.cmpB = null; render(); };
A.cmpPick = (d, el) => { if (d.which === 'Before') UI.cmpA = el.value; else UI.cmpB = el.value; render(); };
A.pickPhoto = () => { const i = $('#file-photo'); i.value = ''; i.click(); };
function onPhotoChosen(file) {
  if (!file) return;
  Sheet.photo = file; const url = URL.createObjectURL(file);
  openSheet('Add progress photo', `<img class="prev-img" src="${url}" alt="Selected photo">
    <div class="field"><span class="lbl">Pose</span><div class="seg">${POSES.map(p => `<button data-act="pick" data-group="pose" data-value="${p}" aria-pressed="${p === UI.photoPose}">${p}</button>`).join('')}</div></div>
    <div class="field"><label class="lbl" for="ph-d">Date</label><input id="ph-d" type="date" name="date" value="${todayStr()}" max="${todayStr()}"></div>
    <button class="btn block" id="ph-save" data-act="savePhoto">Save photo</button>`, { onClose: () => URL.revokeObjectURL(url) });
}
A.savePhoto = async () => {
  const file = Sheet.photo; if (!file) return;
  const pose = picked($('#sheet'), 'pose') || 'Front', date = fval('date') || todayStr(), btn = $('#ph-save');
  btn.disabled = true; btn.textContent = 'Uploading…';
  try {
    const blob = await toJpeg(file, 1600, 0.85);
    if (CAP.assets) { const res = await CAP.assets.upload(blob, { type: 'image/jpeg' }); put('photos', newId(), { date, pose, assetId: res.id, ts: Date.now() }); }
    else { const id = newId(); Store.blobs[id] = URL.createObjectURL(blob); put('photos', newId(), { date, pose, local: id, ts: Date.now() }); }
    UI.photoPose = pose; UI.cmpA = UI.cmpB = null; closeSheet(); toast('Photo saved');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save photo';
    toast(e?.code === 'too_large' ? 'That photo is too big. Try a smaller one.' : e?.code === 'quota_or_state' ? 'Photo storage is full. Delete some old photos first.' : e?.code === 'rate_limited' ? 'Too many uploads at once. Wait a moment and try again.' : "Couldn't upload the photo. Try again.", { bad: true, ms: 4000 });
  }
};
A.viewPhoto = d => {
  const p = Store.docs.photos[d.id]; if (!p) return; const bw = bwOn(p.date);
  openSheet(`${p.pose} · ${fmtDate(p.date, { rel: false })}`, `<div class="viewer"><img src="${photoSrc({ ...p, id: d.id })}" alt="${esc(p.pose)} photo"></div><p class="muted small">${bw ? `Bodyweight around then: ${fwu(bw.weight)} (${fmtDate(bw.date)})` : ''}</p><button class="linkbtn danger center" data-act="deletePhoto" data-id="${d.id}">Delete photo</button>`);
};
A.deletePhoto = async d => {
  const p = Store.docs.photos[d.id]; if (!p || !(await ask('Delete this photo for good?', { ok: 'Delete', danger: true }))) return;
  if (p.assetId && CAP.assets) { try { await CAP.assets.delete(p.assetId); } catch (e) {} }
  del('photos', d.id); closeSheet();
};
