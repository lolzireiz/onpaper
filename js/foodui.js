'use strict';
/* Food tab, rebuilt around the foods you eat every day.
   - Your usuals: anything you've logged on 2+ days lately becomes a one-tap tile (same amount as last time).
     Pin daily staples (shakes, snacks) to keep them first and add them all in one tap.
   - One "Add food" sheet: search everything you've ever logged, plus scan / snap / describe / manual / meal / copy a day.
   - The day's log, grouped by time of day. */

const USUAL_DAYS = 28, USUAL_SHOW = 8;
const itK = it => (it.cal || 0) * (it.qty || 1), itP = it => (it.p || 0) * (it.qty || 1);
/* the short "how much" for a tile: "37 g", "2 servings", "1 scoop" */
function amtShort(it) {
  if (it.mode === 'amount' && it.amount) return `${fracTxt(it.amount)} ${it.amountUnit || it.servingUnit || ''}`.trim();
  if (it.qty && Math.abs(it.qty - 1) > 0.01) return `${fracTxt(it.qty)} servings`;
  if (it.src === 'meal' || it.parts) return '';
  const l = servingLabel(it).replace(/\s*\([^)]*\)/g, '').trim(); return l === '1 serving' ? '' : l;
}
/* every food you've logged (latest copy = "same as last time"), plus saved foods and meals */
function foodIndex() {
  return Store.cached('foodIndex', () => {
    const m = new Map(), since = addDays(todayStr(), -(USUAL_DAYS - 1)), gone = S().foodGone || {};
    for (const d of Store.list('food').sort((a, b) => a.date.localeCompare(b.date))) for (const it of (d.items || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))) {
      const k = keyOf(it.name); if (!k) continue;
      if (gone[k] && (it.ts || parseDate(d.date).getTime()) <= gone[k]) continue;
      let u = m.get(k); if (!u) m.set(k, u = { k, n: 0, recent: new Set(), last: '' });
      u.it = it; u.last = d.date; u.n++; if (d.date >= since) u.recent.add(d.date);
    }
    for (const f of myFoods()) {
      const k = keyOf(f.name); if (!k) continue; if (gone[k] && (f.lastUsed || f.ts || 0) <= gone[k]) continue; let u = m.get(k);
      if (!u) m.set(k, u = { k, n: 0, recent: new Set(), last: '', it: f.kind === 'meal'
        ? { name: f.name, serving: f.serving, servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: f.cal, p: f.p, c: f.c, f: f.f, src: 'meal', parts: f.parts, myId: f.id }
        : { name: f.name, serving: f.serving, servingSize: f.servingSize, servingUnit: f.servingUnit, altSize: f.altSize, altUnit: f.altUnit, cal: f.cal, p: f.p, c: f.c, f: f.f, qty: 1, mode: 'servings', src: 'mine', myId: f.id } });
      u.mine = f.id; if (f.kind === 'meal') u.meal = true;
    }
    return m;
  });
}
function usualsList() {
  const s = S(), pins = s.foodPins || [], hide = s.foodHide || [];
  return Store.cached(`usuals:${todayStr()}:${pins.join('|')}#${hide.join('|')}`, () => {
    const ix = foodIndex(), out = [];
    for (const k of pins) { const u = ix.get(k); if (u) out.push({ ...u, pin: true }); }
    const free = [...ix.values()].filter(u => !pins.includes(u.k) && !hide.includes(u.k));
    out.push(...free.filter(u => u.recent.size >= 2).sort((a, b) => b.recent.size - a.recent.size || b.last.localeCompare(a.last) || b.n - a.n));
    /* not much history yet: fill with what you had most recently */
    if (out.length < 6) out.push(...free.filter(u => u.last && !out.some(o => o.k === u.k)).sort((a, b) => b.last.localeCompare(a.last) || b.n - a.n).slice(0, 6 - out.length));
    return out;
  });
}
const foodDate = () => UI.foodDate || todayStr();
const cntOn = (k, date = foodDate()) => (foodDay(date).items || []).filter(x => keyOf(x.name) === k).length;
function foodFrom(u) { const t = clone(u.it); for (const x of ['id', 'ts', 'note', 'confidence']) delete t[x]; return { ...t, src: t.src === 'mine' ? 'manual' : (t.src || 'manual') }; }
function removeFoodIds(ids, date) { const dd = clone(foodDay(date)); dd.date = date; dd.items = (dd.items || []).filter(x => !ids.includes(x.id)); put('food', date, dd); }
function bumpMine(u) { const f = u.mine && Store.docs.myfoods[u.mine]; if (f) put('myfoods', u.mine, { ...f, lastUsed: Date.now(), uses: (f.uses || 0) + 1 }); }
function quickAdd(k, el) {
  const u = foodIndex().get(k); if (!u) return null;
  const date = foodDate(), it = { ...foodFrom(u), id: newId(), ts: Date.now() };
  addFoodItem(it); bumpMine(u);
  if (el && !REDUCED()) { sparkle(el); el.classList.remove('just'); void el.offsetWidth; el.classList.add('just'); }
  toastUndo(`Added ${it.name} · ${fmtN(itK(it))} kcal`, () => removeFoodIds([it.id], date));
  return it;
}

/* ---------- the page ---------- */
Views.food.render = function () {
  const date = foodDate(), t = foodTotals(date), s = S();
  let h = buddyCardHTML() + `<div class="daynav"><button class="iconbtn" data-act="foodDay" data-d="-1" aria-label="Previous day">${ICON.chevL}</button><b>${date === todayStr() ? 'Today' : fmtDay(date)}</b><button class="iconbtn" data-act="foodDay" data-d="1" aria-label="Next day" ${date >= todayStr() ? 'disabled style="opacity:.3"' : ''}>${ICON.chevR}</button></div>`;
  h += foodSummaryHTML(t, s).replace(/<\/section>\s*$/, burnRowHTML(date) + '</section>');
  h += `<div class="fa-cta"><button class="btn fa-addbtn" data-act="foodAdd">${ICON.plus} Add food</button><button class="btn ghost fa-cam" data-act="mealSnap" aria-label="Snap your meal"><span aria-hidden="true">📸</span></button><button class="btn ghost fa-scan" data-act="barcodeScan" aria-label="Scan a barcode"><span aria-hidden="true">▥</span> Scan</button></div>`;
  h += usualsHTML(date);
  h += dayLogHTML(date);
  h += proteinIdeasHTML();
  h += macroTrendsHTML();
  return h;
};

/* calories burned, folded into the summary card as one row */
function burnRowHTML(date) {
  const r = burnSplit(date), ate = foodTotals(date).cal, chev = ICON.chevR.replace('<svg', '<svg width="16" height="16" style="opacity:.4;flex:none"');
  if (!r.has) return `<button class="bn-row" data-act="burnOpen" data-date="${date}"><span aria-hidden="true">🔥</span><span class="grow muted small">${r.work ? `Workouts burned <b>${fmtN(r.work)}</b> kcal · add the day's total` : 'Add calories burned'}</span>${chev}</button>`;
  const net = r.total ? ate - r.total : null;
  const segs = [['w', r.work], ['m', r.mixed != null ? r.mixed : r.other], ['r', r.rest]].filter(x => x[1] > 0), sum = segs.reduce((a, x) => a + x[1], 0) || 1;
  const parts = [r.work ? `${fmtN(r.work)} workouts` : '', r.other != null ? `${fmtN(r.other)} moving` : r.mixed != null ? `${fmtN(r.mixed)} moving + resting` : '', r.rest != null ? `${fmtN(r.rest)} resting` : ''].filter(Boolean).join(' · ');
  return `<button class="bn-row" data-act="burnOpen" data-date="${date}"><span aria-hidden="true">🔥</span><span class="grow"><span class="small"><b>${fmtN(r.grand)}</b> <span class="muted">kcal burned${r.total ? '' : ' (active)'}${net != null && ate > 0 ? ` · ${fmtN(Math.abs(net))} ${net >= 0 ? 'surplus' : 'deficit'}` : ''}</span></span>
    <span class="bn-bar bn-thin" aria-hidden="true">${segs.map(x => `<i class="bn-${x[0]}${x[0] === 'm' && r.mixed != null ? ' bn-mix' : ''}" style="flex:${x[1] / sum}"></i>`).join('')}</span><span class="faint tiny">${parts}</span></span>${chev}</button>`;
}

/* ---------- your usuals ---------- */
function usualsHTML(date) {
  const us = usualsList();
  if (!us.length) return `<section class="card us-empty"><b>⭐ Your usuals</b><p class="muted small" style="margin:4px 0 0">Foods you log often show up here so you can add them again in one tap.</p></section>`;
  const pins = us.filter(u => u.pin), todo = pins.filter(u => !cntOn(u.k, date)), kc = todo.reduce((a, u) => a + itK(u.it), 0), shown = UI.usualsAll ? us : us.slice(0, USUAL_SHOW);
  return `<section class="card us-card"><div class="card-h"><h2 class="sec-t" style="margin:0">Your usuals</h2><button class="linkbtn" style="padding:0;font-size:14px" data-act="usualsEdit">Edit</button></div>
    ${todo.length ? `<button class="btn block us-staples" data-act="usualStaples">📌 Add ${todo.length === pins.length ? 'your' : 'the other'} ${todo.length} daily ${todo.length === 1 ? 'staple' : 'staples'} <span class="faint">· ${fmtN(kc)} kcal</span></button>` : ''}
    <div class="usuals">${shown.map(u => tileHTML(u, date)).join('')}</div>
    ${us.length > USUAL_SHOW ? `<button class="linkbtn center" style="width:100%" data-act="usualsMore">${UI.usualsAll ? 'Show less' : `Show all ${us.length}`}</button>` : ''}
    <p class="faint tiny center" style="margin:8px 0 0">Tap to add · hold for options${pins.length ? '' : ' · pin daily staples to add them all at once'}</p></section>`;
}
function tileHTML(u, date) {
  const it = u.it, c = cntOn(u.k, date), sub = [amtShort(it), `${fmtN(itK(it))} kcal`].filter(Boolean).join(' · ');
  return `<div class="ut${c ? ' on' : ''}"><button class="ut-main" data-act="usualAdd" data-k="${esc(u.k)}" aria-label="Add ${esc(it.name)}${c ? `, ${c} logged` : ''}">
    <b>${u.pin ? '<span class="ut-pin" aria-hidden="true">📌</span>' : ''}${u.meal ? '🍽 ' : ''}${esc(it.name)}</b><span class="ut-s">${esc(sub)}</span><span class="ut-s">${trim(itP(it), 0)} g protein</span>
    <span class="ut-plus" aria-hidden="true">${ICON.plus}</span>${c ? `<span class="ut-c" aria-hidden="true">✓${c > 1 ? ' ' + c : ''}</span>` : ''}</button></div>`;
}
A.usualAdd = (d, el) => quickAdd(d.k, el.closest('.ut') || el);
A.usualsMore = () => { UI.usualsAll = !UI.usualsAll; render(); };
A.usualStaples = () => {
  const date = foodDate(), todo = usualsList().filter(u => u.pin && !cntOn(u.k, date)); if (!todo.length) return;
  const before = foodTotals(date), day = clone(foodDay(date)), now = Date.now(), added = todo.map((u, i) => ({ ...foodFrom(u), id: newId(), ts: now + i }));
  day.date = date; day.items = [...(day.items || []), ...added]; put('food', date, day); todo.forEach(bumpMine); feedBuddy(before, foodTotals(date));
  if (!REDUCED()) confetti({ n: 40 });
  toastUndo(`Added ${added.length} ${added.length === 1 ? 'staple' : 'staples'} · ${fmtN(added.reduce((a, x) => a + itK(x), 0))} kcal`, () => removeFoodIds(added.map(x => x.id), date));
};
/* hold a tile for its options */
{
  let t = null, fired = false, sx = 0, sy = 0;
  const stop = () => clearTimeout(t);
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.ut-main, .fa-main'); if (!b || b.closest('.sw-open')) return;
    fired = false; sx = e.clientX; sy = e.clientY; stop();
    t = setTimeout(() => { if (b.closest('.sw-drag')) return; fired = true; b.closest('.ut')?.classList.remove('just'); A.usualMore({ k: b.dataset.k }); }, 480);
  });
  document.addEventListener('pointerup', stop); document.addEventListener('pointercancel', stop);
  document.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stop(); });
  window.addEventListener('click', e => { if (fired && e.target.closest && e.target.closest('.ut-main, .fa-main')) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.ut, .sw')) e.preventDefault(); });
}
A.usualMore = d => {
  const u = foodIndex().get(d.k); if (!u) return;
  const pinned = (S().foodPins || []).includes(u.k), date = foodDate(), c = cntOn(u.k, date), it = u.it, k = esc(u.k);
  openSheet(it.name, `<p class="muted small" style="margin:0 0 14px">${esc([amtShort(it), `${fmtN(itK(it))} kcal`, `${trim(itP(it), 0)} g protein`].filter(Boolean).join(' · '))}${u.recent.size ? `<br><span class="faint">Logged on ${u.recent.size} of the last ${USUAL_DAYS} days</span>` : ''}</p>
    <div class="us-acts"><button class="btn block" data-act="usualAddClose" data-k="${k}">${ICON.plus} Add it</button>
    <button class="btn ghost block" data-act="faForm" data-k="${k}">Add a different amount</button>
    <button class="btn ghost block" data-act="usualPin" data-k="${k}">${pinned ? 'Unpin from daily staples' : '📌 Pin as a daily staple'}</button>
    ${c ? `<button class="btn ghost block" data-act="usualUndo" data-k="${k}">Remove one from ${date === todayStr() ? 'today' : 'this day'} <span class="faint">(${c} logged)</span></button>` : ''}
    ${usualsList().some(x => x.k === u.k) ? `<button class="btn ghost block" data-act="usualHide" data-k="${k}">Hide from usuals</button>` : ''}
    <button class="linkbtn danger center" style="width:100%;text-align:center;justify-content:center" data-act="foodForget" data-k="${k}">Delete from your foods</button></div>`);
};
A.usualAddClose = d => { closeSheet(); quickAdd(d.k); };
function setPin(k, on) { const s = S(), pins = (s.foodPins || []).filter(x => x !== k); if (on) pins.push(k); saveSettings({ foodPins: pins, foodHide: (s.foodHide || []).filter(x => x !== k) }); }
A.usualPin = d => {
  const on = !(S().foodPins || []).includes(d.k); setPin(d.k, on); closeSheet();
  toast(on ? '📌 Pinned. Add all your staples in one tap from Your usuals.' : 'Unpinned');
};
A.usualUndo = d => {
  const date = foodDate(), xs = (foodDay(date).items || []).filter(x => keyOf(x.name) === d.k).sort((a, b) => (b.ts || 0) - (a.ts || 0)); if (!xs.length) return;
  const gone = xs[0]; removeFoodIds([gone.id], date); closeSheet();
  toastUndo(`Removed one ${gone.name}`, () => { const dd = clone(foodDay(date)); dd.date = date; dd.items = [...(dd.items || []), gone]; put('food', date, dd); });
};
A.usualHide = d => {
  const s = S(), oldP = s.foodPins || [], oldH = s.foodHide || [];
  saveSettings({ foodPins: oldP.filter(x => x !== d.k), foodHide: [...oldH.filter(x => x !== d.k), d.k] });
  if ($('#sheet [data-act=usualPinE]')) drawUsualsEdit(); else closeSheet();
  toastUndo('Hidden from usuals', () => saveSettings({ foodPins: oldP, foodHide: oldH }));
};
A.usualsEdit = () => { openSheet('Your usuals', ''); drawUsualsEdit(); };
function drawUsualsEdit() {
  const s = S(), pins = s.foodPins || [], hide = s.foodHide || [], ix = foodIndex(), us = usualsList();
  const row = (u, hid) => `<div class="row us-er"><div class="grow"><b>${esc(u.it.name)}</b><div class="faint small">${u.recent.size ? `${u.recent.size} of the last ${USUAL_DAYS} days` : 'Not lately'} · ${fmtN(itK(u.it))} kcal</div></div>
    ${hid ? `<button class="btn sm ghost" data-act="usualShow" data-k="${esc(u.k)}">Show</button>` : `<button class="pinbtn" data-act="usualPinE" data-k="${esc(u.k)}" aria-pressed="${pins.includes(u.k)}" aria-label="${pins.includes(u.k) ? 'Unpin' : 'Pin'} ${esc(u.it.name)}">📌</button><button class="iconbtn sm" data-act="usualHide" data-k="${esc(u.k)}" aria-label="Hide ${esc(u.it.name)}">${ICON.x}</button>`}</div>`;
  sheetBody(`<p class="muted small" style="margin:0 0 8px">Anything you've logged on 2 or more days lately shows up here on its own. <b>Pin</b> your daily staples (shakes, snacks) to keep them first and add them all with one tap.</p>
    ${us.length ? us.map(u => row(u)).join('') : '<p class="faint small">Nothing yet. Log a few foods first.</p>'}
    ${hide.length ? `<span class="lbl" style="display:block;margin-top:16px">Hidden</span>${hide.map(k => ix.get(k)).filter(Boolean).map(u => row(u, true)).join('')}` : ''}`);
}
A.usualPinE = d => { setPin(d.k, !(S().foodPins || []).includes(d.k)); drawUsualsEdit(); };
A.usualShow = d => { saveSettings({ foodHide: (S().foodHide || []).filter(x => x !== d.k) }); drawUsualsEdit(); };

/* ---------- one Add food sheet ---------- */
A.foodAdd = () => {
  openSheet('Add food', addSheetHTML(), { onMount: L => {
    const q = $('#fa-q', L); q.addEventListener('input', () => { $('#fa-list', L).innerHTML = faListHTML(q.value); $('.fa-ways', L).hidden = !!q.value.trim(); const hero = $('.fa-hero', L); if (hero) hero.hidden = !!q.value.trim(); });
  } });
};
function addSheetHTML() {
  const ai = !!CAP.sample, date = foodDate(), yn = (foodDay(addDays(date, -1)).items || []).length;
  const ways = [['barcodeScan', '▥', 'Scan barcode'], ai && ['foodSnap', ICON.camera, 'Snap a label'], ai && ['foodDescribe', ICON.spark, 'Describe it'], ['faManual', ICON.plus, 'Enter manually'], ['mealStart', '🍽', 'Build a meal'], yn && ['copyYesterday', '↺', date === todayStr() ? 'Copy yesterday' : 'Copy day before']].filter(Boolean);
  return `<div class="fa-search">${ICON.search}<input id="fa-q" type="search" placeholder="Search your foods" autocomplete="off" autocapitalize="off" enterkeyhint="search" aria-label="Search your foods"></div>
    <button class="fa-hero" data-act="mealSnap"><span class="fa-hi" aria-hidden="true">📸</span><span class="grow"><b>Snap your meal</b><span class="faint">Take a photo, add details if you like, and get portions and macros.</span></span>${ICON.chevR}</button>
    <div class="fa-ways" style="--n:${ways.length <= 4 ? ways.length : 3}">${ways.map(([a, ic, l]) => `<button class="fa-way" data-act="${a}"><span class="fa-ic" aria-hidden="true">${ic}</span><span>${l}</span></button>`).join('')}</div>
    <div id="fa-list">${faListHTML('')}</div>
    ${ai ? '' : `<p class="faint small" style="margin-top:12px">Want label scanning? <button class="linkbtn" style="padding:0;font-size:inherit" data-act="openSettings">Add your free AI key</button> in Settings.</p>`}
    ${myFoods().length ? '<button class="linkbtn center" style="width:100%;margin-top:6px" data-act="manageMyFoods">Manage saved foods</button>' : ''}`;
}
function faListHTML(q) {
  const date = foodDate(), ql = keyOf(q), words = ql ? ql.split(' ') : [];
  let xs = [...foodIndex().values()];
  if (words.length) xs = xs.filter(u => words.every(w => u.k.includes(w)));
  xs.sort((a, b) => (words.length ? (b.k.startsWith(words[0]) - a.k.startsWith(words[0])) : 0) || b.recent.size - a.recent.size || (b.last || '').localeCompare(a.last || '') || b.n - a.n);
  if (!xs.length) return ql ? `<p class="muted small center" style="margin:14px 0 10px">Nothing saved called “${esc(q.trim())}”.</p><button class="btn ghost block" data-act="faManual" data-n="${esc(q.trim())}">${ICON.plus} Enter “${esc(q.trim())}” manually</button>`
    : '<p class="faint small" style="margin:12px 0 0">Foods you log show up here, so next time it’s one tap.</p>';
  return `<div class="fa-lblrow"><span class="lbl">${ql ? `${xs.length} ${xs.length === 1 ? 'match' : 'matches'}` : 'Your foods'}</span><span class="faint tiny">Swipe left to delete</span></div><div class="fa-list">${xs.slice(0, 40).map(u => faRowHTML(u, date)).join('')}</div>`;
}
function faRowHTML(u, date) {
  const it = u.it, c = cntOn(u.k, date), sub = [amtShort(it), `${fmtN(itK(it))} kcal`, `${trim(itP(it), 0)} g protein`].filter(Boolean).join(' · ');
  return `<div class="sw"><button class="sw-del" data-act="foodForget" data-k="${esc(u.k)}" aria-label="Delete ${esc(it.name)} from your foods">${ICON.x}<span>Delete</span></button><div class="sw-c fa-row${c ? ' on' : ''}"><button class="fa-main" data-act="faForm" data-k="${esc(u.k)}"><b>${u.meal ? '🍽 ' : ''}${esc(it.name)}</b><span class="faint small">${esc(sub)}</span>${c ? `<span class="fa-c">✓ ${c > 1 ? c + ' ' : ''}logged ${date === todayStr() ? 'today' : 'this day'}</span>` : ''}</button><button class="fa-plus" data-act="faAdd" data-k="${esc(u.k)}" aria-label="Add ${esc(it.name)}">${ICON.plus}</button></div></div>`;
}
A.faAdd = (d, el) => {
  const row = el.closest('.sw'); if (!quickAdd(d.k)) return;
  const u = foodIndex().get(d.k); if (!row || !u) return;
  const tmp = document.createElement('div'); tmp.innerHTML = faRowHTML(u, foodDate()); const nr = tmp.firstElementChild; row.replaceWith(nr);
  if (!REDUCED()) { nr.querySelector('.sw-c').classList.add('just'); sparkle(nr.querySelector('.fa-plus')); }
};
A.faForm = d => { const u = foodIndex().get(d.k); if (!u) return; Sheet.meal = null; foodForm(foodFrom(u), null, false, true); sheetTitle(u.it.name); };
A.faManual = d => { Sheet.meal = null; foodForm({ name: d.n || '', servingSize: 1, servingUnit: 'serving', cal: '', p: '', c: '', f: '', qty: 1, mode: 'servings', src: 'manual' }); sheetTitle('Enter manually'); };

/* ---------- the day's log, by time of day ---------- */
const SLOTS = [['Morning', 0, 11], ['Afternoon', 11, 16], ['Evening', 16, 21], ['Late night', 21, 24]];
function dayLogHTML(date) {
  const items = (foodDay(date).items || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)), today = date === todayStr(), tot = items.reduce((a, x) => a + itK(x), 0);
  const head = `<div class="card-h fl-h"><h2 class="sec-t" style="margin:0">${today ? "Today's food" : 'Food this day'}</h2>${items.length ? `<span class="faint small">${items.length} ${items.length === 1 ? 'item' : 'items'} · ${fmtN(tot)} kcal</span>` : ''}</div>`;
  if (!items.length) {
    const yn = (foodDay(addDays(date, -1)).items || []).length;
    return `<section class="card flush">${head}<div class="fl-empty"><p class="muted small" style="margin:0">Nothing logged yet.</p>${yn ? `<button class="btn ghost sm" data-act="copyYesterday">↺ Copy ${today ? 'yesterday' : 'the day before'}</button>` : ''}</div></section>`;
  }
  const slotOf = it => { if (!it.ts) return -1; const h = new Date(it.ts).getHours(); return SLOTS.findIndex(s => h >= s[1] && h < s[2]); };
  const groups = new Map(); for (const it of items) { const g = slotOf(it); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it); }
  const tag = it => it.est === 'photo' ? ' · photo estimate' : it.src === 'label' ? ' · label' : it.src === 'ai' ? ' · estimate' : it.src === 'meal' ? ' · meal' : '';
  let h = '';
  for (const [g, xs] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    h += `<div class="fl-g"><span>${g < 0 ? 'Logged' : SLOTS[g][0]}</span><span>${fmtN(xs.reduce((a, x) => a + itK(x), 0))} kcal</span></div>`;
    h += xs.map(it => `<div class="sw"><button class="sw-del" data-act="logDel" data-id="${it.id}" aria-label="Delete ${esc(it.name)}">${ICON.x}<span>Delete</span></button><div class="sw-c"><button class="row fl-row" data-act="foodEdit" data-id="${it.id}"><div class="grow"><b>${esc(it.name)}</b><div class="faint small">${esc(eatenLabel(it))}${it.ts ? ' · ' + fmtClock(it.ts) : ''}${tag(it)}</div></div><div class="rnum"><b>${fmtN(itK(it))}</b> <span class="faint small">kcal</span><div class="faint tiny">${trim(itP(it), 0)} g protein</div></div></button></div></div>`).join('');
  }
  return `<section class="card flush fl-card">${head}${h}</section>`;
}
PAGES.push(['⭐', 'Your usuals & daily staples', 'usuals staples pin favorites quick add repeat foods shake snacks', () => { UI.tab = 'food'; render(); A.usualsEdit(); }]);

/* ---------- delete: forget a food (it comes back only if you log it again), or delete one logged item ---------- */
A.foodForget = (d, el) => {
  const k = d.k, s0 = S(), u = foodIndex().get(k); if (!u) return;
  const name = u.it.name, mine = myFoods().filter(f => keyOf(f.name) === k), prev = { foodGone: s0.foodGone || {}, foodPins: s0.foodPins || [], foodHide: s0.foodHide || [] };
  const row = el && el.closest('.sw'), inList = row && $('#fa-list');
  const go = () => {
    for (const f of mine) del('myfoods', f.id);
    saveSettings({ foodGone: { ...prev.foodGone, [k]: Date.now() }, foodPins: prev.foodPins.filter(x => x !== k), foodHide: prev.foodHide.filter(x => x !== k) });
    if (inList) { const q = $('#fa-q'); $('#fa-list').innerHTML = faListHTML(q ? q.value : ''); } else if (!$('#fa-list')) closeSheet();
    toastUndo(`Deleted ${name} from your foods`, () => { for (const f of mine) put('myfoods', f.id, f); saveSettings(prev); if ($('#fa-list')) { const q = $('#fa-q'); $('#fa-list').innerHTML = faListHTML(q ? q.value : ''); } });
  };
  if (row && !REDUCED()) { row.style.height = row.offsetHeight + 'px'; void row.offsetWidth; row.classList.add('sw-gone'); setTimeout(go, 220); } else go();
};
A.logDel = (d, el) => {
  const date = foodDate(), gone = (foodDay(date).items || []).find(x => x.id === d.id); if (!gone) return;
  const row = el && el.closest('.sw');
  const go = () => { removeFoodIds([gone.id], date); toastUndo(`Removed ${gone.name}`, () => { const dd = clone(foodDay(date)); dd.date = date; dd.items = [...(dd.items || []), gone]; put('food', date, dd); }); };
  if (row && !REDUCED()) { row.style.height = row.offsetHeight + 'px'; void row.offsetWidth; row.classList.add('sw-gone'); setTimeout(go, 220); } else go();
};

/* ---------- swipe left on a row to reveal Delete (swipe all the way to delete), like iOS lists ---------- */
{
  const W = 92; let st = null, open = null, eat = false;
  const shut = r => { if (!r) return; r.classList.remove('sw-open', 'sw-full'); const c = r.querySelector('.sw-c'); if (c) c.style.transform = ''; };
  document.addEventListener('pointerdown', e => {
    const r = e.target.closest && e.target.closest('.sw');
    if (open && open !== r) { shut(open); open = null; eat = true; setTimeout(() => { eat = false; }, 350); }
    if (!r || e.target.closest('.sw-del')) return;
    st = { r, c: r.querySelector('.sw-c'), x0: e.clientX, y0: e.clientY, base: r.classList.contains('sw-open') ? -W : 0, wasOpen: r.classList.contains('sw-open'), x: 0, mode: null, id: e.pointerId };
  });
  document.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.mode) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) st.mode = 'x'; else if (Math.abs(dy) > 8) { st = null; return; } else return; }
    const w = st.r.offsetWidth; let x = Math.min(0, st.base + dx); if (x < -w * 0.85) x = -w * 0.85;
    st.x = x; st.r.classList.add('sw-drag'); st.c.style.transform = `translateX(${x}px)`; st.r.classList.toggle('sw-full', x < -w * 0.5);
  });
  const end = () => {
    if (!st) return; const s = st; st = null;
    if (s.mode !== 'x') { if (s.wasOpen) { shut(s.r); open = null; eat = true; setTimeout(() => { eat = false; }, 350); } return; }
    s.r.classList.remove('sw-drag'); eat = true; setTimeout(() => { eat = false; }, 350);
    const w = s.r.offsetWidth;
    if (s.x < -w * 0.5) { s.c.style.transform = `translateX(${-w}px)`; s.r.querySelector('.sw-del').click(); return; }
    if (s.x < -W / 2) { s.c.style.transform = `translateX(${-W}px)`; s.r.classList.add('sw-open'); open = s.r; } else { shut(s.r); if (open === s.r) open = null; }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  /* a tap that closes an open row, or the end of a drag, shouldn't also add/open the food */
  window.addEventListener('click', e => { if (eat && e.target.closest && !e.target.closest('.sw-del')) { e.stopPropagation(); e.preventDefault(); eat = false; } }, true);
}
