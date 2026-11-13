'use strict';
/* Dunk simulator: a figure scaled to YOUR height and standing reach jumps at a regulation hoop.
   Instead of resizing the body, the whole world is scaled: the figure keeps its proportions and the rim,
   ball and jump height are converted from inches into the figure's units (k = model units per inch). */

const bestVert = () => Math.max(0, ...Store.list('jumps').map(j => j.vert || 0));
const userHeight = () => S().heightIn || 70;
const userReach = () => S().reach || Math.round(userHeight() * 1.33);
const SIM_POSES = {
  stand: { p: [0, 0.95, -0.35], lean: 2, f: [0.13, 0.06, -0.35], h: [0.22, 0.86, -0.3], ep: [1, 0, -0.3] },
  load: { p: [0, 0.6, -0.42], lean: 32, f: [0.16, 0.06, -0.3], kp: [0.2, 0, 1], h: [0.26, 0.72, -0.78], ep: [1, 0, 0.3] },
  air: { p: [0, 0.98, -0.1], lean: -3, fR: [0.12, 0.12, -0.08], fL: [-0.12, 0.3, -0.22], kpL: [0, 0, 1], hR: [0.08, 2.4, 0.2], hL: [-0.3, 1.35, 0.05], epR: [1, 0, -0.2], epL: [-1, -0.3, -0.3], ptR: 0.7, ptL: 0.8 },
};
function simModel(sex) {
  const build = (G3.state === 'ready' && G3.mesh[sex].build) || BUILD[sex] || BUILD.male;
  const P = Object.fromEntries(Object.entries(SIM_POSES).map(([k, o]) => [k, animResolve(o, build)]));
  // standing reach of the figure in model units: fingertip of the raised hand while still on the ground
  const Ja = animJoints({ ...P.air, p: [P.air.p[0], P.air.p[1] - 0.02, P.air.p[2]] }, build), up = V.norm(V.sub(Ja.haR, Ja.elR));
  const tip = V.add(Ja.haR, V.mul(up, 0.19 * (build.fa || 0.27) / 0.27));
  return { build, P, reachM: tip[1], tipZ: tip[2] };
}
function simDef(sex, o) {
  const M = simModel(sex), k = M.reachM / o.reach, rimY = o.rim * k, jump = o.vert * k, T = 2.6;
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const lift = q => (dy, dz) => { q.p = V.add(q.p, [0, dy, dz]); q.fR = V.add(q.fR, [0, dy, dz]); q.fL = V.add(q.fL, [0, dy, dz]); q.hR = V.add(q.hR, [0, dy, dz]); q.hL = V.add(q.hL, [0, dy, dz]); return q; };
  const qAt = t => {   // t: 0..1 over the whole loop
    const s = t * T, { stand, load, air } = M.P;
    if (s < 0.5) return animLerp(stand, load, ease(s / 0.5));
    if (s < 0.72) return animLerp(load, air, ease((s - 0.5) / 0.22));
    if (s < 1.72) { const u = (s - 0.72) / 1.0, h = jump * 4 * u * (1 - u); return lift(animLerp(air, air, 0))(h, 0.18 * u); }
    if (s < 2.0) return lift(animLerp(air, load, ease((s - 1.72) / 0.28)))(0, 0.18);
    return lift(animLerp(load, stand, ease((s - 2.0) / 0.6)))(0, 0.18 * (1 - ease((s - 2.0) / 0.6)));
  };
  const peakTip = M.reachM + jump, dunkY = (o.rim + 6) * k, rimZ = M.tipZ + 0.18 * 0.5 + 0.05;
  const props = [{ t: 'hoop', k, y: rimY, z: rimZ }, { t: 'ball', r: 4.7 * k }, { t: 'hline', x: -0.25, y: peakTip, z: rimZ, w: 1.1, col: [0.2, 0.57, 0.96], th: 0.016 }, { t: 'hline', x: -0.25, y: dunkY, z: rimZ, w: 1.1, col: [0.24, 0.81, 0.51], th: 0.016 }];
  const top = Math.max(rimY + 40 * k, peakTip + 0.1), c = [0, top * 0.5, 0.1];
  return { name: 'Dunk', build: M.build, a: M.P.stand, b: M.P.air, qAt, props, c, r: Math.max(1.1, top * 0.56), yaw: 72, hl: new Set(), grip: 1, k, T };
}

function dunkSimHTML() {
  const s = S(), h = userHeight(), rim = s.dunkGoal || 120, bv = bestVert(), v = UI.simVert ?? (bv || 24), reach = userReach();
  const touch = reach + v, needDunk = rim + 6 - reach, needTouch = rim - reach;
  const st = touch >= rim + 6 ? ['🔥 Dunk!', touch - rim - 6 < 0.25 ? 'Right at the dunk line' : `You clear the dunk line by ${trim(touch - rim - 6, 1)}″`, 'var(--ok)'] : touch >= rim ? ['✋ Rim touch', `${trim(rim + 6 - touch, 1)}″ more to dunk`, '#f5b915'] : ['📏 Short', `${trim(rim - touch, 1)}″ below the rim · ${trim(rim + 6 - touch, 1)}″ from a dunk`, 'var(--miss)'];
  return `<section class="card dsim"><div class="card-h"><div><div class="eyebrow">🏀 Dunk simulator</div><h2 class="sec-t" style="margin:0">You at ${ftin(h)} vs a ${ftin(rim)} rim</h2></div><button class="linkbtn" data-act="simSetup">Edit</button></div>
    <div class="dsim-stage"><canvas class="dsim-cv" role="img" aria-label="A figure your height jumping at the rim"></canvas><div class="dsim-badge" style="--c:${st[2]}"><b>${st[0]}</b><span>${st[1]}</span></div><div class="dsim-leg"><span><i style="background:#3392f5"></i>Your peak ${ftin(Math.round(touch * 2) / 2)}</span><span><i style="background:#3ccf82"></i>Dunk line ${ftin(rim + 6)}</span></div></div>
    <div class="field"><div class="card-h"><span class="lbl">Vertical jump</span><b class="rnum" id="sim-v">${trim(v, 1)}″</b></div><input type="range" class="sim-range" min="0" max="50" step="0.5" value="${v}" aria-label="Vertical jump in inches">
      <div class="chips">${bv ? `<button class="chip" data-act="simVert" data-v="${bv}" aria-pressed="${v === bv}">My best ${trim(bv, 1)}″</button>` : ''}<button class="chip" data-act="simVert" data-v="${Math.max(0, needTouch)}" aria-pressed="${v === Math.max(0, needTouch)}">Touch rim ${trim(Math.max(0, needTouch), 1)}″</button><button class="chip" data-act="simVert" data-v="${Math.max(0, needDunk)}" aria-pressed="${v === Math.max(0, needDunk)}">Dunk ${trim(Math.max(0, needDunk), 1)}″</button></div></div>
    <div class="stats"><div class="stat"><span class="k">Standing reach</span><span class="v">${ftin(reach)}</span>${s.reach ? '' : '<span class="faint tiny">estimated</span>'}</div><div class="stat"><span class="k">Touch at ${trim(v, 1)}″</span><span class="v">${ftin(Math.round(touch * 2) / 2)}</span></div><div class="stat"><span class="k">Vert to dunk</span><span class="v">${trim(Math.max(0, needDunk), 1)}″</span>${bv ? `<span class="faint tiny">${needDunk - bv > 0 ? trim(needDunk - bv, 1) + '″ to go' : 'you have it'}</span>` : ''}</div></div>
  </section>`;
}
A.simVert = d => { UI.simVert = +d.v; render(); };
document.addEventListener('input', e => {
  const r = e.target.closest && e.target.closest('.sim-range'); if (!r) return; UI.simVert = +r.value; const l = $('#sim-v'); if (l) l.textContent = trim(UI.simVert, 1) + '″';
  clearTimeout(simInput.t); simInput.t = setTimeout(() => { const y = $('#view').scrollTop; render(); $('#view').scrollTop = y; }, 180);
});
function simInput() {}
A.simSetup = () => {
  const s = S(), h = userHeight(), r = s.reach || 0;
  openSheet('Dunk simulator setup', `<p class="muted small" style="margin:0">Your height sets the size of the figure. Standing reach (flat-footed, one arm straight up, fingertips) makes it exact. If you skip it, it's estimated from your height.</p>
    <div class="field"><span class="lbl">Your height</span><div class="fields"><select id="sim-hf">${[4, 5, 6, 7].map(f => `<option value="${f}" ${Math.floor(h / 12) === f ? 'selected' : ''}>${f} ft</option>`).join('')}</select><select id="sim-hi">${[...Array(12)].map((_, i) => `<option value="${i}" ${h % 12 === i ? 'selected' : ''}>${i} in</option>`).join('')}</select></div></div>
    <div class="field"><span class="lbl">Standing reach (optional)</span><div class="fields"><select id="sim-rf"><option value="">—</option>${[6, 7, 8, 9].map(f => `<option value="${f}" ${r && Math.floor(r / 12) === f ? 'selected' : ''}>${f} ft</option>`).join('')}</select><input id="sim-ri" inputmode="decimal" placeholder="in" value="${r ? trim(r % 12, 1) : ''}"></div></div>
    <div class="field"><span class="lbl">Rim height</span><div class="seg">${[[96, "8′"], [108, "9′"], [114, "9′6″"], [120, "10′"]].map(([v, l]) => `<button data-act="pick" data-group="simrim" data-value="${v}" aria-pressed="${(s.dunkGoal || 120) === v}">${l}</button>`).join('')}</div></div>
    <button class="btn block" data-act="simSave">Save</button>`);
};
A.simSave = () => {
  const h = (+$('#sim-hf').value) * 12 + (+$('#sim-hi').value), rf = $('#sim-rf').value, ri = num($('#sim-ri').value) || 0, rim = +picked($('#sheet'), 'simrim') || S().dunkGoal || 120;
  const patch = { heightIn: h, dunkGoal: rim }; if (rf) patch.reach = (+rf) * 12 + ri;
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
      const t = REDUCED() ? 0.48 : ((now - t0) / 1000 / def.T) % 1; g3Draw(cv, G, def, t, yaw, 0);
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
