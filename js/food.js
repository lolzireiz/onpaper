'use strict';
/* Food: daily calories and protein. Claude reads nutrition labels or estimates meals from a photo or description. */

const foodDay = date => Store.docs.food[date] || { date, items: [] };
function foodTotals(date) {
  const t = { cal: 0, p: 0, c: 0, f: 0 };
  for (const it of foodDay(date).items || []) { const q = it.qty || 1; t.cal += (it.cal || 0) * q; t.p += (it.p || 0) * q; t.c += (it.c || 0) * q; t.f += (it.f || 0) * q; }
  return t;
}
function recentFoods() {
  return Store.cached('recentFoods', () => {
    const seen = new Map();
    for (const d of Store.list('food').sort((a, b) => b.date.localeCompare(a.date))) for (const it of (d.items || []).slice().reverse()) { const k = keyOf(it.name); if (k && !seen.has(k)) seen.set(k, it); }
    return [...seen.values()].slice(0, 14);
  });
}
const macroBar = (label, val, target, unit, cls = '') => {
  const pct = target ? clamp(val / target * 100, 0, 100) : 0;
  return `<div class="macro"><div class="t"><span class="muted">${label}</span><span><b>${trim(val, 0)}</b> <span class="faint">/ ${trim(target, 0)} ${unit}</span></span></div><div class="bar ${cls} ${val >= target ? 'over' : ''}" role="progressbar" aria-label="${label}" aria-valuenow="${Math.round(val)}" aria-valuemax="${target}"><i style="width:${pct}%"></i></div></div>`;
};

Views.food = {
  title() { return '<h1>Food</h1>'; },
  render() {
    const date = UI.foodDate || todayStr(), t = foodTotals(date), items = foodDay(date).items || [], s = S();
    const ai = !!CAP.sample, img = ai && CAP.sampleImages;
    let h = `<div class="daynav"><button class="iconbtn" data-act="foodDay" data-d="-1" aria-label="Previous day">${ICON.chevL}</button><b>${date === todayStr() ? 'Today' : fmtDay(date)}</b><button class="iconbtn" data-act="foodDay" data-d="1" aria-label="Next day" ${date >= todayStr() ? 'disabled style="opacity:.3"' : ''}>${ICON.chevR}</button></div>
    <section class="card"><div class="card-h" style="align-items:flex-end"><div class="stat"><span class="k">Calories</span><span class="big">${trim(t.cal, 0)}<span class="unit">of ${trim(s.calTarget, 0)}</span></span></div><div class="stat" style="text-align:right"><span class="k">Protein</span><span class="v">${trim(t.p, 0)}<span class="unit">of ${trim(s.proteinTarget, 0)} g</span></span></div></div>
      ${macroBar('Calories', t.cal, s.calTarget, 'kcal')}${macroBar('Protein', t.p, s.proteinTarget, 'g', 'p')}
      <p class="faint small">${t.cal < s.calTarget ? `${trim(s.calTarget - t.cal, 0)} kcal` : 'Calories done'} and ${t.p < s.proteinTarget ? `${trim(s.proteinTarget - t.p, 0)} g protein to go` : 'protein hit'}. Carbs ${trim(t.c, 0)} g · fat ${trim(t.f, 0)} g.</p></section>
    <div class="btnrow${img ? '' : ''}">${img ? `<button class="btn" data-act="foodSnap">${ICON.camera} Snap a label</button>` : ''}${ai ? `<button class="btn ${img ? 'ghost' : ''}" data-act="foodDescribe">${ICON.spark} Describe it</button>` : ''}<button class="btn ghost" data-act="foodManual" ${ai ? '' : 'style="grid-column:1/-1"'}>${ICON.plus} Enter manually</button></div>
    <button class="btn ghost block" data-act="mealStart" style="margin-top:-4px">🍽 Build a meal</button>
    ${img ? '<p class="faint small" style="margin-top:-6px">Snap a nutrition label for exact numbers, or a photo of your plate for an estimate.</p>' : ''}`;
    const rec = recentFoods();
    if (rec.length) h += `<div class="field"><span class="lbl">Add again</span><div class="chips scroll">${rec.map((it, i) => `<button class="chip" data-act="foodAgain" data-i="${i}">${esc(it.name)} <span class="faint">${trim((it.cal || 0) * (it.qty || 1), 0)}</span></button>`).join('')}</div></div>`;
    h += `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">${date === todayStr() ? "Today's" : 'This day’s'} food</h2>${items.length ? items.slice().reverse().map(it => `<button class="row" data-act="foodEdit" data-id="${it.id}"><div class="grow"><b>${esc(it.name)}</b><div class="faint small">${it.qty && it.qty !== 1 ? `${trim(it.qty, 2)} × ` : ''}${esc(it.serving || '1 serving')}${it.src === 'label' ? ' · from label' : it.src === 'ai' ? ' · estimate' : ''}</div></div><div class="rnum"><b>${trim((it.cal || 0) * (it.qty || 1), 0)}</b> <span class="faint small">kcal</span><div class="faint tiny">${trim((it.p || 0) * (it.qty || 1), 0)} g protein</div></div></button>`).join('') : '<p class="muted small" style="padding:4px 0 16px">Nothing logged yet.</p>'}</section>`;
    if (!ai) h += `<p class="faint small">Want label scanning? <button class="linkbtn" data-act="openSettings">Add your free Gemini key</button> in Settings.</p>`;
    return h;
  },
};
A.foodDay = d => { const cur = UI.foodDate || todayStr(), nx = addDays(cur, +d.d); if (nx > todayStr()) return; UI.foodDate = nx === todayStr() ? null : nx; render(); };
A.foodManual = d => { if (!d || d.inmeal !== '1') Sheet.meal = null; foodFormX(); };
const foodFormX = () => foodForm({ name: '', serving: '', cal: '', p: '', c: '', f: '', qty: 1, src: 'manual' });
A.foodAgain = d => { const it = recentFoods()[+d.i]; if (!it) return; if (Sheet.meal && d.inmeal === '1') { Sheet.meal.parts.push({ ...clone(it), id: newId() }); return drawMeal(); } addFoodItem({ ...clone(it), id: newId(), ts: Date.now() }); toast(`Added ${it.name}`); };
A.foodEdit = d => { Sheet.meal = null; const it = (foodDay(UI.foodDate || todayStr()).items || []).find(x => x.id === d.id); if (it) foodForm(clone(it), null, true); };
function addFoodItem(item) { const date = UI.foodDate || todayStr(), day = clone(foodDay(date)); day.date = date; day.items = [...(day.items || []).filter(x => x.id !== item.id), item]; put('food', date, day); }

function foodForm(it, imgUrl, editing = false) {
  const qtyChips = [0.5, 1, 1.5, 2, 3];
  const html = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}
    ${it.note ? `<p class="tip-line">${esc(it.note)}${it.confidence ? ` <span class="faint">(${esc(it.confidence)} confidence)</span>` : ''}</p>` : ''}
    <div class="field"><label class="lbl" for="fd-n">Food</label><input id="fd-n" name="name" value="${esc(it.name)}" placeholder="e.g. Chicken burrito bowl" autocapitalize="sentences"></div>
    <div class="field"><label class="lbl" for="fd-s">Serving</label><input id="fd-s" name="serving" value="${esc(it.serving || '')}" placeholder="e.g. 1 cup (240 g)"></div>
    <div class="field"><label class="lbl" for="fd-q">How many servings</label><div class="chips">${qtyChips.map(q => `<button class="chip" data-act="foodQty" data-q="${q}" aria-pressed="${+it.qty === q}">${q}</button>`).join('')}</div><input id="fd-q" name="qty" inputmode="decimal" value="${it.qty ?? 1}" aria-label="Servings"></div>
    <div class="fields four"><div class="field"><label class="lbl" for="fd-cal">kcal</label><input id="fd-cal" name="cal" inputmode="decimal" value="${it.cal ?? ''}"></div><div class="field"><label class="lbl" for="fd-p">Protein</label><input id="fd-p" name="p" inputmode="decimal" value="${it.p ?? ''}"></div><div class="field"><label class="lbl" for="fd-c">Carbs</label><input id="fd-c" name="c" inputmode="decimal" value="${it.c ?? ''}"></div><div class="field"><label class="lbl" for="fd-f">Fat</label><input id="fd-f" name="f" inputmode="decimal" value="${it.f ?? ''}"></div></div>
    <p class="faint small">Numbers are per serving. Protein, carbs and fat are in grams.</p>
    <button class="btn block" data-act="foodSave">${Sheet.meal ? 'Add to meal' : editing ? 'Save' : 'Add to ' + (UI.foodDate ? fmtDate(UI.foodDate) : 'today')}</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}
    ${editing ? `<button class="linkbtn danger center" data-act="foodDelete" data-id="${it.id}">Remove</button>` : ''}`;
  Sheet.food = it;
  if ($('#sheet').hidden) openSheet(editing ? 'Edit food' : 'Add food', html); else { sheetTitle(editing ? 'Edit food' : 'Check and add'); sheetBody(html); }
}
A.foodQty = (d, el) => { $$('#sheet [data-act="foodQty"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); $('#fd-q').value = d.q; };
A.foodSave = () => {
  const name = fval('name'); if (!name) return toast('Name the food.', { bad: true });
  const cal = num(fval('cal')); if (cal == null) return toast('Enter the calories.', { bad: true });
  const it = Sheet.food || {};
  if (Sheet.meal) { Sheet.meal.parts.push({ id: newId(), name, serving: fval('serving'), qty: num(fval('qty')) || 1, cal, p: num(fval('p')) || 0, c: num(fval('c')) || 0, f: num(fval('f')) || 0, src: it.src || 'manual' }); return drawMeal(); }
  addFoodItem({ id: it.id || newId(), name, serving: fval('serving'), qty: num(fval('qty')) || 1, cal, p: num(fval('p')) || 0, c: num(fval('c')) || 0, f: num(fval('f')) || 0, src: it.src || 'manual', ts: it.ts || Date.now() });
  closeSheet(); toast(`${name} added`);
};
A.foodDelete = d => { const date = UI.foodDate || todayStr(), day = clone(foodDay(date)); day.items = (day.items || []).filter(x => x.id !== d.id); put('food', date, day); closeSheet(); };

/* ---------- Claude help ---------- */
const FOOD_JSON = `{"name": "short food name", "serving": "serving size as printed or estimated", "cal": 0, "protein": 0, "carbs": 0, "fat": 0, "confidence": "high", "note": ""}`;
const PROMPT_PHOTO = `You are helping someone log food in a calorie and protein tracker. The attached photo is either (a) a Nutrition Facts label or (b) a photo of a meal or food.
If it is a nutrition label: read the values for ONE serving exactly as printed (calories in kcal; protein, total carbohydrate and total fat in grams). Use the product name if it's visible, otherwise a short description. Set "kind" to "label" and "confidence" to "high" unless the label is hard to read.
If it is a photo of food: identify the food and estimate realistic values for the whole portion shown. Set "kind" to "estimate", "serving" to a description of the portion, and "confidence" to high, medium or low.
"note" is one short sentence telling the user anything to double-check (for example "Label is blurry, check the protein" or "Assumed about 6 oz of chicken"), or "".
Reply with only JSON in this shape: {"kind": "label", ${FOOD_JSON.slice(1)}
If the photo shows neither food nor a nutrition label, reply {"kind": "none", "note": "<what you see instead>"}.`;
const promptText = t => `You are helping someone log food in a calorie and protein tracker. Estimate nutrition for: "${t.slice(0, 600)}"
Use typical US portions unless amounts are given. If it's a known restaurant or packaged item, use its published values. If it lists several foods, return their combined total and a short combined name.
"confidence" is high, medium or low. "note" is one short sentence about any assumption the user should check, or "".
Reply with only JSON in this shape: ${FOOD_JSON}`;
function fromAI(out, src) {
  const n = v => { const x = num(v); return x == null ? '' : Math.round(x * 10) / 10; };
  return { name: String(out.name || '').slice(0, 80), serving: String(out.serving || '').slice(0, 80), cal: n(out.cal), p: n(out.protein), c: n(out.carbs), f: n(out.fat), qty: 1, src, note: String(out.note || '').slice(0, 200), confidence: ['high', 'medium', 'low'].includes(out.confidence) ? out.confidence : '' };
}
function aiErrorText(e) {
  switch (e?.code) {
    case 'cancelled': return null;
    case 'no_key': return 'Add your Gemini key in Settings to scan labels.';
    case 'bad_key': return 'Gemini rejected your API key. Check it in Settings.';
    case 'bad_model': return "That Gemini model name wasn't found. Reset it in Settings.";
    case 'offline': return "Couldn't reach Gemini. Check your signal and try again.";
    case 'not_granted': case 'sampling_disabled': case 'not_declared': case 'capability_disabled': case 'capability_removed':
      CAP.sample = null; scheduleRender(); return "Claude isn't allowed in this app right now, so enter the numbers yourself.";
    case 'images_unavailable': CAP.sampleImages = false; scheduleRender(); return "Photos can't be sent from here. Describe the food instead.";
    case 'rate_limited': return "Gemini's free limit is used up for now. Wait a minute, or enter it manually.";
    case 'image_rejected': return "That photo couldn't be read. Try a clearer, closer shot of the label.";
    case 'refused': return "Gemini couldn't help with that one. Enter it manually.";
    case 'invalid_json': case 'empty_completion': return "Couldn't pull numbers out of that. Try again or enter it manually.";
    case 'session_expired': return 'Sign in to Claude again, then retry.';
    default: return 'Something went wrong. Try again in a moment.';
  }
}
function aiWorking(title, imgUrl, label) {
  const ctl = new AbortController(); Sheet.ai = ctl;
  const body = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}<p class="thinking" id="ai-st">${label}</p><button class="btn ghost block" data-act="aiStop">Stop</button>`;
  if (Sheet.meal && !$('#sheet').hidden) { sheetTitle(title); sheetBody(body); Sheet.onClose = () => ctl.abort(); } else openSheet(title, body, { onClose: () => ctl.abort() });
  return ctl;
}
A.aiStop = () => { Sheet.ai?.abort(); if (Sheet.meal) drawMeal(); else closeSheet(); };
function aiFailed(e, imgUrl) {
  const msg = aiErrorText(e); if (msg == null) return;
  sheetBody(`${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}<p class="tip-line">${esc(msg)}</p><button class="btn block" data-act="foodManual" data-inmeal="${Sheet.meal ? 1 : 0}">Enter manually</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}`);
}
A.foodSnap = d => { if (!d || d.inmeal !== '1') Sheet.meal = null; const i = $('#file-food'); i.value = ''; i.click(); };
async function onFoodPhoto(file) {
  if (!file || !CAP.sample) return;
  const blob = await toJpeg(file, 1600, 0.88), url = URL.createObjectURL(blob);
  const ctl = aiWorking('Reading your photo', url, 'Reading the label…');
  try {
    const out = await CAP.sample.json(PROMPT_PHOTO, { images: [blob], signal: ctl.signal });
    if (ctl.signal.aborted) return;
    if (!out || out.kind === 'none') return sheetBody(`<img class="prev-img" src="${url}" alt="Your photo"><p class="tip-line">${esc(out?.note || "That doesn't look like food or a nutrition label.")}</p><button class="btn block" data-act="foodSnap" data-inmeal="${Sheet.meal ? 1 : 0}">Try another photo</button><button class="btn ghost block" data-act="foodManual" data-inmeal="${Sheet.meal ? 1 : 0}">Enter manually</button>`);
    foodForm(fromAI(out, out.kind === 'label' ? 'label' : 'ai'), url);
  } catch (e) { aiFailed(e, url); }
}
A.foodDescribe = d => {
  if (!d || d.inmeal !== '1') Sheet.meal = null;
  (Sheet.meal ? (t, b) => { sheetTitle(t); sheetBody(b); } : openSheet)('Describe what you ate', `<div class="field"><label class="lbl" for="fd-txt">What and how much</label><textarea id="fd-txt" name="txt" placeholder="e.g. Chipotle bowl with double chicken, white rice, black beans, cheese and mild salsa"></textarea></div><button class="btn block" data-act="foodEstimate">${ICON.spark} Estimate</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}<p class="faint small">Gemini estimates from typical portions and published nutrition info. Check the numbers before adding.</p>`, { onMount(L) { setTimeout(() => $('#fd-txt', L)?.focus(), 280); } });
};
A.foodEstimate = async () => {
  const txt = fval('txt'); if (!txt) return toast('Describe the food first.', { bad: true });
  const ctl = new AbortController(); Sheet.ai = ctl; Sheet.onClose = () => ctl.abort();
  sheetBody(`<p class="muted">“${esc(txt)}”</p><p class="thinking">Estimating…</p><button class="btn ghost block" data-act="aiStop">Stop</button>`);
  try {
    const out = await CAP.sample.json(promptText(txt), { signal: ctl.signal });
    if (ctl.signal.aborted) return;
    foodForm(fromAI(out || {}, 'ai'));
  } catch (e) { aiFailed(e); }
};

/* ---------- build a meal: several items logged as one ---------- */
A.mealStart = () => { Sheet.meal = { name: '', parts: [] }; openSheet('Build a meal', '', { onClose: () => { Sheet.meal = null; } }); drawMeal(); };
A.mealBack = () => drawMeal();
function keepMealName() { const n = $('#ml-n'); if (n && Sheet.meal) Sheet.meal.name = n.value.trim(); }
function drawMeal() {
  const m = Sheet.meal; if (!m) return; sheetTitle('Build a meal');
  const t = m.parts.reduce((a, it) => { const q = it.qty || 1; a.cal += (it.cal || 0) * q; a.p += (it.p || 0) * q; a.c += (it.c || 0) * q; a.f += (it.f || 0) * q; return a; }, { cal: 0, p: 0, c: 0, f: 0 });
  const ai = !!CAP.sample, img = ai && CAP.sampleImages, rec = recentFoods();
  sheetBody(`<div class="field"><label class="lbl" for="ml-n">Meal name</label><input id="ml-n" name="mealname" value="${esc(m.name)}" placeholder="e.g. Post-workout dinner" autocapitalize="sentences"></div>
    <div class="card" style="background:var(--s2);padding:12px"><div class="stats"><div class="stat"><span class="k">Calories</span><span class="v">${trim(t.cal, 0)}</span></div><div class="stat"><span class="k">Protein</span><span class="v">${trim(t.p, 0)}<span class="unit">g</span></span></div><div class="stat"><span class="k">Items</span><span class="v">${m.parts.length}</span></div></div></div>
    ${m.parts.length ? `<div>${m.parts.map((it, i) => `<div class="row"><div class="grow"><b>${esc(it.name)}</b><div class="faint small">${it.qty && it.qty !== 1 ? trim(it.qty, 2) + ' × ' : ''}${esc(it.serving || '1 serving')} · ${trim((it.cal || 0) * (it.qty || 1), 0)} kcal · ${trim((it.p || 0) * (it.qty || 1), 0)} g protein</div></div><button class="iconbtn sm" data-act="mealDel" data-i="${i}" aria-label="Remove ${esc(it.name)}">${ICON.x}</button></div>`).join('')}</div>` : '<p class="muted small">Add each part of the meal: snap its label, describe it, or type it in.</p>'}
    <div class="btnrow">${img ? `<button class="btn ghost" data-act="mealAdd" data-how="snap">${ICON.camera} Snap label</button>` : ''}${ai ? `<button class="btn ghost" data-act="mealAdd" data-how="describe">${ICON.spark} Describe</button>` : ''}<button class="btn ghost" data-act="mealAdd" data-how="manual" ${img ? '' : 'style="grid-column:1/-1"'}>${ICON.plus} Type it in</button></div>
    ${rec.length ? `<div class="field"><span class="lbl">Add something you've had before</span><div class="chips scroll">${rec.map((it, i) => `<button class="chip" data-act="foodAgain" data-inmeal="1" data-i="${i}">${esc(it.name)}</button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="mealSave" ${m.parts.length ? '' : 'disabled'}>Log meal${m.parts.length ? ` · ${trim(t.cal, 0)} kcal` : ''}</button>`);
}
A.mealAdd = d => { keepMealName(); if (d.how === 'snap') A.foodSnap({ inmeal: '1' }); else if (d.how === 'describe') A.foodDescribe({ inmeal: '1' }); else A.foodManual({ inmeal: '1' }); };
A.mealDel = d => { keepMealName(); Sheet.meal.parts.splice(+d.i, 1); drawMeal(); };
A.mealSave = () => {
  keepMealName(); const m = Sheet.meal; if (!m || !m.parts.length) return;
  const sum = k => Math.round(m.parts.reduce((a, it) => a + (it[k] || 0) * (it.qty || 1), 0) * 10) / 10;
  const name = m.name || (m.parts.length === 1 ? m.parts[0].name : 'Meal');
  addFoodItem({ id: newId(), name, serving: m.parts.map(p => p.name).join(' + ').slice(0, 120), qty: 1, cal: sum('cal'), p: sum('p'), c: sum('c'), f: sum('f'), src: 'meal', parts: m.parts, ts: Date.now() });
  Sheet.meal = null; closeSheet(); toast(`${name} logged`);
};
