'use strict';
/* Dunk simulator: a figure scaled to YOUR height and standing reach jumps at a regulation hoop.
   Instead of resizing the body, the whole world is scaled: the figure keeps its proportions and the rim,
   ball and jump height are converted from inches into the figure's units (k = model units per inch). */

const bestVert = () => Math.max(0, ...Store.list('jumps').map(j => j.vert || 0));
const userHeight = () => S().heightIn || 70;
const userReach = () => S().reach || Math.round(userHeight() * 1.33);
/* Poses are in the figure's own units with the body at z = 0, facing +z (toward the hoop). Feet/hands are absolute, so moving the
   whole body means shifting p, feet and hands together (see shift()). */
const SIM_POSES = {
  stand: { p: [0, 0.95, 0], lean: 3, f: [0.13, 0.06, 0], hR: [0.2, 1.02, 0.2], hL: [-0.22, 0.88, 0.04], epR: [1, -0.5, -0.4], epL: [-1, 0, -0.2] },
  runA: { p: [0, 0.92, 0], lean: 14, fR: [0.11, 0.07, 0.3], fL: [-0.11, 0.34, -0.3], kpR: [0, 0.2, 1], kpL: [0, -0.5, 1], hR: [0.24, 0.98, 0.08], hL: [-0.22, 1.15, 0.3], epR: [1, -0.3, -0.6], epL: [-1, -0.6, -0.4] },
  runB: { p: [0, 0.92, 0], lean: 14, fR: [0.11, 0.34, -0.3], fL: [-0.11, 0.07, 0.3], kpR: [0, -0.5, 1], kpL: [0, 0.2, 1], hR: [0.24, 1.05, 0.2], hL: [-0.24, 0.82, -0.28], epR: [1, -0.4, -0.5], epL: [-1, 0.4, 0.2] },
  load: { p: [0, 0.62, -0.06], lean: 32, f: [0.15, 0.06, 0.04], kp: [0.25, 0, 1], hR: [0.24, 0.72, -0.48], hL: [-0.24, 0.72, -0.46], epR: [1, 0.2, 0.4], epL: [-1, 0.2, 0.4] },
  take: { p: [0, 1.02, 0.04], lean: 8, f: [0.13, 0.06, 0.02], pt: 0.95, hR: [0.14, 2.2, 0.36], hL: [-0.26, 1.85, 0.3], epR: [1, 0, -0.2], epL: [-1, 0, -0.2] },
  air: { p: [0, 0.98, 0], lean: -2, fR: [0.12, 0.3, -0.06], fL: [-0.12, 0.42, -0.16], kpR: [0, -0.2, 1], kpL: [0, -0.2, 1], ptR: 0.7, ptL: 0.8, hR: [0.06, 2.55, 0.34], hL: [-0.36, 1.25, 0.02], epR: [1, 0, -0.2], epL: [-1, -0.2, -0.5] },
  slam: { p: [0, 0.98, 0], lean: 10, fR: [0.12, 0.26, 0.02], fL: [-0.12, 0.34, -0.08], kpR: [0, -0.2, 1], kpL: [0, -0.2, 1], ptR: 0.7, ptL: 0.8, hR: [0.16, 1.12, 0.42], hL: [-0.38, 1.0, -0.06], epR: [1, -0.6, -0.3], epL: [-1, -0.2, -0.5] },
  land: { p: [0, 0.64, 0], lean: 26, f: [0.16, 0.06, 0.02], kp: [0.25, 0, 1], hR: [0.3, 0.98, 0.32], hL: [-0.3, 0.98, 0.3], epR: [1, -0.4, -0.4], epL: [-1, -0.4, -0.4] },
};
function simModel(sex) {
  const build = (G3.state === 'ready' && G3.mesh[sex].build) || BUILD[sex] || BUILD.male;
  const P = Object.fromEntries(Object.entries(SIM_POSES).map(([k, o]) => [k, animResolve(o, build)]));
  // standing reach in model units: fingertip of the raised hand with the pelvis at standing height
  const Ja = animJoints({ ...P.air, p: [0, 0.95, 0] }, build), up = V.norm(V.sub(Ja.haR, Ja.elR)), tip = V.add(Ja.haR, V.mul(up, 0.19 * (build.fa || 0.27) / 0.27));
  return { build, P, reachM: tip[1], tipZ: tip[2], handZ: Ja.haR[2] };
}
const shift = (q, dy, dz) => { const o = { ...q }; for (const k of ['p', 'hR', 'hL', 'fR', 'fL']) o[k] = V.add(q[k], [0, k === 'p' || k[0] === 'h' ? dy : dy, dz]); return o; };
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function simDef(sex, o) {
  const M = simModel(sex), k = M.reachM / o.reach, rimY = o.rim * k, jump = Math.max(0, o.vert) * k, dunk = o.reach + o.vert >= o.rim + 6 - 0.01;
  const rimZ = 0, D = 1.05, FX = u => 1 - Math.pow(1 - u, 1.55), zT = rimZ - M.tipZ - D * FX(0.5), zG = zT - 0.24, zS = zG - 1.7, T = 4.2, g = 9.81 * 39.37 * k, ballR = 4.7 * k;
  const P = M.P, run = [P.runA, P.runB];
  const at = (q, z, dy = 0) => shift(q, dy, z);
  const def = { name: 'Dunk', build: M.build, a: P.stand, b: P.air, hl: new Set(), grip: 1, k, T, yaw: 74, ballR, dunk };
  def.qAt = t => {
    const s = t * T; let q, z; def._ball = null; def._rimDy = 0;
    if (s < 0.25) { q = at(P.stand, zS); z = zS; }
    else if (s < 1.45) {   // approach: four strides
      const u = (s - 0.25) / 1.2, st = u * 4, i = Math.floor(st), f = st - i, a = run[i % 2], b = run[(i + 1) % 2];
      z = zS + (zG - zS) * u; const bob = Math.abs(Math.sin(st * Math.PI)) * 0.035;
      q = at(i === 0 && f < 0.5 ? animLerp(P.stand, a, ease(f * 2)) : animLerp(a, b, ease(f)), z, bob);
    }
    else if (s < 1.68) { const u = ease((s - 1.45) / 0.23); z = zG + 0.14 * u; q = at(animLerp(P.runB, P.load, u), z); }
    else if (s < 1.86) { const u = ease((s - 1.68) / 0.18); z = zG + 0.14 + 0.1 * u; q = at(animLerp(P.load, P.take, u), z); }
    else if (s < 2.86) {   // flight
      const u = (s - 1.86) / 1.0, h = jump * 4 * u * (1 - u) + 0.04 * Math.sin(Math.PI * u); z = zT + D * FX(u);
      let pose = animLerp(P.take, P.air, ease(Math.min(1, u / 0.3)));
      if (dunk && u > 0.5) pose = animLerp(P.air, P.slam, ease((u - 0.5) / 0.22));
      q = at(pose, z, h);
      if (dunk && u > 0.62) { // ball leaves the hand over the rim and drops through the net
        const t0 = (u - 0.62) * 1.0, y0 = rimY + ballR * 0.6, y = y0 - 0.5 * g * t0 * t0;
        def._ball = [0, Math.max(ballR, y), rimZ]; def._rimDy = 2.2 * k * Math.max(0, Math.sin(Math.min(1, (u - 0.62) / 0.25) * Math.PI));
      }
    }
    else if (s < 3.12) { const u = ease((s - 2.86) / 0.26); z = zT + D; q = at(animLerp(dunk ? P.slam : P.air, P.land, u), z); }
    else { const u = ease((s - 3.12) / 0.6); z = zT + D; q = at(animLerp(P.land, P.stand, u), z); }
    if (dunk && s >= 2.48 && !def._ball) { // after the slam the ball keeps bouncing under the hoop
      const t0 = s - 2.48, y0 = rimY + ballR * 0.6, tHit = Math.sqrt(2 * (y0 - ballR) / g); let y;
      if (t0 < tHit) y = y0 - 0.5 * g * t0 * t0; else { const v0 = g * tHit * 0.55, t1 = t0 - tHit, tb = 2 * v0 / g; const t2 = t1 % tb, v = v0 * Math.pow(0.55, Math.floor(t1 / tb)); y = ballR + Math.max(0, v * t2 - 0.5 * g * t2 * t2); }
      def._ball = [0, y, rimZ + Math.min(0.5, Math.max(0, t0 - tHit) * 0.35)];
    }
    // camera drifts with the runner and settles on the hoop
    const cz = Math.min(rimZ - 0.12, Math.max(zS + 0.75, (z == null ? zS : z) + 0.5));
    def.c = [0, def.cy, def._cz == null ? cz : def._cz + (cz - def._cz) * 0.12]; def._cz = def.c[2];
    def.fade = s < 0.25 ? s / 0.25 : s > T - 0.3 ? (T - s) / 0.3 : 1;
    return q;
  };
  const peakTip = M.reachM + jump, dunkY = (o.rim + 6) * k, bz = rimZ + 15 * k;
  def.props = [{ t: 'hoop', k, y: rimY, z: rimZ }, { t: 'ball', r: ballR }, { t: 'hline', x: -0.3, y: peakTip, z: rimZ - 0.3, w: 1.0, col: [0.2, 0.57, 0.96], th: 0.014 }, { t: 'hline', x: -0.3, y: dunkY, z: rimZ - 0.3, w: 1.0, col: [0.24, 0.81, 0.51], th: 0.014 }];
  def.court = { k, base: bz + 48 * k, ft: bz - 180 * k, lane: 192 * k, ftr: 72 * k, z0: zS - 3, z1: bz + 48 * k + 1.5 };
  const top = Math.max(rimY + 42 * k, peakTip + 0.12);
  def.cy = top * 0.47; def.r = Math.max(1.15, top * 0.55); def.c = [0, def.cy, rimZ - 0.12];
  return def;
}

const dLen = i => U.metric ? `${Math.round(i * 2.54)} cm` : ftin(i), dIn = i => U.metric ? `${Math.round(i * 2.54)} cm` : `${trim(i, 1)}″`;
function dunkSimHTML() {
  const s = S(), h = userHeight(), rim = s.dunkGoal || 120, bv = bestVert(), v = UI.simVert ?? (bv || 24), reach = userReach();
  const touch = reach + v, needDunk = rim + 6 - reach, needTouch = rim - reach;
  const st = touch >= rim + 6 ? ['🔥 Dunk!', touch - rim - 6 < 0.25 ? 'Right at the dunk line' : `You clear the dunk line by ${dIn(touch - rim - 6)}`, 'var(--ok)'] : touch >= rim ? ['✋ Rim touch', `${dIn(rim + 6 - touch)} more to dunk`, '#f5b915'] : ['📏 Short', `${dIn(rim - touch)} below the rim · ${dIn(rim + 6 - touch)} from a dunk`, 'var(--miss)'];
  return `<section class="card dsim"><div class="card-h"><div><div class="eyebrow">🏀 Dunk simulator</div><h2 class="sec-t" style="margin:0">You at ${dLen(h)} vs a ${dLen(rim)} rim</h2></div><button class="linkbtn" data-act="simSetup">Edit</button></div>
    <div class="dsim-stage"><canvas class="dsim-cv" role="img" aria-label="A figure your height jumping at the rim"></canvas><div class="dsim-badge" style="--c:${st[2]}"><b>${st[0]}</b><span>${st[1]}</span></div><div class="dsim-leg"><span><i style="background:#3392f5"></i>Your peak ${dLen(Math.round(touch * 2) / 2)}</span><span><i style="background:#3ccf82"></i>Dunk line ${dLen(rim + 6)}</span></div></div>
    <div class="field"><div class="card-h"><span class="lbl">Vertical jump</span><b class="rnum" id="sim-v">${dIn(v)}</b></div><input type="range" class="sim-range" min="0" max="50" step="0.5" value="${v}" aria-label="Vertical jump in inches">
      <div class="chips">${bv ? `<button class="chip" data-act="simVert" data-v="${bv}" aria-pressed="${v === bv}">My best ${dIn(bv)}</button>` : ''}<button class="chip" data-act="simVert" data-v="${Math.max(0, needTouch)}" aria-pressed="${v === Math.max(0, needTouch)}">Touch rim ${dIn(Math.max(0, needTouch))}</button><button class="chip" data-act="simVert" data-v="${Math.max(0, needDunk)}" aria-pressed="${v === Math.max(0, needDunk)}">Dunk ${dIn(Math.max(0, needDunk))}</button></div></div>
    <div class="stats"><div class="stat"><span class="k">Standing reach</span><span class="v">${dLen(reach)}</span>${s.reach ? '' : '<span class="faint tiny">estimated</span>'}</div><div class="stat"><span class="k">Touch at ${dIn(v)}</span><span class="v">${dLen(Math.round(touch * 2) / 2)}</span></div><div class="stat"><span class="k">Vert to dunk</span><span class="v">${dIn(Math.max(0, needDunk))}</span>${bv ? `<span class="faint tiny">${needDunk - bv > 0 ? dIn(needDunk - bv) + ' to go' : 'you have it'}</span>` : ''}</div></div>
  </section>`;
}
A.simVert = d => { UI.simVert = +d.v; render(); };
document.addEventListener('input', e => {
  const r = e.target.closest && e.target.closest('.sim-range'); if (!r) return; UI.simVert = +r.value; const l = $('#sim-v'); if (l) l.textContent = dIn(UI.simVert);
  clearTimeout(simInput.t); simInput.t = setTimeout(() => { const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; }, 180);
});
function simInput() {}
A.simSetup = () => {
  const s = S(), h = userHeight(), r = s.reach || 0;
  openSheet('Dunk simulator setup', `<p class="muted small" style="margin:0">Your height sets the size of the figure. Standing reach (flat-footed, one arm straight up, fingertips) makes it exact. If you skip it, it's estimated from your height.</p>
    ${U.metric ? `<div class="field"><span class="lbl">Your height (cm)</span><input id="sim-hcm" inputmode="decimal" value="${Math.round(h * 2.54)}"></div><div class="field"><span class="lbl">Standing reach in cm (optional)</span><input id="sim-rcm" inputmode="decimal" placeholder="e.g. 236" value="${r ? Math.round(r * 2.54) : ''}"></div>` : `<div class="field"><span class="lbl">Your height</span><div class="fields"><select id="sim-hf">${[4, 5, 6, 7].map(f => `<option value="${f}" ${Math.floor(h / 12) === f ? 'selected' : ''}>${f} ft</option>`).join('')}</select><select id="sim-hi">${[...Array(12)].map((_, i) => `<option value="${i}" ${h % 12 === i ? 'selected' : ''}>${i} in</option>`).join('')}</select></div></div>
    <div class="field"><span class="lbl">Standing reach (optional)</span><div class="fields"><select id="sim-rf"><option value="">—</option>${[6, 7, 8, 9].map(f => `<option value="${f}" ${r && Math.floor(r / 12) === f ? 'selected' : ''}>${f} ft</option>`).join('')}</select><input id="sim-ri" inputmode="decimal" placeholder="in" value="${r ? trim(r % 12, 1) : ''}"></div></div>`}
    <div class="field"><span class="lbl">Rim height</span><div class="seg">${[[96, "8′"], [108, "9′"], [114, "9′6″"], [120, "10′"]].map(([v, l]) => [v, U.metric ? (v * 0.0254).toFixed(2) + ' m' : l]).map(([v, l]) => `<button data-act="pick" data-group="simrim" data-value="${v}" aria-pressed="${(s.dunkGoal || 120) === v}">${l}</button>`).join('')}</div></div>
    <button class="btn block" data-act="simSave">Save</button>`);
};
A.simSave = () => {
  const met = !!$('#sim-hcm'), h = met ? Math.round(num($('#sim-hcm').value) / 2.54) : (+$('#sim-hf').value) * 12 + (+$('#sim-hi').value), rcm = met ? num($('#sim-rcm').value) : 0, rf = met ? (rcm ? 1 : '') : $('#sim-rf').value, ri = met ? 0 : num($('#sim-ri').value) || 0, rim = +picked($('#sheet'), 'simrim') || S().dunkGoal || 120;
  if (!(h > 48 && h < 96)) { toast('Check your height.', { bad: true }); return; }
  const patch = { heightIn: h, dunkGoal: rim }; if (rf) patch.reach = met ? Math.round(rcm / 2.54 * 2) / 2 : (+rf) * 12 + ri;
  if (patch.reach && (patch.reach < h || patch.reach > h * 1.5)) { toast('That reach looks off. It\'s usually about 1.3× your height.', { bad: true }); return; }
  saveSettings(patch); closeSheet(); toast('Saved');
};

/* mount: runs after each render, draws the looping jump into the canvas */
function mountDunkSim() {
  const cv = $('.dsim-cv'); if (!cv || cv._on) return; cv._on = 1;
  const sex = S().bodyModel === 'female' ? 'female' : 'male';
  const start = () => {
    if (!cv.isConnected) return;
    const o = { rim: S().dunkGoal || 120, reach: userReach(), vert: UI.simVert ?? (bestVert() || 24) }, def = simDef(sex, o);
    let G; try { G = g3Setup(cv, def, sex); } catch (e) { cv.parentElement.classList.add('dsim-nogl'); return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), fit = () => { const r = cv.getBoundingClientRect(); if (r.width) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); } };
    fit(); const t0 = performance.now(); let yaw = def.yaw, drag = null;
    const frame = now => {
      if (!cv.isConnected) { const x = G.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); return; }
      if (!cv.width) fit();
      const t = REDUCED() ? 0.6 : ((now - t0) / 1000 / def.T) % 1; g3Draw(cv, G, def, t, yaw, 0); cv.style.opacity = REDUCED() ? 1 : def.fade;
      if (!REDUCED()) requestAnimationFrame(frame);
    };
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * 0.6; if (REDUCED()) frame(performance.now()); } });
    const end = () => { drag = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    requestAnimationFrame(frame);
  };
  const st = cv.parentElement;
  if (G3.state === 'ready') start(); else { st.classList.add('anim-loading'); loadBodyMesh(ok => { st.classList.remove('anim-loading'); if (ok) start(); else st.classList.add('dsim-nogl'); }); }
}
{ const base = render; render = function () { base(); if (UI.tab === 'athlete') mountDunkSim(); }; }
{ const ar = Views.athlete.render; Views.athlete.render = () => { const h = ar(), i = h.indexOf('<section', h.indexOf('</div>', h.indexOf('seg-top'))); return i > 0 ? h.slice(0, i) + dunkSimHTML() + h.slice(i) : h + dunkSimHTML(); }; }
