'use strict';
/* Boot: tab bar, file inputs, capabilities, keep the view across app updates. */

const TABS = [['home', 'Today'], ['train', 'Train'], ['food', 'Food'], ['progress', 'Progress'], ['you', 'You']];
$('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="tab" data-tab="${k}" aria-label="${l}">${ICON[k]}<span>${l}</span></button>`).join('');
A.tab = (d, el) => {
  if (el) { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); }
  if (d.tab === 'progress') { if (tabOf(UI.tab) === 'progress') { UI.liftKey = null; $('#view').scrollTo({ top: 0, behavior: 'smooth' }); render(); return; } UI.tab = UI.progLast === 'athlete' ? 'athlete' : ['weight', 'photos', 'measure'].includes(UI.progLast) ? 'body' : 'lifts'; $('#view').scrollTop = 0; render(); return; }
  if (UI.tab === d.tab) { // tapping the current tab goes back to its top level
    if (d.tab === 'lifts') UI.liftKey = null;
    $('#view').scrollTo({ top: 0, behavior: 'smooth' });
  } else { UI.tab = d.tab; $('#view').scrollTop = 0; }
  if (d.tab === 'train' && activeWorkout()) UI.session = true;
  render();
};
$('#file-food').addEventListener('change', e => onFoodPhoto(e.target.files && e.target.files[0]));
$('#file-watch').addEventListener('change', e => onWatchPhoto(e.target.files && e.target.files[0]));
$('#file-photo').addEventListener('change', e => onPhotoChosen(e.target.files && e.target.files[0]));
$('#file-backup').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; onBackupChosen(f).finally(() => { e.target.value = ''; }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#dialog').hidden) return; closeSheet(); } });
setInterval(() => { if (UI.tab === 'train' && UI.session && $('#sheet').hidden) scheduleRender(); }, 60000);

/* old exercise names still find their animation, guide and muscles (train.js migrates saved data on launch) */
for (const [a, b] of EX_RENAMES) { if (EX_ANIM[b] && !EX_ANIM[a]) EX_ANIM[a] = EX_ANIM[b]; if (EX_INFO[b] && !EX_INFO[a]) EX_INFO[a] = EX_INFO[b]; if (EX_MUSCLES[keyOf(b)] && !EX_MUSCLES[keyOf(a)]) EX_MUSCLES[keyOf(a)] = EX_MUSCLES[keyOf(b)]; }
function initCaps() { refreshCaps(); scheduleRender(); }
function start(saved) {
  if (saved && typeof saved === 'object') for (const k of ['tab', 'bodySub', 'liftKey', 'session', 'weightRange', 'weightFilter']) if (saved[k] !== undefined) UI[k] = saved[k];
  render();
  initStore().then(() => { try { migrateExNames(); } catch (e) {} requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof splashOut === 'function') splashOut(); })); if (!S().onboarded && !activeWorkout()) openOnboarding(); checkVersion(); setTimeout(() => siriPoll(false), 900); if (activeWorkout()) { UI.tab = 'train'; UI.session = true; render(); restoreRest(); } else lsSet('onpaper.rest', ''); });
  initCaps();
}
if (window.claude?.hot?.snapshot) window.claude.hot.snapshot(() => ({ tab: UI.tab, bodySub: UI.bodySub, liftKey: UI.liftKey, session: UI.session, weightRange: UI.weightRange, weightFilter: UI.weightFilter }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? {});

/* warm up the 3D figure in the background so exercise animations open instantly */
setTimeout(() => { const go = () => { try { loadBodyMesh(() => {}); } catch (e) {} }; 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 4000 }) : go(); }, 1500);
