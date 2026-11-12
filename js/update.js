'use strict';
/* Update status: compares the running version with the one live on the site, and applies it in one tap. */
const Upd = { state: 'idle', latest: null, checkedAt: 0 };
const cmpVer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
async function checkUpdate() {
  if (Upd.state === 'checking' || Upd.state === 'applying') return;
  Upd.state = 'checking'; drawUpd();
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0;
    const j = await r.json(); Upd.latest = j; Upd.checkedAt = Date.now();
    Upd.state = cmpVer(j.version, APP_VERSION) > 0 ? 'ready' : 'current';
  } catch (e) { Upd.state = 'error'; }
  drawUpd(); scheduleRender();
}
function updBannerHTML() { return Upd.state === 'ready' ? `<button class="banner upd" data-act="applyUpdate">✨ <b>Update v${esc(Upd.latest.version)} is ready</b> · Tap to update</button>` : ''; }
function updStatusHTML() {
  const t = Upd.checkedAt ? fmtClock(Upd.checkedAt) : '';
  const line = { idle: 'Not checked yet', checking: '<span class="thinking">Checking for updates…</span>', current: `<span style="color:var(--ok)">✓ Up to date</span> <span class="faint">· checked ${t}</span>`, ready: `<b style="color:var(--accent)">v${esc(Upd.latest?.version)} is ready to install</b>`, error: `<span class="faint">Couldn't check (offline?) · ${t ? 'last checked ' + t : 'try again'}</span>`, applying: '<span class="thinking">Updating…</span>' }[Upd.state];
  const notes = Upd.state === 'ready' && Upd.latest?.notes?.length ? `<ul class="muted small" style="margin:6px 0 0;padding-left:18px">${Upd.latest.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  return `<div class="field"><span class="lbl">App updates · you're on v${APP_VERSION}</span><p class="small" id="upd-line">${line}</p>${notes}
    <div class="btnrow">${Upd.state === 'ready' ? `<button class="btn" data-act="applyUpdate">Update now</button>` : `<button class="btn ghost" data-act="checkUpdate">Check now</button>`}<span class="faint tiny" style="align-self:center">Checks on its own every minute while the app is open.</span></div></div>`;
}
function drawUpd() { const box = $('#upd-box'); if (box) box.innerHTML = updStatusHTML(); }
A.checkUpdate = () => checkUpdate();
A.applyUpdate = async () => {
  Upd.state = 'applying'; drawUpd(); toast('Updating…', { ms: 8000 });
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
  try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) await reg.update(); } catch (e) {}
  try { await new Promise(r => setTimeout(r, 300)); } catch (e) {}
  location.reload();
};
setTimeout(checkUpdate, 2500);
setInterval(() => { if (document.visibilityState === 'visible') checkUpdate(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - Upd.checkedAt > 15000) checkUpdate(); });
