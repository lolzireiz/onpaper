'use strict';
/* Food: calories + protein. Real serving sizes (eat 37 g of a 13 g serving), My Foods, meals, label scanning. */

const UNITS = ['g', 'oz', 'lb', 'ml', 'tsp', 'tbsp', 'cup', 'fl oz', 'piece', 'serving'];
/* kitchen conversions: weight in grams, volume in ml (US cup / tbsp / tsp) */
const U_WT = { g: 1, oz: 28.3495, lb: 453.592 }, U_VOL = { ml: 1, tsp: 4.92892, tbsp: 14.7868, 'fl oz': 29.5735, cup: 236.588 };
const unitFam = u => U_WT[u] ? U_WT : U_VOL[u] ? U_VOL : null;
const FRACS = [['¼', 0.25], ['⅓', 1 / 3], ['½', 0.5], ['⅔', 2 / 3], ['¾', 0.75]];
/* "1/4", "1 1/2", "1½", "0.75", "2,5" → number */
function parseAmt(v) {
  let t = String(v == null ? '' : v).trim(); if (!t) return null;
  for (const [ch, x] of [...FRACS, ['⅛', 0.125], ['⅜', 0.375], ['⅝', 0.625], ['⅞', 0.875]]) t = t.replace(ch, ' ' + x + ' ');
  t = t.replace(',', '.').replace(/\s+/g, ' ').trim();
  let m = t.match(/^(\d+)\s*\/\s*(\d+)$/); if (m) return +m[2] ? +m[1] / +m[2] : null;
  m = t.match(/^(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)$/); if (m) return +m[3] ? +m[1] + +m[2] / +m[3] : null;
  m = t.match(/^(\d+(?:\.\d+)?)\s+(0?\.\d+)$/); if (m) return +m[1] + +m[2];
  const n = parseFloat(t); return Number.isFinite(n) ? n : null;
}
/* 0.25 → "¼", 1.5 → "1½", 37 → "37" */
function fracTxt(n) { if (n == null || !Number.isFinite(+n)) return ''; n = +n; const w = Math.floor(n + 1e-6), r = n - w, f = FRACS.find(x => Math.abs(x[1] - r) < 0.012); return f ? `${w || ''}${f[0]}` : trim(n, 2); }
/* units you can eat this food in: the label's unit family, plus the "also equals" one */
function eatUnits(su, altSize, altUnit) {
  const out = []; const add = u => { const f = unitFam(u); if (f) Object.keys(f).forEach(k => out.includes(k) || out.push(k)); else if (u === 'piece' && !out.includes('piece')) out.push('piece'); };
  add(su); if (altSize > 0) add(altUnit);
  return out;
}
/* servings in `amount unit` of a food whose label serving is ss su (and optionally also altSize altUnit) */
function servingsIn(amount, unit, ss, su, altSize, altUnit) {
  if (amount == null) return null;
  const f = unitFam(unit);
  if (ss > 0 && unit === su) return amount / ss;
  if (f && ss > 0 && f[su]) return amount * f[unit] / (ss * f[su]);
  if (altSize > 0 && unit === altUnit) return amount / altSize;
  if (f && altSize > 0 && f[altUnit]) return amount * f[unit] / (altSize * f[altUnit]);
  return null;
}
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
const myFoods = () => Store.list('myfoods').sort((a, b) => (b.lastUsed || b.ts || 0) - (a.lastUsed || a.ts || 0));
const servingLabel = it => it.serving || (it.servingSize ? `${fracTxt(it.servingSize)} ${it.servingUnit || 'g'}` : '1 serving');
const eatenLabel = it => it.mode === 'amount' && it.amount ? `${fracTxt(it.amount)} ${it.amountUnit || it.servingUnit} · ${trim(it.qty, 2)} servings` : `${fracTxt(it.qty || 1)} × ${servingLabel(it)}`;
const macroBar = (label, val, target, unit, cls = '') => {
  const pct = target ? clamp(val / target * 100, 0, 100) : 0;
  return `<div class="macro"><div class="t"><span class="muted">${label}</span><span><b>${trim(val, 0)}</b> <span class="faint">/ ${trim(target, 0)} ${unit}</span></span></div><div class="bar ${cls} ${val >= target ? 'over' : ''}" role="progressbar" aria-label="${label}" aria-valuenow="${Math.round(val)}" aria-valuemax="${target}"><i style="width:${pct}%"></i></div></div>`;
};

Views.food = {
  title() { return '<h1>Food</h1>'; },
  render() {
    const date = UI.foodDate || todayStr(), t = foodTotals(date), items = foodDay(date).items || [], s = S();
    const ai = !!CAP.sample, mf = myFoods();
    let h = buddyCardHTML() + `<div class="daynav"><button class="iconbtn" data-act="foodDay" data-d="-1" aria-label="Previous day">${ICON.chevL}</button><b>${date === todayStr() ? 'Today' : fmtDay(date)}</b><button class="iconbtn" data-act="foodDay" data-d="1" aria-label="Next day" ${date >= todayStr() ? 'disabled style="opacity:.3"' : ''}>${ICON.chevR}</button></div>
    ${foodSummaryHTML(t, s)}
    ${proteinIdeasHTML()}
    <div class="btnrow"><button class="btn${ai ? ' ghost' : ''}" data-act="barcodeScan"><span aria-hidden="true">▥</span> Scan barcode</button>${ai ? `<button class="btn" data-act="foodSnap">${ICON.camera} Snap a label</button><button class="btn ghost" data-act="foodDescribe">${ICON.spark} Describe it</button>` : ''}<button class="btn ghost" data-act="foodManual">${ICON.plus} Enter manually</button><button class="btn ghost" data-act="mealStart">🍽 Build a meal</button>${(foodDay(addDays(date, -1)).items || []).length ? `<button class="btn ghost" data-act="copyYesterday">↺ Copy ${date === todayStr() ? "yesterday" : "day before"}</button>` : ''}</div>`;
    if (mf.length) h += `<div class="field"><div class="card-h"><span class="lbl">My foods</span><button class="linkbtn" style="font-size:13px;padding:0" data-act="manageMyFoods">Manage</button></div><div class="chips scroll">${mf.map(f => `<button class="chip" data-act="useMyFood" data-id="${f.id}">${esc(f.name)} <span class="faint">${esc(servingLabel(f))}</span></button>`).join('')}</div></div>`;
    const rec = recentFoods();
    if (rec.length) h += `<div class="field"><span class="lbl">Add again (same amount as last time)</span><div class="chips scroll">${rec.map((it, i) => `<button class="chip" data-act="foodAgain" data-i="${i}">${esc(it.name)} <span class="faint">${trim((it.cal || 0) * (it.qty || 1), 0)}</span></button>`).join('')}</div></div>`;
    h += `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">${date === todayStr() ? "Today's" : 'This day’s'} food</h2>${items.length ? items.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).map(it => `<button class="row" data-act="foodEdit" data-id="${it.id}"><div class="grow"><b>${esc(it.name)}</b><div class="faint small">${esc(eatenLabel(it))}${it.ts ? ' · ' + fmtClock(it.ts) : ''}${it.src === 'label' ? ' · label' : it.src === 'ai' ? ' · estimate' : it.src === 'meal' ? ' · meal' : ''}</div></div><div class="rnum"><b>${trim((it.cal || 0) * (it.qty || 1), 0)}</b> <span class="faint small">kcal</span><div class="faint tiny">${trim((it.p || 0) * (it.qty || 1), 0)} g protein</div></div></button>`).join('') : '<p class="muted small" style="padding:4px 0 16px">Nothing logged yet.</p>'}</section>`;
    if (!ai) h += `<p class="faint small">Want label scanning? <button class="linkbtn" data-act="openSettings">Add your free AI key</button> in Settings.</p>`;
    return h;
  },
};
A.foodDay = d => { const cur = UI.foodDate || todayStr(), nx = addDays(cur, +d.d); if (nx > todayStr()) return; UI.foodDate = nx === todayStr() ? null : nx; render(); };
const inMeal = d => d && d.inmeal === '1';
A.foodManual = d => { if (!inMeal(d)) Sheet.meal = null; foodForm({ name: '', servingSize: 1, servingUnit: 'serving', cal: '', p: '', c: '', f: '', qty: 1, mode: 'servings', src: 'manual' }); };
A.foodAgain = d => { const it = recentFoods()[+d.i]; if (!it) return; if (Sheet.meal && inMeal(d)) { Sheet.meal.parts.push({ ...clone(it), id: newId() }); return drawMeal(); } addFoodItem({ ...clone(it), id: newId(), ts: Date.now() }); toast(`Added ${it.name}`); };
A.useMyFood = d => { const f = Store.docs.myfoods[d.id]; if (!f) return; if (!inMeal(d)) Sheet.meal = null; foodForm({ ...clone(f), id: undefined, myId: d.id, qty: 1, amount: '', amountUnit: null, mode: (f.servingUnit && !['serving', 'piece'].includes(f.servingUnit)) ? 'amount' : 'servings', src: 'mine' }, null, false, true); };
A.foodEdit = d => { Sheet.meal = null; const it = (foodDay(UI.foodDate || todayStr()).items || []).find(x => x.id === d.id); if (it) foodForm(clone(it), null, true); };
function addFoodItem(item) {
  const date = UI.foodDate || todayStr(), isNew = !(foodDay(date).items || []).some(x => x.id === item.id), before = foodTotals(date), day = clone(foodDay(date));
  day.date = date; day.items = [...(day.items || []).filter(x => x.id !== item.id), item]; put('food', date, day);
  if (isNew) feedBuddy(before, foodTotals(date));
}

/* ---------- the add/edit form: serving size + how much you ate ---------- */
function foodForm(it, imgUrl, editing = false, focusAmount = false) {
  Sheet.food = it; Sheet.foodMode = it.mode || 'servings';
  const saved = it.myId || myFoods().find(f => keyOf(f.name) === keyOf(it.name));
  const html = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}
    ${it.note ? `<p class="tip-line">${esc(it.note)}${it.confidence ? ` <span class="faint">(${esc(it.confidence)} confidence)</span>` : ''}</p>` : ''}
    <div class="field"><label class="lbl" for="fd-n">Food</label><input id="fd-n" name="name" value="${esc(it.name || '')}" placeholder="e.g. PB2 peanut butter powder" autocapitalize="sentences"></div>
    <div class="field"><span class="lbl">Serving size (from the label)</span><div class="fields"><input id="fd-ss" name="ssize" inputmode="decimal" value="${it.servingSize ?? ''}" placeholder="13" aria-label="Serving size amount"><select id="fd-su" name="sunit" aria-label="Serving size unit">${UNITS.map(u => `<option ${u === (it.servingUnit || 'serving') ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <div class="alsoeq"><span class="faint small">also equals</span><input id="fd-as" inputmode="decimal" value="${it.altSize ? fracTxt(it.altSize).replace('¼', '1/4').replace('⅓', '1/3').replace('½', '1/2').replace('⅔', '2/3').replace('¾', '3/4') : ''}" placeholder="2" aria-label="Also equals amount"><select id="fd-au" aria-label="Also equals unit"><option value="">—</option>${UNITS.filter(u => u !== 'serving').map(u => `<option ${u === it.altUnit ? 'selected' : ''}>${u}</option>`).join('')}</select></div><p class="faint tiny" style="margin:4px 0 0">Optional. If the label says “2 tbsp (13 g)”, add both and you can log in spoons, cups or grams.</p></div>
    <div class="field"><span class="lbl">Per serving</span><div class="fields four"><div class="field"><label class="faint tiny" for="fd-cal">kcal</label><input id="fd-cal" name="cal" inputmode="decimal" value="${it.cal ?? ''}"></div><div class="field"><label class="faint tiny" for="fd-p">Protein g</label><input id="fd-p" name="p" inputmode="decimal" value="${it.p ?? ''}"></div><div class="field"><label class="faint tiny" for="fd-c">Carbs g</label><input id="fd-c" name="c" inputmode="decimal" value="${it.c ?? ''}"></div><div class="field"><label class="faint tiny" for="fd-f">Fat g</label><input id="fd-f" name="f" inputmode="decimal" value="${it.f ?? ''}"></div></div></div>
    <div class="field"><span class="lbl">How much did you eat?</span><div class="seg" id="fd-modes"><button data-act="foodMode" data-m="servings" aria-pressed="${Sheet.foodMode === 'servings'}">Servings</button><button data-act="foodMode" data-m="amount" aria-pressed="${Sheet.foodMode === 'amount'}" id="fd-mode-amt">By amount</button></div>
      <div id="fd-eat"></div></div>
    <div class="tip-line" id="fd-sum" aria-live="polite"></div>
    ${Sheet.meal ? '' : `<label class="row" style="border:0;padding:4px 0;min-height:0;gap:10px;cursor:pointer"><input type="checkbox" id="fd-save" style="width:22px;height:22px;min-height:0;accent-color:var(--accent);appearance:auto;-webkit-appearance:checkbox" ${it.src === 'label' || saved ? 'checked' : ''}><span class="grow small">${saved ? 'Keep in My Foods (updates the saved serving)' : 'Save to My Foods: remembers this product and its serving, not this amount'}</span></label>`}
    <button class="btn block" data-act="foodSave">${Sheet.meal ? 'Add to meal' : editing ? 'Save changes' : 'Add to ' + (UI.foodDate ? fmtDate(UI.foodDate) : 'today')}</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}
    ${editing ? `<button class="linkbtn danger center" data-act="foodDelete" data-id="${it.id}">Remove</button>` : ''}`;
  if ($('#sheet').hidden) openSheet(editing ? 'Edit food' : 'Add food', html); else { sheetTitle(editing ? 'Edit food' : 'Check and add'); sheetBody(html); }
  drawEat(it); const L = $('#sheet');
  L.querySelectorAll('#fd-ss,#fd-su,#fd-as,#fd-au,#fd-cal,#fd-p,#fd-c,#fd-f').forEach(i => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { if (['fd-su', 'fd-au', 'fd-as'].includes(i.id)) drawEat(); updateFoodSum(); }));
  updateFoodSum();
  if (focusAmount) setTimeout(() => $('#fd-amt')?.focus(), 300);
}
const FRAC_CHIPS = [['¼', '1/4'], ['⅓', '1/3'], ['½', '1/2'], ['⅔', '2/3'], ['¾', '3/4'], ['1', '1'], ['1½', '1 1/2'], ['2', '2']];
function drawEat(it) {
  const su = $('#fd-su')?.value || 'serving', m = Sheet.foodMode, box = $('#fd-eat'); if (!box) return;
  const units = eatUnits(su, parseAmt($('#fd-as')?.value), $('#fd-au')?.value || ''), amtOK = units.length > 0;
  const prevU = $('#fd-eu')?.value, prevA = $('#fd-amt')?.value, prevQ = $('#fd-q')?.value;
  const want = (it && it.amountUnit) || prevU || (units.includes(su) ? su : units[0]), eu = units.includes(want) ? want : (units.includes(su) ? su : units[0]);
  const ab = $('#fd-mode-amt'); if (ab) { ab.textContent = 'By amount'; ab.disabled = !amtOK; ab.style.opacity = amtOK ? '' : '.4'; }
  if (m === 'amount' && amtOK) {
    box.innerHTML = `<div class="fields" style="margin-top:8px"><input id="fd-amt" inputmode="decimal" value="${esc(it && it.amount ? fracTxt(it.amount).replace(/[¼⅓½⅔¾]/, x => ' ' + FRAC_CHIPS.find(c => c[0] === x)[1]).trim() : (prevA || ''))}" placeholder="${unitFam(eu) && ['g', 'ml'].includes(eu) ? 'e.g. 37' : 'e.g. 1/4'}" aria-label="Amount eaten"><select id="fd-eu" aria-label="Unit eaten">${units.map(u => `<option ${u === eu ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <div class="chips fracs" id="fd-fr" style="margin-top:8px"${['g', 'ml'].includes(eu) ? ' hidden' : ''}>${FRAC_CHIPS.map(([l, v]) => `<button class="chip" data-act="foodFrac" data-v="${v}">${l}</button>`).join('')}</div>`;
    $('#fd-eu').addEventListener('change', e => { $('#fd-fr').hidden = ['g', 'ml'].includes(e.target.value); $('#fd-amt').placeholder = ['g', 'ml'].includes(e.target.value) ? 'e.g. 37' : 'e.g. 1/4'; updateFoodSum(); });
  } else { if (m === 'amount') Sheet.foodMode = 'servings'; box.innerHTML = `<div class="chips" style="margin-top:8px">${[['¼', 0.25], ['½', 0.5], ['1', 1], ['1½', 1.5], ['2', 2], ['3', 3]].map(([l, q]) => `<button class="chip" data-act="foodQty" data-q="${q}">${l}</button>`).join('')}</div><input id="fd-q" inputmode="decimal" value="${it ? (it.qty ?? 1) : (prevQ || 1)}" aria-label="Servings eaten" style="margin-top:8px">`; }
  box.querySelectorAll('input').forEach(i => i.addEventListener('input', updateFoodSum));
  $$('#fd-modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === Sheet.foodMode)));
}
A.foodFrac = (d, el) => { $$('#sheet [data-act="foodFrac"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); const i = $('#fd-amt'); if (i) i.value = d.v; updateFoodSum(); };
function readFoodForm() {
  const ss = parseAmt($('#fd-ss')?.value), su = $('#fd-su')?.value || 'serving', mode = Sheet.foodMode;
  const altUnit = $('#fd-au')?.value || '', altSize = altUnit ? parseAmt($('#fd-as')?.value) : null;
  const amount = mode === 'amount' ? parseAmt($('#fd-amt')?.value) : null, amountUnit = mode === 'amount' ? ($('#fd-eu')?.value || su) : null;
  const qty = mode === 'amount' ? servingsIn(amount, amountUnit, ss, su, altSize, altUnit) : parseAmt($('#fd-q')?.value);
  return { name: fval('name'), servingSize: ss || (su === 'serving' ? 1 : null), servingUnit: su, altSize: altSize > 0 ? altSize : null, altUnit: altSize > 0 ? altUnit : null, amountUnit, cal: num(fval('cal')), p: num(fval('p')) || 0, c: num(fval('c')) || 0, f: num(fval('f')) || 0, mode, amount, qty: qty != null ? Math.round(qty * 1000) / 1000 : null };
}
function updateFoodSum() {
  const v = readFoodForm(), el = $('#fd-sum'); if (!el) return;
  if (v.cal == null || v.qty == null) { el.textContent = v.mode === 'amount' && v.amount != null ? `Add the serving size in ${unitFam(v.amountUnit) === U_WT ? 'g, oz or lb' : unitFam(v.amountUnit) === U_VOL ? 'cups, spoons or ml' : v.amountUnit} so the app can scale it.` : 'Fill in calories and how much you ate.'; return; }
  el.innerHTML = `${v.mode === 'amount' ? `${fracTxt(v.amount)} ${v.amountUnit} = <b>${trim(v.qty, 2)} servings</b> → ` : ''}<b>${trim(v.cal * v.qty, 0)} kcal</b> · ${trim(v.p * v.qty, 1)} g protein · ${trim(v.c * v.qty, 0)} g carbs · ${trim(v.f * v.qty, 0)} g fat`;
}
A.foodMode = d => { Sheet.foodMode = d.m; drawEat(); updateFoodSum(); if (d.m === 'amount') $('#fd-amt')?.focus(); };
A.foodQty = (d, el) => { $$('#sheet [data-act="foodQty"]').forEach(b => b.setAttribute('aria-pressed', String(b === el))); const q = $('#fd-q'); if (q) q.value = d.q; updateFoodSum(); };
A.foodSave = () => {
  const v = readFoodForm(), it = Sheet.food || {};
  if (!v.name) return toast('Name the food.', { bad: true });
  if (v.cal == null) return toast('Enter the calories per serving.', { bad: true });
  if (!(v.qty > 0)) return toast('Enter how much you ate.', { bad: true });
  const serving = v.servingUnit === 'serving' ? (it.serving && it.serving !== '1 serving' ? it.serving : '1 serving') : `${fracTxt(v.servingSize)} ${v.servingUnit}${v.altSize ? ` (${fracTxt(v.altSize)} ${v.altUnit})` : ''}`;
  const base = { name: v.name, serving, servingSize: v.servingSize, servingUnit: v.servingUnit, altSize: v.altSize, altUnit: v.altUnit, cal: v.cal, p: v.p, c: v.c, f: v.f, ...(Sheet.food && Sheet.food.barcode ? { barcode: Sheet.food.barcode } : {}) };
  const saveBox = $('#fd-save');
  if (saveBox && saveBox.checked) {
    const ex = it.myId ? { id: it.myId } : myFoods().find(f => keyOf(f.name) === keyOf(v.name));
    const id = ex ? ex.id : newId(), old = Store.docs.myfoods[id] || {};
    put('myfoods', id, { ...old, ...base, ts: old.ts || Date.now(), lastUsed: Date.now(), uses: (old.uses || 0) + 1 });
  } else if (it.myId && Store.docs.myfoods[it.myId]) put('myfoods', it.myId, { ...Store.docs.myfoods[it.myId], lastUsed: Date.now(), uses: (Store.docs.myfoods[it.myId].uses || 0) + 1 });
  const item = { ...base, id: it.id || newId(), qty: v.qty, mode: v.mode, amount: v.mode === 'amount' ? v.amount : null, amountUnit: v.mode === 'amount' ? v.amountUnit : null, src: it.src === 'mine' ? 'manual' : (it.src || 'manual'), ts: it.ts || Date.now() };
  if (Sheet.meal) { Sheet.meal.parts.push(item); return drawMeal(); }
  addFoodItem(item); closeSheet(); toast(`${v.name}: ${trim(v.cal * v.qty, 0)} kcal added`);
};
A.foodDelete = d => {
  const date = UI.foodDate || todayStr(), day = clone(foodDay(date)), gone = (day.items || []).find(x => x.id === d.id);
  day.items = (day.items || []).filter(x => x.id !== d.id); put('food', date, day); closeSheet();
  if (gone) toastUndo(`Removed ${gone.name}`, () => { const dd = clone(foodDay(date)); dd.date = date; dd.items = [...(dd.items || []), gone]; put('food', date, dd); });
};
A.manageMyFoods = () => {
  const draw = () => sheetBody(myFoods().length ? `${myFoods().map(f => `<div class="row"><div class="grow"><b>${esc(f.name)}</b><div class="faint small">${esc(servingLabel(f))} · ${trim(f.cal, 0)} kcal · ${trim(f.p, 1)} g protein per serving${f.uses ? ` · used ${f.uses}×` : ''}</div></div><button class="iconbtn sm" data-act="delMyFood" data-id="${f.id}" aria-label="Delete ${esc(f.name)}">${ICON.x}</button></div>`).join('')}<p class="faint small">Tap a food on the Food screen to log it. To change a saved serving, log it and keep "Keep in My Foods" checked.</p>` : '<p class="muted">No saved foods yet.</p>');
  Sheet.drawMyFoods = draw; openSheet('My foods', ''); draw();
};
A.delMyFood = d => { const f = Store.docs.myfoods[d.id]; del('myfoods', d.id); Sheet.drawMyFoods && Sheet.drawMyFoods(); if (f) toastUndo(`Deleted ${f.name}`, () => { put('myfoods', d.id, f); Sheet.drawMyFoods && !$('#sheet').hidden && Sheet.drawMyFoods(); }); };

/* ---------- AI help (Gemini) ---------- */
const FOOD_JSON = `{"name": "short food name", "serving": "serving size as printed, e.g. 2 tbsp (13 g)", "serving_size": 13, "serving_unit": "g", "household_size": 2, "household_unit": "tbsp", "cal": 0, "protein": 0, "carbs": 0, "fat": 0, "confidence": "high", "note": ""}`;
const PROMPT_PHOTO = `You are helping someone log food in a calorie and protein tracker. The attached photo is either (a) a Nutrition Facts label or (b) a photo of a meal or food.
If it is a nutrition label: read the values for ONE serving exactly as printed (calories in kcal; protein, total carbohydrate and total fat in grams). "serving_size" is the serving amount as a number and "serving_unit" its unit: prefer grams ("g") or millilitres ("ml") when the label gives them in brackets, e.g. "2 tbsp (13g)" gives serving_size 13 and serving_unit "g". When the label ALSO gives a household measure (cup, tbsp, tsp, fl oz, oz or pieces), put it in "household_size" (a decimal number, so 1/4 is 0.25) and "household_unit" (one of: cup, tbsp, tsp, fl oz, oz, piece); otherwise use null for both. Use the product name if visible, otherwise a short description. Set "kind" to "label".
If it is a photo of food: identify it and estimate realistic values for the whole portion shown, with serving_size 1 and serving_unit "serving". Set "kind" to "estimate".
"confidence" is high, medium or low. "note" is one short sentence about anything to double-check, or "".
Reply with only JSON in this shape: {"kind": "label", ${FOOD_JSON.slice(1)}
If the photo shows neither food nor a nutrition label, reply {"kind": "none", "note": "<what you see instead>"}.`;
const promptText = t => `You are helping someone log food in a calorie and protein tracker. Estimate nutrition for: "${t.slice(0, 600)}"
Use typical US portions unless amounts are given. If it's a known restaurant or packaged item, use its published values. If it lists several foods, return their combined total, a short combined name, serving_size 1 and serving_unit "serving".
"confidence" is high, medium or low. "note" is one short sentence about any assumption to check, or "".
Reply with only JSON in this shape: ${FOOD_JSON}`;
function fromAI(out, src) {
  const n = v => { const x = num(v); return x == null ? '' : Math.round(x * 10) / 10; };
  const normU = x => { let u = String(x || '').toLowerCase().trim().replace(/\.$/, ''); const map = { grams: 'g', gram: 'g', milliliters: 'ml', milliliter: 'ml', tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', cups: 'cup', ounce: 'oz', ounces: 'oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', floz: 'fl oz', 'fl. oz': 'fl oz', pound: 'lb', pounds: 'lb', lbs: 'lb', pieces: 'piece', pc: 'piece' }; return map[u] || u; };
  let su = normU(out.serving_unit || 'serving'); if (!UNITS.includes(su)) su = 'serving';
  const hu = normU(out.household_unit), hs = parseAmt(out.household_size), alt = hs > 0 && UNITS.includes(hu) && hu !== 'serving' && hu !== su && unitFam(hu) !== unitFam(su) ? { altSize: hs, altUnit: hu } : {};
  const ss = num(out.serving_size) || 1;
  return { name: String(out.name || '').slice(0, 80), serving: String(out.serving || '').slice(0, 80), servingSize: su === 'serving' ? 1 : ss, servingUnit: su, ...alt, cal: n(out.cal), p: n(out.protein), c: n(out.carbs), f: n(out.fat), qty: 1, mode: src === 'label' && su !== 'serving' && su !== 'piece' && !/^\s*[\d./½¼¾]*\s*(tortillas?|bars?|scoops?|slices?|pieces?|cookies?|eggs?|bottles?|cans?|packets?|pouch(es)?|wraps?|buns?|muffins?|containers?|cups?|pancakes?|waffles?|links?|patty|patties|sticks?)\b/i.test(String(out.serving || '')) ? 'amount' : 'servings', src, note: String(out.note || '').slice(0, 200), confidence: ['high', 'medium', 'low'].includes(out.confidence) ? out.confidence : '' };
}
function aiErrorText(e) {
  switch (e?.code) {
    case 'cancelled': return null;
    case 'no_key': return 'Add your AI key in Settings to scan labels.';
    case 'bad_key': return 'Your AI key was rejected. Re-copy it and use "Test my key" in Settings.';
    case 'bad_model': return "The scanner couldn't find a model to use. Clear the model under Advanced in Settings.";
    case 'timeout': return 'That took too long. Try again; a close, well-lit photo of just the label reads fastest.';
    case 'offline': return "Couldn't connect. Check your signal or Wi-Fi and try again.";
    case 'rate_limited': return "You've hit the free scanning limit for the moment. Wait a minute and try again.";
    case 'overloaded': return "The scanner is really busy right now. Try again in a minute, or enter it manually.";
    case 'refused': return "The scanner couldn't read that one. Enter it manually.";
    case 'invalid_json': case 'empty_completion': return "Couldn't pull numbers out of that. Try again or enter it manually.";
    default: return 'Something went wrong while scanning. Try again.';
  }
}
function aiWorking(title, imgUrl, label) {
  const ctl = new AbortController(); Sheet.ai = ctl;
  const body = `${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}<p class="thinking" id="ai-st">${label}</p><button class="btn ghost block" data-act="aiStop">Stop</button>`;
  if (Sheet.meal && !$('#sheet').hidden) { sheetTitle(title); sheetBody(body); Sheet.onClose = () => ctl.abort(); } else openSheet(title, body, { onClose: () => ctl.abort() });
  const t0 = Date.now(); clearInterval(Sheet.aiTick); Sheet.aiLabel = label;
  Sheet.aiTick = setInterval(() => { const st = $('#ai-st'); if (!st || ctl.signal.aborted) return clearInterval(Sheet.aiTick); st.textContent = `${Sheet.aiLabel} ${Math.round((Date.now() - t0) / 1000)}s`; }, 1000);
  return ctl;
}
A.aiStop = () => { Sheet.ai?.abort(); clearInterval(Sheet.aiTick); if (Sheet.meal) drawMeal(); else closeSheet(); };
function aiFailed(e, imgUrl) {
  clearInterval(Sheet.aiTick); const msg = aiErrorText(e); if (msg == null) return;
  sheetBody(`${imgUrl ? `<img class="prev-img" src="${imgUrl}" alt="Your photo">` : ''}<p class="tip-line">${esc(msg)}${e && e.message ? `<br><span class="faint tiny">${esc(errCode(e))}</span>` : ''}</p>${imgUrl && Sheet.lastPhoto ? `<button class="btn block" data-act="retryPhoto">Try again</button>` : ''}${imgUrl ? `<button class="btn ghost block" data-act="foodSnap" data-inmeal="${Sheet.meal ? 1 : 0}">Use a different photo</button>` : ''}<button class="btn ${imgUrl ? 'ghost' : ''} block" data-act="foodManual" data-inmeal="${Sheet.meal ? 1 : 0}">Enter manually</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}`);
}
A.foodSnap = d => { if (!inMeal(d)) Sheet.meal = null; const i = $('#file-food'); i.value = ''; i.click(); };
A.retryPhoto = () => { if (Sheet.lastPhoto) onFoodPhoto(Sheet.lastPhoto); };
async function onFoodPhoto(file) {
  if (!file || !CAP.sample) return; Sheet.lastPhoto = file;
  const blob = await toJpeg(file, 1100, 0.8), url = URL.createObjectURL(blob);
  const ctl = aiWorking('Reading your photo', url, 'Reading the label…');
  try {
    const out = await CAP.sample.json(PROMPT_PHOTO, { images: [blob], signal: ctl.signal, onStatus: t => { Sheet.aiLabel = t; } });
    clearInterval(Sheet.aiTick); if (ctl.signal.aborted) return;
    if (!out || out.kind === 'none') return sheetBody(`<img class="prev-img" src="${url}" alt="Your photo"><p class="tip-line">${esc(out?.note || "That doesn't look like food or a nutrition label.")}</p><button class="btn block" data-act="foodSnap" data-inmeal="${Sheet.meal ? 1 : 0}">Try another photo</button><button class="btn ghost block" data-act="foodManual" data-inmeal="${Sheet.meal ? 1 : 0}">Enter manually</button>`);
    foodForm(fromAI(out, out.kind === 'label' ? 'label' : 'ai'), url, false, out.kind === 'label');
  } catch (e) { aiFailed(e, url); }
}
A.foodDescribe = d => {
  if (!inMeal(d)) Sheet.meal = null;
  (Sheet.meal ? (t, b) => { sheetTitle(t); sheetBody(b); } : openSheet)('Describe what you ate', `<div class="field"><label class="lbl" for="fd-txt">What and how much</label><textarea id="fd-txt" name="txt" placeholder="e.g. Chipotle bowl with double chicken, white rice, black beans, cheese and mild salsa"></textarea></div><button class="btn block" data-act="foodEstimate">${ICON.spark} Estimate</button>${Sheet.meal ? '<button class="linkbtn center" data-act="mealBack">Back to meal</button>' : ''}<p class="faint small">Estimates use typical portions and published nutrition info. Check the numbers before adding.</p>`, { onMount(L) { setTimeout(() => $('#fd-txt', L)?.focus(), 280); } });
};
A.foodEstimate = async () => {
  const txt = fval('txt'); if (!txt) return toast('Describe the food first.', { bad: true });
  const ctl = new AbortController(); Sheet.ai = ctl; Sheet.onClose = () => ctl.abort();
  sheetBody(`<p class="muted">“${esc(txt)}”</p><p class="thinking" id="ai-st">Estimating…</p><button class="btn ghost block" data-act="aiStop">Stop</button>`);
  try {
    const out = await CAP.sample.json(promptText(txt), { signal: ctl.signal, onStatus: t => { const st = $('#ai-st'); if (st) st.textContent = t; } });
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
  const ai = !!CAP.sample, rec = recentFoods(), mf = myFoods();
  sheetBody(`<div class="field"><label class="lbl" for="ml-n">Meal name</label><input id="ml-n" name="mealname" value="${esc(m.name)}" placeholder="e.g. Post-workout shake" autocapitalize="sentences"></div>
    <div class="card" style="background:var(--s2);padding:12px"><div class="stats"><div class="stat"><span class="k">Calories</span><span class="v">${trim(t.cal, 0)}</span></div><div class="stat"><span class="k">Protein</span><span class="v">${trim(t.p, 0)}<span class="unit">g</span></span></div><div class="stat"><span class="k">Items</span><span class="v">${m.parts.length}</span></div></div></div>
    ${m.parts.length ? `<div>${m.parts.map((it, i) => `<div class="row"><div class="grow"><b>${esc(it.name)}</b><div class="faint small">${esc(eatenLabel(it))} · ${trim((it.cal || 0) * (it.qty || 1), 0)} kcal · ${trim((it.p || 0) * (it.qty || 1), 0)} g protein</div></div><button class="iconbtn sm" data-act="mealDel" data-i="${i}" aria-label="Remove ${esc(it.name)}">${ICON.x}</button></div>`).join('')}</div>` : '<p class="muted small">Add each part of the meal: pick a saved food, snap its label, describe it, or type it in.</p>'}
    ${mf.length ? `<div class="field"><span class="lbl">My foods</span><div class="chips scroll">${mf.map(f => `<button class="chip" data-act="mealMyFood" data-id="${f.id}">${esc(f.name)}</button>`).join('')}</div></div>` : ''}
    <div class="btnrow"><button class="btn ghost" data-act="mealAdd" data-how="barcode">▥ Barcode</button>${ai ? `<button class="btn ghost" data-act="mealAdd" data-how="snap">${ICON.camera} Snap label</button><button class="btn ghost" data-act="mealAdd" data-how="describe">${ICON.spark} Describe</button>` : ''}<button class="btn ghost" data-act="mealAdd" data-how="manual" ${ai ? 'style="grid-column:1/-1"' : 'style="grid-column:1/-1"'}>${ICON.plus} Type it in</button></div>
    ${rec.length ? `<div class="field"><span class="lbl">Same as last time</span><div class="chips scroll">${rec.map((it, i) => `<button class="chip" data-act="foodAgain" data-inmeal="1" data-i="${i}">${esc(it.name)}</button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="mealSave" ${m.parts.length ? '' : 'disabled'}>Log meal${m.parts.length ? ` · ${trim(t.cal, 0)} kcal` : ''}</button>`);
}
A.mealMyFood = d => { keepMealName(); A.useMyFood({ id: d.id, inmeal: '1' }); };
A.mealAdd = d => { keepMealName(); if (d.how === 'barcode') return A.barcodeScan({ inmeal: '1' }); if (d.how === 'snap') A.foodSnap({ inmeal: '1' }); else if (d.how === 'describe') A.foodDescribe({ inmeal: '1' }); else A.foodManual({ inmeal: '1' }); };
A.mealDel = d => { keepMealName(); Sheet.meal.parts.splice(+d.i, 1); drawMeal(); };
A.mealSave = () => {
  keepMealName(); const m = Sheet.meal; if (!m || !m.parts.length) return;
  const sum = k => Math.round(m.parts.reduce((a, it) => a + (it[k] || 0) * (it.qty || 1), 0) * 10) / 10;
  const name = m.name || (m.parts.length === 1 ? m.parts[0].name : 'Meal');
  addFoodItem({ id: newId(), name, serving: m.parts.map(p => p.name).join(' + ').slice(0, 120), servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: sum('cal'), p: sum('p'), c: sum('c'), f: sum('f'), src: 'meal', parts: m.parts, ts: Date.now() });
  Sheet.meal = null; closeSheet(); toast(`${name} logged`);
};

/* calories + protein as two rings (like the big trackers), carbs/fat underneath */
function foodSummaryHTML(t, s) {
  const cp = s.calTarget ? t.cal / s.calTarget * 100 : 0, pp = s.proteinTarget ? t.p / s.proteinTarget * 100 : 0;
  const cc = cp > 108 ? '#f5b915' : 'var(--accent)', pc = pp >= 100 ? 'var(--ok)' : '#ff6b8b';
  const calLeft = s.calTarget - t.cal, pLeft = s.proteinTarget - t.p;
  const one = (pct, col, val, of, unit, lbl, sub) => `<div class="fr">${ring(Math.min(pct, 100), col, 112, 10, `<span data-count="${Math.round(val)}">${fmtN(val)}</span><small>of ${fmtN(of)}${unit}</small>`)}<span class="fr-l">${lbl}</span><span class="faint small">${sub}</span></div>`;
  return `<section class="card fsum"><div class="fsum-rings">${one(cp, cc, t.cal, s.calTarget, '', 'Calories', calLeft >= 0 ? `${fmtN(calLeft)} left` : `${fmtN(-calLeft)} over`)}${one(pp, pc, t.p, s.proteinTarget, ' g', 'Protein', pLeft > 0 ? `${fmtN(pLeft)} g to go` : 'Goal hit ✓')}</div>
    <div class="fsum-mac"><span><i style="background:#f5b915"></i>Carbs <b>${trim(t.c, 0)} g</b></span><span><i style="background:#ff6b8b"></i>Fat <b>${trim(t.f, 0)} g</b></span><span><i style="background:#3392f5"></i>Protein <b>${trim(t.p, 0)} g</b></span></div></section>`;
}
