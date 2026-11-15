'use strict';
/* ---------- adjust a built meal ingredient by ingredient (the banana in the wrap is never the same size twice) ---------- */
const ME_STEP = { g: 5, oz: 0.5, ml: 10, 'fl oz': 0.5, cup: 0.25, tbsp: 0.5, tsp: 0.5, lb: 0.05, kg: 0.01, l: 0.05 };
/* how a part's amount is shown: by weight/volume when it has one, otherwise in servings */
function meView(pt) {
  if (pt.mode === 'amount' && pt.amount > 0 && pt.amountUnit) return { kind: 'amt', v: pt.amount, u: pt.amountUnit };
  if (pt.servingUnit && pt.servingUnit !== 'serving' && pt.servingSize > 0) return { kind: 'amt', v: Math.round((pt.qty || 1) * pt.servingSize * 100) / 100, u: pt.servingUnit };
  return { kind: 'srv', v: pt.qty || 1, u: 'servings' };
}
function meSet(pt, v) {
  const w = meView(pt); v = Math.max(0, Math.round(v * 100) / 100);
  if (w.kind === 'srv') { pt.qty = v; pt.mode = 'servings'; return; }
  const q = servingsIn(v, w.u, pt.servingSize, pt.servingUnit, pt.altSize, pt.altUnit); if (q == null) return;
  pt.mode = 'amount'; pt.amount = v; pt.amountUnit = w.u; pt.qty = q;
}
const meTot = parts => { const t = { cal: 0, p: 0, c: 0, f: 0 }; for (const pt of parts) for (const k in t) t[k] += (pt[k] || 0) * (pt.qty || 1); for (const k in t) t[k] = Math.round(t[k] * 10) / 10; return t; };

/* open for a logged meal (id) or a usual you're about to add (k) */
function mealAdjust(item, from) {
  Sheet.meal = null; Sheet.me = { item: clone(item), parts: clone(item.parts || []), from, was: meTot(item.parts || []) };
  openSheet(item.name, '', { onClose: () => { Sheet.me = null; } }); drawMe();
}
function drawMe() {
  const M = Sheet.me; if (!M) return; const t = meTot(M.parts), q = M.item.qty || 1;
  sheetBody(`<p class="muted small" style="margin:0 0 12px">Change any ingredient's amount. The meal's calories and macros update to match.</p>
    <div class="me-tot" id="me-tot">${meTotHTML(t, q, M.was)}</div>
    <div class="me-list">${M.parts.map((pt, i) => { const w = meView(pt), st = w.kind === 'srv' ? 0.25 : (ME_STEP[w.u] || 1);
      return `<div class="me-row"><div class="grow"><b>${esc(pt.name)}</b><span class="faint tiny" id="me-k${i}">${meRowTxt(pt)}</span></div>
        <div class="me-amt"><button class="btn ghost me-st" data-act="meStep" data-i="${i}" data-d="${-st}" aria-label="Less ${esc(pt.name)}">−</button><label><input id="me-v${i}" data-i="${i}" class="me-in" inputmode="decimal" value="${trim(w.v, 2)}" aria-label="${esc(pt.name)} amount in ${esc(w.u)}"><span>${esc(w.kind === 'srv' ? (w.v === 1 ? 'serving' : 'servings') : w.u)}</span></label><button class="btn ghost me-st" data-act="meStep" data-i="${i}" data-d="${st}" aria-label="More ${esc(pt.name)}">+</button></div></div>`; }).join('')}</div>
    <button class="btn block" data-act="meSave" id="me-save">${meSaveTxt(t, q)}</button>
    ${M.from.id ? `<button class="linkbtn center" style="width:100%;justify-content:center;margin-top:6px" data-act="meWhole">Edit the meal as a whole instead</button>` : ''}`);
  $$('#sheet .me-in').forEach(inp => inp.addEventListener('input', () => { const v = parseAmt(inp.value); if (v == null || !(v >= 0)) return; meSet(M.parts[+inp.dataset.i], v); meLive(+inp.dataset.i); }));
}
const meRowTxt = pt => `${trim((pt.cal || 0) * (pt.qty || 1), 0)} kcal · ${trim((pt.p || 0) * (pt.qty || 1), 1)} g protein`;
function meTotHTML(t, q, was) {
  const d = Math.round((t.cal - was.cal) * q), x = k => trim(t[k] * q, 0);
  return `<div class="stats"><div class="stat"><span class="k">Calories</span><span class="v">${fmtN(Math.round(t.cal * q))}</span>${d ? `<span class="tiny ${d > 0 ? 'me-up' : 'me-dn'}">${d > 0 ? '+' : '−'}${fmtN(Math.abs(d))}</span>` : '<span class="faint tiny">no change</span>'}</div><div class="stat"><span class="k">Protein</span><span class="v">${x('p')}<span class="unit">g</span></span></div><div class="stat"><span class="k">Carbs</span><span class="v">${x('c')}<span class="unit">g</span></span></div><div class="stat"><span class="k">Fat</span><span class="v">${x('f')}<span class="unit">g</span></span></div></div>${q !== 1 ? `<p class="faint tiny" style="margin:6px 0 0">Totals for the ${fracTxt(q)} servings you logged.</p>` : ''}`;
}
const meSaveTxt = (t, q) => `${Sheet.me && Sheet.me.from.id ? 'Save' : 'Add'} · ${fmtN(Math.round(t.cal * q))} kcal`;
function meLive(i) {
  const M = Sheet.me, t = meTot(M.parts), q = M.item.qty || 1, k = $('#me-k' + i); if (k) k.textContent = meRowTxt(M.parts[i]);
  $('#me-tot').innerHTML = meTotHTML(t, q, M.was); $('#me-save').textContent = meSaveTxt(t, q);
}
A.meStep = d => {
  const M = Sheet.me, i = +d.i, pt = M.parts[i], w = meView(pt), v = Math.max(0, w.v + +d.d); meSet(pt, v);
  const inp = $('#me-v' + i); if (inp) inp.value = trim(meView(pt).v, 2); meLive(i);
};
A.meSave = () => {
  const M = Sheet.me; if (!M) return; const t = meTot(M.parts), it = { ...M.item, ...t, parts: M.parts, serving: M.parts.map(p => p.name).join(' + ').slice(0, 120) };
  if (M.from.id) { const date = M.from.date, day = clone(foodDay(date)); day.date = date; day.items = (day.items || []).map(x => x.id === it.id ? it : x); put('food', date, day); Sheet.me = null; closeSheet(); toast(`${it.name} updated · ${fmtN(Math.round(t.cal * (it.qty || 1)))} kcal`); return; }
  const date = foodDate(), add = { ...it, id: newId(), ts: Date.now() }; Sheet.me = null; closeSheet(); addFoodItem(add);
  const u = foodIndex().get(M.from.k); if (u) bumpMine(u); if (typeof sfx === 'function') sfx('pop');
  toastUndo(`Added ${add.name} · ${fmtN(itK(add))} kcal`, () => removeFoodIds([add.id], date));
};
A.meWhole = () => { const M = Sheet.me; if (!M) return; const date = M.from.date, it = (foodDay(date).items || []).find(x => x.id === M.from.id); Sheet.me = null; if (it) foodForm(clone(it), null, true); };

/* tapping a logged meal opens its ingredients; a usual meal's menu can adjust before adding */
A.foodEdit = d => {
  Sheet.meal = null; const date = UI.foodDate || todayStr(), it = (foodDay(date).items || []).find(x => x.id === d.id); if (!it) return;
  if (it.parts && it.parts.length) return mealAdjust(it, { id: it.id, date });
  foodForm(clone(it), null, true);
};
A.mealAdjust = d => { const u = foodIndex().get(d.k); if (!u || !(u.it.parts || []).length) return; mealAdjust({ ...foodFrom(u), qty: 1 }, { k: d.k }); };
