'use strict';
/* Starter program: builds a split from gym days per week, your goals and your gym's equipment.
   Also: general skill trackers (mile time, max pull-ups, vertical...) with PRs. */

function buildProgram(daysPerWeek, goals, gym) {
  const key = daysPerWeek <= 3 ? 'full' : daysPerWeek === 4 ? 'ul' : 'ppl', T = TEMPLATES[key], used = new Set(T.days.flatMap(d => d.ex));
  const days = T.days.map(d => {
    let ex = [...new Set(d.ex.map(n => available(n, gym) ? n : (alternatives(n, gym, d.ex)[0] || {}).name).filter(Boolean))];
    const why = {};
    if (goals.length) {
      const pool = [...library().values()].filter(e => (d.groups.includes(e.group) || e.group === 'Core') && available(e.name, gym) && !ex.includes(e.name) && !used.has(e.name));
      for (const p of bestForGoals(goals, 2, pool, 1)) {
        const sc = goalScore(p.name, goals), g = exGoalIds(p.name).find(x => goals.includes(x));
        if (ex.length >= 6) {
          let lo = -1, loS = Infinity; ex.forEach((n, i) => { if (i < 2) return; const s = goalScore(n, goals); if (s < loS) { loS = s; lo = i; } });
          if (lo < 0 || loS >= sc) continue; ex[lo] = p.name;
        } else ex.push(p.name);
        used.add(p.name); why[p.name] = g;
      }
    }
    return { id: newId(), name: d.name, groups: [...d.groups], exercises: ex, why };
  });
  return { label: T.label, per: daysPerWeek, days };
}
A.buildProgram = d => {
  if (d && d.n) Sheet.progN = +d.n;
  const n = Sheet.progN || S().weeklyGoal || 4, gym = activeGym(), goals = myGoals(), pr = Sheet.prog = buildProgram(n, goals, gym);
  const html = `<p class="muted small" style="margin:0"><b style="color:var(--tx)">${pr.label}</b>, repeating in order. Built for ${gym ? esc(gym.name) + "'s equipment" : 'a fully equipped gym'}${goals.length ? ' and your goals' : ''}.</p>
    <div class="field"><span class="lbl">Gym days per week</span><div class="seg">${[2, 3, 4, 5, 6].map(x => `<button data-act="buildProgram" data-n="${x}" aria-pressed="${x === n}">${x}</button>`).join('')}</div></div>
    ${pr.days.map((day, i) => `<div class="progday"><div class="pd-h"><span class="pd-n">${i + 1}</span><b>${esc(day.name)}</b><span class="faint small">${day.exercises.length} exercises</span></div><ol>${day.exercises.map(x => `<li><span class="grow">${esc(x)}</span>${day.why[x] ? `<span class="gbadge"><i aria-hidden="true">${GOALS[day.why[x]][0]}</i>${esc(GOALS[day.why[x]][1])}</span>` : ''}${musBtn(x)}</li>`).join('')}</ol></div>`).join('')}
    ${gym ? '' : '<p class="faint small" style="margin:0">Add your gym in the Train tab and the app will swap out anything it doesn\'t have.</p>'}
    <button class="btn block" data-act="useProgram">Use this program</button><button class="btn ghost block" data-act="useProgram" data-edit="1">Use it, then let me tweak it</button>`;
  if ($('#sheet').hidden) openSheet('Your starter program', html); else { sheetTitle('Your starter program'); sheetBody(html); }
};
A.useProgram = async d => {
  const pr = Sheet.prog; if (!pr) return;
  if (splitDays().length && !(await ask('Replace your current split with this program? Your logged workouts stay.', { ok: 'Replace' }))) return;
  saveSettings({ split: { days: pr.days.map(({ why, ...x }) => x) }, weeklyGoal: pr.per });
  closeSheet(); toast('Program saved 💪'); confetti({ n: 60 });
  if (d.edit) setTimeout(() => A.editSplit(), 350); else { UI.tab = 'train'; UI.session = false; render(); }
};

/* ---------- skill trackers ---------- */
/* [id, emoji, label, kind, better ('hi'|'lo'), goals] kind: len (in/cm) | time (min+sec) | sec | reps | bpm */
const SKILLS = [
  ['vert', '🦘', 'Vertical jump', 'len', 'hi', ['jump', 'power']], ['broad', '🐸', 'Broad jump', 'len', 'hi', ['jump', 'power']],
  ['dash40', '⚡', '40-yard dash', 'sec', 'lo', ['sprint', 'agility']], ['shuttle', '👟', '5-10-5 shuttle', 'sec', 'lo', ['agility']],
  ['mile', '🏃', 'Mile time', 'time', 'lo', ['endurance']], ['fivek', '🏅', '5K time', 'time', 'lo', ['endurance']], ['rhr', '❤️', 'Resting heart rate', 'bpm', 'lo', ['longevity', 'endurance']],
  ['pullups', '🤸', 'Max pull-ups', 'reps', 'hi', ['relative', 'vback']], ['pushups', '🫸', 'Max push-ups', 'reps', 'hi', ['relative', 'chest']],
  ['plank', '🍫', 'Plank hold', 'time', 'hi', ['core', 'backhealth']], ['hang', '✊', 'Dead hang', 'time', 'hi', ['grip']], ['balance', '⚖️', 'One-leg balance, eyes closed', 'time', 'hi', ['balance', 'longevity']],
  ['wallsit', '🦵', 'Wall sit', 'time', 'hi', ['legs', 'injury']], ['toetouch', '🧘', 'Sit-and-reach', 'len', 'hi', ['mobility']],
];
const SKILL = Object.fromEntries(SKILLS.map(([id, e, l, kind, better, goals]) => [id, { id, e, l, kind, better, goals }]));
const skillFmt = (sk, v) => v == null ? '—' : sk.kind === 'time' ? `${Math.floor(v / 60)}:${pad(Math.round(v % 60))}` : sk.kind === 'sec' ? `${trim(v, 2)}s` : sk.kind === 'len' ? `${trim(U.l(v), 1)}${U.metric ? ' cm' : '″'}` : sk.kind === 'bpm' ? `${trim(v, 0)} bpm` : `${trim(v, 0)}`;
const skillEntries = id => Store.list('skills').filter(x => x.skill === id).sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
const skillBest = (sk, es) => es.length ? (sk.better === 'hi' ? Math.max : Math.min)(...es.map(x => x.v)) : null;
function mySkills() {
  const have = new Set(Store.list('skills').map(x => x.skill)), g = new Set(myGoals()), hidden = new Set(S().skillsHidden || []);
  const out = SKILLS.filter(s => have.has(s[0])).map(s => s[0]);
  for (let round = 0; round < 2; round++) for (const goal of myGoals()) { const sk = SKILLS.find(s => s[5][0] === goal && !out.includes(s[0]) && !hidden.has(s[0])) || (round ? SKILLS.find(s => s[5].includes(goal) && !out.includes(s[0]) && !hidden.has(s[0])) : null); if (sk && out.length < Math.max(4, have.size + 2)) out.push(sk[0]); }
  for (const id of S().skillsPinned || []) if (SKILL[id] && !out.includes(id)) out.push(id);
  return out;
}
function skillsCardHTML() {
  const ids = mySkills();
  return `<section class="card flush"><div class="card-h" style="padding-top:12px"><h2 class="sec-t">Skill trackers</h2><button class="linkbtn" data-act="skillPick">+ Track</button></div>
    ${ids.length ? ids.map(id => { const sk = SKILL[id], es = skillEntries(id), best = skillBest(sk, es), last = es[es.length - 1], first = es[0];
      const d = es.length > 1 ? last.v - first.v : 0, good = d && (d > 0) === (sk.better === 'hi');
      return `<div class="row" style="padding-right:10px"><button class="grow" style="display:flex;align-items:center;gap:12px;text-align:left" data-act="skillOpen" data-id="${id}"><span style="font-size:22px;width:28px;text-align:center" aria-hidden="true">${sk.e}</span><span class="grow"><b>${esc(sk.l)}</b><span class="faint small" style="display:block">${es.length ? `Best ${skillFmt(sk, best)}${es.length > 1 && d ? ` · <span style="color:${good ? 'var(--ok)' : 'var(--miss)'}">${good ? 'improved' : 'slipped'} ${skillFmt(sk, Math.abs(d)).replace(/^0:/, ':')}</span>` : ` · ${fmtDate(last.date)}`}` : 'Not tested yet'}</span></span></button><button class="btn sm ghost" data-act="skillLog" data-id="${id}">Log</button></div>`; }).join('')
      : `<p class="muted small" style="padding:0 16px 14px;margin:0">Track anything you test now and then, like your mile time, max pull-ups or vertical jump, and watch it improve.</p>`}</section>`;
}
A.skillPick = () => {
  const mine = new Set(mySkills());
  openSheet('Track a skill', `<p class="muted small" style="margin:0">Pick what you want to test and improve.</p><div class="exlist">${SKILLS.map(([id, e, l, , , gs]) => `<button class="row" data-act="skillLog" data-id="${id}"><span style="font-size:22px;width:28px;text-align:center" aria-hidden="true">${e}</span><span class="grow"><b>${l}</b><span class="faint small" style="display:block">${gs.map(g => GOALS[g][1]).join(' · ')}</span></span>${mine.has(id) ? '<span class="faint small">Tracking</span>' : ICON.plus.replace('<svg', '<svg width="18" height="18" style="color:var(--tx3)"')}</button>`).join('')}</div>`);
};
function skillInputHTML(sk, v) {
  if (sk.kind === 'time') return `<div class="durin" style="grid-template-columns:1fr 1fr" role="group" aria-label="${esc(sk.l)}"><label><input name="skm" inputmode="numeric" maxlength="3" value="${v != null ? Math.floor(v / 60) : ''}" placeholder="0" aria-label="Minutes"><span>min</span></label><label><input name="sks" inputmode="numeric" maxlength="2" value="${v != null ? pad(Math.round(v % 60)) : ''}" placeholder="00" aria-label="Seconds"><span>sec</span></label></div>`;
  const unit = sk.kind === 'sec' ? 'seconds' : sk.kind === 'len' ? (U.metric ? 'cm' : 'inches') : sk.kind === 'bpm' ? 'bpm' : 'reps';
  return `<div class="inunit"><input name="skv" inputmode="decimal" value="${v != null ? plain(sk.kind === 'len' ? U.l(v) : v, 2) : ''}" placeholder="0" aria-label="${esc(sk.l)} in ${unit}"><span>${unit}</span></div>`;
}
A.skillLog = d => {
  const sk = SKILL[d.id]; if (!sk) return; const e = d.eid ? Store.docs.skills[d.eid] : null;
  const html = `<div class="field"><span class="lbl">${sk.e} ${esc(sk.l)} <span class="faint">(${sk.better === 'hi' ? 'higher' : 'lower'} is better)</span></span>${skillInputHTML(sk, e ? e.v : null)}</div>
    <div class="field"><label class="lbl" for="sk-d">Date</label><input id="sk-d" type="date" name="date" value="${e ? e.date : todayStr()}" max="${todayStr()}"></div>
    <div class="field"><label class="lbl" for="sk-n">Note (optional)</label><input id="sk-n" name="note" value="${esc(e?.note || '')}" placeholder="e.g. after leg day, on the track"></div>
    <button class="btn block" data-act="skillSave" data-id="${sk.id}" data-eid="${d.eid || ''}">Save</button>${e ? `<button class="linkbtn danger center" data-act="skillDel" data-eid="${d.eid}" data-id="${sk.id}">Delete</button>` : ''}`;
  if ($('#sheet').hidden) openSheet(e ? 'Edit entry' : `Log ${sk.l.toLowerCase()}`, html); else { sheetTitle(e ? 'Edit entry' : `Log ${sk.l.toLowerCase()}`); sheetBody(html); }
};
A.skillSave = d => {
  const sk = SKILL[d.id]; let v;
  if (sk.kind === 'time') { const m = num(fval('skm')) || 0, s = num(fval('sks')) || 0; if (s >= 60) return toast('Seconds go up to 59.', { bad: true }); v = m * 60 + s; }
  else { v = num(fval('skv')); if (sk.kind === 'len' && v != null) v = U.toIn(v); }
  if (!(v > 0)) return toast('Enter your result.', { bad: true });
  const prev = skillEntries(sk.id).filter(x => x.id !== d.eid), pb = skillBest(sk, prev);
  put('skills', d.eid || newId(), { skill: sk.id, v, date: fval('date') || todayStr(), note: fval('note'), ts: Date.now() });
  const isPR = pb != null && (sk.better === 'hi' ? v > pb : v < pb);
  A.skillOpen({ id: sk.id });
  if (isPR) { toast(`New best ${sk.l.toLowerCase()}: ${skillFmt(sk, v)}! ${sk.e}`, { pr: true, ms: 3800 }); confetti({ n: 22, emoji: sk.e, power: 13 }); setTimeout(() => confetti({ n: 70 }), 150); } else toast('Saved');
};
A.skillDel = d => { const e = Store.docs.skills[d.eid]; del('skills', d.eid); A.skillOpen({ id: d.id }); if (e) toastUndo('Entry deleted', () => put('skills', d.eid, e)); };
A.skillOpen = d => {
  const sk = SKILL[d.id]; if (!sk) return; const es = skillEntries(sk.id), best = skillBest(sk, es);
  if (!es.length) return A.skillLog(d);
  const html = `<div class="stats"><div class="stat"><span class="k">Best</span><span class="v" style="font-size:26px">${skillFmt(sk, best)}</span></div><div class="stat"><span class="k">Latest</span><span class="v" style="font-size:26px">${skillFmt(sk, es[es.length - 1].v)}</span></div><div class="stat"><span class="k">Tests</span><span class="v" style="font-size:26px">${es.length}</span></div></div>
    ${es.length > 1 ? `<div class="skspark">${spark(es.map(x => sk.better === 'lo' ? -x.v : x.v))}<span class="faint tiny">${sk.better === 'lo' ? 'Up = faster / lower' : 'Up = better'}</span></div>` : ''}
    <button class="btn block" data-act="skillLog" data-id="${sk.id}">Log a new test</button>
    <div>${[...es].reverse().map(x => `<button class="row" data-act="skillLog" data-id="${sk.id}" data-eid="${x.id}"><div class="grow"><b>${skillFmt(sk, x.v)}</b>${x.v === best ? ' <span class="pr">Best</span>' : ''}<div class="faint small">${fmtDate(x.date)}${x.note ? ' · ' + esc(x.note) : ''}</div></div></button>`).join('')}</div>`;
  if ($('#sheet').hidden) openSheet(`${sk.e} ${sk.l}`, html); else { sheetTitle(`${sk.e} ${sk.l}`); sheetBody(html); }
};
