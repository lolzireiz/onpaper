'use strict';
/* Brand: the logo mark in the header, and the launch animation hand-off. */
const LP_MARK = `<svg class="lp-mark" viewBox="80 80 864 864" data-act="logoTap" role="img" aria-label="Liftprint"><defs><linearGradient id="lpg" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#ffb238"/><stop offset=".5" stop-color="#ff4f6d"/><stop offset="1" stop-color="#b13dff"/></linearGradient></defs><g fill="none" stroke="url(#lpg)" stroke-width="62" stroke-linecap="round"><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.00s" d="M396.1 574.8 A120.0 134.4 0 1 1 627.9 574.8"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.06s" d="M343.5 698.4 A220.0 246.4 0 0 1 359.2 362.8"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.12s" d="M415.6 318.5 A220.0 246.4 0 0 1 680.5 698.4"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.18s" d="M323.9 830.0 A320.0 358.4 0 0 1 381.8 212.6"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.24s" d="M478.6 183.6 A320.0 358.4 0 0 1 700.1 830.0"/></g><g class="lp-bar" transform="translate(512 548) scale(1.3)"><rect x="-150" y="-13" width="300" height="26" rx="13"/><rect x="-112" y="-64" width="38" height="128" rx="13"/><rect x="-150" y="-46" width="30" height="92" rx="11"/><rect x="74" y="-64" width="38" height="128" rx="13"/><rect x="120" y="-46" width="30" height="92" rx="11"/></g></svg>`;
Views.home.title = () => `<span class="wordmark">${LP_MARK}<span>lift<i>print</i></span></span>`;
/* tap the logo: the arcs redraw and it sparkles */
A.logoTap = (d, el) => { const m = el.closest('.lp-mark') || el; if (REDUCED()) return; m.classList.remove('lp-tw'); void m.getBoundingClientRect(); m.classList.add('lp-tw'); sparkle(m); setTimeout(() => m.classList.remove('lp-tw'), 1000); };
/* launch: wait until your data is on screen (and the draw-in has played), then fly the mark into the logo */
function splashOut() {
  const sp = document.getElementById('splash'); if (!sp || sp.dataset.out) return; sp.dataset.out = 1;
  const wait = Math.max(0, 980 - (performance.now() - (window.SPLASH_T0 || 0)));
  setTimeout(() => {
    const mark = sp.querySelector('.sp-mark'), tgt = document.querySelector('#top .lp-mark');
    const ok = tgt && mark && !REDUCED() && $('#sheet').hidden && !document.body.classList.contains('ob-open');
    if (!ok) { sp.classList.add('out'); setTimeout(() => sp.remove(), 400); return; }
    const a = mark.getBoundingClientRect(), b = tgt.getBoundingClientRect(), s = b.width / a.width;
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    tgt.style.opacity = '0';
    mark.style.transition = 'transform .52s cubic-bezier(.55,0,.15,1)'; sp.classList.add('fly');
    requestAnimationFrame(() => { mark.style.transform = `translate(${dx}px,${dy}px) scale(${s})`; });
    setTimeout(() => { tgt.style.opacity = ''; tgt.classList.add('lp-land'); setTimeout(() => tgt.classList.remove('lp-land'), 600); sp.remove(); }, 540);
  }, wait);
}
