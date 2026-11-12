'use strict';
/* Lifts: PR list, lift detail (rep maxes, hit/miss vs bodyweight), Big 3, quick PR logging, set editing. */

Views.lifts = {
  title() { return UI.liftKey && liftByKey(UI.liftKey) ? '<h1>Lift</h1>' : '<h1>Lifts &amp; PRs</h1>'; },
  actions() { return `<button class="btn sm" data-act="logPR" data-key="${esc(UI.liftKey || '')}">Log PR attempt</button>`; },
  render() { const L = UI.liftKey && liftByKey(UI.liftKey); if (L) return liftDetailHTML(L); UI.liftKey = null; return liftsListHTML(); },
};

function big3() {
  const b = S().big3 || DEFAULTS.big3, idx = liftIndex();
  const parts = ['squat', 'bench', 'deadlift'].map(k => ({ k, name: b[k], L: idx.get(keyOf(b[k])) || null }));
  const have = parts.every(p => p.L && p.L.e1);
  const total = have ? parts.reduce((a, p) => a + p.L.e1, 0) : null;
  const singles = parts.every(p => p.L && p.L.best[1]) ? parts.reduce((a, p) => a + p.L.best[1].w, 0) : null;
  // running total over time
  const pts = []; if (have) {
    const keys = new Set(parts.map(p => p.L.key)), best = {};
    const evs = allSets().filter(s => keys.has(keyOf(s.ex)) && s.hit !== false);
    for (const s of evs) { const k = keyOf(s.ex), e = e1rm(+s.w || 0, Math.max(1, s.r)); if (!best[k] || e > best[k]) best[k] = e; if (Object.keys(best).length === 3) { const x = parseDate(s.date).getTime(), y = Object.values(best).reduce((a, b) => a + b, 0); if (pts.length && pts[pts.length - 1].x === x) pts[pts.length - 1].y = y; else pts.push({ x, y, date: s.date }); } }
  }
  return { parts, total, singles, pts };
}
function big3CardHTML() {
  const b = big3(), lw = latestWeighin();
  if (!b.total) {
    const missing = b.parts.filter(p => !p.L).map(p => p.name);
    return `<section class="card"><div class="card-h"><h2 class="sec-t">Big 3 total</h2><button class="linkbtn" data-act="openSettings">Change lifts</button></div><p class="muted small">Log at least one set of ${missing.length ? esc(missing.join(', ')) : 'each lift'} to see your squat + bench + deadlift total.</p></section>`;
  }
  return `<section class="card"><div class="card-h"><h2 class="sec-t">Big 3 total</h2><button class="linkbtn" data-act="openSettings">Change lifts</button></div>
    <div class="stats"><div class="stat"><span class="k">Est. total</span><span class="v">${fw(b.total, 0)}<span class="unit">${U.wu}</span></span></div><div class="stat"><span class="k">Tested singles</span><span class="v">${b.singles ? fw(b.singles, 0) : '—'}</span></div><div class="stat"><span class="k">× bodyweight</span><span class="v">${lw ? trim(b.total / lw.weight, 2) : '—'}</span></div></div>
    ${b.pts.length > 1 ? chartSlot('big3', { h: 150, label: 'Estimated Big 3 total over time', series: [{ type: 'step', pts: b.pts.map(p => ({ ...p, y: U.w(p.y) })), extend: true, end: true }], yFmt: v => trim(v, 0), tip: p => `<b>${trim(p.y, 0)} ${U.wu}</b> est. total · ${fmtDate(p.date)}` }) : ''}
    <p class="faint small">${b.parts.map(p => `${esc(p.name)} ${fw(p.L.e1, 0)}`).join(' + ')}. Estimated 1RMs use the Epley formula from your best set.</p></section>`;
}
function liftsListHTML() {
  const lifts = liftList();
  if (!lifts.length) return `<div class="empty"><p>Nothing logged yet. Log a PR you already have (pick its real date) or start a workout. Every set gets checked for rep-max PRs.</p><button class="btn" data-act="logPR">Log a PR attempt</button></div>${big3CardHTML()}`;
  return big3CardHTML() + `<section class="card flush"><h2 class="sec-t" style="padding-top:14px">All lifts</h2>${lifts.map(L => {
    const lastPR = [...L.sets].reverse().find(s => s.pr);
    return `<button class="row" data-act="openLift" data-key="${esc(L.key)}"><div class="ring ${lastPR && daysBetween(lastPR.date, todayStr()) <= 14 ? 'is-pr' : ''}"><span>${esc(initials(L.name))}</span></div><div class="grow"><b>${esc(L.name)}</b><div class="faint small">${L.heavy ? `Heaviest ${fw(L.heavy.w)}×${L.heavy.r}` : 'No completed sets'}${lastPR ? ` · last PR ${fmtDate(lastPR.date)}` : ''}</div></div><div class="rnum"><div style="font:700 22px/1 var(--f-display)">${L.e1 ? fw(L.e1, 0) : '—'}</div><div class="faint tiny">est. 1RM</div></div></button>`;
  }).join('')}</section>`;
}
A.openLift = d => { closeSheet(); UI.tab = 'lifts'; UI.liftKey = d.key; UI.liftFilter = 'key'; $('#view').scrollTop = 0; render(); };
A.liftBack = () => { UI.liftKey = null; render(); };
A.liftFilter = d => { UI.liftFilter = d.f; render(); };

function liftDetailHTML(L) {
  const hits = L.sets.filter(s => s.hit), misses = L.sets.filter(s => !s.hit);
  const x = s => parseDate(s.date).getTime();
  const prLine = []; let run = 0; for (const s of hits) if (s.e1 > run) { run = s.e1; prLine.push({ x: x(s), y: U.w(run), s }); }
  const x0 = Math.min(...L.sets.map(x)), x1 = Math.max(Date.now(), ...L.sets.map(x));
  const tipSet = p => { const s = p.s; return `<b>${fw(s.w)}×${s.r}</b>${s.hit ? '' : ' missed'} · est. 1RM ${fw(s.e1, 0)}<br>${fmtDate(s.date)}${s.bw ? ` · BW ${fw(s.bw.weight)}` : ''}`; };
  const pts = arr => arr.map(s => ({ x: x(s), y: U.w(s.e1), s }));
  const ws = weighins().filter(w => wiX(w) >= x0 - 30 * 864e5);
  const rows = (UI.liftFilter === 'all' ? L.sets : L.sets.filter(s => s.pr || s.baseline || !s.hit)).slice().reverse();
  const frontier = new Map(); for (const r of Object.keys(L.best).map(Number)) { const b = bestAtLeast(L.best, r); if (b) frontier.set(b.id, b); }
  const repCells = [...frontier.values()].sort((a, b) => a.r - b.r).map(b => `<div><span class="k">${b.r} REP${b.r > 1 ? 'S' : ''}</span><span class="v">${fw(b.w)}</span><span class="faint tiny">${fmtDate(b.date)}${b.bw && b.w ? ` · ${ratio(b.w, b.bw)} BW` : ''}</span></div>`).join('');
  return `<button class="back" data-act="liftBack">${ICON.chevL.replace('<svg', '<svg width="18" height="18"')} Lifts</button>
  <div class="card-h"><h1 class="lift-h grow">${esc(L.name)}</h1>${musBtn(L.name)}<button class="iconbtn" data-act="liftMenu" data-key="${esc(L.key)}" aria-label="Lift options">${ICON.dots}</button></div>
  <div class="stats"><div class="stat"><span class="k">Est. 1RM</span><span class="v">${L.e1 ? fw(L.e1, 0) : '—'}<span class="unit">${U.wu}</span></span></div><div class="stat"><span class="k">Heaviest</span><span class="v">${L.heavy ? `${fw(L.heavy.w)}<span class="unit">×${L.heavy.r}</span>` : '—'}</span></div><div class="stat"><span class="k">PRs</span><span class="v">${L.prs}</span></div></div>
  <section class="card"><h2 class="sec-t">Estimated 1RM over time</h2>
    ${chartSlot('lift-' + slug(L.key), { h: 190, x0, x1, label: `${L.name} estimated one-rep max over time`, series: [{ type: 'step', pts: prLine, extend: true }, { type: 'dots', pts: pts(hits.filter(s => !s.pr)), color: 'var(--tx3)', r: 2.5, op: .8 }, { type: 'rings', pts: pts(misses), color: 'var(--miss)' }, { type: 'pr', pts: pts(hits.filter(s => s.pr || s.baseline)) }], scrubPts: pts(L.sets), yFmt: v => trim(v, 0), tip: tipSet })}
    ${legend([['l', 'background:var(--accent)', 'Best so far'], ['', 'background:var(--grad)', 'PR'], ['', 'background:var(--tx3)', 'Other sets'], ['', 'box-shadow:inset 0 0 0 2px var(--miss)', 'Missed']])}
  </section>
  <section class="card"><h2 class="sec-t">Your bodyweight over the same time</h2>
    ${chartSlot('liftbw-' + slug(L.key), { h: 130, x0, x1, label: 'Bodyweight over the same period', empty: 'Log weigh-ins to compare your strength with your bodyweight.', series: [{ type: 'line', pts: ws.map(w => ({ x: wiX(w), y: U.w(w.weight), w })), end: true }], yFmt: v => trim(v, 0), tip: p => `<b>${fw(p.w.weight)} ${U.wu}</b> · ${fmtDate(p.w.date)}${p.w.time ? ' ' + fmtTime(p.w.time) : ''}` })}
    <p class="faint small">Same dates as the chart above, so you can see whether a PR or a miss lined up with a heavier or lighter bodyweight.</p></section>
  ${repCells ? `<section class="card"><h2 class="sec-t">Rep maxes</h2><div class="repmax">${repCells}</div><p class="faint small">Your heaviest weight for each rep count. Lifting more for the same reps (or more reps at the same weight) counts as a PR.</p></section>` : ''}
  <section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t">History</h2><div class="seg" style="width:190px"><button data-act="liftFilter" data-f="key" aria-pressed="${UI.liftFilter !== 'all'}">PRs &amp; misses</button><button data-act="liftFilter" data-f="all" aria-pressed="${UI.liftFilter === 'all'}">All sets</button></div></div>
    ${rows.length ? rows.map(s => setHistoryRow(L, s)).join('') : '<p class="muted small" style="padding:10px 0 16px">No PRs or misses yet.</p>'}</section>`;
}
function setHistoryRow(L, s) {
  const badge = s.pr ? '<span class="pr">PR</span>' : s.baseline ? '<span class="baseb">First</span>' : !s.hit ? '<span class="missb">Missed</span>' : '';
  let note = '';
  if (s.pr) note = `<div class="faint small">${esc(prDesc(s))}</div>`;
  if (!s.hit) {
    const t = s.prevBest;
    if (t && t.bw && s.bw) {
      const diff = s.bw.weight - t.bw.weight;
      note = `<div class="note">Your best for ${s.r}+ reps was ${fw(t.w)}×${t.r} on ${fmtDate(t.date)} at ${fwu(t.bw.weight)} bodyweight. This attempt was at ${fwu(s.bw.weight)} (${Math.abs(diff) < 0.05 ? 'the same' : `${trim(Math.abs(U.w(diff)), 1)} ${U.wu} ${diff < 0 ? 'lighter' : 'heavier'}`}).</div>`;
    } else if (t) note = `<div class="note">Your best for ${s.r}+ reps was ${fw(t.w)}×${t.r} on ${fmtDate(t.date)}.${!s.bw ? ' Log weigh-ins to see how bodyweight compares.' : ''}</div>`;
  }
  return `<button class="row" style="align-items:flex-start" data-act="editSet" data-wid="${s.wid}" data-sid="${s.id}"><div class="grow"><b class="num">${fw(s.w)}${s.w ? ' ' + U.wu : ''} × ${s.r}</b> ${badge}<div class="faint small">${fmtDate(s.date)}${s.bw ? ` · BW ${fw(s.bw.weight)}${s.w ? ` · ${ratio(s.w, s.bw)} BW` : ''}` : ''}${s.r > 1 && s.hit ? ` · est. 1RM ${fw(s.e1, 0)}` : ''}</div>${note}</div></button>`;
}

/* ---------- log a PR attempt (outside a workout) ---------- */
A.logPR = d => {
  const lifts = liftList(), name = d.key ? (liftByKey(d.key)?.name || '') : '';
  const suggestions = [...new Set([...lifts.map(L => L.name), ...Object.values(S().big3 || {}), 'Overhead Press', 'Pull-ups'])].slice(0, 12);
  openSheet('Log a PR attempt', `
    <div class="field"><label class="lbl" for="pr-ex">Lift</label><input id="pr-ex" name="ex" value="${esc(name)}" placeholder="e.g. Bench Press" autocapitalize="words" autocomplete="off"><div class="chips scroll" style="margin-top:4px">${suggestions.map(n => `<button class="chip" data-act="fillLift" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div></div>
    <div class="fields"><div class="field"><label class="lbl" for="pr-w">Weight (${U.wu})</label><input id="pr-w" name="w" inputmode="decimal" placeholder="0 = bodyweight"></div><div class="field"><label class="lbl" for="pr-r">Reps</label><input id="pr-r" name="r" inputmode="numeric" value="1"></div></div>
    <div class="field"><span class="lbl">Result</span><div class="seg">${['hit', 'miss'].map(v => `<button data-act="pick" data-group="res" data-value="${v}" aria-pressed="${v === 'hit'}">${v === 'hit' ? 'Made it' : 'Missed it'}</button>`).join('')}</div></div>
    <div class="field"><label class="lbl" for="pr-d">Date</label><input id="pr-d" type="date" name="date" value="${todayStr()}" max="${todayStr()}"></div>
    <p class="faint small">Backfill older PRs with their real dates. Each one is compared with the weigh-in closest before it.</p>
    <button class="btn block" data-act="savePR">Save</button>`);
};
A.fillLift = d => { const i = $('#pr-ex'); if (i) i.value = d.name; };
A.savePR = () => {
  const ex = fval('ex').replace(/\s+/g, ' '), w = num(fval('w')), r = Math.round(num(fval('r')) || 0), date = fval('date') || todayStr();
  if (!ex) return toast('Which lift was it?', { bad: true });
  if (!r || r < 1) return toast('Enter the number of reps.', { bad: true });
  const hit = picked($('#sheet'), 'res') !== 'miss', lb = U.toLb(w || 0);
  const known = liftByKey(keyOf(ex)); const name = known ? known.name : ex;
  const ts = date === todayStr() ? Date.now() : parseDate(date).getTime() + 18 * 36e5;
  const id = newId(), sid = newId();
  put('workouts', id, { date, quick: true, ts, sets: [{ id: sid, ex: name, w: lb, r, hit, ts }] });
  closeSheet();
  const rec = setRec(liftByKey(keyOf(name)), sid);
  if (rec?.pr) toast(`PR! ${name}: ${prDesc(rec)}`, { pr: true, ms: 3800 });
  else if (!hit) toast('Missed attempt saved. See how bodyweight compared in the lift history.', { ms: 3600 });
  else toast(rec?.baseline ? `${name} added. Future sets get compared with this one.` : 'Saved');
  if (UI.tab === 'lifts') { UI.liftKey = keyOf(name); render(); }
};

/* ---------- edit a single set (from history or a workout) ---------- */
A.editSet = d => {
  const w = Store.docs.workouts[d.wid]; const s = w && (w.sets || []).find(x => x.id === d.sid); if (!s) return;
  openSheet(`Edit ${s.ex}`, `
    <div class="fields"><div class="field"><label class="lbl" for="es-w">Weight (${U.wu})</label><input id="es-w" name="w" inputmode="decimal" value="${plain(U.w(s.w))}"></div><div class="field"><label class="lbl" for="es-r">Reps</label><input id="es-r" name="r" inputmode="numeric" value="${s.r}"></div></div>
    <div class="seg">${['hit', 'miss'].map(v => `<button data-act="pick" data-group="res" data-value="${v}" aria-pressed="${(v === 'hit') === (s.hit !== false)}">${v === 'hit' ? 'Made it' : 'Missed it'}</button>`).join('')}</div>
    ${w.quick ? `<div class="field"><label class="lbl" for="es-d">Date</label><input id="es-d" type="date" name="date" value="${w.date}" max="${todayStr()}"></div>` : `<p class="faint small">${fmtDay(w.date)} · ${esc(w.dayName || 'Workout')}</p>`}
    <button class="btn block" data-act="saveSet" data-wid="${d.wid}" data-sid="${d.sid}">Save</button>
    <button class="linkbtn danger center" data-act="deleteSet" data-wid="${d.wid}" data-sid="${d.sid}">Delete this set</button>`);
};
A.saveSet = d => {
  const w = clone(Store.docs.workouts[d.wid]); if (!w) return closeSheet();
  const r = Math.round(num(fval('r')) || 0); if (!r) return toast('Enter the number of reps.', { bad: true });
  w.sets = w.sets.map(s => s.id === d.sid ? { ...s, w: U.toLb(num(fval('w')) || 0), r, hit: picked($('#sheet'), 'res') !== 'miss' } : s);
  if (w.quick && fval('date')) w.date = fval('date');
  put('workouts', d.wid, w); closeSheet();
};
A.deleteSet = async d => {
  if (!(await ask('Delete this set?', { ok: 'Delete', danger: true }))) return;
  const w = clone(Store.docs.workouts[d.wid]); if (!w) return closeSheet();
  w.sets = w.sets.filter(s => s.id !== d.sid);
  if (!w.sets.length && w.quick) del('workouts', d.wid); else put('workouts', d.wid, w);
  closeSheet();
};

/* ---------- rename / merge a lift ---------- */
A.liftMenu = d => {
  const L = liftByKey(d.key); if (!L) return;
  openSheet(L.name, `<div class="field"><label class="lbl" for="rn">Rename this lift</label><input id="rn" name="rn" value="${esc(L.name)}" autocapitalize="words"></div><p class="faint small">Renaming to the name of another lift merges their history, which is handy for fixing typos.</p><button class="btn block" data-act="renameLift" data-key="${esc(L.key)}">Rename</button><button class="btn ghost block" data-act="logPR" data-key="${esc(L.key)}">Log a PR attempt for this lift</button>`);
};
A.renameLift = async d => {
  const to = fval('rn').replace(/\s+/g, ' '); if (!to) return;
  const target = liftByKey(keyOf(to)), name = target && target.key !== d.key ? target.name : to;
  if (target && target.key !== d.key && !(await ask(`Merge into ${target.name}? Their histories will be combined.`, { ok: 'Merge' }))) return;
  for (const w of Store.list('workouts')) {
    if (!(w.sets || []).some(s => keyOf(s.ex) === d.key) && !(w.plan || []).some(n => keyOf(n) === d.key)) continue;
    put('workouts', w.id, { ...clone(w), sets: (w.sets || []).map(s => keyOf(s.ex) === d.key ? { ...s, ex: name } : s), plan: (w.plan || []).map(n => keyOf(n) === d.key ? name : n) });
  }
  closeSheet(); UI.liftKey = keyOf(name); toast('Lift renamed');
};
