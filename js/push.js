'use strict';
/* Lock-screen + Apple Watch rest alerts. Web apps can't run timers in the background on iPhone,
   so the rest-end alert is scheduled on the ntfy push service and delivered by the free ntfy app. */
const PUSH_ON = 'onpaper.pushOn', PUSH_TOPIC = 'onpaper.pushTopic';
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function pushTopic() { let t = lsGet(PUSH_TOPIC); if (!t) { const a = new Uint8Array(9); crypto.getRandomValues(a); t = 'onpaper-' + [...a].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); lsSet(PUSH_TOPIC, t); } return t; }
const pushOn = () => lsGet(PUSH_ON) === '1';
const Push = { at: 0 };
/* Fire-and-forget requests that iOS finishes even after the app is backgrounded (no CORS preflight needed). */
function beacon(url, body = '') {
  try { if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
  try { fetch(url, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {}); } catch (e) {}
}
async function pushSend(msg, delaySec) {
  const body = { topic: pushTopic(), title: msg.title, message: msg.body, priority: 5, tags: [msg.tag || 'stopwatch'] };
  if (delaySec) body.delay = `${Math.max(10, Math.round(delaySec))}s`;
  const r = await fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).id;
}
/* One scheduled alert per topic under the sequence ID "rest": publishing again replaces it, deleting cancels it. */
function pushScheduleRest(sec, next) {
  if (!pushOn() || !(sec > 0)) return;
  Push.at = Date.now() + sec * 1000;
  const q = new URLSearchParams({ delay: `${Math.max(10, Math.round(sec))}s`, title: 'Rest is up ⏱', priority: '5', tags: 'stopwatch' });
  beacon(`https://ntfy.sh/${pushTopic()}/rest?${q}`, next ? `Time for your next set: ${next}` : 'Time for your next set.');
}
function pushCancel() {
  const had = Push.at > Date.now(); Push.at = 0; if (!pushOn() || !had) return;
  try { fetch(`https://ntfy.sh/${pushTopic()}/rest/delete`, { keepalive: true, mode: 'no-cors' }).catch(() => {}); } catch (e) {}
}
/* Leaving the app: re-send the pending alert with the time that's left, so it's on the server before iOS freezes us. */
function pushOnHide() { if (Rest.end && Rest.end - Date.now() > 10000) pushScheduleRest((Rest.end - Date.now()) / 1000, Rest.next); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { pushOnHide(); saveRest(); } });
window.addEventListener('pagehide', () => { pushOnHide(); saveRest(); });
/* Keep the rest timer across iOS closing the app in the background. */
function saveRest() { lsSet('onpaper.rest', Rest.end ? JSON.stringify({ end: Rest.end, total: Rest.total, next: Rest.next || '' }) : ''); }
function restoreRest() {
  let r = null; try { r = JSON.parse(lsGet('onpaper.rest') || 'null'); } catch (e) {}
  if (!r || !r.end) return;
  if (r.end > Date.now() + 1000) { Rest.total = r.total; Rest.end = r.end; Rest.next = r.next; Push.at = r.end; startRestUI(); }
  else lsSet('onpaper.rest', '');
}
function pushSettingsHTML() {
  const on = pushOn(), t = pushTopic();
  return `<div class="field"><span class="lbl">Rest alerts on your lock screen &amp; Apple Watch</span><div class="seg">${chipSeg('pushon', [['on', 'On'], ['off', 'Off']], on ? 'on' : 'off')}</div></div>
    <details ${on ? '' : 'open'} class="small" style="background:var(--s2);border-radius:12px;padding:10px 12px"><summary style="font-weight:650">One-time setup (1 minute)</summary>
      <ol class="muted" style="padding-left:18px;margin:8px 0;display:flex;flex-direction:column;gap:6px">
        <li>In <b>Safari</b>, open <b>ntfy.sh/app</b>, tap <b>Share → Add to Home Screen</b>.</li>
        <li>Open ntfy <b>from that home-screen icon</b>, tap <b>Subscribe to topic</b>, paste this topic, keep the server as ntfy.sh, and allow notifications:<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><code style="background:var(--s3);padding:6px 8px;border-radius:8px;font-size:13px;user-select:all;-webkit-user-select:all">${t}</code><button class="btn sm ghost" style="background:var(--s3)" data-act="copyTopic">Copy</button></div></li>
        <li>If you installed the ntfy App Store app, delete it. On iPhone it often only shows alerts when it's open.</li>
        <li>Turn this <b>On</b>, save, tap <b>Send a test alert</b>, then lock your phone and wait a few seconds.</li>
      </ol>
      <p class="faint tiny">Your Watch shows the alert whenever your phone is locked or in your pocket. The topic is a random private name, so only you get these.</p></details>
    <button class="btn ghost block" data-act="testPush">Send a test alert</button><p class="small" id="push-test" aria-live="polite"></p>`;
}
A.copyTopic = async () => { try { await navigator.clipboard.writeText(pushTopic()); toast('Topic copied'); } catch (e) { toast('Press and hold the topic to copy it.'); } };
A.testPush = async (d, el) => {
  const out = $('#push-test'); el.disabled = true; out.innerHTML = '<span class="thinking">Sending…</span>';
  try { await pushSend({ title: 'Liftprint test ✅', body: 'Rest alerts are working. You can lock your phone between sets now.', tag: 'white_check_mark' }); out.innerHTML = '<span style="color:var(--ok)">Sent!</span> <span class="faint">It should pop up in a few seconds. Nothing? Check the topic in ntfy matches exactly and that ntfy notifications are allowed.</span>'; }
  catch (e) { out.innerHTML = `<span style="color:var(--miss)">Couldn't send. Check your connection.</span>`; }
  el.disabled = false;
};
