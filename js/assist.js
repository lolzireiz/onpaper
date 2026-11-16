'use strict';
/* ---------- AI assistant: chat about your own data, quick commands, and actions you confirm with a tap.
   Uses the same AI key as photo/label scanning. Also keeps a count of how much of the key's daily allowance this app has used. ---------- */

/* ===== usage meter =====
   The AI service doesn't tell apps how much allowance is left, so the app counts its own requests.
   Daily allowances reset at midnight Pacific time. The daily limit is an editable estimate (Settings in the assistant). */
const AIU_KEY = 'onpaper.aiUse', AIU_TZ = 'America/Los_Angeles';
const aiuDay = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA', { timeZone: AIU_TZ });   // YYYY-MM-DD in Pacific time
function aiuMsToReset(t = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: AIU_TZ, hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  const secs = ((+p.hour % 24) * 3600) + (+p.minute * 60) + (+p.second);
  return (86400 - secs) * 1000 - (t % 1000);
}
function aiUse() {
  let u = null; try { u = JSON.parse(localStorage.getItem(AIU_KEY) || 'null'); } catch (e) {}
  const day = aiuDay(); if (!u || u.day !== day) u = { day, n: 0, tok: 0, kinds: {}, hit: 0, recent: (u && u.recent) || [], hist: (u && u.hist) || {} };
  if (u.day === day && u.n) u.hist[day] = u.n;
  u.recent = (u.recent || []).filter(t => Date.now() - t < 60000);
  return u;
}
function aiUseSave(u) { const keep = Object.keys(u.hist || {}).sort().slice(-14); u.hist = Object.fromEntries(keep.map(k => [k, u.hist[k]])); try { localStorage.setItem(AIU_KEY, JSON.stringify(u)); } catch (e) {} }
function aiUseAdd(kind, meta, model) {
  const u = aiUse(); u.n++; u.tok += (meta && meta.totalTokenCount) || 0; u.kinds[kind] = (u.kinds[kind] || 0) + 1; u.recent.push(Date.now()); u.hist[u.day] = u.n; u.model = model; aiUseSave(u);
  aiMeterRefresh();
}
const aiPerMinute = msg => /per.?minute|PerMinute|RPM/i.test(String(msg || ''));
function aiUseHit(msg) { if (aiPerMinute(msg)) return; const u = aiUse(); u.hit = Date.now(); u.hitMsg = String(msg || '').slice(0, 200); aiUseSave(u); aiMeterRefresh(); }
const aiLimit = () => Math.max(1, +S().aiDailyLimit || 250);
const aiResetTxt = () => { const ms = aiuMsToReset(), h = Math.floor(ms / 3600000), m = Math.ceil((ms % 3600000) / 60000); return h ? `${h}h ${m}m` : `${m}m`; };
const aiResetAt = () => new Date(Date.now() + aiuMsToReset()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function aiUseState() {
  const u = aiUse(), lim = aiLimit(), left = Math.max(0, lim - u.n), pct = Math.min(1, u.n / lim);
  const hitToday = u.hit && aiuDay(u.hit) === u.day, minute = u.recent.length;
  const tone = hitToday || left === 0 ? 'out' : pct >= 0.8 ? 'low' : 'ok';
  return { u, lim, left, pct, hitToday, minute, tone };
}
function aiMeterHTML() {
  const st = aiUseState();
  return `<button class="ai-meter ai-${st.tone}" data-act="aiUsage" aria-label="AI usage today: ${st.u.n} of about ${st.lim}. Resets in ${aiResetTxt()}"><span class="ai-mbar"><i style="width:${Math.round(st.pct * 100)}%"></i></span><span>${st.hitToday ? 'Limit hit' : `${st.u.n}/${st.lim}`}</span><span class="faint">↻ ${aiResetTxt()}</span></button>`;
}
function aiMeterRefresh() { const m = $('#ai-meter'); if (m) m.innerHTML = aiMeterHTML(); }
A.aiUsage = () => {
  const st = aiUseState(), u = st.u, k = u.kinds || {}, days = Object.entries(u.hist || {}).sort().slice(-7);
  const mx = Math.max(st.lim, ...days.map(d => d[1]), 1);
  openSheet('AI usage', `<div class="ai-use-big ai-${st.tone}"><div><b>${u.n}</b><span class="faint"> of ~${st.lim} today</span></div><div class="ai-ubar"><i style="width:${Math.round(st.pct * 100)}%"></i></div>
      <p class="small" style="margin:8px 0 0">${st.hitToday ? `⛔ Your key hit its limit today. It comes back in <b>${aiResetTxt()}</b> (${aiResetAt()}).` : st.tone === 'low' ? `⚠️ About <b>${st.left}</b> left. Resets in <b>${aiResetTxt()}</b> (${aiResetAt()}).` : `✅ About <b>${st.left}</b> left. Resets in <b>${aiResetTxt()}</b> (${aiResetAt()}).`}</p></div>
    <div class="stats ai-use-stats" style="margin-top:12px"><div class="stat"><span class="k">Assistant</span><span class="v">${k.assist || 0}</span></div><div class="stat"><span class="k">Food &amp; scans</span><span class="v">${(k.food || 0)}</span></div><div class="stat"><span class="k">Last minute</span><span class="v">${st.minute}</span></div><div class="stat"><span class="k">Tokens</span><span class="v">${u.tok >= 1000 ? trim(u.tok / 1000, 1) + 'k' : u.tok}</span></div></div>
    ${days.length > 1 ? `<h3 class="sec-t" style="margin-top:14px">Last 7 days</h3><div class="ai-days">${days.map(([d, n]) => `<div><span style="height:${Math.max(3, Math.round(n / mx * 56))}px"></span><b>${n}</b><i>${'SMTWTFS'[parseDate(d).getDay()]}</i></div>`).join('')}</div>` : ''}
    <div class="field" style="margin-top:14px"><label class="lbl" for="ai-lim">Your key's daily limit</label><div class="stepper" style="max-width:240px"><button data-act="step" data-t="ai-lim" data-d="-50" aria-label="Lower">−</button><input id="ai-lim" inputmode="numeric" value="${st.lim}"><button data-act="step" data-t="ai-lim" data-d="50" aria-label="Higher">+</button></div></div>
    <p class="faint small">The AI service doesn't share how much is left, so the app counts every request it sends from this phone. Free keys usually get a few hundred a day and a handful a minute. If your key is used elsewhere too, those don't show here. Everything resets at midnight Pacific time, which is ${aiResetAt()} your time. An assistant message is 1 request; a photo scan is 1, sometimes 2 if it retries.</p>
    <button class="btn block" data-act="aiLimSave">Save limit</button>`);
};
A.aiLimSave = () => { const v = Math.round(num($('#ai-lim').value)); if (!(v >= 1)) return toast('Enter a number.', { bad: true }); saveSettings({ aiDailyLimit: v }); closeSheet(); aiMeterRefresh(); toast('Limit saved'); };

/* ===== your data, summarised for the assistant ===== */
const aiF = (n, d = 0) => n == null || isNaN(n) ? '?' : (+n).toFixed(d).replace(/\.0+$/, '');
function aiContext() {
  const s = S(), t = todayStr(), L = [], add = x => L.push(x), wu = U.wu;
  add(`NOW: ${fmtDay(t)} ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} (${t}). Units: ${s.unit === 'metric' ? 'kg, cm' : 'lb, inches'}. Weights below are in ${wu}.`);
  /* profile */
  const g = myGoals().map(id => (GOALS[id] || [])[1] || id), sp = (typeof mySports === 'function' ? mySports() : []).map(id => SPORT[id]?.l || id);
  add(`PROFILE: ${s.name ? 'name ' + s.name + ', ' : ''}${s.bodyModel === 'female' ? 'female' : 'male'}${s.heightIn ? `, height ${Math.floor(s.heightIn / 12)}'${Math.round(s.heightIn % 12)}"` : ''}. Eating plan: ${s.goal || 'bulk'}${s.goalWeight ? `, goal bodyweight ${fw(s.goalWeight)}` : ''}. Targets: ${s.calTarget} kcal, ${s.proteinTarget} g protein. Trains ${s.weeklyGoal || 4}x/week goal. Goals: ${g.join(', ') || 'none set'}. Sports: ${sp.join(', ') || 'none'}.${s.reach ? ` Standing reach ${aiF(s.reach, 1)} in.` : ''}${s.dunkGoal ? ` Dunk/rim-touch goal ${s.dunkGoal} in.` : ''}`);
  /* weight */
  const ws = weighins(), tr = typeof weightTrend === 'function' ? weightTrend(ws) : new Map(), last = ws[ws.length - 1];
  if (last) {
    const tv = d => { let v = null; for (const [k, x] of tr) if (k <= d) v = x; return v; }, now = tv(t), w2 = tv(addDays(t, -14)), w4 = tv(addDays(t, -28));
    add(`BODYWEIGHT: latest ${fw(last.weight)} on ${last.date}; smoothed trend ${aiF(U.w(now), 1)}${w2 != null ? `, 2-week change ${aiF(U.w(now - w2), 1)}` : ''}${w4 != null ? `, 4-week change ${aiF(U.w(now - w4), 1)} (~${aiF(U.w((now - w4) / 4), 2)}/week)` : ''}. Recent: ${ws.slice(-10).map(w => `${w.date.slice(5)} ${aiF(U.w(w.weight), 1)}`).join(', ')}.`);
  } else add('BODYWEIGHT: no weigh-ins logged.');
  /* food */
  const b = calBudget(t), ft = foodTotals(t), items = foodDay(t).items || [];
  add(`FOOD TODAY: ${aiF(ft.cal)} kcal, ${aiF(ft.p)} g protein, ${aiF(ft.c)} g carbs, ${aiF(ft.f)} g fat. Today's calorie goal after the banking/payback budget: ${b.ceiling} (base ${b.base}${b.carry ? `, ${b.carry > 0 ? '+' : ''}${b.carry} carried from recent days` : ''}). Left: ${Math.max(0, b.ceiling - Math.round(ft.cal))} kcal, ${Math.max(0, s.proteinTarget - Math.round(ft.p))} g protein.${items.length ? ` Eaten: ${items.map(i => `${i.name} (${aiF((i.cal || 0) * (i.qty || 1))} kcal, ${aiF((i.p || 0) * (i.qty || 1))} g P${i.ts ? ' @' + new Date(i.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''})`).join('; ')}.` : ''}`);
  const fd = []; for (let i = 1; i <= 14; i++) { const d = addDays(t, -i), x = foodTotals(d); if (x.cal > 0) fd.push(`${d.slice(5)} ${aiF(x.cal)}kcal/${aiF(x.p)}gP`); }
  add(`FOOD LAST 14 DAYS: ${fd.join(', ') || 'nothing logged'}.`);
  try { const us = usualsList().slice(0, 12).map(u => `${u.it.name} (${aiF(itK(u.it))} kcal)`); if (us.length) add(`USUAL FOODS: ${us.join(', ')}.`); } catch (e) {}
  /* readiness / recovery */
  const dd = dailyOf(t), rd = readiness(t);
  add(`READINESS TODAY: ${rd.has ? `${rd.score}/100 "${rd.lbl}". Sleep ${dd.sleep != null ? dd.sleep + ' h' : '?'}, energy ${dd.energy ?? '?'}/5, sore: ${Object.entries(dd.soreMap || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${['', 'a little', 'sore', 'very sore'][v] || v}`).join(', ') || 'nothing'}${dd.naps && dd.naps.length ? `, naps ${dd.naps.length}` : ''}. Training load ratio ${aiF(rd.ratio, 2)}.` : 'morning check-in not done yet.'}`);
  try { const bs = burnSplit(t); if (bs.has) add(`CALORIES BURNED TODAY: workouts ${bs.work}, active ${bs.active ?? '?'}, total ${bs.total ?? '?'}.`); } catch (e) {}
  /* habits */
  try { const hs = myHabits(); if (hs.length) add(`HABITS (id: name, done today?, streak, last 7 days): ${hs.map(h => `${h.id}: ${h.n}, ${habitDone(h, t) ? 'done' : 'not yet'}, ${habitStreak(h)}d, ${[...Array(7)].map((_, i) => habitDone(h, addDays(t, i - 6)) ? '✓' : '·').join('')}`).join(' | ')}.`); } catch (e) {}
  /* plan + training */
  const days = splitDays(), nx = nextDay(), aw = activeWorkout();
  if (days.length) add(`WORKOUT SPLIT (day id: name: exercises): ${days.map(d => `${d.id}: ${d.name}: ${(d.exercises || []).map(n => { const tg = tgtFor(n); return `${n} ${tg.sets}x${tg.reps}${isTimed(n) ? 's' : ''}`; }).join(', ')}`).join(' || ')}. Next up: ${nx ? nx.name : '?'}.`);
  if (aw) add(`WORKOUT IN PROGRESS right now: ${(aw.plan || []).join(', ')}; sets so far: ${(aw.sets || []).map(x => `${x.ex} ${fw(x.w)}x${rTx(x.ex, x.r)}`).join(', ') || 'none'}.`);
  const wo = Store.list('workouts').filter(w => w.date >= addDays(t, -28)).sort((a, b) => b.date.localeCompare(a.date));
  add(`WORKOUTS LAST 4 WEEKS (${wo.length}): ${wo.slice(0, 14).map(w => { const by = {}; for (const x of (w.sets || [])) if (!x.warm) (by[x.ex] = by[x.ex] || []).push(`${bwFactor(x.ex) ? (x.w ? 'BW+' + aiF(U.w(x.w), 1) : 'BW') : aiF(U.w(x.w), 1)}x${rTx(x.ex, x.r)}${x.hit === false ? '(missed)' : ''}`); const nm = days.find(d => d.id === w.dayId)?.name || (w.quick ? 'quick' : 'workout'); return `${w.date} ${nm}: ${Object.entries(by).map(([e, ss]) => `${e} ${ss.join(' ')}`).join('; ') || 'no sets'}`; }).join(' || ') || 'none'}.`);
  const acts = Store.list('acts').filter(a => a.date >= addDays(t, -14)); if (acts.length) add(`OTHER ACTIVITIES LAST 2 WEEKS: ${acts.slice(0, 10).map(a => `${a.date} ${a.type || a.name || 'activity'}${a.min ? ' ' + a.min + 'min' : ''}`).join(', ')}.`);
  /* lifts */
  const ls = liftList().slice(0, 40).map(Lf => { const old = Lf.sets.filter(x => x.date <= addDays(t, -30) && x.hit && !x.warm).reduce((m, x) => Math.max(m, x.e1), 0); if (Lf.bwf) return `${Lf.name}: bodyweight exercise, best ${Lf.heavy ? `${Lf.heavy.added ? '+' + aiF(U.w(Lf.heavy.added), 1) + ' ' + wu + ' added' : 'bodyweight'} x${Lf.heavy.r}` : '?'}, last ${Lf.last.date}, ${Lf.prs} PRs`;
    return `${Lf.name}: ${isTimed(Lf.name) ? `heaviest ${aiF(U.w(Lf.heavy?.w), 1)} for ${Lf.heavy?.r}s` : `est 1RM ${aiF(U.w(Lf.e1), 0)}, heaviest ${aiF(U.w(Lf.heavy?.w), 1)}x${Lf.heavy?.r}`}${dbKind(Lf.name) === 'pair' ? ' (per dumbbell)' : dbKind(Lf.name) === 'side' ? ' (per side)' : ''}, last ${Lf.last.date}, ${Lf.prs} PRs${old ? `, 30+ days ago best est ${aiF(U.w(old), 0)}` : ''}`; });
  add(`LIFTS (most recent first): ${ls.join(' | ') || 'none yet'}.`);
  /* jumps */
  const js = Store.list('jumps').sort((a, b) => a.date.localeCompare(b.date)); if (js.length) add(`JUMP LOG (rim touch height in, vertical in): ${js.slice(-8).map(j => `${j.date} rim ${j.rim ?? '?'} vert ${j.vert ?? '?'}`).join(', ')}.`);
  /* gym */
  const gy = activeGym(); if (gy) add(`GYM: ${gy.name}. Equipment: ${(gy.equip || []).map(id => EQ_LABEL[id] || id).join(', ')}.`);
  try { const avail = [...library().values()].filter(e => !gy || available(e.name, gy)).map(e => e.name); add(`EXERCISES THE APP KNOWS (use these exact names): ${avail.join(', ')}.`); } catch (e) {}
  return L.join('\n');
}

const AI_SYSTEM = () => `You are the coach built into Liftprint, a personal training, nutrition and recovery tracker. You talk with the app's owner about their own data, given below. Be a sharp, friendly strength & nutrition coach: direct, specific, numbers from their data, no fluff, no medical diagnosis (suggest a doctor for injuries or medical issues). Keep answers short for a phone screen: usually 2-8 short lines or bullets. Use **bold** for key numbers. Never invent data you don't have; if something isn't logged, say so and suggest logging it. Never mention what AI model or company powers you.
Reply ONLY with JSON: {"reply": "markdown text", "actions": [ ... ]}. "actions" is optional and contains things the user can tap to apply; only include them when genuinely useful or asked for. Allowed actions:
- {"type":"log_food","name":"...","cal":number,"p":number,"c":number,"f":number,"serving":"short text"} to log a food for today (per one serving, realistic numbers).
- {"type":"habit","id":"<habit id>","date":"YYYY-MM-DD"} to mark a habit done (today or a past day).
- {"type":"targets","cal":number,"protein":number} to change daily targets (either may be omitted).
- {"type":"swap","day":"<day id>","from":"<exercise in that day>","to":"<exact known exercise name>"} to swap an exercise in their split.
- {"type":"add_ex","day":"<day id>","name":"<exact known exercise name>"} to add an exercise to a split day.
- {"type":"open","screen":"home|train|food|lifts|body|you"} to jump to a screen.
At most 4 actions. The user always confirms before anything changes, so describe in the reply what each action would do.

THEIR DATA:
${aiContext()}`;

/* ===== chat state ===== */
const AIC_KEY = 'onpaper.aiChat';
const aiChat = () => { try { return JSON.parse(localStorage.getItem(AIC_KEY) || '[]'); } catch (e) { return []; } };
const aiChatSave = m => { try { localStorage.setItem(AIC_KEY, JSON.stringify(m.slice(-60))); } catch (e) {} };
const AI_CMDS = [
  ['📋', 'Today\'s plan', 'Give me my game plan for today: training (what\'s next and any weights to aim for based on my last sessions), what I still need to eat, and recovery. Keep it tight.'],
  ['🍽️', 'What to eat', 'Based on what I have left today (calories and protein) and the foods I usually eat, what should I eat for the rest of today? Give 2-3 concrete options with numbers, and offer log buttons for the best one.'],
  ['📈', 'Bulk check', 'How is my lean bulk going? Look at my bodyweight trend vs my target rate, my calorie and protein averages, and tell me if I should change anything.'],
  ['🏋️', 'Last workout', 'Review my most recent workout: what went well, any PRs, anything that stalled, and what to aim for next time on each exercise.'],
  ['📆', 'Week recap', 'Recap my last 7 days: training sessions, food and protein consistency, bodyweight, habits and recovery. Then the one thing to focus on this week.'],
  ['🧱', 'Plateau check', 'Which of my lifts are stalled or going backwards? For each, explain why it might be and a specific fix.'],
  ['😴', 'Recovery', 'Explain my readiness today and what is driving it, and how I should adjust today\'s training.'],
  ['🏀', 'Dunk progress', 'How is my progress toward dunking? Use my jump log, bodyweight and leg/jump training. What should I prioritise next?'],
  ['🔁', 'Swap exercise', 'I want to swap an exercise in my split. Ask me which one and why if I haven\'t said, otherwise suggest the best replacement my gym has and offer the swap.'],
  ['🎯', 'Hit my macros', 'Am I on track to hit my calories and protein today given the time? If not, what is the easiest way to close the gap?'],
];

/* ===== tiny markdown (escaped first) ===== */
function aiMd(txt) {
  const inl = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let list = null;
  for (const raw of String(txt || '').split('\n')) {
    const l = raw.trimEnd(), b = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/), h = l.match(/^#{1,4}\s+(.*)$/);
    if (b) { const ol = /^\s*\d/.test(l); if (!list || list.ol !== ol) { if (list) out.push(list.ol ? '</ol>' : '</ul>'); list = { ol }; out.push(ol ? '<ol>' : '<ul>'); } out.push(`<li>${inl(b[1])}</li>`); continue; }
    if (list) { out.push(list.ol ? '</ol>' : '</ul>'); list = null; }
    if (h) out.push(`<p class="ai-h">${inl(h[1])}</p>`); else if (l.trim()) out.push(`<p>${inl(l)}</p>`);
  }
  if (list) out.push(list.ol ? '</ol>' : '</ul>');
  return out.join('');
}

/* ===== actions the assistant can offer (always applied by a tap) ===== */
function aiActCheck(a) {
  const lib = library(), days = splitDays(), dayOf = id => days.find(d => d.id === id || keyOf(d.name) === keyOf(id || ''));
  if (!a || !a.type) return null;
  if (a.type === 'log_food') { const cal = +a.cal; if (!a.name || !(cal >= 0) || cal > 5000) return null; return { ...a, label: `🍽️ Log ${a.name} · ${Math.round(cal)} kcal${+a.p ? `, ${Math.round(+a.p)} g protein` : ''}` }; }
  if (a.type === 'habit') { const h = myHabits().find(x => x.id === a.id); const d = /^\d{4}-\d\d-\d\d$/.test(a.date || '') && a.date <= todayStr() && a.date >= addDays(todayStr(), -13) ? a.date : todayStr(); if (!h) return null; return { ...a, date: d, label: `${h.e} Mark ${h.n} done ${d === todayStr() ? 'today' : habDayWord(d)}` }; }
  if (a.type === 'targets') { const c = +a.cal, p = +a.protein; if (!(c >= 1200 && c <= 6000) && !(p >= 40 && p <= 400)) return null; return { ...a, label: `🎯 Set targets${c >= 1200 && c <= 6000 ? ` · ${Math.round(c)} kcal` : ''}${p >= 40 && p <= 400 ? ` · ${Math.round(p)} g protein` : ''}` }; }
  if (a.type === 'swap') { const d = dayOf(a.day), to = lib.get(keyOf(a.to || '')); if (!d || !to) return null; const from = (d.exercises || []).find(n => keyOf(n) === keyOf(a.from || '')); if (!from) return null; return { ...a, day: d.id, from, to: to.name, label: `🔁 ${d.name}: swap ${from} → ${to.name}` }; }
  if (a.type === 'add_ex') { const d = dayOf(a.day), e = lib.get(keyOf(a.name || '')); if (!d || !e || (d.exercises || []).some(n => keyOf(n) === keyOf(e.name))) return null; return { ...a, day: d.id, name: e.name, label: `➕ Add ${e.name} to ${d.name}` }; }
  if (a.type === 'open') { const n = { home: 'Home', train: 'Train', food: 'Food', lifts: 'Lifts', body: 'Body', you: 'You' }[a.screen]; if (!n) return null; return { ...a, label: `↗ Open ${n}` }; }
  return null;
}
A.aiAct = d => {
  const m = aiChat(), msg = m[+d.m], a = msg && msg.actions && msg.actions[+d.a]; if (!a || a.done) return;
  const t = todayStr();
  if (a.type === 'log_food') {
    const it = { id: newId(), name: String(a.name).slice(0, 80), serving: a.serving || '1 serving', servingSize: 1, servingUnit: 'serving', qty: 1, mode: 'servings', cal: Math.round(+a.cal), p: +(+a.p || 0).toFixed(1), c: +(+a.c || 0).toFixed(1), f: +(+a.f || 0).toFixed(1), src: 'ai', est: 'ai', ts: Date.now() };
    const was = UI.foodDate; UI.foodDate = t; addFoodItem(it); UI.foodDate = was; if (typeof sfx === 'function') sfx('pop');
  } else if (a.type === 'habit') A.habitTap({ id: a.id, date: a.date });
  else if (a.type === 'targets') saveSettings({ ...(+a.cal >= 1200 && +a.cal <= 6000 ? { calTarget: Math.round(+a.cal) } : {}), ...(+a.protein >= 40 && +a.protein <= 400 ? { proteinTarget: Math.round(+a.protein) } : {}) });
  else if (a.type === 'swap' || a.type === 'add_ex') {
    const s = S(); if (!s.split) return; const split = clone(s.split);
    split.days = split.days.map(x => x.id !== a.day ? x : { ...x, exercises: a.type === 'swap' ? x.exercises.map(n => n === a.from ? a.to : n) : [...(x.exercises || []), a.name] });
    saveSettings({ split });
  } else if (a.type === 'open') { aiClose(); UI.tab = a.screen; render(); return; }
  a.done = 1; aiChatSave(m); aiDraw(); toast(a.label.replace(/^\S+\s/, '') + ' ✓');
};

/* ===== the panel ===== */
const AI = { busy: false, ctl: null, status: '' };
A.aiOpen = () => {
  if ($('#ai')) return;
  const el = document.createElement('div'); el.id = 'ai'; el.className = 'ai-panel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Assistant');
  el.innerHTML = `<header class="ai-top"><button class="iconbtn" data-act="aiClose" aria-label="Close">${ICON.chevL}</button><div class="grow"><b>Assistant</b><div id="ai-meter">${aiMeterHTML()}</div></div><button class="iconbtn" data-act="aiMenu" aria-label="More">${ICON.dots}</button></header>
    <div class="ai-body" id="ai-body"></div>
    <div class="ai-cmds" id="ai-cmds"></div>
    <form class="ai-in" id="ai-form"><button type="button" class="iconbtn ai-cmdbtn" data-act="aiCmds" aria-label="Commands" aria-expanded="false">${ICON.ai}</button><textarea id="ai-text" rows="1" placeholder="Ask your coach…" aria-label="Message"></textarea><button class="ai-send" id="ai-send" aria-label="Send">${ICON.up}</button></form>`;
  document.body.appendChild(el); document.body.classList.add('ai-open');
  const ta = $('#ai-text'); ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); aiSend(); } });
  $('#ai-form').addEventListener('submit', e => { e.preventDefault(); aiSend(); });
  aiVV(); aiDraw(true); AI.tick = setInterval(aiMeterRefresh, 30000);
  if (!REDUCED()) el.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
};
function aiClose() { const el = $('#ai'); if (!el) return; if (AI.ctl) AI.ctl.abort(); clearInterval(AI.tick); el.remove(); document.body.classList.remove('ai-open'); if (window.visualViewport) visualViewport.removeEventListener('resize', aiVVSet); }
A.aiClose = aiClose;
/* keep the input above the iPhone keyboard */
function aiVVSet() { const el = $('#ai'); if (!el || !window.visualViewport) return; el.style.height = visualViewport.height + 'px'; el.style.top = visualViewport.offsetTop + 'px'; const b = $('#ai-body'); if (b && AI.stick) b.scrollTop = b.scrollHeight; }
function aiVV() { if (window.visualViewport) { visualViewport.addEventListener('resize', aiVVSet); aiVVSet(); } }

function aiWelcomeHTML() {
  if (!geminiKey()) return `<div class="ai-empty"><div class="ai-logo">${ICON.ai}</div><h3>Add your AI key first</h3><p class="muted small">The assistant uses the same key as photo and label scanning. It stays on this phone.</p><button class="btn" data-act="aiKey">Add my key</button></div>`;
  const nm = S().name ? `, ${esc(S().name)}` : '';
  return `<div class="ai-empty"><div class="ai-logo">${ICON.ai}</div><h3>Hey${nm}. What do you want to know?</h3><p class="muted small">I can see your workouts, lifts, food, weight, readiness, habits and jump log. I can also log food, tick habits, change targets or swap exercises when you tap to confirm.</p>
    <div class="ai-grid">${AI_CMDS.map((c, i) => `<button class="ai-gc" data-act="aiCmd" data-i="${i}"><span>${c[0]}</span>${esc(c[1])}</button>`).join('')}</div></div>`;
}
function aiDraw(scroll) {
  const body = $('#ai-body'); if (!body) return; const m = aiChat();
  const near = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
  body.innerHTML = (m.length ? m.map((x, i) => x.role === 'user' ? `<div class="ai-msg me"><div>${esc(x.text).replace(/\n/g, '<br>')}</div></div>`
    : `<div class="ai-msg bot${x.err ? ' err' : ''}"><div>${x.err ? `<p>${esc(x.text)}</p>${i === m.length - 1 ? '<button class="btn ghost sm" data-act="aiRetry">Try again</button>' : ''}` : aiMd(x.text)}${(x.actions || []).length ? `<div class="ai-acts">${x.actions.map((a, j) => `<button class="ai-act${a.done ? ' done' : ''}" data-act="aiAct" data-m="${i}" data-a="${j}"${a.done ? ' disabled' : ''}>${a.done ? '✓ ' : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}</div></div>`).join('') : aiWelcomeHTML())
    + (AI.busy ? `<div class="ai-msg bot"><div><span class="ai-dots"><i></i><i></i><i></i></span>${AI.status ? `<span class="faint small"> ${esc(AI.status)}</span>` : ''} <button class="linkbtn small" data-act="aiStop">Stop</button></div></div>` : '');
  $('#ai-cmds').innerHTML = m.length && geminiKey() ? AI_CMDS.map((c, i) => `<button class="chip" data-act="aiCmd" data-i="${i}">${c[0]} ${esc(c[1])}</button>`).join('') : '';
  $('#ai-cmds').hidden = !m.length || !UI.aiCmds;
  const send = $('#ai-send'); if (send) send.disabled = AI.busy || !geminiKey();
  if (scroll || near || AI.busy) { body.scrollTop = body.scrollHeight; AI.stick = true; }
}
A.aiCmds = (d, el) => { UI.aiCmds = !UI.aiCmds; if (el) el.setAttribute('aria-expanded', String(!!UI.aiCmds)); aiDraw(); };
A.aiCmd = d => { const c = AI_CMDS[+d.i]; if (c) { UI.aiCmds = false; aiSend(c[2], `${c[0]} ${c[1]}`); } };
A.aiKey = () => { aiClose(); A.openSettings(); setTimeout(() => { const k = $('#st-gk'); if (k) { k.closest('details') && (k.closest('details').open = true); k.closest('details.sset') && (k.closest('details.sset').open = true); k.scrollIntoView({ block: 'center' }); k.focus(); } }, 350); };
A.aiStop = () => { if (AI.ctl) AI.ctl.abort(); };
A.aiRetry = () => { const m = aiChat(); if (m.length && m[m.length - 1].err) m.pop(); const u = m[m.length - 1]; if (!u || u.role !== 'user') return; m.pop(); aiChatSave(m); aiSend(u.prompt || u.text, u.prompt ? u.text : null); };
A.aiMenu = () => openSheet('Assistant', `<div class="col" style="gap:8px"><button class="btn ghost block" data-act="aiUsage">📊 AI usage &amp; limits</button><button class="btn ghost block" data-act="aiClear">🧹 Clear the chat</button><button class="btn ghost block" data-act="aiKey">🔑 AI key settings</button></div><p class="faint small" style="margin-top:12px">Each message sends a summary of your logged data along with it so the answers are about you. Your chat is kept on this phone only.</p>`);
A.aiClear = () => { const old = aiChat(); aiChatSave([]); closeSheet(); aiDraw(true); if (old.length) toastUndo('Chat cleared', () => { aiChatSave(old); aiDraw(true); }); };

async function aiSend(text, shown) {
  const ta = $('#ai-text'); text = (text ?? (ta ? ta.value : '')).trim(); if (!text || AI.busy) return;
  if (!geminiKey()) return aiDraw();
  const st = aiUseState(); if (st.hitToday) toast(`Your key hit its daily limit. It resets in ${aiResetTxt()}.`, { bad: true, ms: 4000 });
  if (ta && text === ta.value.trim()) { ta.value = ''; ta.style.height = 'auto'; }
  const m = aiChat(); m.push({ role: 'user', text: shown || text, prompt: shown ? text : undefined, ts: Date.now() }); aiChatSave(m);
  AI.busy = true; AI.status = ''; aiDraw(true);
  const hist = m.slice(-13, -1).filter(x => !x.err).map(x => ({ role: x.role === 'user' ? 'user' : 'model', parts: [{ text: x.role === 'user' ? (x.prompt || x.text) : JSON.stringify({ reply: x.text }) }] }));
  const ctl = new AbortController(); AI.ctl = ctl; let out, err;
  try { out = await Gemini.json(text, { signal: ctl.signal, system: AI_SYSTEM(), history: hist, temp: 0.6, kind: 'assist', onStatus: t => { AI.status = t; aiDraw(); } }); }
  catch (e) { err = e; }
  AI.busy = false; AI.ctl = null; AI.status = '';
  const m2 = aiChat();
  if (err) { if (err.code !== 'cancelled') m2.push({ role: 'bot', err: 1, text: err.code === 'rate_limited' ? (aiPerMinute(err.message) ? 'Too many requests in the last minute. Give it a minute and try again.' : `Your key is out of requests for today. It resets in ${aiResetTxt()} (${aiResetAt()}).`) : (aiErrorText(err) || 'Something went wrong. Try again.'), ts: Date.now() }); else { const last = m2[m2.length - 1]; if (last && last.role === 'user') { m2.pop(); if (ta && !ta.value) ta.value = last.prompt ? '' : last.text; } } }
  else {
    const reply = typeof out === 'string' ? out : (out && (out.reply || out.text || out.answer)) || '';
    const acts = (Array.isArray(out && out.actions) ? out.actions : []).map(aiActCheck).filter(Boolean).slice(0, 4);
    m2.push({ role: 'bot', text: reply || "I couldn't come up with an answer. Try asking another way.", actions: acts, ts: Date.now() });
  }
  aiChatSave(m2); aiDraw(true); aiMeterRefresh();
}
