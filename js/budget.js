'use strict';
/* Smart calorie budget: your daily target works as a rolling weekly budget.
   Today's limit = target ± what you were under or over across the previous days (6 by default).
   - Each day moves by at most 25% of target, so a big miss is paid back over a couple of days, not all at once.
   - Days with under half your target logged count as "not tracked" and are skipped (you can override per day).
   - Protein never rolls over: muscle building responds to protein day by day. */

const BUD_CAP = 0.25;
const budDays = () => { const v = S().budgetDays; return v == null ? 7 : +v; };
const dayCal = d => foodTotals(d).cal;
function budTracked(d, base) { const o = dailyOf(d).budget; if (o === 'out') return false; if (o === 'in') return true; return dayCal(d) >= base * 0.5; }
const r10 = v => Math.round(v / 10) * 10;
function calBudget(date = todayStr()) {
  return Store.cached('bud:' + date, () => {
    const s = S(), base = s.calTarget || 2500, n = budDays(), eaten = dayCal(date);
    if (!n) return { base, ceiling: base, carry: 0, raw: 0, cap: 0, rows: [], eaten, left: base - eaten, off: true, n: 0 };
    const rows = [];
    for (let i = n - 1; i >= 1; i--) { const d = addDays(date, -i), cal = dayCal(d), tracked = budTracked(d, base); rows.push({ d, cal, tracked, diff: tracked ? base - cal : 0, forced: dailyOf(d).budget || '' }); }
    const raw = rows.reduce((a, r) => a + r.diff, 0), cap = r10(base * BUD_CAP), carry = r10(clamp(raw, -cap, cap)), ceiling = base + carry;
    const tr = rows.filter(r => r.tracked), sum = tr.reduce((a, r) => a + r.cal, 0);
    return { base, ceiling, carry, raw, cap, rows, eaten, left: ceiling - eaten, n, prevAvg: tr.length ? sum / tr.length : null, nTr: tr.length, sum, skipped: rows.filter(r => !r.tracked && r.cal > 0).length };
  });
}
/* the window average if today ends at `end` kcal */
const budAvg = (b, end) => (b.sum + end) / (b.nTr + 1);
/* tomorrow's limit if today ends at `end` kcal */
function budTomorrow(date, end, full) {
  const base = S().calTarget || 2500, n = budDays(); if (!n) return full ? { v: base, capped: false } : base;
  let raw = base - end; for (let i = 1; i <= n - 2; i++) { const d = addDays(date, -i); if (budTracked(d, base)) raw += base - dayCal(d); }
  const cap = r10(base * BUD_CAP), v = base + r10(clamp(raw, -cap, cap));
  return full ? { v, capped: Math.abs(raw) > cap } : v;
}
const sgn = v => (v >= 0 ? '+' : '−') + fmtN(Math.abs(v));

/* ---------- on the Food tab ---------- */
function budChipHTML(b) {
  if (b.off || Math.abs(b.carry) < 10) return '';
  return `<button class="bud-chip ${b.carry > 0 ? 'up' : 'down'}" data-act="budgetOpen">${b.carry > 0 ? `+${fmtN(b.carry)} banked` : `−${fmtN(-b.carry)} payback`}</button>`;
}
/* one smart line under the rings once you pass your plain target */
function budLineHTML(b, date) {
  if (b.off || b.eaten <= b.base) return '';
  const today = date === todayStr(), avg = budAvg(b, b.eaten), dAvg = avg - b.base;
  if (b.eaten <= b.ceiling) return `<button class="bud-line ok" data-act="budgetOpen"><span aria-hidden="true">✓</span><span>Over ${fmtN(b.base)}, but inside ${today ? "today's" : 'this day’s'} budget thanks to the days before. ${today ? `${fmtN(b.left)} left.` : ''}</span></button>`;
  const over = b.eaten - b.ceiling, near = Math.abs(dAvg) <= b.base * 0.05;
  return `<button class="bud-line warn" data-act="budgetOpen"><span aria-hidden="true">⚖️</span><span>${fmtN(over)} over ${today ? "today's" : 'the'} budget. Your ${b.nTr + 1}-day average is ${fmtN(avg)} (${sgn(dAvg)})${near ? ', still basically on target' : ''}.${today ? ` Tomorrow ≈ ${fmtN(budTomorrow(date, b.eaten))}.` : ''}</span></button>`;
}

/* ---------- the budget sheet: the math, the week, and planning a big meal ---------- */
function budPlanHTML(b, date, planTxt) {
  const plan = num(String(planTxt || '').replace(/,/g, '')) || 0, end = b.eaten + plan;
  let planOut = '';
  if (plan > 0) {
    const fits = end <= b.ceiling, avg = budAvg(b, end), T = budTomorrow(date, end, true), tm = T.v;
    planOut = fits ? `<p class="bud-pr ok">✓ That fits. You'd finish around <b>${fmtN(end)}</b>, with ${fmtN(b.ceiling - end)} to spare.</p>`
      : `<p class="bud-pr warn">You'd finish around <b>${fmtN(end)}</b>, ${fmtN(end - b.ceiling)} over today's budget. Your ${b.nTr + 1}-day average would be <b>${fmtN(avg)}</b> (${sgn(avg - b.base)} vs ${fmtN(b.base)}), and tomorrow's budget would be about <b>${fmtN(tm)}</b>${T.capped ? ', with the rest spread over the days after' : ''}.</p>`;
  }
  return planOut;
}
A.budgetOpen = () => { Sheet.bud = { plan: '' }; openSheet('Smart calorie budget', ''); drawBudget(); };
function drawBudget() {
  const date = UI.foodDate || todayStr(), today = date === todayStr(), b = calBudget(date), s = S(), n = budDays(), P = Sheet.bud || { plan: '' };
  const seg = `<div class="field"><span class="lbl">Balance calories over</span><div class="seg">${[[0, 'Off'], [3, '3 days'], [7, '7 days']].map(([v, l]) => `<button data-act="budSet" data-v="${v}" aria-pressed="${n === v}">${l}</button>`).join('')}</div></div>`;
  if (b.off) { sheetBody(`<p class="muted">Smart budget is off, so every day is judged on its own against ${fmtN(b.base)} kcal.</p>${seg}`); return; }
  const mx = Math.max(b.base * 1.4, ...b.rows.map(r => r.cal), b.eaten);
  const bar = (cal, cls) => `<span class="bud-bar"><i class="${cls}" style="width:${clamp(cal / mx * 100, 0, 100)}%"></i><em style="left:${b.base / mx * 100}%"></em></span>`;
  const row = r => `<div class="bud-r${r.tracked ? '' : ' off'}"><span class="bud-d">${fmtDay(r.d).replace(/,.*$/, '')}</span>${bar(r.cal, r.cal > b.base ? 'hi' : 'lo')}<span class="bud-n">${r.tracked ? `<b>${fmtN(r.cal)}</b><span class="${r.diff >= 0 ? 'pos' : 'neg'}">${Math.abs(r.diff) < 25 ? 'on target' : r.diff > 0 ? `${fmtN(r.diff)} under` : `${fmtN(-r.diff)} over`}</span>` : `<b class="faint">${r.cal ? fmtN(r.cal) : '—'}</b><span class="faint">${r.cal ? 'looks incomplete' : 'not logged'}</span>`}</span>${r.cal ? `<button class="linkbtn bud-t" data-act="budDay" data-d="${r.d}" data-v="${r.tracked ? 'out' : 'in'}">${r.tracked ? 'Skip' : 'Count'}</button>` : '<span class="bud-t"></span>'}</div>`;
  const planOut = budPlanHTML(b, date, P.plan);
  const head = b.carry > 0 ? `${fmtN(b.base)} target <b class="pos">+ ${fmtN(b.carry)}</b> you didn't eat in the last ${n - 1} days`
    : b.carry < 0 ? `${fmtN(b.base)} target <b class="neg">− ${fmtN(-b.carry)}</b> to balance the last ${n - 1} days` : `${fmtN(b.base)} target. The last ${n - 1} days balanced out.`;
  sheetBody(`<div class="bud-hero"><span class="faint small">${today ? "Today's" : fmtDay(date) + '’s'} budget</span><b><span data-count="${b.ceiling}">${fmtN(b.ceiling)}</span> <small>kcal</small></b><span class="small">${head}</span>${Math.abs(b.raw) > b.cap ? `<span class="faint tiny">The full ${fmtN(Math.abs(b.raw))} is more than one day should absorb, so it's capped at ${fmtN(b.cap)} and the rest carries into the next days.</span>` : ''}</div>
    <div class="bud-now"><div><span class="faint small">Eaten${today ? ' so far' : ''}</span><b>${fmtN(b.eaten)}</b></div><div><span class="faint small">${b.left >= 0 ? 'Left' : 'Over'}</span><b class="${b.left >= 0 ? 'pos' : 'neg'}">${fmtN(Math.abs(b.left))}</b></div><div><span class="faint small">${b.nTr + 1}-day avg${today ? ' so far' : ''}</span><b>${fmtN(budAvg(b, b.eaten))}</b></div></div>
    ${today ? `<div class="field"><label class="lbl" for="bud-plan">Planning a big meal later?</label><div class="bud-planrow"><input id="bud-plan" inputmode="numeric" placeholder="Rough calories, e.g. 1,400" value="${esc(P.plan)}"><span class="faint small">kcal</span></div><div id="bud-po">${planOut}</div></div>` : ''}
    <div class="field"><span class="lbl">The last ${n} days</span><div class="bud-week">${b.rows.map(row).join('')}<div class="bud-r now"><span class="bud-d">${today ? 'Today' : fmtDay(date).replace(/,.*$/, '')}</span>${bar(b.eaten, b.eaten > b.ceiling ? 'over' : 'cur')}<span class="bud-n"><b>${fmtN(b.eaten)}</b><span class="faint">of ${fmtN(b.ceiling)}</span></span><span class="bud-t"></span></div></div>
    <p class="faint tiny" style="margin:6px 0 0">The line marks your ${fmtN(b.base)} target. Days with less than half of it logged look incomplete, so they're skipped unless you tap Count.</p></div>
    ${seg}
    <details class="nap-how"><summary class="faint small">How it works</summary><p class="faint small">Your daily target works like a weekly budget. Eat under one day and the next days get that room back; go over and the next days come down a little. Weight change follows your average over the week, not any single day. Any one day moves by at most 25% (${fmtN(b.cap)} kcal), so a big night out is paid back over a couple of days instead of all at once. Planning a big meal? Eating a bit under the days before banks room automatically. Protein doesn't roll over: your muscles respond to protein day by day, so still aim for ${s.proteinTarget} g every day.</p></details>`);
  const pi = $('#bud-plan'); if (pi) pi.addEventListener('input', () => { Sheet.bud.plan = pi.value; const po = $('#bud-po'); if (po) po.innerHTML = budPlanHTML(calBudget(date), date, pi.value); });
}
A.budSet = d => { saveSettings({ budgetDays: +d.v }); setTimeout(drawBudget, 0); };
A.budDay = d => { putDaily(d.d, { budget: d.v }); setTimeout(drawBudget, 0); };

/* ---------- wire it into the app ---------- */
{
  const fr = Views.food.render;
  Views.food.render = function () {
    let h = fr(); const date = UI.foodDate || todayStr(), b = calBudget(date); if (b.off) return h;
    const s = S(), t = foodTotals(date), a = h.indexOf('<section class="card fsum">'), z = h.indexOf('</section>', a) + 10; if (a < 0) return h;
    let sum = foodSummaryHTML(t, { ...s, calTarget: b.ceiling });
    sum = sum.replace('<div class="fr">', '<div class="fr" data-act="budgetOpen" role="button" aria-label="Calorie budget details">').replace('<span class="fr-l">Calories</span>', `<span class="fr-l">Calories</span>${budChipHTML(b)}`);
    const old = h.slice(a, z), burn = old.slice(old.indexOf('<button class="bn-row"'), old.lastIndexOf('</section>'));
    sum = sum.replace(/<\/section>\s*$/, budLineHTML(b, date) + (burn.startsWith('<button') ? burn : '') + '</section>');
    return h.slice(0, a) + sum + h.slice(z);
  };
}
/* a weigh-in jump the morning after a big day is mostly water: say so */
{
  const sw = A.saveWeighin;
  A.saveWeighin = d => {
    const before = weighins().slice(-1)[0]; sw(d); if (d.id || !before) return;
    const now = weighins().slice(-1)[0]; if (!now || now === before) return;
    const dLb = now.weight - before.weight, gap = daysBetween(before.date, now.date); if (dLb < 1 || gap > 3 || gap < 1) return;
    const y = addDays(now.date, -1), b = calBudget(y), big = dayCal(y) - (S().calTarget || 2500);
    const msg = big >= 400 ? `Up ${trim(U.w(dLb), 1)} ${U.wu} after yesterday's big day. That's mostly water, salt and food weight, not fat. It usually settles in 1–3 days.`
      : dLb >= 1.5 ? `Up ${trim(U.w(dLb), 1)} ${U.wu} since your last weigh-in. Jumps like that are mostly water (salt, carbs, timing); your trend line smooths them out.` : '';
    if (msg) setTimeout(() => toast(msg, { ms: 6500 }), 1600);
  };
}
PAGES.push(['⚖️', 'Smart calorie budget', 'calorie budget bank banking weekly average rollover compensate make up under ate over ate', () => { UI.tab = 'food'; render(); A.budgetOpen(); }]);
