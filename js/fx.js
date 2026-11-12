'use strict';
/* Motion: confetti, bursts, count-ups, screen entrances. All of it is skipped when the phone asks for reduced motion. */
const REDUCED = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FX_COLORS = ['#ffb238', '#ff4f6d', '#b13dff', '#3392f5', '#3ccf82', '#ffe08a'];
let fxCanvas = null, fxParts = [], fxRAF = 0;
function fxCtx() {
  if (!fxCanvas) { fxCanvas = document.createElement('canvas'); fxCanvas.id = 'fx'; document.body.appendChild(fxCanvas); }
  const dpr = Math.min(2, devicePixelRatio || 1); if (fxCanvas.width !== innerWidth * dpr) { fxCanvas.width = innerWidth * dpr; fxCanvas.height = innerHeight * dpr; }
  const c = fxCanvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return c;
}
/* confetti({x, y, n, spread, power, colors, emoji, small}) — x/y in screen px (defaults: top-center burst) */
function confetti(o = {}) {
  if (REDUCED()) return;
  const x = o.x ?? innerWidth / 2, y = o.y ?? innerHeight * .32, n = o.n ?? 90, power = o.power ?? 11, spread = o.spread ?? Math.PI * 2;
  const base = o.angle ?? -Math.PI / 2, cols = o.colors || FX_COLORS;
  for (let i = 0; i < n; i++) {
    const a = base + (Math.random() - .5) * spread, v = power * (.45 + Math.random() * .75);
    fxParts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.small ? .32 : .38, life: 0, max: (o.small ? 45 : 80) + Math.random() * 40, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, w: (o.small ? 4 : 6) + Math.random() * 5, h: (o.small ? 3 : 4) + Math.random() * 6, c: cols[i % cols.length], shape: o.emoji ? 'e' : Math.random() < .3 ? 'c' : 'r', emoji: o.emoji });
  }
  if (!fxRAF) fxRAF = requestAnimationFrame(fxTick);
}
function fxTick() {
  const c = fxCtx(); c.clearRect(0, 0, innerWidth, innerHeight);
  fxParts = fxParts.filter(p => p.life < p.max);
  for (const p of fxParts) {
    p.life++; p.vx *= .985; p.vy = p.vy * .985 + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    const a = Math.min(1, (p.max - p.life) / 22); c.globalAlpha = a; c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
    if (p.shape === 'e') { c.font = '22px system-ui'; c.textAlign = 'center'; c.fillText(p.emoji, 0, 8); }
    else { c.fillStyle = p.c; if (p.shape === 'c') { c.beginPath(); c.arc(0, 0, p.w / 2.2, 0, 7); c.fill(); } else c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6))); }
    c.restore();
  }
  c.globalAlpha = 1;
  fxRAF = fxParts.length ? requestAnimationFrame(fxTick) : 0; if (!fxRAF) c.clearRect(0, 0, innerWidth, innerHeight);
}
const centerOf = el => { const r = el?.getBoundingClientRect?.(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; };
function celebratePR(el) { const p = centerOf(el); confetti({ x: p.x, y: p.y, n: 70, power: 12 }); setTimeout(() => confetti({ x: innerWidth * .2, y: innerHeight * .25, n: 40, angle: -Math.PI / 3, spread: 1.2, power: 13 }), 160); setTimeout(() => confetti({ x: innerWidth * .8, y: innerHeight * .25, n: 40, angle: -Math.PI * 2 / 3, spread: 1.2, power: 13 }), 300); }
function sparkle(el, colors) { const p = centerOf(el); confetti({ x: p.x, y: p.y, n: 18, power: 6, small: true, colors: colors || ['#3ccf82', '#3392f5', '#ffffff'] }); }
/* count-up: elements with data-count="123.4" data-dp="1" animate from 0 */
function countUps(root = document) {
  if (REDUCED()) return;
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, dp = +(el.dataset.dp || 0); if (!isFinite(to)) return; const t0 = performance.now(), dur = 750;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
/* screen entrance: stagger the view's cards in when you switch tabs */
let fxLastView = '';
function fxEnter(view) {
  const sig = UI.tab + (UI.session ? ':s' : '') + (UI.liftKey || '') + (UI.bodySub || '');
  if (sig === fxLastView || REDUCED()) { fxLastView = sig; return; }
  fxLastView = sig;
  [...view.children].forEach((c, i) => { c.style.setProperty('--i', Math.min(i, 9)); });
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
  $$('.bar i', view).forEach(b => { const w = b.style.width; b.style.transition = 'none'; b.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => { b.style.transition = ''; b.style.width = w; })); });
  countUps(view);
  clearTimeout(fxEnter.t); fxEnter.t = setTimeout(() => view.classList.remove('enter'), 900);
}
