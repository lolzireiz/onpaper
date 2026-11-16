'use strict';
/* Brand: the logo mark in the header, and the launch animation hand-off. */
const LP_MARK = `<svg class="lp-mark" viewBox="80 80 864 864" data-act="logoTap" role="img" aria-label="Liftprint"><defs><linearGradient id="lpg" x1=".05" y1="0" x2=".95" y2="1"><stop offset="0" stop-color="#ffa62b"/><stop offset=".55" stop-color="#f4511e"/><stop offset="1" stop-color="#e8284f"/></linearGradient></defs><rect class="lp-bg" x="80" y="80" width="864" height="864" rx="210" fill="url(#lpg)"/><g fill="none" stroke="#fff" stroke-width="60" stroke-linecap="round"><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.00s" d="M435.4 447.7 A100 100 0 1 1 425.4 562.0"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.06s" d="M603.5 684.2 A195 195 0 0 1 326.5 451.7"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.12s" d="M371.7 376.5 A195 195 0 0 1 665.7 632.1"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.18s" d="M740.5 333.5 A290 290 0 0 1 296.5 706.0"/><path class="lp-arc" pathLength="1" stroke-dasharray="1" style="--d:0.24s" d="M239.5 611.2 A290 290 0 0 1 657.0 260.9"/></g><circle class="lp-bar" cx="512" cy="512" r="38"/></svg>`;
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
