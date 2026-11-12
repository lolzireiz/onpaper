'use strict';
/* Lock-screen + Apple Watch rest alerts. Web apps can't run timers in the background on iPhone,
   so the rest-end alert is scheduled on the ntfy push service and delivered by the free ntfy app. */
const PUSH_ON = 'onpaper.pushOn', PUSH_TOPIC = 'onpaper.pushTopic';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function pushTopic() { let t = lsGet(PUSH_TOPIC); if (!t) { const a = new Uint8Array(9); crypto.getRandomValues(a); t = 'onpaper-' + [...a].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); lsSet(PUSH_TOPIC, t); } return t; }
const pushOn = () => lsGet(PUSH_ON) === '1';
const Push = { id: null, seq: 0 };
async function pushSend(msg, delaySec) {
  const body = { topic: pushTopic(), title: msg.title, message: msg.body, priority: 5, tags: [msg.tag || 'stopwatch'] };
  if (delaySec) body.delay = `${Math.max(10, Math.round(delaySec))}s`;
  const r = await fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).id;
}
function pushCancel() { const id = Push.id; Push.id = null; Push.seq++; if (!id) return; fetch(`https://ntfy.sh/${pushTopic()}/${id}`, { method: 'DELETE' }).catch(() => {}); }
async function pushScheduleRest(sec, next) {
  if (!pushOn()) return; pushCancel(); const mySeq = Push.seq;
  try { const id = await pushSend({ title: 'Rest is up ⏱', body: next ? `Time for your next set: ${next}` : 'Time for your next set.' }, sec); if (mySeq === Push.seq) Push.id = id; else fetch(`https://ntfy.sh/${pushTopic()}/${id}`, { method: 'DELETE' }).catch(() => {}); } catch (e) {}
}
function pushSettingsHTML() {
  const on = pushOn(), t = pushTopic();
  return `<div class="field"><span class="lbl">Rest alerts on your lock screen &amp; Apple Watch</span><div class="seg">${chipSeg('pushon', [['on', 'On'], ['off', 'Off']], on ? 'on' : 'off')}</div></div>
    <details ${on ? '' : 'open'} class="small" style="background:var(--s2);border-radius:12px;padding:10px 12px"><summary style="font-weight:650">One-time setup (1 minute)</summary>
      <ol class="muted" style="padding-left:18px;margin:8px 0;display:flex;flex-direction:column;gap:6px">
        <li>Install the free <b>ntfy</b> app from the App Store.</li>
        <li>Open it, tap <b>+</b>, and subscribe to this topic (leave the server as ntfy.sh):<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><code style="background:var(--s3);padding:6px 8px;border-radius:8px;font-size:13px;user-select:all;-webkit-user-select:all">${t}</code><button class="btn sm ghost" style="background:var(--s3)" data-act="copyTopic">Copy</button></div></li>
        <li>Allow notifications when ntfy asks.</li>
        <li>Turn this <b>On</b>, save settings, then tap <b>Send a test alert</b>.</li>
      </ol>
      <p class="faint tiny">Your Watch shows the alert whenever your phone is locked or in your pocket. The topic is a random private name, so only you get these.</p></details>
    <button class="btn ghost block" data-act="testPush">Send a test alert</button><p class="small" id="push-test" aria-live="polite"></p>`;
}
A.copyTopic = async () => { try { await navigator.clipboard.writeText(pushTopic()); toast('Topic copied'); } catch (e) { toast('Press and hold the topic to copy it.'); } };
A.testPush = async (d, el) => {
  const out = $('#push-test'); el.disabled = true; out.innerHTML = '<span class="thinking">Sending…</span>';
  try { await pushSend({ title: 'On Paper test ✅', body: 'Rest alerts are working. You can lock your phone between sets now.', tag: 'white_check_mark' }); out.innerHTML = '<span style="color:var(--ok)">Sent!</span> <span class="faint">It should pop up in a few seconds. Nothing? Check the topic in ntfy matches exactly and that ntfy notifications are allowed.</span>'; }
  catch (e) { out.innerHTML = `<span style="color:var(--miss)">Couldn't send. Check your connection.</span>`; }
  el.disabled = false;
};
