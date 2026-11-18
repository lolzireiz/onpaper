'use strict';
/* iPhone app version only. Replaces the web workarounds with the real thing:
   - rest alerts are scheduled as local notifications (lock screen + watch), no extra app or setup
   - permission messages point at the app's own page in the phone's Settings, with a button to open it */
const isNativeApp = () => !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
A.openAppSettings = () => { try { window.location.href = 'app-settings:'; } catch (e) {} };
/* shown wherever the camera is refused */
function camBlockedHTML() {
  return isNativeApp()
    ? `Camera access is off for Liftprint. <button class="linkbtn" data-act="openAppSettings" style="padding:0;font-size:inherit;font-weight:650">Open Settings</button> and turn on Camera, or use a photo instead.`
    : 'Camera access was blocked. Allow the camera for this site in your browser settings, or use a photo instead.';
}

if (isNativeApp()) {
  const LN = () => Capacitor.Plugins && Capacitor.Plugins.LocalNotifications, REST_ID = 4101;
  const lnReady = async ask => {
    const P = LN(); if (!P) return false;
    try { let s = (await P.checkPermissions()).display; if (s !== 'granted' && ask) s = (await P.requestPermissions()).display; return s === 'granted'; } catch (e) { return false; }
  };
  pushScheduleRest = function (sec, next) {
    if (!pushOn() || !(sec > 0)) return; const at = Date.now() + sec * 1000; Push.at = at;
    lnReady(true).then(ok => { if (!ok || Push.at !== at) return;
      LN().schedule({ notifications: [{ id: REST_ID, title: 'Rest is up ⏱', body: next ? `Time for your next set: ${next}` : 'Time for your next set.', schedule: { at: new Date(at), allowWhileIdle: true } }] }).catch(() => {}); });
  };
  pushCancel = function () { Push.at = 0; const P = LN(); if (P) P.cancel({ notifications: [{ id: REST_ID }] }).catch(() => {}); };
  pushOnHide = function () {};   // the phone delivers it on its own; nothing to re-send when the app is closed
  pushSend = async function (msg) {
    if (!await lnReady(true)) throw new Error('blocked');
    await LN().schedule({ notifications: [{ id: REST_ID + 1, title: msg.title, body: msg.body, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] }); return 'local';
  };
  pushSettingsHTML = function () {
    return `<div class="field"><span class="lbl">Rest alerts on your lock screen &amp; watch</span><div class="seg">${chipSeg('pushon', [['on', 'On'], ['off', 'Off']], pushOn() ? 'on' : 'off')}</div></div>
      <p class="muted small" style="margin:0 0 10px">When your rest timer ends, your phone and watch buzz even if the phone is locked. The first time, allow notifications when asked.</p>
      <button class="btn ghost block" data-act="testPush">Send a test alert</button><p class="small" id="push-test" aria-live="polite"></p>`;
  };
  A.testPush = async (d, el) => {
    const out = $('#push-test'); el.disabled = true;
    try { await pushSend({ title: 'Liftprint test ✅', body: 'Rest alerts are working. You can lock your phone between sets now.' }); out.innerHTML = '<span style="color:var(--ok)">Sent!</span> <span class="faint">Lock your phone now. It arrives in 5 seconds.</span>'; }
    catch (e) { out.innerHTML = `<span style="color:var(--miss)">Notifications are off for Liftprint.</span> <button class="linkbtn" data-act="openAppSettings" style="padding:0;font-size:inherit">Open Settings</button>`; }
    el.disabled = false;
  };
  /* status bar text (clock, battery) follows the app's theme, not the phone's light/dark setting, so it never ends up dark-on-dark */
  const sbSync = () => { try { const SB = Capacitor.Plugins && Capacitor.Plugins.StatusBar; if (SB) SB.setStyle({ style: document.documentElement.dataset.theme === 'light' ? 'LIGHT' : 'DARK' }).catch(() => {}); } catch (e) {} };
  if (typeof applyTheme === 'function') { const at = applyTheme; applyTheme = function (...a) { const r = at(...a); sbSync(); return r; }; }
  setTimeout(sbSync, 400);
  siriSettingsHTML = function () { return ''; };   // the Siri weigh-in shortcut was a web-version workaround that went through an outside service
  siriPoll = async function () {};
  if (localStorage.getItem(PUSH_ON) == null) lsSet(PUSH_ON, '1');   // on by default in the app: nothing to set up
}
