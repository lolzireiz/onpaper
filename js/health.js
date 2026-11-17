'use strict';
/* Health sync, native iPhone app only (does nothing in the browser version).
   Reads from the phone's Health app, which is where a watch syncs to: workouts, steps, sleep, resting heart rate, HRV.
   - Cardio and sport workouts become Sports & cardio entries (once each).
   - A strength workout recorded on the watch fills in "watch stats" on the gym workout logged that day.
   - Sleep pre-fills the morning check-in. Steps, resting heart rate and HRV go to the day record and to the coach.
   hkFetch() talks to the plugin; hkImport() is plain data mapping so it can be tested without a phone. */
const HK_READ = ['steps', 'calories', 'heartRate', 'restingHeartRate', 'heartRateVariability', 'sleep', 'workouts'];
const HK_STRENGTH = /strength|weightlifting|coretraining|crosstraining/i;
const hkPlugin = () => (window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.Health) || null;
const hkAvail = () => !!hkPlugin();
const hkCfg = () => S().health || {};
const hkOn = () => hkAvail() && !!hkCfg().on;
const hkDay = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hkWords = t => String(t || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
function hkActType(t) { const w = hkWords(t); for (const [, list] of ACTS) for (const a of list) if (a[5] && a[5].test(w)) return a[0]; return 'other'; }

async function hkFetch(days = 7) {
  const H = hkPlugin(); if (!H) return null;
  const end = new Date(), start = new Date(Date.now() - days * 864e5); start.setHours(0, 0, 0, 0);
  const rng = { startDate: start.toISOString(), endDate: end.toISOString() }, safe = p => p.then(r => r, () => null);
  const [wk, st, sl, rh, hv] = await Promise.all([
    safe(H.queryWorkouts({ ...rng, limit: 200 })),
    safe(H.queryAggregated({ dataType: 'steps', ...rng, bucket: 'day', aggregation: 'sum' })),
    safe(H.readSamples({ dataType: 'sleep', ...rng, limit: 2000 })),
    safe(H.readSamples({ dataType: 'restingHeartRate', ...rng, limit: 60 })),
    safe(H.readSamples({ dataType: 'heartRateVariability', ...rng, limit: 300 })),
  ]);
  return { workouts: wk && wk.workouts || [], steps: st && st.samples || [], sleep: sl && sl.samples || [], rhr: rh && rh.samples || [], hrv: hv && hv.samples || [] };
}
const HK_AWAKE = /awake|inbed|in_bed|out/i;
function hkSleepByDay(samples) {   // hours asleep, keyed by the day you woke up
  const out = {}; for (const s of samples || []) {
    let min = 0;
    if (Array.isArray(s.stages) && s.stages.length) { for (const g of s.stages) if (!HK_AWAKE.test(g.stage || '')) min += +g.durationMinutes || (new Date(g.endDate) - new Date(g.startDate)) / 6e4 || 0; }
    else if (!HK_AWAKE.test(s.sleepState || '')) min = (new Date(s.endDate) - new Date(s.startDate)) / 6e4;
    if (!(min > 0) || !s.endDate) continue; const d = hkDay(s.endDate); out[d] = (out[d] || 0) + min / 60;
  }
  for (const d in out) out[d] = Math.min(16, Math.round(out[d] * 4) / 4); return out;
}
function hkImport(raw) {
  if (!raw) return { acts: 0, watch: 0, days: 0, paired: [] };
  const cfg = hkCfg(), seen = new Set(cfg.seen || []), res = { acts: 0, watch: 0, days: 0, paired: [] }, t0 = todayStr();
  for (const w of raw.workouts || []) {
    const id = w.platformId || `${w.workoutType}@${w.startDate}`; if (seen.has(id) || !w.startDate) continue;
    const date = hkDay(w.startDate), dur = Math.round(+w.duration || 0); if (dur < 300 || date > t0) { seen.add(id); continue; }
    const kcal = w.totalEnergyBurned > 0 ? Math.round(w.totalEnergyBurned) : null;
    if (HK_STRENGTH.test(w.workoutType || '')) {   // lifting: pair with the gym workout logged at the same time, never create a duplicate
      if ((cfg.nope || []).includes(id)) { seen.add(id); continue; }
      const ws = new Date(w.startDate).getTime(), we = w.endDate ? new Date(w.endDate).getTime() : ws + dur * 1000;
      let best = null, bestScore = -Infinity;
      for (const g of Store.list('workouts')) {
        if (!g.endTs || g.watch || !(g.sets || []).length) continue;
        const timed = g.startTs && !g.noTime && !g.past, score = timed ? Math.min(g.endTs, we) - Math.max(g.startTs, ws) : (g.date === date ? 0 : -Infinity);   // overlap in ms; a gap of up to 30 min still counts
        if (score > bestScore && score > -30 * 6e4) { best = g; bestScore = score; }
      }
      if (best) {
        const nw = clone(Store.docs.workouts[best.id]); nw.watch = { type: hkWords(w.workoutType).replace(/\b\w/g, c => c.toUpperCase()), duration: dur, ...(kcal ? { activeCal: kcal } : {}), src: 'health', hk: id };
        put('workouts', best.id, nw); seen.add(id); res.watch++; res.paired.push({ gym: best.id, hk: id, start: w.startDate, end: w.endDate || new Date(we).toISOString(), dur, kcal });
      } else if (Date.now() - we > 36 * 36e5) seen.add(id);   // nothing to pair it with after a day and a half: stop looking
      continue;
    }
    seen.add(id); const type = hkActType(w.workoutType);
    if (Store.list('acts').some(a => a.date === date && a.type === type && Math.abs((a.duration || 0) - dur) < 600)) continue;   // already logged by hand
    const mi = w.totalDistance > 0 ? w.totalDistance / 1609.344 : null;
    put('acts', newId(), { type, name: type === 'other' ? hkWords(w.workoutType).replace(/\b\w/g, c => c.toUpperCase()) : '', date, duration: dur, dist: mi && ACT[type] && ACT[type].dist ? +mi.toFixed(2) : null, activeCal: kcal, totalCal: null, avgHr: null, maxHr: null, effort: null, note: '', src: 'health', hk: id, ts: new Date(w.startDate).getTime() || Date.now() });
    res.acts++;
  }
  const byDay = {}, set = (d, k, v) => { if (v > 0 && d <= t0) (byDay[d] = byDay[d] || {})[k] = v; };
  for (const s of raw.steps || []) if (s.startDate) set(hkDay(s.startDate), 'steps', Math.round(+s.value || 0));
  for (const [d, h] of Object.entries(hkSleepByDay(raw.sleep))) set(d, 'sleep', h);
  for (const s of [...(raw.rhr || [])].sort((a, b) => a.startDate < b.startDate ? -1 : 1)) set(hkDay(s.startDate), 'rhr', Math.round(+s.value || 0));
  const hv = {}; for (const s of raw.hrv || []) { const d = hkDay(s.startDate); (hv[d] = hv[d] || []).push(+s.value || 0); }
  for (const [d, a] of Object.entries(hv)) set(d, 'hrv', Math.round(a.reduce((x, y) => x + y, 0) / a.length));
  for (const [d, v] of Object.entries(byDay)) { const old = dailyOf(d).hk || {}; if (JSON.stringify({ ...old, ...v }) !== JSON.stringify(old)) { putDaily(d, { hk: { ...old, ...v } }); res.days++; } }
  saveSettings({ health: { ...cfg, on: true, seen: [...seen].slice(-600), last: Date.now() } });
  return res;
}
let hkBusy = false;
const hkNeedsWatch = () => Store.list('workouts').some(g => g.endTs && !g.watch && (g.sets || []).length && Date.now() - g.endTs < 6 * 36e5);   // a recent gym workout still waiting for its watch stats
async function hkHeart(start, end) {   // average and peak heart rate across the workout
  try { const r = await hkPlugin().readSamples({ dataType: 'heartRate', startDate: start, endDate: end, limit: 5000 }); const v = (r && r.samples || []).map(x => +x.value).filter(x => x > 30 && x < 240);
    return v.length ? { avgHr: Math.round(v.reduce((a, b) => a + b, 0) / v.length), maxHr: Math.round(Math.max(...v)) } : {}; } catch (e) { return {}; }
}
function hkPairedNote(p) {
  const g = Store.docs.workouts[p.gym]; if (!g || !g.watch) return; const x = g.watch;
  const line = [fmtDur(x.duration), x.activeCal ? `${trim(x.activeCal, 0)} kcal` : '', x.avgHr ? `♥ ${x.avgHr}` : ''].filter(Boolean).join(' · ');
  const el = document.getElementById('wt-wait-' + p.gym); if (el && typeof watchSectionHTML === 'function') el.outerHTML = watchSectionHTML(g, p.gym);
  toastUndo(`⌚ Paired with your watch workout: ${line}`, () => {   // wrong one? one tap separates them and it is never paired again
    const cur = Store.docs.workouts[p.gym]; if (cur && cur.watch && cur.watch.hk === p.hk) { const nw = clone(cur); delete nw.watch; put('workouts', p.gym, nw); }
    saveSettings({ health: { ...hkCfg(), nope: [...(hkCfg().nope || []), p.hk].slice(-60) } }); render();
  }, 9000);
}
async function hkSync(manual, force) {
  if (!hkOn() || hkBusy) return null; if (!manual && !force && !hkNeedsWatch() && Date.now() - (hkCfg().last || 0) < 10 * 6e4) return null;
  hkBusy = true; let res = null;
  try {
    res = hkImport(await hkFetch(hkCfg().last ? 7 : 14));
    for (const p of res.paired) { const hr = await hkHeart(p.start, p.end); const cur = Store.docs.workouts[p.gym]; if (cur && cur.watch && (hr.avgHr || hr.maxHr)) put('workouts', p.gym, { ...clone(cur), watch: { ...cur.watch, ...hr } }); }
  } catch (e) { if (manual) toast("Couldn't read Health data. Check the permissions in the Health app.", { bad: true }); }
  hkBusy = false;
  if (res && (res.acts || res.watch || res.days)) { Store.rev++; changed(); render(); }
  if (res && res.paired.length) hkPairedNote(res.paired[res.paired.length - 1]);
  else if (res && manual) toast(res.acts ? `Synced: ${res.acts === 1 ? '1 activity' : `${res.acts} activities`}` : 'Health data is up to date');
  hkRowDraw(); return res;
}
/* After a gym workout is finished, keep checking for the watch workout: the watch takes a little while to hand it to the phone. */
let hkHuntT = [];
function hkHunt(id) {
  hkHuntT.forEach(clearTimeout); hkHuntT = [];
  for (const s of [4, 20, 45, 90, 180, 300, 600]) hkHuntT.push(setTimeout(() => { const g = Store.docs.workouts[id]; if (g && !g.watch && hkOn()) hkSync(false, true); }, s * 1000));
}
{ const fin = A.finishWorkout; A.finishWorkout = async d => { const w = activeWorkout(), id = w && w.id; await fin(d); const g = id && Store.docs.workouts[id]; if (g && g.endTs && hkOn()) hkHunt(id); }; }
/* the "add your watch stats" card: with Health connected there is nothing to scan */
{ const ws = watchSectionHTML; watchSectionHTML = function (w, id) {
  if (!w.watch && hkOn() && w.endTs && Date.now() - w.endTs < 6 * 36e5) return `<section class="card" id="wt-wait-${id}" style="background:var(--s2);gap:8px"><div><b>⌚ Looking for your watch workout…</b><p class="muted small">End the workout on your watch and it is paired with this one automatically, usually within a minute. Nothing to scan.</p></div><button class="linkbtn" data-act="watchForm" data-id="${id}" style="align-self:flex-start;padding:0;font-size:13px">Type the numbers in instead</button></section>`;
  return ws(w, id);
}; }
A.hkConnect = async () => {
  const H = hkPlugin(); if (!H) return;
  try {
    const av = await H.isAvailable(); if (av && av.available === false) return toast('Health data is not available on this device.', { bad: true });
    await H.requestAuthorization({ read: HK_READ, write: [] });
  } catch (e) { return toast("Couldn't open the Health permissions.", { bad: true }); }
  saveSettings({ health: { ...hkCfg(), on: true } }); hkSync(true);
};
A.hkSyncNow = () => hkSync(true);
A.hkOff = async () => { if (!await ask('Stop reading Health data? What was already imported stays.', { ok: 'Turn off' })) return; saveSettings({ health: { ...hkCfg(), on: false } }); hkRowDraw(); };

function hkRowHTML() {
  if (!hkAvail()) return ''; const c = hkCfg();
  return `<details class="sset" id="st-hk"${c.on ? '' : ' open'}><summary><span class="si" aria-hidden="true">⌚</span><span class="grow"><b>Health &amp; watch data</b><span class="faint small">${c.on ? (c.last ? `Synced ${new Date(c.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Connected') : 'Bring in workouts, steps, sleep and heart rate'}</span></span></summary><div class="sset-b">
    <p class="muted small" style="margin:0 0 10px">Reads workouts, steps, sleep, resting heart rate and HRV from your phone's Health app, which is where your watch syncs. Liftprint only reads. It never writes to Health, and the data stays on your phone.</p>
    ${c.on ? `<div class="fields"><button class="btn" data-act="hkSyncNow">Sync now</button><button class="btn ghost" data-act="hkOff">Turn off</button></div>` : `<button class="btn block" data-act="hkConnect">Connect Health</button>`}</div></details>`;
}
function hkRowDraw() { const el = $('#st-hk'); if (el) el.outerHTML = hkRowHTML(); }
{ const os = A.openSettings; A.openSettings = d => { os(d); if (!hkAvail()) return; const look = $('#st-look'); const anchor = look && look.closest('details'); if (anchor && !$('#st-hk')) anchor.insertAdjacentHTML('beforebegin', hkRowHTML()); }; }

/* the coach sees it too */
{ const ctx = aiContext; aiContext = function () {
  let s = ctx(); const rows = []; for (let i = 0; i < 7; i++) { const d = addDays(todayStr(), -i), h = dailyOf(d).hk; if (h) rows.push(`${d}: ${[h.steps ? `${h.steps} steps` : '', h.sleep ? `${h.sleep} h asleep` : '', h.rhr ? `resting HR ${h.rhr}` : '', h.hrv ? `HRV ${h.hrv} ms` : ''].filter(Boolean).join(', ')}`); }
  return rows.length ? `${s}\nFROM THEIR WATCH / HEALTH APP (last 7 days, newest first):\n${rows.join('\n')}` : s;
}; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => hkSync(false), 1200); });
setTimeout(() => hkSync(false), 2500);
