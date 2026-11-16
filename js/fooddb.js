'use strict';
/* ---------- Food search beyond your own foods: a built-in list of everyday staples, plus name search in the Open Food Facts database. ---------- */
/* [name, kcal, protein, carbs, fat per 100 g, usual serving in g, serving label]. Typical reference values; brands and cooking methods vary. */
const STAPLES = [
  ['Chicken breast, cooked', 165, 31, 0, 3.6, 120, '1 breast'], ['Chicken thigh, cooked', 209, 26, 0, 10.9, 120, '1 thigh'], ['Ground beef 90% lean, cooked', 217, 26, 0, 12, 113, '4 oz'], ['Ground beef 80% lean, cooked', 254, 26, 0, 17, 113, '4 oz'],
  ['Ground turkey 93% lean, cooked', 176, 22, 0, 9.7, 113, '4 oz'], ['Steak, sirloin, cooked', 200, 29, 0, 9, 170, '6 oz'], ['Turkey breast, roasted', 135, 30, 0, 0.7, 85, '3 oz'], ['Bacon, cooked', 541, 37, 1.4, 42, 16, '2 slices'],
  ['Salmon, cooked', 206, 22, 0, 12, 140, '1 fillet'], ['Tuna, canned in water', 116, 26, 0, 1, 113, '1 can, drained'], ['Shrimp, cooked', 99, 24, 0.2, 0.3, 85, '3 oz'], ['Cod, cooked', 105, 23, 0, 0.9, 120, '1 fillet'], ['Tilapia, cooked', 128, 26, 0, 2.7, 120, '1 fillet'],
  ['Egg, whole', 143, 12.6, 0.7, 9.5, 50, '1 large egg'], ['Egg white', 52, 10.9, 0.7, 0.2, 33, '1 egg white'], ['Tofu, firm', 144, 17, 2.8, 8.7, 126, '½ block'],
  ['White rice, cooked', 130, 2.7, 28, 0.3, 158, '1 cup'], ['Brown rice, cooked', 123, 2.7, 25.6, 1, 195, '1 cup'], ['Pasta, cooked', 158, 5.8, 31, 0.9, 140, '1 cup'], ['Quinoa, cooked', 120, 4.4, 21.3, 1.9, 185, '1 cup'], ['Oats, dry', 389, 16.9, 66, 6.9, 40, '½ cup'],
  ['Bread, white', 265, 9, 49, 3.2, 28, '1 slice'], ['Bread, whole wheat', 247, 13, 41, 3.4, 32, '1 slice'], ['Bagel, plain', 257, 10, 50, 1.6, 95, '1 bagel'], ['Tortilla, flour', 306, 8, 50, 8, 45, '1 tortilla'], ['Rice cake', 387, 8, 82, 2.8, 9, '1 cake'],
  ['Potato, baked', 93, 2.5, 21, 0.1, 173, '1 medium'], ['Sweet potato, baked', 90, 2, 20.7, 0.2, 130, '1 medium'], ['French fries', 312, 3.4, 41, 15, 117, 'medium order'],
  ['Banana', 89, 1.1, 22.8, 0.3, 118, '1 medium'], ['Apple', 52, 0.3, 13.8, 0.2, 182, '1 medium'], ['Orange', 47, 0.9, 11.8, 0.1, 131, '1 medium'], ['Blueberries', 57, 0.7, 14.5, 0.3, 148, '1 cup'], ['Strawberries', 32, 0.7, 7.7, 0.3, 152, '1 cup'], ['Grapes', 69, 0.7, 18, 0.2, 151, '1 cup'], ['Avocado', 160, 2, 8.5, 14.7, 150, '1 avocado'],
  ['Broccoli', 34, 2.8, 6.6, 0.4, 91, '1 cup'], ['Spinach', 23, 2.9, 3.6, 0.4, 30, '1 cup'], ['Carrot', 41, 0.9, 9.6, 0.2, 61, '1 medium'],
  ['Milk, whole', 61, 3.2, 4.8, 3.3, 244, '1 cup'], ['Milk, 2%', 50, 3.3, 4.8, 2, 244, '1 cup'], ['Milk, skim', 34, 3.4, 5, 0.1, 245, '1 cup'], ['Greek yogurt, nonfat plain', 59, 10.2, 3.6, 0.4, 170, '1 container'], ['Greek yogurt, whole plain', 97, 9, 4, 5, 170, '1 container'], ['Cottage cheese, 2%', 84, 11, 4.3, 2.3, 113, '½ cup'],
  ['Cheddar cheese', 403, 25, 1.3, 33, 28, '1 oz'], ['Mozzarella, part skim', 254, 24, 2.8, 16, 28, '1 oz'], ['Butter', 717, 0.9, 0.1, 81, 14, '1 tbsp'], ['Olive oil', 884, 0, 0, 100, 13.5, '1 tbsp'],
  ['Peanut butter', 588, 25, 20, 50, 32, '2 tbsp'], ['Almonds', 579, 21, 22, 50, 28, '1 oz'], ['Peanuts', 567, 26, 16, 49, 28, '1 oz'], ['Walnuts', 654, 15, 14, 65, 28, '1 oz'], ['Hummus', 166, 7.9, 14, 9.6, 30, '2 tbsp'],
  ['Black beans, cooked', 132, 8.9, 23.7, 0.5, 172, '1 cup'], ['Chickpeas, cooked', 164, 8.9, 27.4, 2.6, 164, '1 cup'], ['Lentils, cooked', 116, 9, 20, 0.4, 198, '1 cup'],
  ['Whey protein powder', 400, 80, 10, 5, 30, '1 scoop'], ['Beef jerky', 410, 33, 11, 26, 28, '1 oz'], ['Honey', 304, 0.3, 82, 0, 21, '1 tbsp'], ['Sugar', 387, 0, 100, 0, 4, '1 tsp'],
  ['Orange juice', 45, 0.7, 10.4, 0.2, 248, '1 cup'], ['Cola', 42, 0, 10.6, 0, 355, '1 can'], ['Beer', 43, 0.5, 3.6, 0, 355, '1 can'], ['Pizza, cheese', 266, 11, 33, 10, 107, '1 slice'], ['Ice cream, vanilla', 207, 3.5, 24, 11, 66, '½ cup'], ['Dark chocolate', 598, 7.8, 46, 43, 28, '1 oz'],
];
const stapleFood = i => { const [n, k, p, c, f, g, lbl] = STAPLES[i], m = g / 100, r = x => Math.round(x * m * 10) / 10; return { name: n, serving: `${lbl} (${g} g)`, servingSize: g, servingUnit: 'g', qty: 1, mode: 'amount', amount: g, amountUnit: 'g', cal: Math.round(k * m), p: r(p), c: r(c), f: r(f), src: 'db', note: 'Typical values. Check them against your label if you have one.' }; };
function staplesMatch(q) {
  const words = keyOf(q).replace(/[-,]/g, ' ').split(/\s+/).filter(Boolean); if (!words.length) return [];
  const mine = new Set([...foodIndex().keys()]);
  return STAPLES.map((s, i) => [keyOf(s[0]).replace(/[-,]/g, ' '), i]).filter(([k, i]) => words.every(w => k.includes(w) || k.includes(w.replace(/s$/, ''))) && !mine.has(keyOf(STAPLES[i][0]))).sort((a, b) => a[0].startsWith(words[0]) === b[0].startsWith(words[0]) ? a[0].length - b[0].length : b[0].startsWith(words[0]) - a[0].startsWith(words[0])).slice(0, 8).map(x => x[1]);
}
const dbRow = (act, i, name, sub, kcal) => `<button class="row fdb-row" data-act="${act}" data-i="${i}"><span class="grow"><b>${esc(name)}</b><div class="faint small">${esc(sub)}</div></span><span class="fdb-k">${kcal}<i>kcal</i></span></button>`;
{ const fl = faListHTML; faListHTML = function (q) {
  const base = fl(q), ql = (q || '').trim(); if (ql.length < 2) return base;
  const st = staplesMatch(ql), noneMine = base.includes('Nothing saved called');
  return (noneMine && st.length ? '' : base) + (st.length ? `<div class="fa-lblrow" style="margin-top:12px"><span class="lbl">Common foods</span><span class="faint tiny">typical values</span></div><div class="fdb-list">${st.map(i => { const f = stapleFood(i); return dbRow('stapleAdd', i, f.name, f.serving, f.cal); }).join('')}</div>` : '')
    + `<div id="fa-off"><button class="btn ghost block" data-act="offSearch" data-q="${esc(ql)}" style="margin-top:12px">${ICON.search} Search brands &amp; packaged foods for “${esc(ql)}”</button></div>` + (noneMine && st.length ? `<button class="linkbtn" data-act="faManual" data-n="${esc(ql)}" style="display:block;margin:10px auto 0">Enter “${esc(ql)}” manually</button>` : '');
}; }
A.stapleAdd = d => foodForm(stapleFood(+d.i), null, false, true);
A.offSearch = async d => {
  const box = $('#fa-off'); if (!box) return; box.innerHTML = '<div class="bc-wait" style="padding:16px 0"><div class="spin" aria-hidden="true"></div></div>';
  let list = null;
  try { const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(d.q)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit,quantity`, { headers: { Accept: 'application/json' } }); list = ((await r.json()).products || []); } catch (e) {}
  if (!$('#fa-off')) return;
  if (!list) { box.innerHTML = `<p class="muted small center" style="margin:12px 0">The food database didn't respond. Check your connection and try again.</p><button class="btn ghost block" data-act="offSearch" data-q="${esc(d.q)}">Try again</button>`; return; }
  const foods = list.map(p => { try { return offToFood(p, p.code); } catch (e) { return null; } }).filter(f => f && f.name && f.name !== 'Scanned food' && +f.cal > 0).slice(0, 12);
  Sheet.offRes = foods;
  box.innerHTML = foods.length ? `<div class="fa-lblrow" style="margin-top:12px"><span class="lbl">Brands &amp; packaged foods</span><span class="faint tiny">Open Food Facts</span></div><div class="fdb-list">${foods.map((f, i) => dbRow('offPick', i, f.name, f.servingUnit === 'serving' ? 'per serving' : `per ${trim(f.servingSize, 0)} ${f.servingUnit}`, Math.round(+f.cal))).join('')}</div><p class="faint tiny" style="margin:8px 0 0">Community data. Check the numbers against the label.</p>`
    : `<p class="muted small center" style="margin:12px 0">Nothing found for “${esc(d.q)}”. Try fewer words, scan the barcode, or enter it manually.</p>`;
};
A.offPick = d => { const f = (Sheet.offRes || [])[+d.i]; if (!f) return; foodForm({ ...clone(f), note: 'Check the numbers against the label.' }, null, false, true); };
