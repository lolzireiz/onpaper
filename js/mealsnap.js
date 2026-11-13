'use strict';
/* Snap your meal: photo + optional note → the AI splits the plate into foods with portion estimates, using the note
   as ground truth (amounts, brands, oil, sauces, how much you ate). You adjust portions, ask it to fix things, then
   log it as one meal or as separate items. */

const MS_CHIPS = ['Ate all of it', 'Ate about half', 'Restaurant portion', 'Cooked in oil or butter', 'Sauce or dressing on it', 'Big dinner plate'];
const msPrompt = (desc, prev, fix) => `You are a nutrition assistant helping someone log a meal in a calorie and protein tracker. Look carefully at the attached photo of their food${desc ? ' and read their note' : ''}.
${desc ? `Their note (treat it as true; it overrides what the photo suggests): "${desc.slice(0, 600)}"` : 'They added no note, so rely on the photo.'}
Split the meal into each separate food or drink and estimate how much of each there is:
- Judge portion sizes from visual cues: the plate or bowl (a dinner plate is usually 10–11 in / 26–28 cm across), utensils, hands, cups, packaging, and how thick or piled-up the food is.
- Use the note for amounts, brands, restaurants, cooking method and anything you can't see (oil or butter used, sauces, dressings, cheese, what's underneath, sugar in a drink). If the note gives an amount, use it exactly.
- If the note says how much they ate (e.g. "ate half"), put that fraction in "ate" (0.25–1); otherwise 1. Item amounts are always for the whole portion in the photo; the app applies "ate".
- Count cooking fats, dressings and sauces and don't lowball them. Use cooked weights for cooked food.
- Use standard nutrition values, or published values for known restaurant or packaged items.
For each item give "name", "portion" (a household measure plus grams, e.g. "1 cup (160 g)"), "grams" (number, or null for drinks or when grams make no sense), "cal" (kcal), "protein", "carbs" and "fat" (grams) for that portion, and "from" ("note" if the amount came from their note, otherwise "photo").
${prev ? `Your previous estimate was: ${JSON.stringify(prev).slice(0, 2500)}
Where an item has "times", they already adjusted it to that many of its listed portion: bake that into the new portion and its calories and macros. "ate" is how much of the meal they ate.
They corrected it: "${(fix || '').slice(0, 400)}". Apply the correction and keep everything else unless the correction changes it.
` : ''}Reply with only JSON in this shape:
{"kind": "meal", "name": "short meal name", "items": [{"name": "", "portion": "", "grams": 0, "cal": 0, "protein": 0, "carbs": 0, "fat": 0, "from": "photo"}], "ate": 1, "confidence": "high", "note": "one short sentence on the biggest assumption to double-check"}
If the photo is a Nutrition Facts label rather than a meal, reply {"kind": "label"}. If there is no food or drink in the photo, reply {"kind": "none", "note": "<what you see instead>"}.`;

/* step 1: pick or take a photo */
A.mealSnap = () => {
  if (!CAP.sample) return openSheet('Snap your meal', `<p class="muted">Meal photos use the free AI helper. Add your key in Settings once and you're set.</p><button class="btn block" data-act="openSettings">Open Settings</button>`);
  Sheet.meal = null; const i = $('#file-meal'); i.value = ''; i.click();
};
document.addEventListener('change', e => { if (e.target && e.target.id === 'file-meal') { const f = e.target.files && e.target.files[0]; if (f) msPhoto(f); } });

/* step 2: the photo, plus a note for the details the camera can't see */
async function msPhoto(file) {
  const blob = await toJpeg(file, 1280, 0.82), url = URL.createObjectURL(blob);
  Sheet.ms = { blob, url, desc: '', out: null, items: [], ate: 1, name: '', fix: '' };
  const draw = () => {
    const M = Sheet.ms;
    sheetBody(`<img class="prev-img ms-img" src="${M.url}" alt="Your meal photo">
      <div class="field"><label class="lbl" for="ms-d">Add details <span class="faint">(optional, makes it more accurate)</span></label>
      <textarea id="ms-d" rows="3" placeholder="e.g. about 8 oz chicken, 1 cup rice, cooked in a tablespoon of olive oil. Ate about half.">${esc(M.desc)}</textarea></div>
      <div class="chips ms-chips">${MS_CHIPS.map(c => `<button class="chip" data-act="msChip" data-t="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <p class="faint tiny" style="margin:8px 0 12px">Amounts, brands, the restaurant, oil, sauces, or how much you ate all help. Anything you write counts as fact.</p>
      <button class="btn block" data-act="msGo">${ICON.spark} Estimate my meal</button>
      <button class="btn ghost block" style="margin-top:8px" data-act="mealSnap">Use a different photo</button>`);
    const t = $('#ms-d'); t.addEventListener('input', () => { M.desc = t.value; });
  };
  Sheet.msDraw = draw;
  $('#sheet').hidden ? openSheet('Snap your meal', '', { onClose: () => Sheet.ai?.abort() }) : sheetTitle('Snap your meal');
  draw();
}
A.msChip = d => { const M = Sheet.ms; if (!M) return; const t = $('#ms-d'); M.desc = (t ? t.value : M.desc).trim(); if (!M.desc.toLowerCase().includes(d.t.toLowerCase())) M.desc = (M.desc ? M.desc.replace(/[.\s]*$/, '. ') : '') + d.t + '.'; Sheet.msDraw(); const n = $('#ms-d'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };

/* step 3: ask the AI */
A.msGo = () => { const t = $('#ms-d'); if (t) Sheet.ms.desc = t.value.trim(); msRun(); };
A.msFix = () => { const t = $('#ms-fix'); const fix = (t ? t.value : '').trim(); if (!fix) return toast('Say what to change first', { bad: true }); Sheet.ms.fix = fix; msRun(true); };
async function msRun(refine) {
  const M = Sheet.ms; if (!M || !CAP.sample) return;
  const prev = refine && M.out ? { name: M.name, ate: M.ate, items: M.items.map(i => ({ name: i.name, portion: i.portion, grams: i.grams, cal: i.cal, protein: i.p, carbs: i.c, fat: i.f, ...(i.mult !== 1 ? { times: i.mult } : {}) })) } : null;
  const ctl = aiWorking(refine ? 'Updating your estimate' : 'Estimating your meal', M.url, refine ? 'Applying your fix…' : 'Looking at your plate…');
  try {
    const out = await CAP.sample.json(msPrompt(M.desc, prev, M.fix), { images: [M.blob], signal: ctl.signal, onStatus: t => { Sheet.aiLabel = t; } });
    clearInterval(Sheet.aiTick); if (ctl.signal.aborted) return;
    if (out && out.kind === 'label') { toast('That looks like a nutrition label, so reading it as one'); return onFoodPhoto(M.blob); }
    if (!out || out.kind === 'none' || !Array.isArray(out.items) || !out.items.length) return sheetBody(`<img class="prev-img ms-img" src="${M.url}" alt="Your meal photo"><p class="tip-line">${esc(out?.note || "Couldn't find food in that photo.")}</p><button class="btn block" data-act="mealSnap">Try another photo</button><button class="btn ghost block" style="margin-top:8px" data-act="msBack">Edit details</button>`);
    const n = v => { const x = num(v); return x == null || x < 0 ? 0 : Math.round(x * 10) / 10; };
    /* a fix keeps the meal name and the 'how much you ate' you picked */
    M.out = out; M.name = refine && M.name ? M.name : String(out.name || 'Meal').slice(0, 60); if (!(refine && M.ateSet)) M.ate = Math.min(1, Math.max(0.25, num(out.ate) || 1)); M.conf = out.confidence; M.note = String(out.note || '').slice(0, 200);
    M.items = out.items.slice(0, 15).map(i => ({ id: newId(), name: String(i.name || 'Food').slice(0, 60), portion: String(i.portion || '').slice(0, 60), grams: num(i.grams) || null, cal: n(i.cal), p: n(i.protein), c: n(i.carbs), f: n(i.fat), from: i.from === 'note' ? 'note' : 'photo', mult: 1 }));
    M.fix = ''; msReview();
  } catch (e) {
    clearInterval(Sheet.aiTick); const msg = aiErrorText(e); if (msg == null) return;
    sheetBody(`<img class="prev-img ms-img" src="${M.url}" alt="Your meal photo"><p class="tip-line">${esc(msg.replace('to scan labels', 'to estimate meals'))}</p><button class="btn block" data-act="msRetry">Try again</button><button class="btn ghost block" style="margin-top:8px" data-act="msBack">Edit details</button>`);
  }
}
A.msRetry = () => msRun(!!(Sheet.ms && Sheet.ms.out && Sheet.ms.fix));
A.msBack = () => { sheetTitle('Snap your meal'); Sheet.msDraw && Sheet.msDraw(); };

/* step 4: review — tweak portions, say what to fix, log */
const MS_ATE = [[1, 'All'], [0.75, '¾'], [0.5, '½'], [0.25, '¼']];
const msTot = M => M.items.reduce((a, i) => { const q = i.mult * M.ate; a.cal += i.cal * q; a.p += i.p * q; a.c += i.c * q; a.f += i.f * q; return a; }, { cal: 0, p: 0, c: 0, f: 0 });
function msReview() {
  const M = Sheet.ms, t = msTot(M); sheetTitle('Your meal');
  const conf = { high: ['Confident', 'ok'], medium: ['Rough estimate', 'mid'], low: ['Best guess', 'low'] }[M.conf] || ['Estimate', 'mid'];
  sheetBody(`<div class="ms-head"><img class="ms-thumb" src="${M.url}" alt=""><div class="grow"><input id="ms-n" class="ms-name" value="${esc(M.name)}" aria-label="Meal name"><span class="ms-conf ${conf[1]}">${conf[0]}</span></div></div>
    <div class="ms-tot"><div><b>${fmtN(t.cal)}</b><span>kcal</span></div><div><b>${trim(t.p, 0)}<small>g</small></b><span>protein</span></div><div><b>${trim(t.c, 0)}<small>g</small></b><span>carbs</span></div><div><b>${trim(t.f, 0)}<small>g</small></b><span>fat</span></div></div>
    <div class="field"><span class="lbl">How much did you eat?</span><div class="seg">${MS_ATE.map(([v, l]) => `<button data-act="msAte" data-v="${v}" aria-pressed="${Math.abs(M.ate - v) < 0.01}">${l}</button>`).join('')}</div></div>
    <div class="ms-items">${M.items.map((i, k) => { const q = i.mult * M.ate; return `<div class="ms-it"><div class="grow"><b>${esc(i.name)}</b><div class="faint small">${esc(i.portion || 'portion')}${i.mult !== 1 ? ` <span class="ms-x">× ${fracTxt(i.mult)}</span>` : ''}${i.from === 'note' ? ' <span class="ms-src">from your note</span>' : ''}</div><div class="small"><b>${fmtN(i.cal * q)}</b> kcal · ${trim(i.p * q, 0)} g protein</div></div>
      <div class="ms-step"><button class="iconbtn sm" data-act="msMult" data-k="${k}" data-d="-1" aria-label="Less ${esc(i.name)}">−</button><button class="iconbtn sm" data-act="msMult" data-k="${k}" data-d="1" aria-label="More ${esc(i.name)}">+</button><button class="iconbtn sm" data-act="msDel" data-k="${k}" aria-label="Remove ${esc(i.name)}">${ICON.x}</button></div></div>`; }).join('')}</div>
    ${M.note ? `<p class="faint small ms-note">💡 ${esc(M.note)}</p>` : ''}
    <div class="field ms-fixf"><label class="lbl" for="ms-fix">Not quite right? Tell it what to fix</label><div class="ms-fixrow"><input id="ms-fix" placeholder="e.g. the rice was 2 cups, no cheese" value="${esc(M.fix)}" enterkeyhint="send"><button class="btn sm" data-act="msFix">Fix</button></div></div>
    <button class="btn block" data-act="msLog" ${M.items.length ? '' : 'disabled'}>Log meal · ${fmtN(t.cal)} kcal</button>
    ${M.items.length > 1 ? '<button class="btn ghost block" style="margin-top:8px" data-act="msLogSep">Log as separate items</button>' : ''}
    <p class="faint tiny center" style="margin:10px 0 0">Photo estimates can be off by 20% or more. Weighing or adding details makes them closer.</p>`);
  const n = $('#ms-n'); n.addEventListener('input', () => { M.name = n.value; });
  const f = $('#ms-fix'); f.addEventListener('input', () => { M.fix = f.value; }); f.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); A.msFix(); } });
}
const MS_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
A.msMult = d => { const it = Sheet.ms.items[+d.k]; if (!it) return; const i = MS_STEPS.findIndex(x => x >= it.mult - 0.001); it.mult = MS_STEPS[Math.max(0, Math.min(MS_STEPS.length - 1, (i < 0 ? 3 : i) + +d.d))]; msReview(); };
A.msDel = d => { Sheet.ms.items.splice(+d.k, 1); msReview(); };
A.msAte = d => { Sheet.ms.ate = +d.v; Sheet.ms.ateSet = true; msReview(); };
function msParts() {
  const M = Sheet.ms;
  return M.items.map(i => ({ id: newId(), name: i.name, serving: i.portion || '1 portion', servingSize: 1, servingUnit: 'serving', qty: Math.round(i.mult * M.ate * 100) / 100, mode: 'servings', cal: i.cal, p: i.p, c: i.c, f: i.f, src: 'ai', ts: Date.now() }));
}
A.msLog = () => {
  const M = Sheet.ms, parts = msParts(); if (!parts.length) return;
  const name = (M.name || '').trim() || (parts.length === 1 ? parts[0].name : 'Meal'), t = msTot(M);
  if (parts.length === 1) addFoodItem({ ...parts[0], name });
  else addFoodItem({ id: newId(), name, serving: parts.map(p => p.name).join(' + ').slice(0, 120), servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: Math.round(t.cal), p: Math.round(t.p * 10) / 10, c: Math.round(t.c * 10) / 10, f: Math.round(t.f * 10) / 10, src: 'meal', est: 'photo', parts, ts: Date.now() });
  Sheet.ms = null; closeSheet(); toast(`📸 ${name} logged · ${fmtN(t.cal)} kcal`);
};
A.msLogSep = () => {
  const M = Sheet.ms, parts = msParts(), t = msTot(M); if (!parts.length) return;
  const date = UI.foodDate || todayStr(), before = foodTotals(date), day = clone(foodDay(date)); day.date = date;
  day.items = [...(day.items || []), ...parts.map((p, i) => ({ ...p, ts: Date.now() + i }))]; put('food', date, day); feedBuddy(before, foodTotals(date)); if (typeof sfx === 'function') sfx('pop');
  Sheet.ms = null; closeSheet(); toast(`📸 ${parts.length} items logged · ${fmtN(t.cal)} kcal`);
};
PAGES.push(['📸', 'Snap your meal', 'photo meal picture camera ai estimate portion snap food', () => A.mealSnap()]);
