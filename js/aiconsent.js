'use strict';
/* AI data consent. Apple's review guideline 5.1.2(i) requires an app to say clearly where personal data goes when it is
   shared with a third-party AI, and to get explicit permission first; a privacy-policy paragraph is not enough.
   So: nothing is sent to the AI service until the person has agreed on this screen. Data that came from the watch /
   Health app is a separate, optional switch that starts OFF. Both can be changed or withdrawn in Settings. */
const AIDC_KEY = 'lp.aiConsent', AIDC_VER = 1;
const aicGet = () => { try { const v = JSON.parse(localStorage.getItem(AIDC_KEY) || 'null'); return v && v.v === AIDC_VER ? v : null; } catch (e) { return null; } };
const aiConsent = () => !!aicGet();
const aiHealthOk = () => { const c = aicGet(); return !!(c && c.health); };
const aicSave = v => { try { v ? localStorage.setItem(AIDC_KEY, JSON.stringify({ v: AIDC_VER, ts: Date.now(), ...v })) : localStorage.removeItem(AIDC_KEY); } catch (e) {} };
const aicHasHealth = () => typeof hkOn === 'function' && hkOn();
let aicWait = null;
function aiConsentAsk() {
  if (aiConsent()) return Promise.resolve(true);
  if (aicWait) return aicWait.p;
  let done; const p = new Promise(r => { done = r; }); aicWait = { p, done };
  const el = document.createElement('div'); el.id = 'aic'; el.className = 'aic'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'aic-t');
  el.innerHTML = `<div class="aic-card"><h2 id="aic-t">Before you use AI features</h2>
    <p>The coach, workout builder, meal photos and scans are powered by an outside AI service run by <b>Google</b>. Nothing is sent until you agree.</p>
    <p class="aic-k">What gets sent when you use one</p>
    <ul><li><b>Coach and workout builder:</b> your question, plus a summary of your profile and goals, recent workouts and lifts, food log, body weight, readiness check-ins, habits and work shifts.</li>
    <li><b>Meal photos and scans:</b> the photo or text you submit.</li></ul>
    <p>It is used to produce your answer. It is not used for advertising. Details are in the <button class="linkbtn" data-act="legalOpen" data-doc="privacy" style="padding:0;font-size:inherit">Privacy Policy</button>.</p>
    ${aicHasHealth() ? `<label class="aic-sw"><input type="checkbox" id="aic-h"><span><b>Also share watch and Health data</b><span>Steps, sleep, heart rate and watch workouts, so the coach can factor them in. Optional, and off unless you tick it.</span></span></label>` : ''}
    <p class="faint tiny">You can change or withdraw this any time in Settings › AI &amp; your data.</p>
    <button class="btn block" data-act="aicYes">Agree and continue</button><button class="btn ghost block" data-act="aicNo" style="margin-top:8px">Not now</button></div>`;
  document.body.appendChild(el); return p;
}
function aicClose(ok) { const el = $('#aic'); if (el) el.remove(); const w = aicWait; aicWait = null; if (w) w.done(ok); }
A.aicYes = () => { aicSave({ health: !!($('#aic-h') && $('#aic-h').checked) }); aicClose(true); };
A.aicNo = () => { aicClose(false); toast('AI features stay off until you agree. Everything else works as normal.'); };

/* every AI request passes through here */
{ const gj = Gemini.json.bind(Gemini); Gemini.json = async function (prompt, opts) {
  if (!(opts && opts.kind === 'test') && !aiConsent()) { const ok = await aiConsentAsk(); if (!ok) throw { code: 'cancelled', message: 'AI data sharing not allowed' }; }
  return gj(prompt, opts);
}; }

/* Settings: review and withdraw */
function aicRowHTML() {
  const c = aicGet();
  return `<details class="sset" id="st-aic"><summary><span class="si" aria-hidden="true">🛡️</span><span class="grow"><b>AI &amp; your data</b><span class="faint small">${c ? `Sharing allowed${c.health ? ', including Health data' : ''}` : 'Not allowed yet'}</span></span></summary><div class="sset-b">
    <p class="muted small" style="margin:0 0 10px">AI features send what they need to an outside AI service run by Google: your question and a summary of your training, food and recovery for the coach and workout builder, or the photo or text you submit for scans. ${c ? `You agreed on ${new Date(c.ts).toLocaleDateString()}.` : 'Nothing is sent until you agree, which the app asks the first time you use an AI feature.'}</p>
    ${c && aicHasHealth() ? `<div class="field"><span class="lbl">Share watch and Health data with the coach</span><div class="seg"><button data-act="aicHealth" data-v="1" aria-pressed="${!!c.health}">On</button><button data-act="aicHealth" data-v="0" aria-pressed="${!c.health}">Off</button></div></div>` : ''}
    ${c ? `<button class="btn ghost block" data-act="aicOff">Stop sharing with AI</button><p class="faint tiny" style="margin:6px 0 0">AI features will ask again before they are used.</p>` : ''}</div></details>`;
}
const aicRowDraw = () => { const el = $('#st-aic'); if (el) { const open = el.open; el.outerHTML = aicRowHTML(); if (open && $('#st-aic')) $('#st-aic').open = true; } };
A.aicHealth = d => { const c = aicGet(); if (!c) return; aicSave({ health: d.v === '1', ts: c.ts }); aicRowDraw(); };
A.aicOff = async () => { if (!await ask('Stop sharing data with the AI service? The coach, workout builder, meal photos and scans will ask again before they are used.', { ok: 'Stop sharing' })) return; aicSave(null); aicRowDraw(); toast('AI data sharing is off'); };
{ const os = A.openSettings; A.openSettings = d => { os(d); const b = $('#sheet .sheet-b'); if (!b || $('#st-aic')) return; const anchor = [...b.querySelectorAll('details.sset')].pop(); if (anchor) anchor.insertAdjacentHTML('beforebegin', aicRowHTML()); else b.insertAdjacentHTML('beforeend', aicRowHTML()); }; }
