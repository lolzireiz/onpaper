'use strict';
/* Onboarding survey: quick, animated, skippable at every step. Runs once for everyone
   (prefilled from current settings for existing users), and again from Settings anytime.
   "edit" mode reuses the interests + goals screens to change goals later. */

const OB = { i: 0, steps: [], a: {}, mode: 'full', seen: new Set(), sugd: [], auto: null };
const PLAN_LBL = { bulk: 'a lean bulk', maintain: 'maintaining', cut: 'a cut' };

function openOnboarding(mode = 'full') {
  const s = S();
  OB.mode = mode; OB.i = 0; OB.seen = new Set(); OB.sugd = []; OB.auto = null;
  OB.steps = mode === 'edit' ? ['sports', 'improve'] : ['welcome', 'you', 'main', 'train', 'sports', 'improve', 'food', 'done'];
  OB.a = { name: s.name || '', bodyModel: s.bodyModel || 'male', unit: s.unit || 'imperial', weight: '', main: s.mainGoal || '', goal: s.goal || 'bulk', weeklyGoal: s.weeklyGoal || 4, defaultSets: s.defaultSets || 3,
    sports: [...(s.sports || [])], goals: [...(s.goals || [])], cal: s.calTarget || 2500, prot: s.proteinTarget || 160, wantPet: s.buddy === true ? 'yes' : 'no', pet: s.pet || 'raccoon' };
  try { localStorage.setItem('onpaper.version', APP_VERSION); } catch (e) {}
  const R = $('#onboard');
  R.innerHTML = `<div class="ob" role="dialog" aria-modal="true" aria-label="Set up Liftprint"><div class="ob-glow" aria-hidden="true"></div>
    <header class="ob-top"><button class="ob-back" data-act="obBack" aria-label="Back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="ob-prog" aria-hidden="true"><i></i></div><button class="ob-skip" data-act="obSkip">${mode === 'edit' ? 'Cancel' : 'Skip'}</button></header>
    <div class="ob-stage"></div>
    <footer class="ob-foot"><button class="btn block ob-next" data-act="obNext">Next</button><button class="ob-alt" data-act="obSkip" hidden>Skip for now</button></footer></div>`;
  R.hidden = false; document.body.classList.add('ob-open');
  /* slide-in transforms must never leave the panel scrolled sideways */
  for (const el of [R.firstElementChild, $('.ob-stage', R)]) el.addEventListener('scroll', () => { if (el.scrollLeft) el.scrollLeft = 0; }, { passive: true });
  if (!REDUCED()) R.firstElementChild.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
  obRender(0);
}
/* reinstalling: skip the survey and go straight to the file picker (must stay in the same tap) */
A.obRestore = () => { saveSettings({ onboarded: S().onboarded || 'skipped' }); A.importData(); obClose(); };
A.startOnboarding = () => { closeSheet(); openOnboarding('full'); };
A.editGoals = () => { closeSheet(); openOnboarding('edit'); };

/* ---------- logo with ridges that draw themselves ---------- */
function obLogo() {
  const cx = 100, cy = 106, specs = [[24, 165, 375], [34, 150, 390, 300], [44, 140, 400, 235], [54, 132, 408, 330], [64, 126, 414, 255]];
  const pt = (rx, ry, a) => [cx + rx * Math.cos(a * Math.PI / 180), cy + ry * Math.sin(a * Math.PI / 180)];
  const arc = (rx, a0, a1, k) => { const ry = rx * 1.12, [x0, y0] = pt(rx, ry, a0), [x1, y1] = pt(rx, ry, a1); return `<path pathLength="1" style="--d:${k * 0.09}s" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${rx} ${ry.toFixed(1)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; };
  let p = '', k = 0; for (const [rx, a0, a1, br] of specs) { if (br) { p += arc(rx, a0, br - 9, k++) + arc(rx, br + 9, a1, k++); } else p += arc(rx, a0, a1, k++); }
  return `<svg class="ob-logo" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="obg" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#ffb238"/><stop offset=".5" stop-color="#ff4f6d"/><stop offset="1" stop-color="#b13dff"/></linearGradient></defs>
    <g class="ridges" fill="none" stroke="url(#obg)" stroke-width="6.6" stroke-linecap="round">${p}</g>
    <g class="bar" fill="#fff"><rect x="71" y="105.8" width="58" height="4.4" rx="2.2"/><rect x="78.4" y="96" width="6.6" height="24" rx="2.3"/><rect x="71" y="99.5" width="5.4" height="17" rx="2"/><rect x="115.6" y="96" width="6.6" height="24" rx="2.3"/><rect x="123.6" y="99.5" width="5.4" height="17" rx="2"/></g></svg>`;
}

/* ---------- views ---------- */
const obSeg = (k, opts) => `<div class="seg ob-in" role="group">${opts.map(([v, l]) => `<button data-act="obPick" data-k="${k}" data-v="${v}" aria-pressed="${String(OB.a[k]) === String(v)}">${l}</button>`).join('')}</div>`;
const OB_VIEWS = {
  welcome() {
    const back = hasData();
    return { t: back ? 'Make Liftprint <span class="gtxt">yours</span>' : 'Welcome to <span class="gtxt">Liftprint</span>', next: "Let's go", alt: true,
      sub: back ? "New: tell the app what you're training for, and it'll point out every exercise that gets you there. All your data stays exactly as it is." : "Every set, PR and weigh-in, and what's actually moving you forward. First, a few quick taps so the app fits you.",
      body: `<div class="ob-hero ob-in">${obLogo()}</div><p class="faint small ob-in" style="text-align:center;margin:0">About 30 seconds · skip anytime</p>${back ? '' : '<button class="linkbtn ob-in" data-act="obRestore" style="align-self:center;font-size:14px">Reinstalling? Restore a backup</button>'}` };
  },
  you() {
    const lw = latestWeighin(), wu = OB.a.unit === 'metric' ? 'kg' : 'lb';
    return { t: 'About you', sub: 'So your numbers and muscle diagrams fit you.', body: `
      <label class="field ob-in"><span class="lbl">What should we call you?</span><input id="ob-name" value="${esc(OB.a.name)}" placeholder="First name (optional)" autocomplete="given-name" autocapitalize="words" maxlength="30"></label>
      <div class="field ob-in"><span class="lbl">Muscle diagrams</span>${obSeg('bodyModel', [['male', 'Male body'], ['female', 'Female body']])}</div>
      <div class="field ob-in"><span class="lbl">Weights in</span>${obSeg('unit', [['imperial', 'Pounds (lb)'], ['metric', 'Kilograms (kg)']])}</div>
      ${lw ? `<p class="muted small ob-in" style="margin:0">Latest weigh-in: <b>${fw(lw.weight)} ${U.wu}</b> ✓</p>` : `<label class="field ob-in"><span class="lbl">Your weight today <span class="faint">(optional)</span></span><div class="inunit"><input id="ob-weight" inputmode="decimal" value="${esc(OB.a.weight)}" placeholder="0"><span id="ob-wu">${wu}</span></div></label>`}` };
  },
  main() {
    return { t: "What's your main goal?", sub: 'Pick the one that matters most right now.', body: `
      <div class="ob-cards">${MAIN_GOALS.map(([id, e, l, sub]) => `<button class="ob-card ob-in" data-act="obPick" data-k="main" data-v="${id}" aria-pressed="${OB.a.main === id}"><span class="oe" aria-hidden="true">${e}</span><span class="grow"><b>${l}</b><span class="faint small">${sub}</span></span><span class="ock" aria-hidden="true"></span></button>`).join('')}</div>
      <div class="field ob-in"><span class="lbl">Eating plan</span><div id="ob-plan">${obSeg('goal', [['bulk', 'Lean bulk'], ['maintain', 'Maintain'], ['cut', 'Cut']])}</div></div>` };
  },
  train() {
    return { t: 'How do you train?', sub: 'Sets your weekly goal and how many sets each exercise starts with.', body: `
      <div class="field ob-in"><span class="lbl">Gym days per week</span><div class="ob-nums">${[2, 3, 4, 5, 6, 7].map(n => `<button data-act="obPick" data-k="weeklyGoal" data-v="${n}" aria-pressed="${OB.a.weeklyGoal === n}">${n}</button>`).join('')}</div></div>
      <div class="field ob-in"><span class="lbl">Sets per exercise</span><div class="ob-nums">${[2, 3, 4, 5].map(n => `<button data-act="obPick" data-k="defaultSets" data-v="${n}" aria-pressed="${OB.a.defaultSets === n}">${n}</button>`).join('')}</div><p class="faint small" style="margin:6px 0 0">You can change it for any exercise mid-workout.</p></div>` };
  },
  sports() {
    return { t: "What are you into?", sub: 'Sports, hobbies, or just your daily life. Pick as many as you want.', body: SPORTS.map(([g, xs]) => `<div class="ob-grp ob-in"><span class="lbl">${g}</span><div class="ob-chips">${xs.map(([id, e, l]) => `<button class="ob-chip" data-act="obTog" data-k="sports" data-v="${id}" aria-pressed="${OB.a.sports.includes(id)}"><i aria-hidden="true">${e}</i>${l}</button>`).join('')}</div></div>`).join('') };
  },
  improve() {
    const sug = suggestGoals(OB.a.sports, OB.a.main); OB.sugd = sug;
    const same = OB.auto && OB.auto.length === OB.a.goals.length && OB.auto.every(g => OB.a.goals.includes(g));
    if (sug.length && (!OB.a.goals.length || same)) { OB.a.goals = sug.slice(0, 5); OB.auto = [...OB.a.goals]; }
    return { t: 'What do you want to get better at?', next: OB.mode === 'edit' ? 'Save' : 'Next',
      sub: sug.length ? 'We picked a few from your answers (✨). Tap to change.' : 'Pick as many as you like. Exercises that help these get a badge.',
      body: GOAL_GROUPS.map(([g, ids]) => `<div class="ob-grp ob-in"><span class="lbl">${g}</span><div class="ob-chips">${ids.map(id => `<button class="ob-chip" data-act="obTog" data-k="goals" data-v="${id}" aria-pressed="${OB.a.goals.includes(id)}"><i aria-hidden="true">${GOALS[id][0]}</i>${GOALS[id][1]}${sug.includes(id) ? '<sup aria-label="suggested">✨</sup>' : ''}</button>`).join('')}</div></div>`).join('') + `<div class="ob-prev ob-in" id="ob-prev" aria-live="polite">${obPreviewText()}</div>` };
  },
  food() {
    return { t: 'Food & your buddy', sub: 'Daily targets for the Food tab. Change them anytime.', body: `
      <div class="fields ob-in"><label class="field"><span class="lbl">Calories</span><input id="ob-cal" inputmode="numeric" value="${OB.a.cal}"></label><label class="field"><span class="lbl">Protein (g)</span><input id="ob-prot" inputmode="numeric" value="${OB.a.prot}"></label></div>
      <button class="btn ghost sm ob-in" data-act="obSuggestFood" style="align-self:flex-start">✨ Suggest numbers for me</button><p class="faint small ob-in" id="ob-fs" style="margin:-4px 0 0"></p>
      <div class="field ob-in"><span class="lbl">Want a food buddy?</span><p class="faint small" style="margin:0 0 6px">A little pet that eats when you log food and cheers when you hit your protein. Totally optional.</p>${obSeg('wantPet', [['no', 'No thanks'], ['yes', 'Yes, sounds fun']])}</div>
      <div id="ob-petsw" class="field"${OB.a.wantPet === 'yes' ? '' : ' hidden'}><span class="lbl">Pick your buddy</span><div class="ob-pets">${Object.keys(PETS).map(k => `<button class="ob-pet" data-act="obPick" data-k="pet" data-v="${k}" aria-pressed="${OB.a.pet === k}">${petSVG(k, 'happy', 54)}<span>${PETS[k].label}</span></button>`).join('')}</div></div>` };
  },
  done() {
    const g = myGoals(), name = S().name;
    const best = g.length ? bestForGoals(g, 1)[0] : null, ex = best ? [best.name] : null;
    return { t: `You're all set${name ? `, ${esc(name)}` : ''}! 🎉`, next: 'Start lifting',
      sub: g.length ? 'Liftprint will point out exercises that help with:' : 'You can pick goals anytime in Settings.',
      body: `${g.length ? `<div class="ob-chips ob-done-chips">${g.map(id => `<span class="ob-chip on"><i aria-hidden="true">${GOALS[id][0]}</i>${GOALS[id][1]}</span>`).join('')}</div>` : ''}
        ${ex ? `<div class="ob-in"><span class="lbl">Look for these badges</span><div class="ob-example"><b>${esc(ex[0])}</b>${goalBadges(ex[0], 3)}</div><p class="faint small" style="margin:8px 0 0">They show up in your workouts, the exercise list, and each exercise's ⓘ guide. Home gets a <b>Your goals</b> card too.</p></div>` : ''}` };
  },
};
function obPreviewText() {
  if (!OB.a.goals.length) return '';
  const xs = bestForGoals(OB.a.goals).map(e => e.name);
  return xs.length ? `<span aria-hidden="true">🎯</span> Top picks for you: <b>${xs.map(esc).join('</b>, <b>')}</b>` : '';
}

/* ---------- render + transitions ---------- */
function obRender(dir = 1) {
  const R = $('#onboard'), st = OB.steps[OB.i], stage = $('.ob-stage', R), old = stage.querySelector('.ob-step:not(.leaving)');
  OB.seen.add(st);
  const v = OB_VIEWS[st](), el = document.createElement('div');
  el.className = 'ob-step'; el.dataset.step = st;
  el.innerHTML = `<h1 class="ob-t ob-in">${v.t}</h1>${v.sub ? `<p class="ob-sub ob-in">${v.sub}</p>` : ''}<div class="ob-body">${v.body}</div>`;
  stage.appendChild(el);
  const back = $('.ob-back', R), skip = $('.ob-skip', R), next = $('.ob-next', R), alt = $('.ob-alt', R);
  back.style.visibility = OB.i > 0 && st !== 'done' ? 'visible' : 'hidden';
  skip.style.visibility = st === 'welcome' || st === 'done' ? 'hidden' : 'visible';
  alt.hidden = !v.alt; next.textContent = v.next || 'Next';
  const total = OB.steps.length - (OB.mode === 'edit' ? 0 : 1);
  $('.ob-prog i', R).style.width = `${Math.max(4, Math.min(100, (OB.i + (OB.mode === 'edit' ? 1 : 0)) / total * 100))}%`;
  $('.ob-prog', R).style.visibility = st === 'welcome' ? 'hidden' : 'visible';
  if (REDUCED() || dir === 0 && !old) { if (old) old.remove(); }
  if (old) {
    old.classList.add('leaving');
    if (REDUCED()) old.remove();
    else old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${dir >= 0 ? -36 : 36}px)` }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = () => old.remove();
  }
  if (!REDUCED()) {
    el.animate([{ opacity: 0, transform: `translateX(${dir > 0 ? 44 : dir < 0 ? -44 : 0}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, delay: old ? 90 : 0, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    $$('.ob-in', el).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 140 + i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    $$('.ob-chip, .ob-pet', el).forEach((n, i) => n.animate([{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 220 + Math.min(i * 14, 520), easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'backwards' }));
  }
  if (st === 'done') setTimeout(() => { confetti({ n: 140 }); $$('.ob-done-chips .ob-chip', el).forEach((n, i) => REDUCED() || n.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 360, delay: 500 + i * 90 })); }, 250);
  stage.scrollTop = 0;
}
function obCollect() {
  const v = id => { const e = $('#' + id); return e ? e.value.trim() : null; };
  if (v('ob-name') != null) OB.a.name = v('ob-name');
  if (v('ob-weight') != null) OB.a.weight = v('ob-weight');
  if (v('ob-cal') != null) OB.a.cal = Math.round(num(v('ob-cal'))) || OB.a.cal;
  if (v('ob-prot') != null) OB.a.prot = Math.round(num(v('ob-prot'))) || OB.a.prot;
}
function obBounce(el) { if (!REDUCED() && el) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.92)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' }); }

A.obNext = () => {
  obCollect();
  const st = OB.steps[OB.i];
  if (OB.mode === 'edit' && st === 'improve') { saveSettings({ sports: OB.a.sports, goals: OB.a.goals, onboarded: S().onboarded && S().onboarded !== 'skipped' ? S().onboarded : Date.now() }); obClose(); toast('Goals updated 🎯'); return; }
  if (st === 'done') { obClose(); UI.tab = 'home'; render(); return; }
  if (OB.steps[OB.i + 1] === 'done') obSave();
  OB.i++; obRender(1);
};
A.obBack = () => { obCollect(); if (OB.i > 0) { OB.i--; obRender(-1); } };
A.obSkip = () => {
  obCollect();
  if (OB.mode === 'edit') { obClose(); return; }
  const answered = [...OB.seen].some(s => s !== 'welcome');
  if (answered) obSave(); else saveSettings({ onboarded: S().onboarded || 'skipped' });
  obClose(); toast(answered ? 'Saved what you picked. Finish anytime in Settings.' : 'No problem. Set it up anytime in Settings.');
};
A.obPick = (d, el) => {
  const k = d.k, val = /^\d+$/.test(d.v) ? +d.v : d.v; OB.a[k] = val;
  $$(`[data-act="obPick"][data-k="${k}"]`, $('#onboard')).forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  obBounce(el);
  if (k === 'main') { const m = MAIN_GOALS.find(x => x[0] === val); if (m) { OB.a.goal = m[4]; $$('[data-k="goal"]', $('#onboard')).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === m[4]))); obBounce($('#ob-plan')); } }
  if (k === 'wantPet') { const w = $('#ob-petsw'); w.hidden = val !== 'yes'; if (val === 'yes' && !REDUCED()) { w.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); $$('.ob-pet', w).forEach((n, i) => n.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 60 + i * 60, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'backwards' })); setTimeout(() => w.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80); } }
  if (k === 'unit' && $('#ob-wu')) $('#ob-wu').textContent = val === 'metric' ? 'kg' : 'lb';
};
A.obTog = (d, el) => {
  const k = d.k, arr = OB.a[k], i = arr.indexOf(d.v);
  if (i >= 0) arr.splice(i, 1); else arr.push(d.v);
  el.setAttribute('aria-pressed', String(i < 0)); obBounce(el);
  if (k === 'goals' && $('#ob-prev')) $('#ob-prev').innerHTML = obPreviewText();
  if (k === 'sports') { const n = OB.a.sports.length; $('.ob-next').textContent = n ? `Next · ${n} picked` : 'Next'; }
};
A.obSuggestFood = () => {
  obCollect();
  const a = OB.a, lw = latestWeighin()?.weight, typed = num(a.weight), lb = typed > 0 ? (a.unit === 'metric' ? typed / LB_KG : typed) : lw;
  const out = $('#ob-fs');
  if (!lb) { out.textContent = 'Add your weight on the "About you" screen (or log a weigh-in) and this can suggest numbers.'; return; }
  const fem = a.bodyModel === 'female', adj = { bulk: 250, maintain: 0, cut: -450 }[a.goal] ?? 0;
  const cal = Math.max(fem ? 1400 : 1600, Math.round((lb * (fem ? 14 : 15) + adj) / 50) * 50), prot = Math.round(lb * (a.goal === 'cut' ? 1 : 0.9) / 5) * 5;
  a.cal = cal; a.prot = prot; $('#ob-cal').value = cal; $('#ob-prot').value = prot; obBounce($('#ob-cal').closest('.fields'));
  const wTxt = a.unit === 'metric' ? `${Math.round(lb * LB_KG)} kg` : `${Math.round(lb)} lb`;
  out.textContent = `Based on ${wTxt} and ${PLAN_LBL[a.goal]}. A rough starting point: if your weight isn't moving the way you want after 2–3 weeks, adjust by 150–200 kcal.`;
};

function obSave() {
  const a = OB.a, s = S(), seen = OB.seen, patch = { onboarded: s.onboarded && s.onboarded !== 'skipped' ? s.onboarded : Date.now() };
  if (seen.has('you')) {
    Object.assign(patch, { name: a.name, bodyModel: a.bodyModel, unit: a.unit });
    const w = num(a.weight);
    if (w > 0 && !weighins().some(x => x.date === todayStr())) { const lb = a.unit === 'metric' ? w / LB_KG : w, now = new Date(); put('weighins', newId(), { date: todayStr(), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, weight: Math.round(lb * 10) / 10, meal: null, bf: null, ts: Date.now() }); }
  }
  if (seen.has('main')) Object.assign(patch, { mainGoal: a.main, goal: a.goal });
  if (seen.has('train')) Object.assign(patch, { weeklyGoal: a.weeklyGoal, defaultSets: a.defaultSets });
  if (seen.has('sports')) patch.sports = a.sports;
  if (seen.has('improve')) patch.goals = a.goals;
  if (seen.has('food')) {
    Object.assign(patch, { calTarget: a.cal, proteinTarget: a.prot, buddy: a.wantPet === 'yes' });
    if (a.wantPet === 'yes' && a.pet !== s.pet) { const prevDef = PETS[petKind()].def, custom = s.buddyName && s.buddyName !== prevDef; Object.assign(patch, { pet: a.pet, buddyName: custom ? s.buddyName : '' }); }
  }
  saveSettings(patch);
}
function obClose() {
  const R = $('#onboard'), box = R.firstElementChild; document.body.classList.remove('ob-open');
  const end = () => { R.hidden = true; R.innerHTML = ''; changed(); };
  if (!box || REDUCED()) return end();
  box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = end;
}
