'use strict';
/* ---------- Bring your history from another app: reads the CSV export from Strong or Hevy (or any CSV with date, exercise, weight and reps columns). ---------- */
function csvParse(text) {
  text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/, 1)[0] || '', sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}
/* "Bench Press (Barbell)" → the app's own name when it has one */
function impExName(raw) {
  const lib = library(), hit = n => lib.get(keyOf(n))?.name; let n = String(raw || '').trim().replace(/\s+/g, ' '); if (!n) return '';
  if (hit(n)) return hit(n);
  const m = n.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const base = m[1].trim(), eq = m[2].trim().toLowerCase(), tries = [];
    if (eq === 'barbell') tries.push(base, `Barbell ${base}`); else if (eq === 'dumbbell') tries.push(`Dumbbell ${base}`, base.replace(/Bench Press/, 'Dumbbell Press'), base.replace(/^(Incline|Decline|Seated|Standing) /, '$1 Dumbbell '), base.replace(/^(Incline|Decline|Seated|Standing) /, '$1 Dumbbell ').replace('Bench Press', 'Press'));
    else if (eq === 'cable') tries.push(`Cable ${base}`, base); else if (eq === 'machine') tries.push(`Machine ${base}`, base); else if (eq === 'smith machine') tries.push(`Smith ${base}`, base);
    else tries.push(base);
    for (const t of tries) if (hit(t)) return hit(t);
    n = eq === 'barbell' || eq === 'bodyweight' ? base : eq === 'dumbbell' ? `Dumbbell ${base}` : n;
  }
  const alias = { 'pull up': 'Pull-ups', 'chin up': 'Chin-ups', 'push up': 'Push-ups', 'squat': 'Squat', 'lat pulldown': 'Lat Pulldown', 'overhead press': 'Overhead Press', 'bent over row': 'Barbell Row', 'triceps pushdown': 'Triceps Pushdown', 'bicep curl': 'Dumbbell Curl' };
  const k = keyOf(n).replace(/-/g, ' '); return hit(alias[k] || '') || n;
}
function impRead(text) {
  const rows = csvParse(text); if (rows.length < 2) return null;
  const H = rows[0].map(h => h.trim().toLowerCase()), col = (...names) => { for (const n of names) { const i = H.findIndex(h => h === n || h.startsWith(n)); if (i >= 0) return i; } return -1; };
  const cDate = col('start_time', 'date'), cEx = col('exercise_title', 'exercise name', 'exercise'), cW = col('weight_lbs', 'weight_kg', 'weight'), cR = col('reps'), cName = col('title', 'workout name'), cSec = col('duration_seconds', 'seconds'), cType = col('set_type'), cOrder = col('set order', 'set_index');
  if (cDate < 0 || cEx < 0 || cR < 0) return null;
  const wh = cW >= 0 ? H[cW] : '', unit = /kg/.test(wh) ? 'kg' : /lb/.test(wh) ? 'lb' : null, src = H.includes('exercise_title') ? 'Hevy' : H.includes('exercise name') ? 'Strong' : 'CSV';
  const pd = v => { let d = new Date(v); if (isNaN(d)) d = new Date(String(v).replace(' ', 'T')); if (isNaN(d)) { const m = String(v).match(/(\d{1,2}) (\w{3}) (\d{4}),? (\d{1,2}):(\d{2})/); if (m) d = new Date(`${m[2]} ${m[1]}, ${m[3]} ${m[4]}:${m[5]}`); } return isNaN(d) ? null : d; };
  const ws = new Map(); let sets = 0; const exs = new Set(), unknown = new Set();
  for (const r of rows.slice(1)) {
    const d = pd(r[cDate]), ex = impExName(r[cEx]); if (!d || !ex) continue;
    const order = cOrder >= 0 ? String(r[cOrder] || '').trim().toUpperCase() : '', type = cType >= 0 ? String(r[cType] || '').toLowerCase() : '';
    if (order === 'REST TIMER' || order === 'NOTE') continue;
    let reps = Math.round(parseFloat(r[cR]) || 0); const secs = cSec >= 0 ? Math.round(parseFloat(r[cSec]) || 0) : 0;
    if (isTimed(ex) && secs) reps = secs; if (!(reps > 0)) continue;
    const w = cW >= 0 ? parseFloat(r[cW]) || 0 : 0, key = d.getTime() + '|' + (cName >= 0 ? r[cName] : '');
    if (!ws.has(key)) ws.set(key, { ts: d.getTime(), name: cName >= 0 ? String(r[cName] || '').trim() : '', sets: [] });
    ws.get(key).sets.push({ ex, w, r: reps, warm: order === 'W' || type === 'warmup' });
    sets++; exs.add(ex); if (!library().get(keyOf(ex))) unknown.add(ex);
  }
  if (!sets) return null;
  const list = [...ws.values()].sort((a, b) => a.ts - b.ts);
  return { src, unit, list, sets, exs: exs.size, unknown: [...unknown], from: list[0].ts, to: list[list.length - 1].ts };
}
A.importHistory = () => { const i = $('#file-import'); i.value = ''; i.click(); };
async function onImportChosen(f) {
  if (!f) return; let text = ''; try { text = await f.text(); } catch (e) {}
  const R = impRead(text); if (!R) return toast("Couldn't find workouts in that file. Export a CSV from Strong or Hevy and try again.", { bad: true, ms: 4500 });
  Sheet.imp = { R, unit: R.unit || (S().unit === 'metric' ? 'kg' : 'lb') }; openSheet('Import workouts', ''); drawImp();
}
function drawImp() {
  const { R, unit } = Sheet.imp, d = t => fmtDate(dateStr(new Date(t))), have = new Set(Store.list('workouts').map(w => w.startTs)), dup = R.list.filter(w => have.has(w.ts)).length;
  sheetBody(`<div class="stats" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div class="stat"><span class="k">Workouts</span><span class="v">${fmtN(R.list.length)}</span></div><div class="stat"><span class="k">Sets</span><span class="v">${fmtN(R.sets)}</span></div><div class="stat"><span class="k">Exercises</span><span class="v">${R.exs}</span></div></div>
    <p class="muted small">From ${R.src}, ${d(R.from)} to ${d(R.to)}.${dup ? ` <b>${dup}</b> already in Liftprint will be skipped.` : ''}</p>
    ${R.unit ? '' : `<div class="field"><span class="lbl">Weights in this file are in</span><div class="seg"><button data-act="impUnit" data-u="lb" aria-pressed="${unit === 'lb'}">lb</button><button data-act="impUnit" data-u="kg" aria-pressed="${unit === 'kg'}">kg</button></div></div>`}
    ${R.unknown.length ? `<details><summary class="faint small">${R.unknown.length} exercise${R.unknown.length === 1 ? '' : 's'} Liftprint doesn't know yet (kept under their own names)</summary><p class="faint small" style="margin:6px 0 0">${R.unknown.slice(0, 40).map(esc).join(', ')}${R.unknown.length > 40 ? '…' : ''}</p></details>` : ''}
    <button class="btn block" data-act="impGo" style="margin-top:12px">Import ${fmtN(R.list.length - dup)} workouts</button><p class="faint tiny center" style="margin:8px 0 0">Your PRs, charts and streaks rebuild from the imported sets. You can undo this.</p>`);
}
A.impUnit = d => { Sheet.imp.unit = d.u; drawImp(); };
A.impGo = () => {
  const { R, unit } = Sheet.imp, have = new Set(Store.list('workouts').map(w => w.startTs)), batch = 'imp' + Date.now().toString(36), docs = { ...Store.docs.workouts }; let n = 0;
  const custom = new Set((S().customEx || []).map(c => keyOf(c.name || c)));
  for (const w of R.list) {
    if (have.has(w.ts)) continue; const id = newId() + n;
    docs[id] = { date: dateStr(new Date(w.ts)), startTs: w.ts, endTs: w.ts + 3600e3, dayName: w.name || 'Imported workout', quick: true, imp: batch, plan: [...new Set(w.sets.map(s => s.ex))],
      sets: w.sets.map((s, i) => ({ id: `${id}s${i}`, ex: s.ex, w: Math.round((unit === 'kg' ? s.w / LB_KG : s.w) * 100) / 100, r: s.r, ts: w.ts + i * 1000, ...(s.warm ? { warm: true } : {}) })) };
    n++;
  }
  Store.docs.workouts = docs; changed(); persist(); saveSettings({ lastImport: batch });
  closeSheet(); toastUndo(`Imported ${fmtN(n)} workouts`, () => impUndo(batch), 8000); if (n && typeof confetti === 'function') confetti({ n: 80 });
};
function impUndo(batch) { const docs = {}; for (const [id, w] of Object.entries(Store.docs.workouts)) if (w.imp !== batch) docs[id] = w; Store.docs.workouts = docs; changed(); persist(); toast('Import removed'); }
A.impUndoLast = async () => { const b = S().lastImport; if (!b) return; if (!(await ask('Remove every workout from your last import?', { ok: 'Remove', danger: true }))) return; impUndo(b); saveSettings({ lastImport: null }); closeSheet(); };
