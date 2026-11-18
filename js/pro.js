'use strict';
/* ---------- Free vs Pro: access state, feature gates, paywall, onboarding offer, owner code.
   Nothing is sold in this build. proPurchase() is the single place to wire up App Store purchases later. ---------- */
const PRO_PRICE = { mo: 5.99, yr: 39.99 }, PRO_TRIAL_DAYS = 7;
const PRO_CODE_HASH = 'f56f58c7ece971f68bcfb2cceba98fc921bcf40b485539e97c1817855f7e9c19';
/* [emoji, name, what you get, key] — the order shown on the paywall */
const PRO_FEATURES = [
  ['✨', 'AI coach', 'Knows your training, food and recovery, and answers in seconds', 'ai'],
  ['📸', 'Snap your meal', 'Log food from a photo or a quick description', 'snap'],
  ['🏦', 'Smart calorie budget', 'Over one day? It balances the next few for you', 'budget'],
  ['🔮', 'PR predictions', 'See which lifts are about to hit a new best', 'forecast'],
  ['🎁', 'Monthly wrap', 'Your month as a shareable highlight reel', 'wrap'],
];
const PRO_FREE = ['Unlimited workouts & routines', 'Every exercise demo', 'Food log & barcode scanner', 'Readiness, habits & streaks', 'Progress charts & PRs', 'No ads, ever'];

function proState() {
  const p = S().pro || {}, now = Date.now();
  if (p.kind === 'founder' || p.kind === 'sub') return { pro: true, kind: p.kind, used: true };
  if (p.kind === 'trial') { const left = (p.until || 0) - now; return { pro: left > 0, kind: left > 0 ? 'trial' : 'free', used: true, daysLeft: Math.max(0, Math.ceil(left / 864e5)), ended: left <= 0 }; }
  return { pro: false, kind: 'free', used: false };
}
const isPro = () => proState().pro;
/* first launch of this version: people already using the app keep everything (founder access); new installs start on Free */
function proInit() {
  const s = S(); if (s.proInit) return;
  const existing = (s.onboarded && s.onboarded !== 'skipped') || Store.list('workouts').length > 0 || Store.list('food').length > 0 || weighins().length > 0;
  saveSettings({ proInit: existing ? 'old' : 'new', ...(existing && !s.pro ? { pro: { kind: 'founder', since: Date.now() } } : {}) });
}
function proStartTrial(quiet) {
  if (proState().used) return false;
  saveSettings({ pro: { kind: 'trial', since: Date.now(), until: Date.now() + PRO_TRIAL_DAYS * 864e5 } });
  if (!quiet) { pwClose(); toast(`Pro is on for ${PRO_TRIAL_DAYS} days. Enjoy 🎉`, { ms: 3500 }); if (typeof confetti === 'function') confetti({ n: 90 }); if (typeof sfx === 'function') sfx('streak'); }
  return true;
}
/* App Store purchases plug in here later */
function proPurchase(plan) { toast('Subscriptions open when Liftprint launches on the App Store. Nothing was charged.', { ms: 4500 }); }

/* ----- gate: returns true when the feature can run, otherwise shows the paywall ----- */
function proGate(key) { if (isPro()) return true; openPaywall(key); return false; }

/* ----- paywall ----- */
const money = n => '$' + n.toFixed(2);
function proPitchHTML(focus) {
  const feats = [...PRO_FEATURES].sort((a, b) => (b[3] === focus) - (a[3] === focus));
  return `<ul class="pw-feats">${feats.map(([e, n, d, k], i) => `<li class="pw-in${k === focus ? ' hot' : ''}" style="--i:${i}"><span class="pw-e">${e}</span><span class="grow"><b>${n}</b><span>${d}</span></span><span class="pw-ck">✓</span></li>`).join('')}</ul>`;
}
function proPlansHTML() {
  const sel = UI.pwPlan || 'yr', save = Math.round((1 - PRO_PRICE.yr / (PRO_PRICE.mo * 12)) * 100);
  return `<div class="pw-plans" role="group" aria-label="Plan"><button class="pw-plan" data-act="pwPlan" data-p="yr" aria-pressed="${sel === 'yr'}"><span class="pw-badge">Best value · save ${save}%</span><b>Yearly</b><span class="pw-pr">${money(PRO_PRICE.yr)}<i>/year</i></span><span class="faint tiny">${money(PRO_PRICE.yr / 12)} a month</span></button>
    <button class="pw-plan" data-act="pwPlan" data-p="mo" aria-pressed="${sel === 'mo'}"><b>Monthly</b><span class="pw-pr">${money(PRO_PRICE.mo)}<i>/month</i></span><span class="faint tiny">Cancel anytime</span></button></div>`;
}
const PW_TITLES = { ai: 'Your coach is a tap away', snap: 'Log a meal with one photo', budget: 'Let the app balance your week', forecast: 'See your next PR coming', wrap: 'Relive your month' };
function openPaywall(focus) {
  if ($('#pw')) return; const st = proState();
  const el = document.createElement('div'); el.id = 'pw'; el.className = 'pw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Liftprint Pro');
  el.innerHTML = `<div class="pw-glow" aria-hidden="true"></div><button class="iconbtn pw-x" data-act="pwClose" aria-label="Close">${ICON.x}</button>
    <div class="pw-scroll"><div class="pw-hero pw-in" style="--i:0"><div class="pw-mark">${typeof LP_MARK === 'string' ? LP_MARK.replace('data-act="logoTap"', '') : ''}</div><span class="pw-tag">PRO</span></div>
      <h1 class="pw-t pw-in" style="--i:1">${PW_TITLES[focus] || 'Get more from every rep'}</h1>
      <p class="pw-sub pw-in" style="--i:2">${st.pro ? (st.kind === 'trial' ? `Your free trial has <b>${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'}</b> left.` : 'You have Pro. Thanks for being here early.') : st.ended ? 'Your trial ended. Everything you logged is still here, and the free features still work.' : 'Everything in Free, plus the smart stuff.'}</p>
      ${proPitchHTML(focus)}
      ${proCompareHTML()}
      ${st.pro && st.kind !== 'trial' ? '' : proPlansHTML()}
      ${!st.used ? `<ol class="pw-line"><li><b>Today</b><span>Full Pro access, free</span></li><li><b>Day ${PRO_TRIAL_DAYS - 2}</b><span>A reminder shows up on your Today screen</span></li><li><b>Day ${PRO_TRIAL_DAYS}</b><span>Trial ends. You keep everything in Free</span></li></ol>` : ''}
    </div>
    <footer class="pw-foot">${st.pro && st.kind !== 'trial' ? `<button class="btn block" data-act="pwClose">Done</button>` : !st.used ? `<button class="btn block pw-cta" data-act="proTrial">Try Pro free for ${PRO_TRIAL_DAYS} days</button><p class="pw-fine">No payment details needed. Nothing is charged in this preview.</p>` : `<button class="btn block pw-cta" data-act="proBuy">Continue</button><p class="pw-fine">Subscriptions open with the App Store launch. Nothing is charged in this preview.</p>`}
      <div class="pw-links"><button data-act="proCode">Have a code?</button><a href="terms.html" target="_blank" rel="noopener">Terms</a><a href="privacy.html" target="_blank" rel="noopener">Privacy</a>${st.pro ? '' : '<button data-act="pwClose">Not now</button>'}</div></footer>`;
  document.body.appendChild(el);
  if (!REDUCED()) el.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function pwClose() { const el = $('#pw'); if (!el) return; if (REDUCED()) return el.remove(); el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(24px)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove(); }
A.pwClose = pwClose;
A.pwOpen = d => openPaywall(d && d.k);
A.pwPlan = d => { UI.pwPlan = d.p; $$('.pw-plan').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.p === d.p))); };
A.proTrial = () => proStartTrial();
A.proBuy = () => proPurchase(UI.pwPlan || 'yr');
A.proCode = () => {
  const el = $('#pw'); if (el) el.remove();
  openSheet('Enter a code', `<div class="field"><label class="lbl" for="pro-code">Access code</label><input id="pro-code" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="LP-XXXXXXXX-XXXXXXXX"></div><button class="btn block" data-act="proCodeGo">Unlock</button>`);
};
A.proCodeGo = async () => {
  const v = ($('#pro-code').value || '').trim().toUpperCase(); if (!v) return;
  let hex = ''; try { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) {}
  if (hex !== PRO_CODE_HASH) return toast("That code didn't work.", { bad: true });
  try { localStorage.setItem('onpaper.code', v); } catch (e) {}
  saveSettings({ pro: { kind: 'founder', since: Date.now() } }); closeSheet(); toast('Pro unlocked for good 🎉', { ms: 3500 }); if (typeof confetti === 'function') confetti({ n: 120 });
};

/* ----- gates on the Pro features ----- */
for (const [act, key] of [['aiOpen', 'ai'], ['mealSnap', 'snap'], ['wrapOpen', 'wrap'], ['budgetOpen', 'budget']]) { const f = A[act]; if (f) A[act] = (d, el) => proGate(key) && f(d, el); }

/* ----- You tab: Pro card + Customize + legal ----- */
/* Free vs Pro, side by side */
function proCompareHTML() {
  const rows = [...PRO_FREE.map(x => [x, 1]), ...PRO_FEATURES.map(f => [f[1], 0])];
  return `<table class="pw-cmp"><thead><tr><th></th><th>Free</th><th class="p">Pro</th></tr></thead><tbody>${rows.map(([n, free]) => `<tr><td>${n}</td><td>${free ? '✓' : '<i>–</i>'}</td><td class="p">✓</td></tr>`).join('')}</tbody></table>`;
}
const planName = () => { const st = proState(); return st.kind === 'founder' ? 'Pro · Founder' : st.kind === 'sub' ? 'Pro' : st.kind === 'trial' ? `Pro trial · ${st.daysLeft}d left` : 'Free'; };
const planPillHTML = () => { const st = proState(); return `<button class="plan-pill${st.pro ? ' pro' : ''}" data-act="pwOpen" aria-label="Your plan: ${planName()}. See plans">${st.pro ? 'PRO' : 'FREE'}</button>`; };
function planRowHTML() { const st = proState(); return `<button class="plan-row${st.pro ? ' pro' : ''}" data-act="plansFromSettings"><span class="pro-ic">✨</span><span class="grow"><b>Your plan: ${planName()}</b><span>${st.pro ? 'Everything is unlocked. See what Free and Pro include' : 'Compare Free and Pro, or start a free trial'}</span></span>${ICON.chevR}</button>`; }
A.openLook = () => { A.openSettings(); setTimeout(() => { const b = $('#st-look'); if (b) { b.closest('details').open = true; b.scrollIntoView({ block: 'center' }); } }, 80); };
A.plansFromSettings = () => { closeSheet(); openPaywall(); };
function proCardHTML() {
  const st = proState();
  if (st.pro && st.kind !== 'trial') return '';
  if (st.kind === 'trial') return `<button class="pro-card on" data-act="pwOpen"><span class="pro-ic">✨</span><span class="grow"><b>Pro trial · ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left</b><span>See what you keep with Pro</span></span>${ICON.chevR}</button>`;
  return `<button class="pro-card" data-act="pwOpen"><span class="pro-ic">✨</span><span class="grow"><b>${st.ended ? 'Get Pro back' : `Try Liftprint Pro free`}</b><span>${st.ended ? 'Assistant, photo logging, smart budget and more' : `${PRO_TRIAL_DAYS} days of the AI coach, photo logging and more`}</span></span>${ICON.chevR}</button>`;
}
{ const yr = Views.you.render; Views.you.render = function () {
  const st = proState(), rows = [['🎨', 'Appearance', 'Theme, colour, sounds, tips', 'openLook'], ['🧩', 'Customize Home', 'Choose what shows on Today', 'homeEdit'], ['✨', 'Liftprint Pro', st.pro ? (st.kind === 'trial' ? `Trial · ${st.daysLeft} days left` : st.kind === 'founder' ? 'Founder access · everything unlocked' : 'Active') : 'See plans', 'pwOpen'], ['📜', 'About & legal', 'Health & safety, privacy, terms, erase data', 'aboutOpen']];
  return proCardHTML() + yr() + `<section class="card flush list-card">${rows.map(([ic, t, sub, act]) => `<button class="row" data-act="${act}"><span class="li-ic">${ic}</span><span class="grow"><b>${t}</b><div class="faint small">${esc(sub)}</div></span>${ICON.chevR.replace('<svg', '<svg width="16" height="16" style="opacity:.4"')}</button>`).join('')}</section>`;
}; }

/* ----- setup: terms line on the first screen, Pro offer before the finish ----- */
if (typeof OB_VIEWS !== 'undefined') {
  const w0 = OB_VIEWS.welcome; OB_VIEWS.welcome = () => { const v = w0(); v.body += legalLineHTML(); return v; };
  OB_VIEWS.pro = () => ({ t: 'One more thing: try <span class="gtxt">Pro</span> free', sub: `${OB.a.name ? esc(OB.a.name) + ', your' : 'Your'} plan is ready. Pro adds the smart stuff on top. ${PRO_TRIAL_DAYS} days free, no payment details.`, next: `Start my ${PRO_TRIAL_DAYS} free days`,
    body: `<div class="ob-pro">${proPitchHTML()}<p class="pw-fine" style="text-align:center">After ${PRO_TRIAL_DAYS} days you keep everything in Free. Nothing is charged in this preview.</p><button class="ob-free" data-act="obProSkip">Continue with Free</button></div>` });
  /* "your plan is ready": the numbers and a starter program built from the answers, shown before the finish */
  OB_VIEWS.plan = () => {
    const a = OB.a, pr = OB.plan = buildProgram(a.weeklyGoal || 4, a.goals || [], activeGym()), has = splitDays().length > 0;
    if (OB.planUse == null) OB.planUse = !has;
    return { t: `${a.name ? esc(a.name) + ', your' : 'Your'} plan is <span class="gtxt">ready</span>`, sub: `Built from your answers for ${PLAN_LBL[a.goal] || 'your goal'}. Everything here can be changed later.`, next: 'Looks good',
      body: `<div class="ob-plan"><div class="op-stats ob-in"><div><b>${fmtN(a.cal)}</b><span>calories a day</span></div><div><b>${a.prot} g</b><span>protein a day</span></div><div><b>${pr.per}×</b><span>a week</span></div></div>
        <div class="op-prog ob-in"><div class="op-h"><b>${esc(pr.label)}</b><span>${pr.days.length} workouts, repeating</span></div>${pr.days.map((d, i) => `<div class="op-day"><span class="op-n">${i + 1}</span><span class="grow"><b>${esc(d.name)}</b><span>${d.exercises.slice(0, 3).map(esc).join(' · ')}${d.exercises.length > 3 ? ` +${d.exercises.length - 3}` : ''}</span></span></div>`).join('')}</div>
        ${has ? '<p class="pw-fine ob-in">You already have a split, so this one is just a suggestion.</p>' : `<label class="op-use ob-in"><input type="checkbox" data-act="obPlanUse" ${OB.planUse ? 'checked' : ''}><span>Add this program to my Train tab</span></label>`}
        <p class="pw-fine ob-in">A starting point, not medical advice. If your weight isn't moving the way you want after 2 to 3 weeks, adjust calories by 150 to 200.</p></div>` };
  };
  A.obPlanUse = (d, el) => { OB.planUse = el.checked; };
  const open0 = openOnboarding; openOnboarding = function (mode) { open0(mode); if (OB.mode === 'edit') return; OB.plan = null; OB.planUse = null; if (!OB.steps.includes('plan')) OB.steps.splice(OB.steps.indexOf('done'), 0, 'plan'); if (!proState().used && !OB.steps.includes('pro')) OB.steps.splice(OB.steps.indexOf('done'), 0, 'pro'); };
  const next0 = A.obNext; A.obNext = () => {
    const st = OB.steps[OB.i]; legalAccept();
    if (OB.steps[OB.i + 1] === 'plan') {   // untouched default targets + a known bodyweight: work the numbers out for them
      obCollect(); const a = OB.a, typed = num(a.weight), lb = typed > 0 ? (a.unit === 'metric' ? typed / LB_KG : typed) : latestWeighin()?.weight;
      if (lb && a.cal === DEFAULTS.calTarget && a.prot === DEFAULTS.proteinTarget) { const fem = a.bodyModel === 'female', adj = { bulk: 250, maintain: 0, cut: -450 }[a.goal] ?? 0; a.cal = Math.max(fem ? 1400 : 1600, Math.round((lb * (fem ? 14 : 15) + adj) / 50) * 50); a.prot = Math.round(lb * (a.goal === 'cut' ? 1 : 0.9) / 5) * 5; OB.seen.add('food'); if ($('#ob-cal')) { $('#ob-cal').value = a.cal; $('#ob-prot').value = a.prot; } }
    }
    if (OB.steps[OB.i + 1] === 'plan' || OB.steps[OB.i + 1] === 'pro') { obCollect(); obSave(); }
    if (st === 'plan' && OB.planUse && OB.plan && !splitDays().length) saveSettings({ split: { days: OB.plan.days.map(({ why, ...x }) => x) }, weeklyGoal: OB.plan.per });
    if (st === 'pro') proStartTrial(true);
    next0();
  };
  A.obProSkip = () => { OB.i++; obRender(1); };
  const skip0 = A.obSkip; A.obSkip = () => { legalAccept(); skip0(); };
}

/* people who were using the app before the terms existed see them once */
A.legalNotice = () => openSheet('A quick heads-up', `<p class="small legal-notice" style="margin-top:0">Liftprint now has Terms of Use and a Privacy Policy. The short version:</p><ul class="small" style="padding-left:18px;line-height:1.5"><li>Your data stays on this phone. We never see it.</li><li>AI features send what you submit to the AI service, using your own key.</li><li>Liftprint is a tracking tool, not medical advice. Numbers and AI answers are estimates.</li><li>It's for people ${LEGAL_MIN_AGE} and older.</li></ul><div class="col" style="gap:8px"><button class="btn ghost block" data-act="legalOpen" data-k="health">Health &amp; safety</button><button class="btn ghost block" data-act="legalOpen" data-k="privacy">Privacy Policy</button><button class="btn ghost block" data-act="legalOpen" data-k="terms">Terms of Use</button><button class="btn block" data-act="legalOk">Got it, I agree</button></div>`, { onClose: legalNag });
A.legalOk = () => { legalAccept(); closeSheet(); };

/* plan tag beside the logo on Today and beside the title on You */
{ const ht = Views.home.title; Views.home.title = () => ht().replace('</span>', '</span>' + planPillHTML()); const yt = Views.you.title; Views.you.title = () => yt().replace('</h1>', ' ' + planPillHTML() + '</h1>'); }
/* theme and colour changes made inside Settings refresh their own buttons */
for (const k of ['setTheme', 'setAccent', 'setSounds', 'setHints']) { const f = A[k]; if (f) A[k] = (d, el) => { f(d, el); const box = $('#st-look'); if (box) box.innerHTML = appearanceHTML(); }; }

/* an optional pet: when it's off, a quiet line at the bottom of Food offers it */
{ const fr = Views.food.render; Views.food.render = function () { return fr.apply(this, arguments) + buddyInviteHTML(); }; }
