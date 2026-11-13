'use strict';
/* v3.9: vertical jump from video, dunk countdown, strength levels, barcode scanning, protein suggestions,
   copy yesterday's food, and Siri weigh-ins. */

/* ======================= vertical jump from a video ======================= */
/* Flight time t (seconds, real time) → jump height h = g·t²/8. In inches: 48.27·t². */
const VT = { speeds: [[1, 'Normal speed'], [4, 'Slo-mo 120 fps (plays 4× slower)'], [8, 'Slo-mo 240 fps (plays 8× slower)']] };
const vtHeight = (dt, slow) => { const t = dt / slow; return 9.80665 * t * t / 8 / 0.0254; };
A.vertTest = () => {
  openSheet('Vertical jump test', `<p class="muted small" style="margin:0">Film a jump from the side with your whole body in frame (slo-mo is best). Then mark the frame your toes leave the ground and the frame they touch back down. Your height comes from how long you were in the air.</p>
    <button class="btn block" data-act="vtPick">${ICON.camera} Choose a video</button>
    <input type="file" id="vt-file" accept="video/*" hidden style="display:none">
    <div id="vt-ui" hidden>
      <video id="vt-v" playsinline muted preload="auto" style="width:100%;max-height:46vh;border-radius:14px;background:#000"></video>
      <input type="range" id="vt-s" min="0" max="1" step="0.0005" value="0" aria-label="Video position" style="width:100%">
      <div class="vt-step"><button class="btn ghost sm" data-act="vtStep" data-d="-10" aria-label="Back 10 frames">−10</button><button class="btn ghost sm" data-act="vtStep" data-d="-1" aria-label="Back 1 frame">◀ 1</button><span id="vt-t" class="faint small">0.000 s</span><button class="btn ghost sm" data-act="vtStep" data-d="1" aria-label="Forward 1 frame">1 ▶</button><button class="btn ghost sm" data-act="vtStep" data-d="10" aria-label="Forward 10 frames">+10</button></div>
      <div class="fields"><button class="btn ghost" data-act="vtMark" data-k="up" id="vt-up">Mark takeoff</button><button class="btn ghost" data-act="vtMark" data-k="down" id="vt-down">Mark landing</button></div>
      <div class="field"><label class="lbl" for="vt-sp">This video was filmed in</label><select id="vt-sp">${VT.speeds.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div id="vt-res" class="vt-res" aria-live="polite"></div>
    </div>`);
  VT.up = VT.down = null;
  const f = $('#vt-file'), v = $('#vt-v'), s = $('#vt-s');
  f.addEventListener('change', () => { const file = f.files && f.files[0]; if (!file) return; if (VT.url) URL.revokeObjectURL(VT.url); VT.url = URL.createObjectURL(file); v.src = VT.url; $('#vt-ui').hidden = false; VT.up = VT.down = null; vtShow(); });
  v.addEventListener('loadedmetadata', () => { s.max = v.duration || 1; v.currentTime = 0.001; vtShow(); });
  v.addEventListener('seeked', () => { $('#vt-t').textContent = `${v.currentTime.toFixed(3)} s`; s.value = v.currentTime; });
  s.addEventListener('input', () => { v.currentTime = +s.value; });
  $('#vt-sp').addEventListener('change', vtShow);
};
A.vtPick = () => { const f = $('#vt-file'); f.value = ''; f.click(); };
A.vtStep = d => { const v = $('#vt-v'); if (!v || !v.duration) return; v.pause(); v.currentTime = clamp(v.currentTime + (+d.d) / 30, 0, v.duration); };
A.vtMark = d => { const v = $('#vt-v'); if (!v || !v.duration) return; VT[d.k] = v.currentTime; const b = $(d.k === 'up' ? '#vt-up' : '#vt-down'); if (b && !REDUCED()) b.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 220 }); vtShow(); };
function vtShow() {
  const r = $('#vt-res'); if (!r) return; const slow = +($('#vt-sp')?.value || 1);
  $('#vt-up').textContent = VT.up != null ? `Takeoff ✓ ${VT.up.toFixed(3)} s` : 'Mark takeoff';
  $('#vt-down').textContent = VT.down != null ? `Landing ✓ ${VT.down.toFixed(3)} s` : 'Mark landing';
  if (VT.up == null || VT.down == null) { r.innerHTML = '<p class="faint small" style="margin:0">Step to the exact frame your toes leave the floor and tap Mark takeoff, then the frame they touch back down and tap Mark landing.</p>'; return; }
  const dt = VT.down - VT.up; if (dt <= 0) { r.innerHTML = '<p class="small" style="margin:0;color:var(--miss)">Landing has to come after takeoff.</p>'; return; }
  const air = dt / slow, h = vtHeight(dt, slow);
  let warn = '';
  if (air > 1.05) warn = `That's ${air.toFixed(2)} s in the air, more than any human jump. ${slow === 1 ? 'This is probably a slo-mo video: change "filmed in" above.' : 'Try a faster slo-mo setting above, or check your marks.'}`;
  else if (air < 0.25) warn = `Only ${air.toFixed(2)} s in the air. ${slow > 1 ? 'If the video plays at normal speed, set "filmed in" to Normal speed.' : 'Check your marks.'}`;
  r.innerHTML = `<div class="stats"><div class="stat"><span class="k">Air time</span><span class="v" style="font-size:24px">${air.toFixed(3)}<span class="unit">s</span></span></div><div class="stat"><span class="k">Vertical</span><span class="v" style="font-size:30px">${trim(h, 1)}<span class="unit">″</span></span></div><div class="stat"><span class="k">In cm</span><span class="v" style="font-size:24px">${trim(h * 2.54, 0)}</span></div></div>
    ${warn ? `<p class="small" style="margin:0;color:#f5c542">${esc(warn)}</p>` : ''}
    <button class="btn block" data-act="vtSave" data-h="${h.toFixed(2)}" ${air > 1.05 || air < 0.18 ? 'disabled' : ''}>Save ${trim(h, 1)}″ to my dunk tracker</button>`;
}
A.vtSave = d => {
  const h = +d.h, prev = Math.max(0, ...Store.list('jumps').map(j => j.vert || 0));
  put('jumps', newId(), { date: todayStr(), rim: null, vert: Math.round(h * 10) / 10, note: 'video test', src: 'video', ts: Date.now() });
  closeSheet(); if (VT.url) { URL.revokeObjectURL(VT.url); VT.url = null; }
  if (prev && h > prev) { toast(`New best vertical: ${trim(h, 1)}″! 🏀`, { pr: true, ms: 3800 }); confetti({ n: 24, emoji: '🏀', power: 13 }); setTimeout(() => confetti({ n: 70 }), 150); }
  else toast(`Vertical saved: ${trim(h, 1)}″`);
};

/* ======================= dunk countdown ======================= */
/* weighted least-squares slope of best-so-far over the last ~4 months, in inches per day */
function trendSlope(pts) {
  if (pts.length < 2) return null; const n = pts.length, mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0, sxx = 0; for (const p of pts) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; } return sxx ? sxy / sxx : null;
}
function dunkCountdownHTML() {
  const goal = S().dunkGoal || 120, reach = S().reach || 0, js = Store.list('jumps').sort((a, b) => a.date.localeCompare(b.date)), since = addDays(todayStr(), -120), day = d => parseDate(d).getTime() / 864e5;
  const rims = js.filter(j => j.rim > 0), best = rims.length ? Math.max(...rims.map(j => j.rim)) : 0, verts = js.filter(j => j.vert > 0), bestV = verts.length ? Math.max(...verts.map(j => j.vert)) : 0;
  const lines = [];
  // touch height from standing reach + best vertical
  if (reach && bestV) { const touch = reach + bestV, need = goal + 6; lines.push(`✋ Standing reach ${ftin(reach)} + best vertical ${trim(bestV, 1)}″ = you touch about <b>${ftin(Math.round(touch))}</b>. Dunking ${ftin(goal)} usually takes about ${ftin(need)} (6″ over the rim)${touch >= need ? ': you have the bounce, now it\'s about the ball. 🔥' : `: <b>${trim(need - touch, 1)}″</b> more vertical.`}`); }
  // pace from dunk tests, else from vertical tests (needs reach)
  const run = (arr, key) => { let m = 0; return arr.filter(j => j.date >= since).map(j => { m = Math.max(m, j[key]); return { x: day(j.date), y: m }; }); };
  let pace = null, kind = '';
  const rp = run(rims, 'rim'); if (rp.length >= 2 && rp[rp.length - 1].x - rp[0].x >= 10) { pace = trendSlope(rp); kind = 'rim'; }
  if ((pace == null || pace <= 0) && reach) { const vp = run(verts, 'vert'); if (vp.length >= 2 && vp[vp.length - 1].x - vp[0].x >= 10) { pace = trendSlope(vp); kind = 'vert'; } }
  const left = kind === 'vert' ? goal + 6 - (reach + bestV) : goal - best;
  if (best >= goal) lines.push(`🎉 You've dunked ${ftin(goal)}! Tap “Dunk setup” to set a higher goal.`);
  else if (pace != null && pace > 0.002 && left > 0) {
    const days = left / pace, weeks = Math.ceil(days / 7), when = new Date(Date.now() + days * 864e5);
    lines.push(`📈 At your recent pace (<b>+${trim(pace * 30.4, 1)}″ a month</b>${kind === 'vert' ? ' of vertical' : ''}), you'd dunk ${ftin(goal)} in about <b>${weeks} ${weeks === 1 ? 'week' : 'weeks'}</b> (around ${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: when.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}).`);
  } else if (pace != null && pace <= 0.002) lines.push(`⏸️ No progress in your recent tests. Plateaus are normal: try a deload week, more sleep, or more explosive work (jump squats, bounds).`);
  else lines.push(`📈 Log a couple of tests at least 10 days apart and you'll get a countdown to ${ftin(goal)}.`);
  return `<div class="dunk-cd">${lines.map(l => `<p>${l}</p>`).join('')}<div class="dunk-btns"><button class="btn ghost sm" data-act="vertTest">🎥 Test vertical</button><button class="btn ghost sm" data-act="setReach">${reach ? '⚙️ Dunk setup' : '📏 Standing reach'}</button></div></div>`;
}
A.setReach = () => {
  const r = S().reach || 0;
  const g = S().dunkGoal || 120;
  openSheet('Dunk setup', `<p class="muted small" style="margin:0">Stand flat-footed next to a wall and reach as high as you can with one hand. That height is your standing reach.</p>
    <div class="field"><span class="lbl">Rim height you're working toward</span><div class="seg">${[[108, '9′'], [114, '9′6″'], [120, '10′']].map(([v, l]) => `<button data-act="pick" data-group="dgoal" data-value="${v}" aria-pressed="${g === v}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lbl">Standing reach</span><div class="fields"><select name="rft" aria-label="Feet">${[6, 7, 8, 9].map(f => `<option value="${f}" ${Math.floor((r || 90) / 12) === f ? 'selected' : ''}>${f} ft</option>`).join('')}</select><input name="rin" inputmode="decimal" value="${r ? plain(r % 12, 1) : ''}" placeholder="inches" aria-label="Inches"></div></div>
    <button class="btn block" data-act="saveReach">Save</button>`);
};
A.saveReach = () => { const v = (+fval('rft')) * 12 + (num(fval('rin')) || 0), g = +picked($('#sheet'), 'dgoal') || S().dunkGoal || 120; if (num(fval('rin')) != null && !(v > 70 && v < 120)) return toast('Check that height.', { bad: true }); saveSettings({ reach: num(fval('rin')) != null ? v : S().reach || 0, dunkGoal: g }); closeSheet(); toast('Saved'); };

/* ======================= strength levels ======================= */
/* 1RM ÷ bodyweight thresholds for Beginner, Novice, Intermediate, Advanced, Elite (common strength-standard tables; approximate). */
const STD = {
  male: { squat: [0.75, 1.25, 1.5, 2.0, 2.5], 'bench press': [0.5, 0.75, 1.0, 1.5, 2.0], deadlift: [1.0, 1.5, 2.0, 2.5, 3.0], 'overhead press': [0.35, 0.55, 0.75, 1.0, 1.25], 'barbell row': [0.5, 0.75, 1.0, 1.25, 1.5], 'front squat': [0.6, 1.0, 1.25, 1.65, 2.0] },
  female: { squat: [0.5, 0.75, 1.0, 1.5, 1.9], 'bench press': [0.25, 0.5, 0.75, 1.0, 1.3], deadlift: [0.5, 1.0, 1.25, 1.75, 2.25], 'overhead press': [0.2, 0.35, 0.5, 0.7, 0.9], 'barbell row': [0.25, 0.4, 0.6, 0.85, 1.1], 'front squat': [0.4, 0.6, 0.85, 1.2, 1.55] },
};
const LVL = ['Just starting', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'], LVL_COL = ['#7d8396', '#8fb3ff', '#58c4dc', '#3ccf82', '#f5c542', '#ff6a8a'];
function strengthLevel(L) {
  const sex = S().bodyModel === 'female' ? 'female' : 'male', th = STD[sex][keyOf(L.name)]; if (!th || !L.e1 || !L.e1Set) return null;
  const bw = setBw(L.e1Set) || latestWeighin()?.weight; if (!bw) return null;
  const ratio = L.e1 / bw; let i = 0; while (i < 5 && ratio >= th[i]) i++;
  const nowBw = latestWeighin()?.weight || bw;
  return { i, name: LVL[i], ratio, th, next: i < 5 ? th[i] : null, nextName: i < 5 ? LVL[i + 1] : null, nextW: i < 5 ? th[i] * nowBw : null, frac: i < 5 ? clamp((ratio - (i ? th[i - 1] : 0)) / (th[i] - (i ? th[i - 1] : 0)), 0, 1) : 1, bw };
}
function strengthCardHTML(L) {
  const s = strengthLevel(L); if (!s) return '';
  return `<section class="card slvl"><div class="card-h"><h2 class="sec-t">Strength level</h2><span class="slvl-tag" style="background:${LVL_COL[s.i]}">${s.name}</span></div>
    <div class="slvl-bar" role="img" aria-label="${esc(s.name)}, ${trim(s.ratio, 2)} times bodyweight">${LVL.slice(1).map((n, k) => `<i class="${k < s.i ? 'on' : ''}" style="--c:${LVL_COL[k + 1]}">${k === s.i - 1 ? '<b></b>' : ''}</i>`).join('')}</div>
    <div class="faint tiny slvl-lbl">${LVL.slice(1).map(n => `<span>${n}</span>`).join('')}</div>
    <p class="small" style="margin:0">Your est. 1RM is <b>${trim(s.ratio, 2)}× bodyweight</b> (${fw(L.e1, 0)} ${U.wu} at ${fw(s.bw, 0)} ${U.wu}).${s.next ? ` <b>${s.nextName}</b> starts at ${s.next}× → about <b>${fw(s.nextW, 0)} ${U.wu}</b> at your current weight.` : ' That\'s elite. 🔥'}</p>
    <p class="faint tiny" style="margin:0">Based on common strength standards for ${S().bodyModel === 'female' ? 'women' : 'men'}. A rough guide, not a verdict.</p></section>`;
}
const levelChip = L => { const s = L && strengthLevel(L); return s ? `<span class="slvl-chip" style="--c:${LVL_COL[s.i]}">${esc(L.name)}: <b>${s.name}</b> · ${trim(s.ratio, 2)}×</span>` : ''; };

/* ======================= barcode scanning ======================= */
const BC = { lib: null, stream: null, raf: 0, busy: false };
function loadZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing); if (BC.lib) return BC.lib;
  return BC.lib = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/zxing.min.js'; s.onload = () => res(window.ZXing); s.onerror = () => { BC.lib = null; rej(new Error('load')); }; document.head.appendChild(s); });
}
function bcReader(Z) {
  const r = new Z.MultiFormatReader(), h = new Map();
  h.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]); h.set(Z.DecodeHintType.TRY_HARDER, true); r.setHints(h); return r;
}
/* decode the centre band of an image/video frame; returns the digits or null */
function bcDecode(Z, reader, src, w, h) {
  const cv = BC.cv || (BC.cv = document.createElement('canvas')), scale = Math.min(1, 1100 / w), cw = Math.round(w * scale), ch = Math.round(h * scale);
  cv.width = cw; cv.height = ch; const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0, cw, ch);
  const bands = [[0.3, 0.4], [0, 1]];
  for (const [y0, hh] of bands) { const y = Math.round(ch * y0), bh = Math.max(1, Math.round(ch * hh)), d = ctx.getImageData(0, y, cw, bh).data, lum = new Uint8ClampedArray(cw * bh);
    for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    try { const res = reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(lum, cw, bh)))); if (res) return res.getText(); } catch (e) { /* not found in this band */ } finally { reader.reset(); } }
  return null;
}
A.barcodeScan = d => {
  if (!inMeal(d)) Sheet.meal = null; Sheet.bcMeal = inMeal(d);
  openSheet('Scan a barcode', `<div class="bc-cam"><video id="bc-v" playsinline muted autoplay></video><div class="bc-frame" aria-hidden="true"><i></i></div><p id="bc-msg" class="bc-msg">Starting camera…</p></div>
    <div class="fields"><button class="btn ghost" data-act="bcPhoto">${ICON.camera} Use a photo instead</button><button class="btn ghost" data-act="bcType">Type the number</button></div>
    <input type="file" id="bc-file" accept="image/*" hidden style="display:none">
    <p class="faint tiny" style="margin:0">Nutrition data comes from Open Food Facts, a free public food database. Always check it against the label.</p>`, { onClose: bcStop });
  $('#bc-file').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) bcFromPhoto(f); });
  bcStart();
};
async function bcStart() {
  const msg = t => { const m = $('#bc-msg'); if (m) m.textContent = t; };
  let Z; try { Z = await loadZXing(); } catch (e) { return msg("Couldn't load the scanner. Check your connection, or type the number."); }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return msg('Live camera isn\'t available here. Use a photo instead.');
  try { BC.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
  catch (e) { return msg('Camera access was blocked. Allow it in Settings → Safari → Camera, or use a photo instead.'); }
  const v = $('#bc-v'); if (!v) return bcStop(); v.srcObject = BC.stream; try { await v.play(); } catch (e) {}
  msg('Line up the barcode inside the box'); const reader = bcReader(Z); let last = 0;
  const tick = now => {
    if (!BC.stream || !v.isConnected) return bcStop();
    if (now - last > 160 && v.videoWidth && !BC.busy) { last = now; const code = bcDecode(Z, reader, v, v.videoWidth, v.videoHeight); if (code) { if (navigator.vibrate) navigator.vibrate(40); return bcFound(code); } }
    BC.raf = requestAnimationFrame(tick);
  };
  BC.raf = requestAnimationFrame(tick);
}
function bcStop() { cancelAnimationFrame(BC.raf); if (BC.stream) { BC.stream.getTracks().forEach(t => t.stop()); BC.stream = null; } }
A.bcPhoto = () => { const f = $('#bc-file'); f.value = ''; f.click(); };
async function bcFromPhoto(file) {
  const m = $('#bc-msg'); if (m) m.textContent = 'Reading the photo…';
  try { const Z = await loadZXing(), url = URL.createObjectURL(file), img = new Image(); img.src = url; await img.decode();
    const code = bcDecode(Z, bcReader(Z), img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url);
    if (code) return bcFound(code); if (m) m.textContent = "Couldn't find a barcode in that photo. Get closer, fill the frame, and keep it sharp.";
  } catch (e) { if (m) m.textContent = "Couldn't read that photo."; }
}
A.bcType = () => {
  bcStop(); sheetTitle('Type the barcode');
  sheetBody(`<div class="field"><label class="lbl" for="bc-n">Barcode number</label><input id="bc-n" inputmode="numeric" placeholder="e.g. 850009015049" autocomplete="off"></div><button class="btn block" data-act="bcLookupTyped">Look it up</button>`);
  setTimeout(() => $('#bc-n')?.focus(), 250);
};
A.bcLookupTyped = () => { const c = String(fval('bc-n') || $('#bc-n')?.value || '').replace(/\D/g, ''); if (c.length < 8) return toast('Barcodes are 8 to 13 digits.', { bad: true }); bcFound(c); };
const normCode = c => { c = String(c).replace(/\D/g, ''); return c.length === 12 ? '0' + c : c; };   // UPC-A ↔ EAN-13
async function bcFound(raw) {
  bcStop(); const code = normCode(raw), saved = myFoods().find(f => f.barcode && normCode(f.barcode) === code);
  if (saved) { closeSheet(); setTimeout(() => A.useMyFood({ id: saved.id, inmeal: Sheet.bcMeal ? '1' : '' }), 280); return; }
  sheetTitle('Looking it up…'); sheetBody(`<div class="bc-wait"><div class="spin" aria-hidden="true"></div><p class="muted">Barcode ${esc(code)}</p></div>`);
  let p = null;
  try { const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity`, { headers: { Accept: 'application/json' } });
    const j = await r.json(); if (j && j.status === 1 && j.product) p = j.product; } catch (e) { p = 'net'; }
  if (p === 'net' || !p) {
    sheetTitle(p === 'net' ? "Couldn't look it up" : 'Not in the database');
    sheetBody(`<p class="muted">${p === 'net' ? 'The food database didn\'t respond. Check your connection and try again.' : `Barcode ${esc(code)} isn't in Open Food Facts yet.`}</p>
      ${CAP.sample ? `<button class="btn block" data-act="foodSnap">${ICON.camera} Snap the label instead</button>` : ''}<button class="btn ${CAP.sample ? 'ghost ' : ''}block" data-act="bcManual" data-code="${code}">Enter it manually</button>`);
    return;
  }
  const food = offToFood(p, code); food.note = `Found: ${food.name}. Check the numbers against the label.`;
  if (Sheet.bcMeal) food.inmeal = 1;
  foodForm(food, null, false, true);
}
A.bcManual = d => foodForm({ name: '', servingSize: 1, servingUnit: 'serving', cal: '', p: '', c: '', f: '', qty: 1, mode: 'servings', src: 'barcode', barcode: d.code });
/* Open Food Facts product → this app's food fields */
function offToFood(p, code) {
  const n = p.nutriments || {}, name = [p.brands ? String(p.brands).split(',')[0].trim() : '', p.product_name_en || p.product_name || 'Scanned food'].filter(Boolean).join(' ').trim();
  const sv = k => n[k + '_serving'], hk = k => n[k + '_100g'];
  const kcal = x => x != null ? +x : null, sq = +p.serving_quantity || null, squ = String(p.serving_quantity_unit || (/ml/i.test(p.serving_size || '') ? 'ml' : 'g')).toLowerCase();
  let servingSize, servingUnit, cal, pr, c, f;
  if (sv('energy-kcal') != null || (sq && hk('energy-kcal') != null)) {
    servingSize = sq || 1; servingUnit = sq ? (squ === 'ml' ? 'ml' : 'g') : 'serving';
    const per = k => sv(k) != null ? +sv(k) : hk(k) != null && sq ? +hk(k) * sq / 100 : null;
    cal = per('energy-kcal') ?? (per('energy') != null ? per('energy') / 4.184 : null); pr = per('proteins'); c = per('carbohydrates'); f = per('fat');
  } else { servingSize = 100; servingUnit = /ml|l\b/i.test(p.quantity || '') ? 'ml' : 'g'; cal = kcal(hk('energy-kcal')) ?? (hk('energy') != null ? hk('energy') / 4.184 : null); pr = hk('proteins'); c = hk('carbohydrates'); f = hk('fat'); }
  // household measure in the serving text, e.g. "2 tbsp (32 g)" or "1 cup (240 ml)"
  let alt = {}; const m = String(p.serving_size || '').toLowerCase().match(/([\d.,/ ]+)\s*(tbsp|tablespoons?|tsp|teaspoons?|cups?|fl\.? ?oz|oz|pieces?|pcs?|bars?|scoops?|slices?|cookies?|crackers?)/);
  if (m) { const amt = parseAmt(m[1]), u = /tbsp|tablesp/.test(m[2]) ? 'tbsp' : /tsp|teasp/.test(m[2]) ? 'tsp' : /cup/.test(m[2]) ? 'cup' : /fl/.test(m[2]) ? 'fl oz' : /^oz/.test(m[2]) ? 'oz' : 'piece'; if (amt > 0 && u !== servingUnit) alt = { altSize: amt, altUnit: u }; }
  const r1 = x => x == null || !isFinite(x) ? '' : Math.round(x * 10) / 10;
  return { name, servingSize, servingUnit, ...alt, cal: x0(r1(cal)), p: r1(pr), c: r1(c), f: r1(f), qty: 1, amount: '', amountUnit: null, mode: servingUnit === 'g' || servingUnit === 'ml' ? 'servings' : 'servings', src: 'barcode', barcode: code };
}
const x0 = v => v === '' ? '' : Math.round(v);

/* ======================= what to eat to hit protein ======================= */
function proteinIdeas() {
  const date = UI.foodDate || todayStr(); if (date !== todayStr()) return [];
  const s = S(), t = foodTotals(date), need = s.proteinTarget - t.p, calLeft = s.calTarget - t.cal; if (need < 12) return [];
  const pool = new Map();
  for (const f of myFoods()) if (f.p > 0) pool.set(keyOf(f.name), { name: f.name, p: +f.p, cal: +f.cal || 0, unit: servingLabel(f), item: () => ({ ...clone(f), id: newId(), myId: f.id, qty: 1, mode: 'servings', amount: '', amountUnit: null, src: 'mine', ts: Date.now() }) });
  for (const it of recentFoods()) { const k = keyOf(it.name); if (!pool.has(k) && it.p > 0) pool.set(k, { name: it.name, p: (+it.p) * (it.qty || 1), cal: (+it.cal || 0) * (it.qty || 1), unit: eatenLabel(it), item: () => ({ ...clone(it), id: newId(), ts: Date.now() }) }); }
  const xs = [...pool.values()].filter(x => x.p / Math.max(30, x.cal) > 0.04).sort((a, b) => b.p / Math.max(30, b.cal) - a.p / Math.max(30, a.cal)).slice(0, 12);
  const combos = [], qs = [1, 2];
  const score = parts => { const p = parts.reduce((a, x) => a + x.f.p * x.q, 0), cal = parts.reduce((a, x) => a + x.f.cal * x.q, 0), cover = Math.min(p, need) / need, over = Math.max(0, cal - Math.max(calLeft, 0) - 80);
    return { p, cal, sc: cover * 100 - over * 0.12 - parts.length * 5 - Math.max(0, p - need - 15) * 0.6 - parts.reduce((a, x) => a + (x.q - 1) * 3, 0) }; };
  for (let i = 0; i < xs.length; i++) for (const qi of qs) {
    combos.push([{ f: xs[i], q: qi }]);
    for (let j = i + 1; j < xs.length; j++) for (const qj of qs) { combos.push([{ f: xs[i], q: qi }, { f: xs[j], q: qj }]);
      for (let k = j + 1; k < Math.min(xs.length, j + 5); k++) combos.push([{ f: xs[i], q: qi }, { f: xs[j], q: qj }, { f: xs[k], q: 1 }]); }
  }
  const ranked = combos.map(parts => ({ parts, ...score(parts) })).filter(c => c.p >= Math.min(need * 0.7, need - 8)).sort((a, b) => b.sc - a.sc), out = [], used = new Set();
  for (const c of ranked) { const key = c.parts.map(x => x.f.name).sort().join('|'); if (used.has(key)) continue; if (out.some(o => o.parts.length === c.parts.length && o.parts.every(x => c.parts.some(y => y.f === x.f)))) continue; used.add(key); out.push(c); if (out.length >= 3) break; }
  return out.map(c => ({ ...c, need, calLeft }));
}
function proteinIdeasHTML() {
  const ideas = proteinIdeas(); if (!ideas.length) return '';
  Sheet.pIdeas = ideas;
  return `<section class="card pideas"><div class="card-h"><h2 class="sec-t">💪 Hit your protein</h2><span class="faint small">${trim(ideas[0].need, 0)} g to go</span></div>
    ${ideas.map((c, i) => `<button class="pidea" data-act="pIdeaAdd" data-i="${i}"><span class="grow">${c.parts.map(x => `<b>${x.q > 1 ? x.q + '× ' : ''}${esc(x.f.name)}</b>`).join(' <span class="faint">+</span> ')}<span class="faint small" style="display:block">${trim(c.p, 0)} g protein · ${trim(c.cal, 0)} kcal${c.calLeft > 0 && c.cal > c.calLeft + 80 ? ` · <span style="color:#f5c542">${trim(c.cal - c.calLeft, 0)} over your calories</span>` : ''}</span></span><span class="pidea-add" aria-hidden="true">${ICON.plus.replace('<svg', '<svg width="18" height="18"')}</span></button>`).join('')}
    <p class="faint tiny" style="margin:0">Built from your saved and recent foods. Tap one to add it all.</p></section>`;
}
A.pIdeaAdd = d => {
  const c = (Sheet.pIdeas || [])[+d.i]; if (!c) return; const date = UI.foodDate || todayStr(), before = foodTotals(date), day = clone(foodDay(date)), added = [];
  for (const x of c.parts) { const it = x.f.item(); it.qty = (it.qty || 1) * x.q; added.push(it.id); day.items = [...(day.items || []), it]; }
  day.date = date; put('food', date, day); feedBuddy(before, foodTotals(date));
  toastUndo(`Added ${c.parts.length === 1 ? c.parts[0].f.name : c.parts.length + ' foods'} (+${trim(c.p, 0)} g protein)`, () => { const dd = clone(foodDay(date)); dd.items = (dd.items || []).filter(x => !added.includes(x.id)); put('food', date, dd); });
};

/* ======================= copy from yesterday ======================= */
A.copyYesterday = () => {
  const date = UI.foodDate || todayStr(), y = addDays(date, -1), items = (foodDay(y).items || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!items.length) return toast(`Nothing logged on ${fmtDay(y)}.`);
  openSheet(`Copy from ${date === todayStr() ? 'yesterday' : fmtDay(y)}`, `<p class="muted small" style="margin:0">Pick what you're eating again.</p>
    <div class="cylist">${items.map(it => `<label class="row"><input type="checkbox" checked value="${it.id}"><span class="grow"><b>${esc(it.name)}</b><span class="faint small" style="display:block">${esc(eatenLabel(it))}${it.ts ? ' · ' + fmtClock(it.ts) : ''}</span></span><span class="rnum"><b>${trim((it.cal || 0) * (it.qty || 1), 0)}</b> <span class="faint small">kcal</span></span></label>`).join('')}</div>
    <button class="btn block" data-act="copyYesterdayGo" data-y="${y}">Add selected</button>`);
};
A.copyYesterdayGo = d => {
  const ids = $$('#sheet .cylist input:checked').map(i => i.value); if (!ids.length) return toast('Pick at least one.', { bad: true });
  const date = UI.foodDate || todayStr(), src = (foodDay(d.y).items || []).filter(x => ids.includes(x.id)), before = foodTotals(date), day = clone(foodDay(date)), now = Date.now(), added = src.map((it, i) => ({ ...clone(it), id: newId(), ts: now + i }));
  day.date = date; day.items = [...(day.items || []), ...added]; put('food', date, day); closeSheet(); feedBuddy(before, foodTotals(date));
  toastUndo(`Added ${added.length} ${added.length === 1 ? 'food' : 'foods'}`, () => { const dd = clone(foodDay(date)); dd.items = (dd.items || []).filter(x => !added.some(a => a.id === x.id)); put('food', date, dd); });
};

/* ======================= Siri weigh-ins ======================= */
/* A Shortcut publishes "w172" to a private ntfy topic; the app picks it up when opened (ntfy keeps messages ~12 h). */
const siriTopic = () => pushTopic() + '-log', SIRI_SEEN = 'onpaper.siriSeen';
const siriURL = () => `https://ntfy.sh/${siriTopic()}/publish?message=w`;
async function siriPoll(manual) {
  if (!S().siriOn && !manual) return;
  let seen = []; try { seen = JSON.parse(localStorage.getItem(SIRI_SEEN) || '[]'); } catch (e) {}
  let txt; try { const r = await fetch(`https://ntfy.sh/${siriTopic()}/json?poll=1&since=24h`, { cache: 'no-store' }); if (!r.ok) throw 0; txt = await r.text(); }
  catch (e) { if (manual) toast("Couldn't reach the shortcut service. Check your connection.", { bad: true }); return; }
  let n = 0, lastW = null;
  for (const line of txt.split('\n')) {
    let m; try { m = JSON.parse(line); } catch (e) { continue; } if (!m || m.event !== 'message' || seen.includes(m.id)) continue; seen.push(m.id);
    const v = num(String(m.message || '').replace(/^[^\d-]*/, '').replace(',', '.')); if (!(v > 0)) continue;
    const lb = U.metric ? v / LB_KG : v; if (lb < 60 || lb > 700) continue;
    const at = new Date((m.time || Date.now() / 1000) * 1000), date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
    if (weighins().some(w => w.date === date && Math.abs(w.weight - lb) < 0.05 && Math.abs((w.ts || 0) - at.getTime()) < 30 * 6e4)) continue;
    put('weighins', newId(), { date, time: `${pad(at.getHours())}:${pad(at.getMinutes())}`, weight: Math.round(lb * 10) / 10, meal: null, bf: null, src: 'siri', ts: at.getTime() }); n++; lastW = lb;
  }
  try { localStorage.setItem(SIRI_SEEN, JSON.stringify(seen.slice(-80))); } catch (e) {}
  if (n) { toast(n === 1 ? `Logged ${fw(lastW)} ${U.wu} from Siri ✓` : `Logged ${n} weigh-ins from Siri ✓`); sparkle(document.querySelector('#toast')); }
  else if (manual) toast('No new weigh-ins from Siri yet.');
}
function siriSettingsHTML() {
  const on = !!S().siriOn;
  return `<div class="field"><span class="lbl">“Hey Siri, log my weight”</span><div class="seg">${chipSeg('siri', [['off', 'Off'], ['on', 'On']], on ? 'on' : 'off')}</div></div>
    <div class="siri-steps" id="siri-steps"${on ? '' : ' hidden'}><p class="small" style="margin:0">Set it up once in the Shortcuts app:</p><ol class="small">
      <li>Open <b>Shortcuts</b>, tap <b>+</b>, and name it <b>Log my weight</b>.</li>
      <li>Add <b>Ask for Input</b>. Set the type to <b>Number</b> and the prompt to “What do you weigh?”</li>
      <li>Add <b>Get Contents of URL</b> and paste this link:<div class="copyrow"><code id="siri-url">${esc(siriURL())}</code><button class="btn sm ghost" data-act="siriCopy">Copy</button></div></li>
      <li>Tap right after the <b>w</b> at the end of the link and insert the <b>Provided Input</b> variable.</li>
      <li>Say <b>“Hey Siri, log my weight”</b> and answer with the number.</li></ol>
      <p class="faint tiny" style="margin:0">Liftprint adds it the next time you open the app, with the time you said it. Open the app within 12 hours. The link is private to you, like your rest alerts.</p>
      <button class="btn ghost sm" data-act="siriCheck">Check for new weigh-ins</button></div>`;
}
A.siriCopy = async () => { try { await navigator.clipboard.writeText(siriURL()); toast('Link copied'); } catch (e) { const r = document.createRange(); r.selectNodeContents($('#siri-url')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Select and copy the link'); } };
A.siriCheck = () => siriPoll(true);
{ const _pick = A.pick; A.pick = (d, el, e) => { const r = _pick(d, el, e); if (d.group === 'siri') { const st = $('#siri-steps'); if (st) st.hidden = d.value !== 'on'; } return r; }; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => siriPoll(false), 600); });
