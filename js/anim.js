'use strict';
/* 3D exercise demos. A jointed figure is posed with two-bone IK from a few targets (pelvis, lean, hands, feet),
   tweened between a start and end pose, and drawn on a canvas with a camera you can drag to rotate.
   Units are meters; x = the figure's right, y = up, z = the way the figure faces. */

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
/* two-bone IK: root a, target t, bone lengths, pole = the way the middle joint should point */
function ik2(a, t, l1, l2, pole) {
  let d = V.sub(t, a), dist = V.len(d); const max = l1 + l2 - 0.004;
  const dir = dist > 1e-5 ? V.mul(d, 1 / dist) : [0, -1, 0]; dist = Math.min(Math.max(dist, 0.05), max);
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  let perp = V.sub(pole, V.mul(dir, V.dot(pole, dir))); if (V.len(perp) < 1e-4) perp = V.sub([0.3, 0.2, 1], V.mul(dir, V.dot([0.3, 0.2, 1], dir)));
  perp = V.norm(perp);
  return [V.add(V.add(a, V.mul(dir, along)), V.mul(perp, h)), V.add(a, V.mul(dir, dist)), perp];
}
const SIDES = [['R', 1], ['L', -1]];
/* Body builds, in meters (a ~1.78 m adult). sw/hw = shoulder and hip joint half-widths; limb pairs are [radius at top, radius at bottom];
   prof = torso slices from hips (0) to shoulders (1): [height, half-width, half-depth]. */
const BUILD = {
  /* limb triples are [radius at top, at the muscle belly, at the bottom] */
  male: { sw: 0.192, hw: 0.088, delt: 0.074, trap: 0.052, neck: 0.055, head: 0.098, jaw: 0.07, thigh: [0.09, 0.099, 0.06], shin: [0.056, 0.063, 0.037], calf: 0.054, foot: 0.04, upper: [0.052, 0.065, 0.046], bicep: 0.052, fore: [0.048, 0.053, 0.032], hand: 0.04, glute: 0.074, gback: 0.03, pec: 0.07,
    prof: [[0, 0.166, 0.096], [0.15, 0.156, 0.098], [0.3, 0.14, 0.094], [0.45, 0.152, 0.1], [0.6, 0.18, 0.112], [0.74, 0.194, 0.118], [0.87, 0.19, 0.098]], hair: [58, 52, 56] },
  female: { sw: 0.16, hw: 0.104, delt: 0.053, trap: 0.03, neck: 0.04, head: 0.094, jaw: 0.062, thigh: [0.094, 0.099, 0.055], shin: [0.049, 0.054, 0.032], calf: 0.045, foot: 0.035, upper: [0.04, 0.046, 0.035], bicep: 0.036, fore: [0.036, 0.039, 0.026], hand: 0.034, glute: 0.083, gback: 0.035, bust: 0.064, pec: 0,
    prof: [[0, 0.192, 0.1], [0.14, 0.182, 0.1], [0.32, 0.116, 0.082], [0.47, 0.126, 0.086], [0.61, 0.146, 0.094], [0.75, 0.154, 0.092], [0.87, 0.156, 0.08]], hair: [96, 62, 44], bun: 1 },
};
/* turn a compact pose into full world-space targets */
function animResolve(o) {
  const lean = o.lean || 0, L = lean * Math.PI / 180, u = [0, Math.cos(L), Math.sin(L)], w = [0, -Math.sin(L), Math.cos(L)], p = o.p || [0, 0.95, 0];
  const neck = V.add(p, V.mul(u, 0.5)), q = { p, lean, shrug: o.shrug || 0, toe: o.toe || 0, ptR: o.ptR ?? o.pt ?? 0, ptL: o.ptL ?? o.pt ?? 0 };
  for (const [s, sx] of SIDES) {
    const sh = V.add(V.add(neck, V.mul(u, -0.05)), [sx * 0.2, 0, 0]);
    if (o['h' + s]) q['h' + s] = o['h' + s]; else if (o.h) q['h' + s] = [o.h[0] * sx, o.h[1], o.h[2]];
    else if (o.hl) q['h' + s] = V.add(V.add(V.add(neck, [o.hl[0] * sx, 0, 0]), V.mul(u, o.hl[1])), V.mul(w, o.hl[2]));
    else q['h' + s] = V.add(sh, [sx * 0.05, -0.56, 0.03]);
    if (o['f' + s]) q['f' + s] = o['f' + s]; else { const f = o.f || [0.13, 0.06, 0]; q['f' + s] = [f[0] * sx, f[1], f[2]]; }
    const ep = o['ep' + s] || o.ep || [0.4, -0.4, -1], kp = o['kp' + s] || o.kp || [0, 0.2, 1];
    q['ep' + s] = o['ep' + s] ? ep : [ep[0] * sx, ep[1], ep[2]]; q['kp' + s] = o['kp' + s] ? kp : [kp[0] * sx, kp[1], kp[2]];
  }
  return q;
}
const mirrorX = a => [-a[0], a[1], a[2]];
function animMirror(q) { const m = { ...q, p: mirrorX(q.p), ptR: q.ptL, ptL: q.ptR }; for (const k of ['h', 'f', 'ep', 'kp']) { m[k + 'R'] = mirrorX(q[k + 'L']); m[k + 'L'] = mirrorX(q[k + 'R']); } return m; }
function animLerp(a, b, t) {
  const q = { p: V.lerp(a.p, b.p, t), lean: a.lean + (b.lean - a.lean) * t, shrug: a.shrug + (b.shrug - a.shrug) * t, toe: a.toe + (b.toe - a.toe) * t, ptR: a.ptR + (b.ptR - a.ptR) * t, ptL: a.ptL + (b.ptL - a.ptL) * t };
  for (const k of ['hR', 'hL', 'fR', 'fL', 'epR', 'epL', 'kpR', 'kpL']) q[k] = V.lerp(a[k], b[k], t);
  return q;
}
function animJoints(q, B = BUILD.male) {
  const L = q.lean * Math.PI / 180, u = [0, Math.cos(L), Math.sin(L)], neck = V.add(q.p, V.mul(u, 0.5)), J = { pelvis: q.p, neck, head: V.add(neck, V.mul(u, 0.185)), chest: V.add(q.p, V.mul(u, 0.3)), up: u, fwd: [0, -Math.sin(L), Math.cos(L)] };
  for (const [s, sx] of SIDES) {
    const sh = V.add(V.add(neck, V.mul(u, -0.05 + q.shrug)), [sx * B.sw, 0, 0]), hip = V.add(q.p, [sx * B.hw, 0, 0]);
    const [el, ha, eback] = ik2(sh, q['h' + s], 0.3, 0.27, q['ep' + s]), [kn, an, kfront] = ik2(hip, q['f' + s], 0.46, 0.46, q['kp' + s]), pt = q['pt' + s];
    // toes: flat on the floor when standing on that foot; otherwise they point out the front of the shin (the side the kneecap faces),
    // and pt points them along the shin. The two are blended by ankle height so a foot never snaps as it lifts.
    const sd = V.norm(V.sub(an, kn)); let pv = V.sub(kfront, V.mul(sd, V.dot(kfront, sd))); if (V.len(pv) < 1e-3) pv = [0, 0, 1]; pv = V.norm(pv);
    const air = V.add(an, V.mul(V.norm(V.add(V.mul(pv, 1 - pt), V.mul(sd, pt))), 0.16)), ground = [an[0], 0.02 + q.toe, an[2] + 0.16];
    let g = pt ? 1 : (an[1] - 0.14) / 0.16; g = g < 0 ? 0 : g > 1 ? 1 : g; g = g * g * (3 - 2 * g);
    let toe = V.lerp(ground, air, g); if (g > 0 && g < 1) toe = V.add(an, V.mul(V.norm(V.sub(toe, an)), 0.16));
    Object.assign(J, { ['kf' + s]: kfront, ['eb' + s]: eback, ['sh' + s]: sh, ['hip' + s]: hip, ['el' + s]: el, ['ha' + s]: ha, ['kn' + s]: kn, ['an' + s]: an, ['toe' + s]: toe });
  }
  return J;
}

/* ---------- poses ---------- */
const AP = o => ({ p: [0, 0.95, 0], lean: 0, f: [0.13, 0.06, 0], ...o });
const SEAT = { t: 'slab', a: [0, 0.4, -0.2], b: [0, 0.4, 0.26], w: 0.42, legs: 1 }, BACKREST = { t: 'slab', a: [0, 0.5, -0.27], b: [0, 1.08, -0.36], w: 0.36 };
const BENCH = { t: 'slab', a: [0, 0.42, -0.78], b: [0, 0.42, 0.34], w: 0.34, legs: 1 };
const CUE = {
  squat: ['Sit back and down, chest up', 'Knees track over your toes', 'Drive up through your whole foot'],
  hinge: ['Push your hips straight back', 'Keep your back flat, bar close to your legs', 'Squeeze your glutes to stand tall'],
  lunge: ['Drop straight down, don\'t lean forward', 'Front knee over your ankle', 'Push up through the front heel'],
  press: ['Shoulder blades pinched back and down', 'Lower under control to your chest', 'Press up without bouncing'],
  ohp: ['Brace your abs, don\'t lean back', 'Press straight up, finish with arms by your ears', 'Lower slowly to your shoulders'],
  pull: ['Start from a full hang', 'Pull your elbows down to your ribs', 'Lower all the way, no swinging'],
  row: ['Keep your back flat and still', 'Pull your elbows back, squeeze your shoulder blades', 'Let your arms stretch fully each rep'],
  curl: ['Elbows pinned to your sides', 'Curl up without swinging your body', 'Lower slowly'],
  tri: ['Elbows stay still, only your forearms move', 'Lock out fully at the end', 'Return slowly'],
  raise: ['Slight bend in your elbows', 'Lift with control, no swinging', 'Lower slower than you lift'],
  fly: ['Slight bend in your elbows, like hugging a tree', 'Squeeze your chest together', 'Open slowly into a stretch'],
  legm: ['Move slow and controlled, no kicking', 'Squeeze hard at the end', 'Lower without letting the weight drop'],
  calf: ['Rise as high as you can onto your toes', 'Pause at the top', 'Lower slowly into a full stretch'],
  core: ['Brace your abs like you\'re about to be poked', 'Move slowly, no momentum', 'Keep breathing'],
  plank: ['Straight line from head to heels', 'Squeeze your glutes and abs', 'Don\'t let your hips sag'],
  thrust: ['Upper back on the bench, chin tucked', 'Drive your hips up until your body is flat', 'Squeeze your glutes at the top'],
  jump: ['Load your hips, then explode up', 'Land soft and quiet, knees bent', 'Reset before each rep'],
  carry: ['Stand tall, shoulders back', 'Small, steady steps', 'Don\'t let the weights pull you sideways'],
  dip: ['Lean slightly forward', 'Lower until your upper arms are level', 'Press up to straight arms'],
};
const SQ_HL = [0.3, -0.03, -0.09];
const ARCH = {
  squat: (o = {}) => ({ A: AP({ hl: o.hl || SQ_HL, lean: 4, f: [0.19, 0.06, 0] }), B: AP({ p: [0, 0.52, -0.3], lean: o.lean || 36, hl: o.hl || SQ_HL, f: [0.19, 0.06, 0], kp: [0.3, 0, 1] }), props: o.props || [{ t: 'bar' }], cue: CUE.squat }),
  jumpsquat: () => ({ A: AP({ p: [0, 0.56, -0.28], lean: 34, f: [0.17, 0.06, 0], h: [0.26, 0.5, -0.3] }), B: AP({ p: [0, 1.24, 0], lean: 0, f: [0.13, 0.34, 0.02], pt: 1, h: [0.25, 1.05, 0.12] }), fast: 1, cue: CUE.jump }),
  hinge: (o = {}) => ({ A: AP({ h: [0.21, 0.83, 0.1] }), B: o.dead ? AP({ p: [0, 0.56, -0.32], lean: 58, h: [0.22, 0.24, 0.14], f: [0.15, 0.06, 0] }) : AP({ p: [0, 0.84, -0.22], lean: 68, h: [0.21, 0.45, 0.2] }), props: o.props || [{ t: 'bar' }], cue: CUE.hinge }),
  swing: () => ({ A: AP({ p: [0, 0.8, -0.25], lean: 55, h: [0.06, 0.52, -0.16], f: [0.2, 0.06, 0] }), B: AP({ lean: -3, h: [0.06, 1.38, 0.52], f: [0.2, 0.06, 0] }), props: [{ t: 'kb' }], fast: 1, cue: ['Hinge at your hips, not a squat', 'Snap your hips forward to float the bell', 'Arms are just ropes'] }),
  backext: () => ({ A: { p: [0, 0.85, 0], lean: 112, f: [0.12, 0.12, -0.55], hl: [0.1, -0.2, 0.14] }, B: { p: [0, 0.85, 0], lean: 37, f: [0.12, 0.12, -0.55], hl: [0.1, -0.2, 0.14] }, props: [{ t: 'slab', a: [0, 0.74, 0.06], b: [0, 0.8, 0.2], w: 0.4, legs: 1 }], yaw: 62, cue: ['Hips on the pad, feet hooked', 'Lift until your body is one straight line', 'Lower slowly, don\'t swing'] }),
  slrdl: () => ({ A: AP({}), B: AP({ p: [0, 0.88, -0.1], lean: 75, fR: [0.1, 0.06, 0], fL: [-0.1, 0.8, -0.98], kpL: [0, -1, 0.2] }), props: [{ t: 'db' }], yaw: 55, cue: ['Hinge forward as your back leg lifts', 'Hips stay square to the floor', 'Stand tall and squeeze your glute'] }),
  lunge: (o = {}) => ({ A: AP({ p: [0, 0.86, 0], fR: [0.11, 0.06, 0.38], fL: [-0.11, o.back ? 0.5 : 0.1, o.back ? -0.6 : -0.42], kpL: [0, -1, 0.35], ptL: o.back ? 0.6 : 0 }), B: AP({ p: [0, 0.52, -0.02], fR: [0.11, 0.06, 0.38], fL: [-0.11, o.back ? 0.5 : 0.1, o.back ? -0.6 : -0.42], kpL: [0, -1, 0.35], ptL: o.back ? 0.6 : 0 }), props: [{ t: 'db' }, ...(o.back ? [{ t: 'slab', a: [-0.4, 0.42, -0.72], b: [0.4, 0.42, -0.72], w: 0.3, legs: 1 }] : [])], yaw: 55, cue: CUE.lunge }),
  stepup: () => ({ A: AP({ p: [0, 0.9, 0.02], fR: [0.11, 0.48, 0.38], fL: [-0.11, 0.06, -0.05] }), B: AP({ p: [0, 1.37, 0.36], fR: [0.11, 0.48, 0.38], fL: [-0.11, 0.5, 0.3] }), props: [{ t: 'db' }, { t: 'slab', a: [0, 0.4, 0.2], b: [0, 0.4, 0.62], w: 0.6, legs: 1 }], yaw: 55, cue: ['Whole foot on the box', 'Drive through that heel, don\'t push off the floor', 'Step down slowly'] }),
  latlunge: () => ({ A: AP({ hl: [0.07, -0.14, 0.2] }), B: AP({ p: [0.3, 0.62, -0.2], lean: 30, fR: [0.56, 0.06, 0], fL: [-0.13, 0.06, 0], hl: [0.07, -0.14, 0.2] }), props: [{ t: 'kb' }], alt: 1, yaw: 15, cue: ['Step wide and sit back into that hip', 'Other leg stays straight', 'Push off hard back to the middle'] }),
  bounds: () => ({ A: AP({ p: [-0.34, 0.78, 0], lean: 16, fL: [-0.38, 0.06, 0], fR: [-0.12, 0.3, -0.32] }), B: AP({ p: [0.34, 0.78, 0], lean: 16, fR: [0.38, 0.06, 0], fL: [0.12, 0.3, -0.32] }), arc: 0.16, fast: 1, yaw: 12, cue: ['Leap sideways off one leg', 'Stick the landing before you go again', 'Stay low and balanced'] }),
  bench: (o = {}) => ({ A: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [o.x || 0.28, 1.1, -0.27] }, B: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [(o.x || 0.28) + 0.05, 0.65, -0.2], ep: o.x ? [0.3, -1, 0.6] : [1, -0.5, 0.3] }, props: [BENCH, ...(o.props || [{ t: 'bar' }])], yaw: 58, cue: CUE.press }),
  incline: (o = {}) => ({ A: { p: [0, 0.48, 0.15], lean: -55, f: [0.22, 0.06, 0.58], kp: [0, 1, 0.4], h: [0.28, 1.3, -0.2] }, B: { p: [0, 0.48, 0.15], lean: -55, f: [0.22, 0.06, 0.58], kp: [0, 1, 0.4], h: [0.34, 0.86, -0.1], ep: [1, -0.5, 0.2] }, props: [{ t: 'slab', a: [0, 0.36, 0.2], b: [0, 0.98, -0.66], w: 0.34 }, { t: 'slab', a: [0, 0.36, 0.0], b: [0, 0.36, 0.34], w: 0.34, legs: 1 }, ...(o.props || [{ t: 'bar' }])], yaw: 58, cue: CUE.press }),
  mpress: () => ({ A: { p: [0, 0.55, 0], lean: -8, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.3, 0.98, 0.12], ep: [1, -0.2, -0.4] }, B: { p: [0, 0.55, 0], lean: -8, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.27, 0.98, 0.56], ep: [1, -0.2, -0.4] }, props: [SEAT, BACKREST, { t: 'grips' }], yaw: 55, cue: ['Back flat against the pad', 'Press forward to straight arms', 'Return slowly until you feel a stretch'] }),
  fly: () => ({ A: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [0.62, 0.66, -0.26], ep: [0, -1, 0] }, B: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [0.07, 1.08, -0.26], ep: [1, -0.3, 0] }, props: [BENCH, { t: 'db' }], yaw: 40, cue: CUE.fly }),
  pecdeck: () => ({ A: { p: [0, 0.55, 0], lean: -6, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.56, 1.0, 0.1], ep: [0.5, -1, -0.3] }, B: { p: [0, 0.55, 0], lean: -6, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.06, 1.0, 0.5], ep: [1, -0.6, 0] }, props: [SEAT, BACKREST, { t: 'grips' }], yaw: 28, cue: CUE.fly }),
  cfly: () => ({ A: AP({ lean: 12, fR: [0.13, 0.06, 0.2], fL: [-0.13, 0.06, -0.2], h: [0.6, 1.3, 0.05], ep: [0.4, -0.6, -1] }), B: AP({ lean: 12, fR: [0.13, 0.06, 0.2], fL: [-0.13, 0.06, -0.2], h: [0.06, 0.96, 0.46], ep: [1, 0.2, -0.3] }), props: [{ t: 'cable2', a: [1.05, 1.9, -0.1] }], yaw: 25, cue: CUE.fly }),
  pushup: () => ({ A: { p: [0, 0.46, -0.48], lean: 68, f: [0.1, 0.1, -1.33], kp: [0, -1, 0], h: [0.27, 0.04, 0], ep: [0.7, 0.15, -1] }, B: { p: [0, 0.17, -0.41], lean: 85, f: [0.1, 0.1, -1.33], kp: [0, -1, 0], h: [0.27, 0.04, 0], ep: [0.7, 0.15, -1] }, yaw: 62, cue: ['Hands under your shoulders, body in a straight line', 'Lower your chest to just above the floor', 'Push the floor away'] }),
  plank: () => ({ A: { p: [0, 0.3, -0.45], lean: 78, f: [0.1, 0.08, -1.35], kp: [0, -1, 0], h: [0.2, 0.04, 0.36], ep: [0, -1, -0.2] }, B: { p: [0, 0.315, -0.45], lean: 78, f: [0.1, 0.08, -1.35], kp: [0, -1, 0], h: [0.2, 0.04, 0.36], ep: [0, -1, -0.2] }, yaw: 62, hold: 1, cue: CUE.plank }),
  dips: () => ({ A: { p: [0, 1.16, -0.03], lean: 5, f: [0.1, 0.36, -0.3], h: [0.3, 1.05, 0], ep: [0.2, 0.3, -1] }, B: { p: [0, 0.9, -0.1], lean: 18, f: [0.1, 0.12, -0.36], h: [0.3, 1.05, 0], ep: [0.25, 0.4, -1] }, props: [{ t: 'rails', y: 1.03, x: 0.3 }], yaw: 50, cue: CUE.dip }),
  ohp: (o = {}) => { const dy = o.seat ? -0.4 : 0, base = o.seat ? { p: [0, 0.55, 0], f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5] } : { p: [0, 0.95, 0], f: [0.15, 0.06, 0] };
    return { A: { ...base, hl: [0.25, -0.04, 0.14], ep: [0.6, -1, 0.3] }, B: { ...base, h: [0.21, 1.95 + dy, 0.02], ep: [1, -0.2, 0.2] }, props: [...(o.seat ? [SEAT, BACKREST] : []), ...(o.props || [{ t: 'bar' }])], cue: CUE.ohp }; },
  pullup: (o = {}) => ({ A: { p: [0, 1.07, 0], f: [0.1, 0.3, -0.25], h: [o.x || 0.32, 2.1, 0], ep: [1, 0, -0.3] }, B: { p: [0, 1.5, -0.05], lean: -6, f: [0.1, 0.72, -0.3], h: [o.x || 0.32, 2.1, 0], ep: o.x ? [0.4, -1, 0.4] : [1, -1, -0.2] }, props: [{ t: 'fixbar', y: 2.12 }], cue: CUE.pull }),
  hlr: () => ({ A: { p: [0, 1.07, 0], f: [0.1, 0.16, 0.03], kp: [0, 1, 1], h: [0.3, 2.1, 0], ep: [1, 0, -0.3] }, B: { p: [0, 1.07, -0.04], lean: -8, f: [0.1, 1.02, 0.84], kp: [0, 1, 1], h: [0.3, 2.1, 0], ep: [1, 0, -0.3] }, props: [{ t: 'fixbar', y: 2.12 }], yaw: 60, cue: ['Hang still, no swinging', 'Lift your legs with your abs, not momentum', 'Lower slowly'] }),
  pulldown: () => ({ A: { p: [0, 0.55, 0], lean: -6, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.38, 1.55, 0.04], ep: [1, 0, -0.2] }, B: { p: [0, 0.55, 0], lean: -14, f: [0.18, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.31, 1.08, 0.14], ep: [1, -1, -0.3] }, props: [SEAT, { t: 'bar', short: 1 }, { t: 'cable', a: [0, 2.35, 0.1] }], cue: ['Lean back just a little, chest up', 'Pull the bar to your upper chest', 'Let it rise slowly to a full stretch'] }),
  sapd: () => ({ A: AP({ lean: 20, h: [0.15, 1.6, 0.44], ep: [1, -0.2, 0] }), B: AP({ lean: 20, h: [0.15, 0.82, 0.22], ep: [1, -0.2, 0] }), props: [{ t: 'bar', short: 1 }, { t: 'cable', a: [0, 2.3, 0.85] }], yaw: 55, cue: ['Arms stay almost straight', 'Sweep the bar down to your thighs', 'Feel your lats, not your arms'] }),
  srow: () => ({ A: { p: [0, 0.5, 0], lean: 10, f: [0.15, 0.3, 0.76], kp: [0, 1, 0.2], h: [0.13, 0.9, 0.58] }, B: { p: [0, 0.5, 0], lean: -6, f: [0.15, 0.3, 0.76], kp: [0, 1, 0.2], h: [0.16, 0.88, 0.2], ep: [0.3, -0.2, -1] }, props: [{ t: 'slab', a: [0, 0.36, -0.22], b: [0, 0.36, 0.28], w: 0.36, legs: 1 }, { t: 'slab', a: [-0.25, 0.3, 0.86], b: [0.25, 0.3, 0.86], w: 0.3 }, { t: 'cable', a: [0, 0.85, 1.4] }], yaw: 60, cue: CUE.row }),
  brow: (o = {}) => ({ A: AP({ p: [0, 0.86, -0.2], lean: 62, h: [o.x || 0.22, 0.5, 0.24], f: [0.15, 0.06, 0] }), B: AP({ p: [0, 0.86, -0.2], lean: 62, h: [(o.x || 0.22) + 0.02, 0.86, 0.05], ep: [0.4, 0.6, -1], f: [0.15, 0.06, 0] }), props: o.props || [{ t: 'bar' }], yaw: 68, cue: CUE.row }),
  facepull: () => ({ A: AP({ fR: [0.13, 0.06, 0.15], fL: [-0.13, 0.06, -0.15], h: [0.12, 1.42, 0.56] }), B: AP({ fR: [0.13, 0.06, 0.15], fL: [-0.13, 0.06, -0.15], h: [0.34, 1.5, 0.12], ep: [1, 0.3, -0.2] }), props: [{ t: 'cable', a: [0, 1.5, 1.4] }], yaw: 50, cue: ['Pull toward your face, elbows high', 'Finish with your hands by your ears', 'Squeeze your upper back'] }),
  rdf: () => ({ A: AP({ p: [0, 0.86, -0.2], lean: 62, h: [0.1, 0.52, 0.26] }), B: AP({ p: [0, 0.86, -0.2], lean: 62, h: [0.62, 1.0, 0.22], ep: [0, 1, -0.3] }), props: [{ t: 'db' }], yaw: 30, cue: ['Hinge forward, back flat', 'Raise your arms out wide like wings', 'Lead with your elbows'] }),
  curl: (o = {}) => ({ A: AP({}), B: AP({ h: [0.23, 1.3, 0.2], ep: [0, -1, -0.3] }), props: o.props || [{ t: 'db' }], yaw: 45, cue: CUE.curl }),
  pushdown: () => ({ A: AP({ lean: 8, h: [0.13, 1.2, 0.27], ep: [0, -1, -0.4] }), B: AP({ lean: 8, h: [0.13, 0.86, 0.15], ep: [0, -1, -0.4] }), props: [{ t: 'bar', short: 1 }, { t: 'cable', a: [0, 2.3, 0.42] }], yaw: 55, cue: CUE.tri }),
  ohext: (o = {}) => ({ A: AP({ h: [0.08, 1.52, -0.22], ep: [0.1, 1, 0.5] }), B: AP({ h: [0.08, 1.95, -0.02], ep: [0.1, 1, 0.5] }), props: o.props || [{ t: 'kb' }], yaw: 55, cue: ['Elbows point at the ceiling', 'Lower the weight behind your head', 'Press up to straight arms'] }),
  skull: () => ({ A: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [0.12, 0.72, -0.52], ep: [0.1, 1, -0.4] }, B: { p: [0, 0.56, 0.22], lean: -90, f: [0.22, 0.06, 0.62], kp: [0, 1, 0.4], h: [0.12, 1.1, -0.3], ep: [0.1, 1, -0.4] }, props: [BENCH, { t: 'bar', short: 1 }], yaw: 60, cue: ['Upper arms stay pointing up', 'Lower the bar to your forehead', 'Straighten your arms'] }),
  latraise: () => ({ A: AP({}), B: AP({ h: [0.74, 1.42, 0.06], ep: [0, 0, -1] }), props: [{ t: 'db' }], yaw: 20, cue: CUE.raise }),
  shrug: () => ({ A: AP({}), B: AP({ shrug: 0.085 }), props: [{ t: 'db' }], yaw: 20, cue: ['Arms straight, just lift your shoulders', 'Shrug straight up toward your ears', 'Hold a second, lower slowly'] }),
  legext: () => ({ A: { p: [0, 0.6, 0], lean: -12, f: [0.12, 0.15, 0.5], kp: [0, 1, 0], h: [0.3, 0.52, 0.02] }, B: { p: [0, 0.6, 0], lean: -12, f: [0.12, 0.6, 0.92], kp: [0, 1, 0], h: [0.3, 0.52, 0.02] }, props: [{ ...SEAT, a: [0, 0.45, -0.2], b: [0, 0.45, 0.34] }, BACKREST], yaw: 62, cue: CUE.legm }),
  slcurl: () => ({ A: { p: [0, 0.6, 0], lean: -12, f: [0.12, 0.58, 0.9], kp: [0, 1, 0], h: [0.3, 0.52, 0.02] }, B: { p: [0, 0.6, 0], lean: -12, f: [0.12, 0.17, 0.34], kp: [0, 1, 0], h: [0.3, 0.52, 0.02] }, props: [{ ...SEAT, a: [0, 0.45, -0.2], b: [0, 0.45, 0.34] }, BACKREST], yaw: 62, cue: CUE.legm }),
  llcurl: () => ({ A: { p: [0, 0.62, 0], lean: 90, f: [0.12, 0.62, -0.9], kp: [0, -1, -0.5], h: [0.26, 0.42, 0.6], ep: [0.6, -0.3, -1] }, B: { p: [0, 0.62, 0], lean: 90, f: [0.12, 1.02, -0.52], kp: [0, -1, -0.6], h: [0.26, 0.42, 0.6], ep: [0.6, -0.3, -1] }, props: [{ t: 'slab', a: [0, 0.48, -0.5], b: [0, 0.48, 0.62], w: 0.36, legs: 1 }], yaw: 62, cue: CUE.legm }),
  legpress: (o = {}) => ({ A: { p: [0, 0.4, 0], lean: -50, f: [0.16, 0.74, 0.42], kp: [0, 1, -0.3], h: [0.3, 0.36, 0.04] }, B: { p: [0, 0.4, 0], lean: -50, f: [0.16, 0.95, 0.7], kp: [0, 1, -0.3], h: [0.3, 0.36, 0.04] }, props: [{ t: 'slab', a: [0, 0.3, 0.12], b: [0, 0.84, -0.52], w: 0.4 }, { t: 'plate' }], yaw: 62, cue: ['Lower until your knees are near your chest', 'Push through your whole foot', 'Don\'t lock your knees hard at the top'] }),
  lpcalf: () => ({ A: { p: [0, 0.4, 0], lean: -50, f: [0.16, 0.95, 0.7], kp: [0, 1, -0.3], h: [0.3, 0.36, 0.04], pt: 0.05 }, B: { p: [0, 0.4, 0], lean: -50, f: [0.16, 0.92, 0.66], kp: [0, 1, -0.3], h: [0.3, 0.36, 0.04], pt: 0.75 }, props: [{ t: 'slab', a: [0, 0.3, 0.12], b: [0, 0.84, -0.52], w: 0.4 }, { t: 'plate' }], yaw: 62, cue: CUE.calf }),
  thrust: () => ({ A: { p: [0, 0.2, 0], lean: -50, f: [0.18, 0.06, 0.5], kp: [0, 1, 0.3], h: [0.3, 0.3, 0.06] }, B: { p: [0, 0.5, 0.05], lean: -88, f: [0.18, 0.06, 0.5], kp: [0, 1, 0.3], h: [0.3, 0.6, 0.1] }, props: [{ t: 'slab', a: [-0.5, 0.42, -0.56], b: [0.5, 0.42, -0.56], w: 0.3, legs: 1 }, { t: 'barhip' }], yaw: 62, cue: CUE.thrust }),
  kickback: () => ({ A: AP({ p: [0, 0.93, 0], lean: 25, h: [0.2, 1.0, 0.46], fL: [-0.1, 0.06, 0], fR: [0.1, 0.06, 0.02] }), B: AP({ p: [0, 0.93, 0], lean: 25, h: [0.2, 1.0, 0.46], fL: [-0.1, 0.06, 0], fR: [0.1, 0.5, -0.62], kpR: [0, -0.3, 1] }), props: [{ t: 'cable', a: [0.1, 0.1, 0.95], to: 'anR' }, { t: 'rails', y: 1.0, x: 0.2, z: 0.46, cross: 1 }], yaw: 62, cue: ['Hold on and lean forward slightly', 'Kick straight back, squeeze your glute', 'Don\'t arch your lower back'] }),
  abduct: () => ({ A: { p: [0, 0.6, 0], lean: -10, f: [0.1, 0.08, 0.46], kp: [0, 1, 0.3], h: [0.3, 0.52, 0.02] }, B: { p: [0, 0.6, 0], lean: -10, f: [0.44, 0.08, 0.42], kp: [1, 1, 0.3], h: [0.3, 0.52, 0.02] }, props: [{ ...SEAT, a: [0, 0.45, -0.2], b: [0, 0.45, 0.3] }, BACKREST], yaw: 12, cue: ['Push your knees apart against the pads', 'Pause when they\'re wide', 'Bring them back slowly'] }),
  calf: (o = {}) => ({ A: AP({ hl: o.hl }), B: AP({ p: [0, 1.05, 0], f: [0.13, 0.16, 0], hl: o.hl }), props: o.props || [], yaw: 62, cue: CUE.calf }),
  scalf: () => ({ A: { p: [0, 0.55, 0], f: [0.13, 0.06, 0.42], kp: [0, 1, 0.5], h: [0.22, 0.66, 0.36] }, B: { p: [0, 0.55, 0], f: [0.13, 0.15, 0.42], kp: [0, 1, 0.5], h: [0.22, 0.75, 0.36] }, props: [SEAT], yaw: 62, cue: CUE.calf }),
  tib: () => ({ A: AP({ p: [0, 0.93, -0.12], lean: -6, f: [0.13, 0.06, 0.24] }), B: AP({ p: [0, 0.93, -0.12], lean: -6, f: [0.13, 0.06, 0.24], toe: 0.13 }), props: [{ t: 'wall', z: -0.3 }], yaw: 62, cue: ['Lean your back on a wall, heels out front', 'Pull your toes up toward your shins', 'Lower slowly'] }),
  crunch: () => ({ A: { p: [0, 0.52, 0], lean: 8, f: [0.12, 0.08, -0.45], pt: 0.85, kp: [0, -0.6, 1], hl: [0.13, 0.12, 0.12], ep: [1, -0.5, 0.2] }, B: { p: [0, 0.5, -0.06], lean: 78, f: [0.12, 0.08, -0.45], pt: 0.85, kp: [0, -0.6, 1], hl: [0.13, 0.12, 0.12], ep: [1, -0.5, 0.2] }, props: [{ t: 'cable', a: [0, 2.3, 0.5] }], yaw: 62, cue: ['Kneel and hold the rope by your head', 'Curl your ribs down toward your hips', 'Hips stay still'] }),
  situp: () => ({ A: { p: [0, 0.55, 0.1], lean: -105, f: [0.14, 0.82, 0.6], kp: [0, 1, 0], hl: [0.14, 0.1, 0.1], ep: [1, 0, 0] }, B: { p: [0, 0.55, 0.1], lean: -15, f: [0.14, 0.82, 0.6], kp: [0, 1, 0], hl: [0.14, 0.1, 0.1], ep: [1, 0, 0] }, props: [{ t: 'slab', a: [0, 0.2, -0.62], b: [0, 0.52, 0.3], w: 0.34, legs: 1 }], yaw: 62, cue: CUE.core }),
  deadbug: () => ({ A: { p: [0, 0.12, 0], lean: -90, h: [0.2, 0.66, -0.45], ep: [1, 0, 0], f: [0.1, 0.58, 0.46], kp: [0, 1, -0.2] }, B: { p: [0, 0.12, 0], lean: -90, hR: [0.2, 0.16, -1.02], hL: [-0.2, 0.66, -0.45], epR: [1, 0.5, 0], epL: [-1, 0, 0], fR: [0.1, 0.58, 0.46], fL: [-0.1, 0.17, 0.9], kp: [0, 1, -0.2], kpL: [0, 1, -0.2], kpR: [0, 1, -0.2] }, alt: 1, yaw: 55, cue: ['Lower back pressed into the floor', 'Reach opposite arm and leg out slowly', 'Switch sides without arching'] }),
  pallof: () => ({ A: AP({ f: [0.2, 0.06, 0], h: [0.05, 1.2, 0.18], ep: [0.6, -1, -0.2] }), B: AP({ f: [0.2, 0.06, 0], h: [0.05, 1.2, 0.56], ep: [0.6, -1, -0.2] }), props: [{ t: 'cable', a: [1.3, 1.2, 0.1] }], yaw: 35, cue: ['Stand side-on to the cable', 'Press straight out and don\'t let it twist you', 'Bring it back to your chest slowly'] }),
  chop: () => ({ A: AP({ f: [0.22, 0.06, 0], hR: [0.5, 1.7, 0.15], hL: [0.4, 1.68, 0.2], epR: [0.3, -1, -0.3], epL: [-0.3, -1, -0.3] }), B: AP({ p: [0, 0.86, -0.06], lean: 18, f: [0.22, 0.06, 0], hR: [-0.3, 0.7, 0.3], hL: [-0.42, 0.7, 0.25], epR: [0.3, -1, -0.3], epL: [-0.3, -1, -0.3] }), props: [{ t: 'cable', a: [1.3, 2.2, 0] }], yaw: 20, cue: ['Turn from your hips, arms stay long', 'Chop down across your body', 'Control it back up'] }),
  carry: () => ({ A: AP({ p: [0, 0.92, 0], fR: [0.11, 0.06, 0.3], fL: [-0.11, 0.13, -0.3] }), B: AP({ p: [0, 0.92, 0], fR: [0.11, 0.13, -0.3], fL: [-0.11, 0.06, 0.3] }), props: [{ t: 'db' }], arc: 0.03, yaw: 55, cue: CUE.carry }),
};
const BAR = [{ t: 'bar' }], DB = [{ t: 'db' }], NONE = [];
const EX_ANIM = {
  'Bench Press': ['bench'], 'Incline Bench Press': ['incline'], 'Dumbbell Bench Press': ['bench', { props: DB }], 'Incline Dumbbell Press': ['incline', { props: DB }], 'Machine Chest Press': ['mpress'], 'Smith Incline Press': ['incline'],
  'Pec Deck Fly': ['pecdeck'], 'Cable Fly': ['cfly'], 'Dips': ['dips'], 'Push-ups': ['pushup'], 'Close-Grip Bench Press': ['bench', { x: 0.13 }],
  'Deadlift': ['hinge', { dead: 1 }], 'Romanian Deadlift': ['hinge'], 'Dumbbell RDL': ['hinge', { props: DB }], 'Kettlebell Swing': ['swing'], 'Back Extension': ['backext'], 'Single-Leg RDL': ['slrdl'],
  'Pull-ups': ['pullup'], 'Chin-ups': ['pullup', { x: 0.17 }], 'Hanging Leg Raise': ['hlr'], 'Lat Pulldown': ['pulldown'], 'Straight-Arm Pulldown': ['sapd'], 'Seated Cable Row': ['srow'],
  'Barbell Row': ['brow'], 'Dumbbell Row': ['brow', { props: DB }], 'T-Bar Row': ['brow', { x: 0.12 }], 'Chest-Supported Row': ['brow', { props: DB }], 'Face Pull': ['facepull'], 'Rear Delt Fly': ['rdf'],
  'Overhead Press': ['ohp'], 'Dumbbell Shoulder Press': ['ohp', { seat: 1, props: DB }], 'Machine Shoulder Press': ['ohp', { seat: 1, props: [{ t: 'grips' }] }], 'Lateral Raise': ['latraise'], 'Cable Lateral Raise': ['latraise'], 'Dumbbell Shrug': ['shrug'],
  'Barbell Curl': ['curl', { props: BAR }], 'EZ-Bar Curl': ['curl', { props: [{ t: 'bar', short: 1 }] }], 'Dumbbell Curl': ['curl'], 'Hammer Curl': ['curl'], 'Preacher Curl': ['curl', { props: [{ t: 'bar', short: 1 }] }], 'Cable Curl': ['curl', { props: [{ t: 'bar', short: 1 }, { t: 'cable', a: [0, 0.08, 0.7] }] }], 'Incline Dumbbell Curl': ['curl'],
  'Triceps Pushdown': ['pushdown'], 'Overhead Cable Extension': ['ohext', { props: [{ t: 'cable', a: [0, 0.3, -0.9] }] }], 'Skull Crushers': ['skull'], 'Dumbbell Overhead Extension': ['ohext'],
  'Squat': ['squat'], 'Smith Squat': ['squat'], 'Front Squat': ['squat', { hl: [0.21, -0.02, 0.13], lean: 22 }], 'Goblet Squat': ['squat', { hl: [0.07, -0.14, 0.2], lean: 22, props: [{ t: 'kb' }] }], 'Hack Squat': ['squat', { hl: [0.2, 0, 0.1], lean: 14, props: NONE }],
  'Leg Press': ['legpress'], 'Leg Extension': ['legext'], 'Bulgarian Split Squat': ['lunge', { back: 1 }], 'Walking Lunge': ['lunge'], 'Jump Squat': ['jumpsquat'], 'Lateral Bounds': ['bounds'], 'Lateral Lunge': ['latlunge'], 'Step-up': ['stepup'],
  'Lying Leg Curl': ['llcurl'], 'Seated Leg Curl': ['slcurl'], 'Hip Thrust': ['thrust'], 'Machine Hip Thrust': ['thrust'], 'Cable Kickback': ['kickback'], 'Hip Abduction': ['abduct'],
  'Standing Calf Raise': ['calf'], 'Calf Extension': ['calf'], 'Dumbbell Standing Calf Raise': ['calf', { props: DB }], 'Smith Calf Raise': ['calf', { hl: SQ_HL, props: BAR }], 'Seated Calf Raise': ['scalf'], 'Leg Press Calf Raise': ['lpcalf'], 'Tibialis Raise': ['tib'],
  'Cable Crunch': ['crunch'], 'Plank': ['plank'], 'Decline Sit-up': ['situp'], 'Farmer Carry': ['carry'], 'Cable Woodchop': ['chop'], 'Pallof Press': ['pallof'], 'Dead Bug': ['deadbug'],
};
const MUS_SEG = { quads: ['thigh'], hamstrings: ['thigh'], glutes: ['glute', 'pelvis'], adductors: ['thigh'], abductors: ['pelvis', 'glute'], calves: ['shin'], chest: ['pec'], abs: ['tl'], obliques: ['tl'], lats: ['tu'], upper_back: ['tu', 'trap'], lower_back: ['tl'], traps: ['trap'], delts: ['sho'], side_delts: ['sho'], rear_delts: ['sho'], biceps: ['upper'], triceps: ['upper'], forearms: ['fore'] };
function animDef(name, sex) {
  const lib = library().get(keyOf(name)), n = lib ? lib.name : name, m = EX_ANIM[n]; if (!m) return null;
  const d = ARCH[m[0]](m[1] || {}), mus = (EX_MUSCLES[keyOf(n)] || [''])[0].split(' ').filter(Boolean), hl = new Set(mus.flatMap(x => MUS_SEG[x] || []));
  const a = animResolve(d.A), b = animResolve(d.B), build = BUILD[sex] || BUILD.male;
  // camera target: middle of everything the figure touches across the move
  let lo = [9, 9, 9], hi = [-9, -9, -9];
  for (const q of [a, b, ...(d.alt ? [animMirror(b)] : [])]) for (const [jk, pt] of Object.entries(animJoints(q, build))) if (!/^(kf|eb|up|fwd)/.test(jk)) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], pt[i]); hi[i] = Math.max(hi[i], pt[i]); }
  lo[1] = 0; if (d.arc) hi[1] += d.arc;
  const c = V.mul(V.add(lo, hi), 0.5), r = Math.max(0.78, V.len(V.sub(hi, lo)) / 2 + 0.16);
  return { ...d, a, b, hl, c, r, build, yaw: d.yaw == null ? 38 : d.yaw };
}

/* ---------- drawing ----------
   A tiny software renderer: every limb is a capsule drawn pixel by pixel into a depth buffer with soft lighting,
   so parts overlap and pass through each other correctly instead of whole limbs swapping order. */
function animPose(def, t, cycle) {
  let b = def.b; if (def.alt && cycle % 2) b = animMirror(def.b);
  let q = animLerp(def.a, b, t);
  if (def.arc) { const k = Math.sin(Math.PI * t) * def.arc; q.p = V.add(q.p, [0, k, 0]); q.fR = V.add(q.fR, [0, k * (t < 0.5 ? 0.4 : 1), 0]); q.fL = V.add(q.fL, [0, k * (t < 0.5 ? 1 : 0.4), 0]); }
  return q;
}
const AL = (() => { const l = Math.hypot(0.45, 0.65, 0.62); return [-0.45 / l, -0.65 / l, 0.62 / l]; })();   // light: up-left, toward the viewer
const SMOOTH = { pelvis: 1, tl: 1, tu: 1, glute: 1, trap: 1, pec: 1 };
const AC = { body: [198, 202, 216], skin: [226, 229, 238], on: [255, 118, 72], bar: [158, 164, 180], dark: [74, 78, 96], pad: [50, 53, 68], wall: [30, 32, 42], cable: [120, 126, 142] };
function rasterCapsule(R, ax, ay, az, bx, by, bz, ra, rb, wa, wb, c, tag, kb = 0, kw = 0, g = 1) {
  const W = R.W, H = R.H, zb = R.zb, px = R.px, id = R.id, e = Math.max(ra, rb) + kb + 1;
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - e)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + e)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - e)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + e));
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, dz = bz - az, e2 = e * e, c0 = c[0], c1 = c[1], c2 = c[2], dr = rb - ra, dw = wb - wa;
  for (let y = y0; y <= y1; y++) {
    const py = y + 0.5 - ay;
    for (let x = x0; x <= x1; x++) {
      const pxx = x + 0.5 - ax; let t = l2 > 1e-6 ? (pxx * dx + py * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ox = pxx - t * dx, oy = py - t * dy, d2 = ox * ox + oy * oy; if (d2 > e2) continue;
      let sw = 0; if (kb) { const u = g === 1 ? t : Math.pow(t, g); sw = 4 * u * (1 - u); } const r = ra + dr * t + kb * sw, d = Math.sqrt(d2); let cov = r + 0.5 - d; if (cov <= 0) continue; if (cov > 1) cov = 1;
      const nn = d < r ? d / r : 1, nz = Math.sqrt(1 - nn * nn), z = az + dz * t + nz * (wa + dw * t + kw * sw), i = y * W + x;
      if (z < zb[i]) continue;
      if (tag && cov >= 0.999) { const j = i * 4; px[j] = c0; px[j + 1] = c1; px[j + 2] = c2; px[j + 3] = 255; zb[i] = z; id[i] = 1; if (x < R.bx0) R.bx0 = x; if (x > R.bx1) R.bx1 = x; if (y < R.by0) R.by0 = y; if (y > R.by1) R.by1 = y; continue; }
      const inv = d > 1e-6 ? nn / d : 0, nx = ox * inv, ny = oy * inv;
      let diff = nx * AL[0] + ny * AL[1] + nz * AL[2]; if (diff < 0) diff = 0;
      const rim = nz * 2.4, sh = (0.36 + 0.7 * diff) * (0.5 + 0.5 * (rim > 1 ? 1 : rim)), sp = diff > 0.93 ? (diff - 0.93) * 420 : 0, j = i * 4;
      const r0 = c0 * sh + sp, g0 = c1 * sh + sp, b0 = c2 * sh + sp;
      if (cov >= 0.999) { px[j] = r0; px[j + 1] = g0; px[j + 2] = b0; px[j + 3] = 255; zb[i] = z; id[i] = 0; }
      else { if (id[i]) continue; const a0 = px[j + 3] / 255, k = 1 - cov, oa = cov + a0 * k; px[j] = (r0 * cov + px[j] * a0 * k) / oa; px[j + 1] = (g0 * cov + px[j + 1] * a0 * k) / oa; px[j + 2] = (b0 * cov + px[j + 2] * a0 * k) / oa; px[j + 3] = oa * 255; if (cov > 0.5) zb[i] = z; }
    }
  }
}
function rasterTri(R, A, B, C, c, sh) {
  const W = R.W, H = R.H, zb = R.zb, px = R.px, area = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); if (Math.abs(area) < 1e-6) return;
  const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
  const r0 = c[0] * sh, g0 = c[1] * sh, b0 = c[2] * sh;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const qx = x + 0.5, qy = y + 0.5;
    const w0 = ((B[0] - qx) * (C[1] - qy) - (B[1] - qy) * (C[0] - qx)) / area, w1 = ((C[0] - qx) * (A[1] - qy) - (C[1] - qy) * (A[0] - qx)) / area, w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const z = w0 * A[2] + w1 * B[2] + w2 * C[2], i = y * W + x; if (z < zb[i]) continue;
    const j = i * 4; px[j] = r0; px[j + 1] = g0; px[j + 2] = b0; px[j + 3] = 255; zb[i] = z; R.id[i] = 0;
  }
}
/* Smooth-shade the tagged (torso) pixels: blur their depth so the seams between the pieces vanish, then light from that surface. */
function smoothShade(R, S) {
  if (R.bx1 < R.bx0) return;
  const W = R.W, x0 = R.bx0, x1 = R.bx1, y0 = R.by0, y1 = R.by1, w = x1 - x0 + 1, h = y1 - y0 + 1, n = w * h, zb = R.zb, id = R.id, px = R.px, rad = Math.max(2, Math.round(0.027 * S));
  if (!R.sa || R.sa.length < n) { R.sa = new Float32Array(n); R.sb = new Float32Array(n); R.sc = new Float32Array(n); R.sd = new Float32Array(n); R.sm = new Uint8Array(n); R.ps = new Float64Array(Math.max(R.W, R.H) + 2); R.pc = new Int32Array(Math.max(R.W, R.H) + 2); }
  const a = R.sa, b = R.sb, cf = R.sc, cg = R.sd, m = R.sm, ps = R.ps, pc = R.pc; let zmin = 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y + y0) * W + x + x0, k = y * w + x; m[k] = id[i]; if (id[i] && zb[i] < zmin) zmin = zb[i]; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; a[k] = m[k] ? zb[(y + y0) * W + x + x0] - zmin : 0; }
  const full = 2 * rad + 1;
  // one masked box blur each way; cf/cg also collect how much of the window is torso (low near its edges and where a limb crosses in front)
  for (let y = 0; y < h; y++) { ps[0] = 0; pc[0] = 0; for (let x = 0; x < w; x++) { const k = y * w + x; ps[x + 1] = ps[x] + (m[k] ? a[k] : 0); pc[x + 1] = pc[x] + m[k]; } for (let x = 0; x < w; x++) { const l = Math.max(0, x - rad), r = Math.min(w, x + rad + 1), c = pc[r] - pc[l]; b[y * w + x] = c ? (ps[r] - ps[l]) / c : 0; cf[y * w + x] = c / full; } }
  for (let x = 0; x < w; x++) { ps[0] = 0; pc[0] = 0; let fs = 0; const fa = R.ps2 || (R.ps2 = new Float64Array(Math.max(R.W, R.H) + 2)); fa[0] = 0; for (let y = 0; y < h; y++) { const k = y * w + x; ps[y + 1] = ps[y] + (m[k] ? b[k] : 0); pc[y + 1] = pc[y] + m[k]; fa[y + 1] = fa[y] + cf[k]; } for (let y = 0; y < h; y++) { const l = Math.max(0, y - rad), r = Math.min(h, y + rad + 1), c = pc[r] - pc[l]; a[y * w + x] = c ? (ps[r] - ps[l]) / c : 0; cg[y * w + x] = (fa[r] - fa[l]) / full; } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (!m[k]) continue;
    const xl = x > 0 && m[k - 1] ? k - 1 : k, xr = x < w - 1 && m[k + 1] ? k + 1 : k, yu = y > 0 && m[k - w] ? k - w : k, yd = y < h - 1 && m[k + w] ? k + w : k;
    let nx = xr > xl ? -(a[xr] - a[xl]) / (xr - xl) * S : 0, ny = yd > yu ? -(a[yd] - a[yu]) / ((yd - yu) / w) * S : 0, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    let e = (cg[k] - 0.42) / 0.5; e = e < 0 ? 0 : e > 1 ? 1 : e; e = e * e * (3 - 2 * e);
    let diff = nx * AL[0] + ny * AL[1] + nz * AL[2]; if (diff < 0) diff = 0; const sh = (0.36 + 0.7 * diff) * (0.8 + 0.2 * e), j = ((y + y0) * W + x + x0) * 4;
    px[j] *= sh; px[j + 1] *= sh; px[j + 2] *= sh; }
}
function animDraw(cv, def, t, yawDeg, cycle = 0) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = Math.min(W, H * 1.12) / (2 * def.r) * 0.96, q = animPose(def, t, cycle), B = def.build || BUILD.male, J = animJoints(q, B);
  const ya = yawDeg * Math.PI / 180, pa = 11 * Math.PI / 180, cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
  const P = pt => { const x = pt[0] - def.c[0], y = pt[1] - def.c[1], z = pt[2] - def.c[2], x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [W / 2 + x1 * S, H * 0.52 - y1 * S, z2]; };
  ctx.clearRect(0, 0, W, H);
  // floor
  const ring = (cx, cz, r, fill, stroke) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, p = P([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
  ring(def.c[0], def.c[2], def.r * 0.98, 'rgba(255,255,255,.035)', 'rgba(255,255,255,.09)'); ring(def.c[0], def.c[2], def.r * 0.55, null, 'rgba(255,255,255,.05)');
  ring(q.p[0], q.p[2], 0.26 + Math.max(0, 0.6 - q.p[1]) * 0.25, `rgba(0,0,0,${0.5 - Math.min(0.3, q.p[1] * 0.18)})`, null);
  // depth-buffered layer
  let R = cv._r; if (!R || R.W !== W || R.H !== H) { const o = document.createElement('canvas'); o.width = W; o.height = H; const octx = o.getContext('2d'), img = octx.createImageData(W, H); R = cv._r = { W, H, o, octx, img, px: img.data, zb: new Float32Array(W * H), id: new Uint8Array(W * H) }; }
  R.px.fill(0); R.zb.fill(-1e9); R.id.fill(0); R.bx0 = R.by0 = 1e9; R.bx1 = R.by1 = -1;
  const caps = [], quads = [];
  const seg = (a, b, w, key, col, w2) => { const A = P(a), Bp = P(b); caps.push([A, Bp, w / 2, (w2 == null ? w : w2) / 2, col || (def.hl.has(key) ? AC.on : AC.body), SMOOTH[key] ? 1 : 0, 0, 1]); };
  const dot = (a, r, key, col) => seg(a, a, r * 2, key, col);
  const limb = (a, b, rr, key) => seg(a, b, rr[0] * 2, key, null, rr[1] * 2);
  const quad = (a, b, w, col, off) => { const d = V.sub(b, a); let wd = [d[2], 0, -d[0]]; if (V.len(wd) < 1e-4) wd = [1, 0, 0]; wd = V.mul(V.norm(wd), w / 2); const o = off || [0, 0, 0]; quads.push([[V.add(a, wd), V.add(b, wd), V.sub(b, wd), V.sub(a, wd)].map(x => P(V.add(x, o))), col]); };
  const X = [1, 0, 0], at = (f, fw = 0, x = 0) => V.add(V.add(V.add(J.pelvis, V.mul(J.up, f * 0.5)), V.mul(J.fwd, fw)), [x, 0, 0]);
  // a limb with a muscle belly: thickest part-way down, tapering to the joint
  const belly = (a, b, rr, fm, key) => { seg(a, b, rr[0] * 2, key, null, rr[2] * 2); const c = caps[caps.length - 1]; c[6] = Math.max(0, rr[1] - (rr[0] + (rr[2] - rr[0]) * fm)); c[7] = Math.log(0.5) / Math.log(fm); };
  const off = (a, b, f, dir, d) => V.add(V.lerp(a, b, f), V.mul(dir, d)), across = (dir, a, b) => { const ax = V.norm(V.sub(b, a)); const p = V.sub(dir, V.mul(ax, V.dot(dir, ax))); return V.len(p) < 1e-3 ? [0, 0, 1] : V.norm(p); };
  for (const [s, sx] of SIDES) {
    const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], sh = J['sh' + s], el = J['el' + s], ha = J['ha' + s];
    belly(hip, kn, B.thigh, 0.36, 'thigh');
    belly(kn, an, B.shin, 0.3, 'shin');
    { const back = V.mul(across(J['kf' + s], kn, an), -1); seg(off(kn, an, 0.14, back, 0.02), off(kn, an, 0.5, back, 0.008), B.calf * 2, 'shin', null, B.calf * 1.3); }      // calf
    seg(an, J['toe' + s], B.foot * 2.1, 'foot', null, B.foot * 1.5);
    belly(sh, el, B.upper, 0.45, 'upper');
    { const front = V.mul(across(J['eb' + s], sh, el), -1); seg(off(sh, el, 0.3, front, 0.014), off(sh, el, 0.72, front, 0.008), B.bicep * 2, 'upper', null, B.bicep * 1.6); }  // biceps
    belly(el, ha, B.fore, 0.28, 'fore'); seg(ha, V.add(ha, V.mul(V.norm(V.sub(ha, el)), 0.07)), B.hand * 2, 'hand', null, B.hand * 1.6);
    seg(V.add(sh, [sx * 0.012, 0.002, 0]), V.lerp(sh, el, 0.4), B.delt * 2, 'sho', null, B.upper[1] * 1.96);                                                                      // deltoid cap
    seg(V.add(J.neck, V.mul(J.up, 0.03)), V.add(sh, [-sx * 0.035, 0, 0]), B.trap * 2 + 0.024, 'trap', null, B.trap * 2);
    dot(at(-0.02, -B.gback, sx * B.hw * 0.9), B.glute, 'glute');
    if (B.pec) seg(at(0.725, 0.058, sx * 0.045), at(0.765, 0.044, sx * 0.14), B.pec * 2, 'pec', null, B.pec * 1.7);
    if (B.bust) { seg(at(0.74, 0.03, sx * 0.04), at(0.76, 0.026, sx * 0.11), 0.09, 'pec'); dot(at(0.67, 0.05, sx * 0.068), B.bust, 'pec'); }
  }
  // torso: five vertical columns that follow the width/depth profile, so it shades as one smooth surface (no banding)
  { const pr = B.prof, pt = (k, j) => { const [f, w, d] = pr[k]; return at(f, 0, (j / 2) * Math.max(0, w - d)); };
    for (let k = 0; k < pr.length - 1; k++) { const fm = (pr[k][0] + pr[k + 1][0]) / 2, key = fm < 0.2 ? 'pelvis' : fm < 0.55 ? 'tl' : 'tu'; for (let j = -2; j <= 2; j++) seg(pt(k, j), pt(k + 1, j), pr[k][2] * 2, key, null, pr[k + 1][2] * 2); } }
  seg(V.add(J.neck, V.mul(J.up, -0.04)), V.add(J.head, V.mul(J.up, -0.03)), B.neck * 2.1, 'neck', null, B.neck * 1.8);
  seg(V.add(J.head, V.mul(J.up, 0.02)), V.add(V.add(J.head, V.mul(J.up, -0.062)), V.mul(J.fwd, 0.022)), B.head * 2, 'head', null, B.jaw * 2);
  dot(V.add(V.add(J.head, V.mul(J.up, 0.04)), V.mul(J.fwd, -0.03)), B.head * 0.95, 'hair', B.hair);
  if (B.bun) { dot(V.add(V.add(J.head, V.mul(J.up, 0.075)), V.mul(J.fwd, -0.105)), 0.046, 'hair', B.hair); }
  // equipment
  const mid = V.mul(V.add(J.haR, J.haL), 0.5);
  const tris = [];
  const plate = (x, y, z, rad) => { const n = 18, c = P([x, y, z]), ring = []; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2; ring.push([x, y + Math.cos(an) * rad, z + Math.sin(an) * rad]); }
    const pr = ring.map(P), face = 0.55 + 0.45 * Math.abs(sy); for (let i = 0; i < n; i++) { tris.push([c, pr[i], pr[(i + 1) % n], AC.dark, face]); seg(ring[i], ring[(i + 1) % n], 0.05, 'prop', AC.dark); } dot([x, y, z], 0.045, 'prop', AC.bar); };
  const barbell = (cx, y, z) => { seg([cx - 0.98, y, z], [cx + 0.98, y, z], 0.03, 'prop', AC.bar); for (const sx of [-1, 1]) plate(cx + sx * 0.83, y, z, 0.2); };
  for (const pr of def.props || []) {
    if (pr.t === 'bar') { if (pr.short) { const half = Math.max(0.3, Math.abs(J.haR[0] - J.haL[0]) / 2 + 0.12); seg([mid[0] - half, mid[1], mid[2]], [mid[0] + half, mid[1], mid[2]], 0.03, 'prop', AC.bar); } else barbell(mid[0], mid[1], mid[2]); }
    else if (pr.t === 'barhip') { const c = V.add(q.p, [0, 0.13, 0.06]); barbell(0, c[1], c[2]); }
    else if (pr.t === 'db') for (const [s] of SIDES) { const h = J['ha' + s]; seg([h[0], h[1], h[2] - 0.12], [h[0], h[1], h[2] + 0.12], 0.034, 'prop', AC.bar); for (const dz of [-0.12, 0.12]) dot([h[0], h[1], h[2] + dz], 0.062, 'prop', AC.dark); }
    else if (pr.t === 'kb') { dot([mid[0], mid[1] - 0.1, mid[2]], 0.1, 'prop', AC.dark); seg([mid[0] - 0.05, mid[1], mid[2]], [mid[0] + 0.05, mid[1], mid[2]], 0.03, 'prop', AC.bar); }
    else if (pr.t === 'grips') for (const [s] of SIDES) { const h = J['ha' + s]; seg([h[0], h[1] - 0.09, h[2]], [h[0], h[1] + 0.09, h[2]], 0.034, 'prop', AC.bar); }
    else if (pr.t === 'slab') { quad(pr.a, pr.b, pr.w, AC.pad); if (pr.legs) for (const e of [pr.a, pr.b]) seg([e[0], e[1] - 0.03, e[2]], [e[0], 0, e[2]], 0.035, 'prop', AC.dark); }
    else if (pr.t === 'fixbar') seg([-0.6, pr.y, 0], [0.6, pr.y, 0], 0.034, 'prop', AC.bar);
    else if (pr.t === 'rails') { if (pr.cross) seg([-pr.x - 0.15, pr.y, pr.z], [pr.x + 0.15, pr.y, pr.z], 0.034, 'prop', AC.bar); else for (const sx of [-1, 1]) { seg([sx * pr.x, pr.y, -0.35], [sx * pr.x, pr.y, 0.35], 0.034, 'prop', AC.bar); seg([sx * pr.x, pr.y, -0.35], [sx * pr.x, 0, -0.35], 0.03, 'prop', AC.dark); } }
    else if (pr.t === 'cable') { const to = pr.to ? J[pr.to] : mid; seg(pr.a, to, 0.014, 'prop', AC.cable); if (pr.a[1] < 2) seg([pr.a[0], 0, pr.a[2]], [pr.a[0], Math.max(pr.a[1], 0.3), pr.a[2]], 0.04, 'prop', AC.dark); else seg([pr.a[0] - 0.25, pr.a[1], pr.a[2]], [pr.a[0] + 0.25, pr.a[1], pr.a[2]], 0.045, 'prop', AC.dark); }
    else if (pr.t === 'cable2') for (const [s, sx] of SIDES) { const a = [pr.a[0] * sx, pr.a[1], pr.a[2]]; seg(a, J['ha' + s], 0.014, 'prop', AC.cable); seg([a[0], 0, a[2]], a, 0.04, 'prop', AC.dark); }
    else if (pr.t === 'plate') { const f = V.mul(V.add(J.toeR, J.toeL), 0.5), an = V.mul(V.add(J.anR, J.anL), 0.5), n = V.norm(V.sub(f, an)); quad(V.add(an, V.mul(n, -0.22)), V.add(an, V.mul(n, 0.4)), 0.6, AC.pad, [0, -0.05, 0.05]); }
    else if (pr.t === 'wall') quad([0, 0, pr.z - 0.09], [0, 1.75, pr.z - 0.09], 1.0, AC.wall);
  }
  for (const [pts, col] of quads) { const n = [(pts[1][1] - pts[0][1]) * (pts[3][2] - pts[0][2]) - (pts[1][2] - pts[0][2]) * (pts[3][1] - pts[0][1]), 0, 0], up = Math.min(1, Math.abs((pts[1][0] - pts[0][0]) * (pts[3][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[3][0] - pts[0][0])) / (S * S * 0.25 + 1)), sh = 0.8 + 0.35 * up; rasterTri(R, pts[0], pts[1], pts[2], col, sh); rasterTri(R, pts[0], pts[2], pts[3], col, sh); }
  for (const [A, B, C, col, sh] of tris) rasterTri(R, A, B, C, col, sh);
  caps.sort((a, b) => (a[0][2] + a[1][2]) - (b[0][2] + b[1][2]));
  for (const [A, Bp, wa, wb, col, tag, kw, g] of caps) rasterCapsule(R, A[0], A[1], A[2], Bp[0], Bp[1], Bp[2], Math.max(0.6, wa * S), Math.max(0.6, wb * S), wa, wb, col, tag, kw * S, kw, g);
  smoothShade(R, S);
  R.octx.putImageData(R.img, 0, 0); ctx.drawImage(R.o, 0, 0);
}

/* ---------- player ---------- */
const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function animTime(def, ms) { // → [t 0..1, cycle]
  if (def.hold) { const k = (ms / 2600) % 1; return [0.5 - 0.5 * Math.cos(k * Math.PI * 2), 0]; }
  const up = def.fast ? 520 : 1050, h1 = def.fast ? 160 : 260, dn = def.fast ? 700 : 1400, h2 = 340, T = up + h1 + dn + h2, cyc = Math.floor(ms / T), x = ms % T;
  return [x < up ? easeIO(x / up) : x < up + h1 ? 1 : x < up + h1 + dn ? 1 - easeIO((x - up - h1) / dn) : 0, cyc];
}
function animHTML(name, sex = 'male') {
  const def = animDef(name, sex); if (!def) return '';
  return `<div class="anim"><div class="anim-stage"><canvas class="anim-cv" data-ex="${esc(name)}" data-sex="${sex}" role="img" aria-label="Animation of ${esc(name)}"></canvas><span class="anim-hint">Drag to turn</span><div class="anim-sex" role="group" aria-label="Figure">${[['male', 'Male'], ['female', 'Female']].map(([k, l]) => `<button data-act="musSex" data-s="${k}" aria-pressed="${sex === k}">${l}</button>`).join('')}</div>${def.hl.size ? '<span class="anim-key"><i></i>Working</span>' : ''}</div><ol class="anim-cues">${def.cue.map(c => `<li>${esc(c)}</li>`).join('')}</ol></div>`;
}
function mountAnim(root) {
  const cv = root && root.querySelector('.anim-cv'); if (!cv || cv._on) return; cv._on = 1;
  const def = animDef(cv.dataset.ex, cv.dataset.sex); if (!def) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), fit = () => { const r = cv.getBoundingClientRect(); if (r.width) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); } };
  fit();
  let yaw = def.yaw, drag = null, t0 = performance.now(), still = REDUCED();
  const frame = now => {
    if (!cv.isConnected) return;
    if (!cv.width) fit();
    const [t, cyc] = still ? [0.5, 0] : animTime(def, now - t0);
    animDraw(cv, def, t, yaw + (drag || still ? 0 : Math.sin((now - t0) / 2600) * 7), cyc);
    if (!still) requestAnimationFrame(frame);
  };
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw }; cv.setPointerCapture(e.pointerId); const h = cv.parentElement.querySelector('.anim-hint'); if (h) h.style.opacity = 0; });
  cv.addEventListener('pointermove', e => { if (!drag) return; yaw = drag.yaw + (e.clientX - drag.x) * 0.7; if (still) frame(performance.now()); });
  const end = () => { if (drag) { def.yaw = yaw; drag = null; } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  requestAnimationFrame(frame);
}
