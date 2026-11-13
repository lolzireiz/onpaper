'use strict';
/* Real-mesh exercise figures (WebGL). The bodies are athletic male/female meshes baked from MakeHuman (CC0) with skin weights;
   the same IK poses that drive the simple figure drive 13 bones here. Falls back to the capsule figure if WebGL or the mesh is unavailable. */

const G3 = { state: 'idle', mesh: null, waiters: [] };
const b64bytes = s => { const bin = atob(s), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; };
function loadBodyMesh(cb) {
  if (G3.state === 'ready') return cb(true); if (G3.state === 'failed') return cb(false);
  G3.waiters.push(cb); if (G3.state === 'loading') return; G3.state = 'loading';
  const done = ok => { G3.state = ok ? 'ready' : 'failed'; G3.waiters.splice(0).forEach(f => f(ok)); };
  const sc = document.createElement('script'); sc.src = 'js/body-mesh.js'; sc.onerror = () => done(false);
  sc.onload = () => { try {
    const M = window.BODY_MESH, n = M.n, out = { n, idx: new Uint16Array(b64bytes(M.idx).buffer), bi: b64bytes(M.bi), bw: b64bytes(M.bw) };
    for (const sex of ['male', 'female']) { const d = M[sex], p16 = new Int16Array(b64bytes(d.pos).buffer), n8 = new Int8Array(b64bytes(d.nrm).buffer), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) { pos[i] = p16[i] * 2.2 / 32767; nrm[i] = n8[i] / 127; }
      const J = d.J, mid = (a, b) => V.mul(V.add(a, b), 0.5), pel = mid(J.L_upper_leg, J.R_upper_leg), shm = mid(J.L_shoulder, J.R_shoulder), len = (a, b) => V.len(V.sub(a, b));
      out[sex] = { pos, nrm, reg: b64bytes(d.reg), cloth: b64bytes(d.cloth), J, pel, shm,
        build: { mesh: sex, sw: Math.abs(J.L_shoulder[0] - J.R_shoulder[0]) / 2, hw: Math.abs(J.L_upper_leg[0] - J.R_upper_leg[0]) / 2, th: len(J.L_upper_leg, J.L_knee), sh: len(J.L_knee, J.L_ankle), ua: len(J.L_shoulder, J.L_elbow), fa: len(J.L_elbow, J.L_hand), torso: len(shm, pel) + 0.05 } };
      out[sex].rest = restFrames(out[sex]); }
    G3.mesh = out; window.BODY_MESH = null; done(true);
  } catch (e) { G3.err = String(e && e.stack || e); done(false); } };
  document.head.appendChild(sc);
}
/* 3x3 frame from a bone direction and a pole (the way its hinge bends); columns x (along bone), y, z */
function frame3(a, b, pole) { const x = V.norm(V.sub(b, a)); let y = V.sub(pole, V.mul(x, V.dot(pole, x))); if (V.len(y) < 1e-4) y = V.sub([0.2, 0.3, 1], V.mul(x, V.dot([0.2, 0.3, 1], x))); y = V.norm(y); return [x, y, [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]]; }
function restFrames(m) {
  const J = m.J, R = { torso: [m.pel, frame3(m.pel, m.shm, [0, 0, 1])] };
  for (const [s, p] of [['R', 'L_'], ['L', 'R_']]) {       // the mesh's "left" is +x, which is this app's R side
    const g = k => J[p + k];
    R['ua' + s] = [g('shoulder'), frame3(g('shoulder'), g('elbow'), [0, 0, -1])]; R['fa' + s] = [g('elbow'), frame3(g('elbow'), g('hand'), [0, 0, -1])];
    R['th' + s] = [g('upper_leg'), frame3(g('upper_leg'), g('knee'), [0, 0, 1])]; R['sh' + s] = [g('knee'), frame3(g('knee'), g('ankle'), [0, 0, 1])];
    R['ft' + s] = [g('ankle'), frame3(g('ankle'), g('toe_3_1'), V.sub(g('knee'), g('ankle')))];
    // hand: x along the fingers, y out of the back of the hand (thumb-to-pinky crossed with the finger direction, flipped per side)
    { const fx = V.sub(g('finger_3_1'), g('hand')), tp = V.sub(g('finger_5_1'), g('finger_1_1')), nb = [fx[1] * tp[2] - fx[2] * tp[1], fx[2] * tp[0] - fx[0] * tp[2], fx[0] * tp[1] - fx[1] * tp[0]]; R['hd' + s] = [g('hand'), frame3(g('hand'), g('finger_3_1'), V.mul(nb, s === 'R' ? 1 : -1))];
      /* grip axis (index knuckle → pinky knuckle) in forearm coordinates, so held props can turn with the hand */
      const fa = R['fa' + s][1], tpn = V.norm(tp); R['grip' + s] = [V.dot(tpn, fa[0]), V.dot(tpn, fa[1]), V.dot(tpn, fa[2])];
      /* centre of the closed fist (where a handle sits), same geometry as gripMesh() */
      const f1 = g('finger_1_1'), f3 = g('finger_3_1'), f5 = g('finger_5_1'), ff = V.norm(V.sub(f3, g('hand'))), a0 = V.sub(f5, f1), aa = V.norm(V.sub(a0, V.mul(ff, V.dot(a0, ff)))), nn = V.mul(V.norm([ff[1] * aa[2] - ff[2] * aa[1], ff[2] * aa[0] - ff[0] * aa[2], ff[0] * aa[1] - ff[1] * aa[0]]), -(p === 'L_' ? 1 : -1));
      R['fist' + s] = V.add(V.add(f3, V.mul(nn, 0.03)), V.mul(ff, -0.012)); }
  }
  return R;
}
/* Closed hands: bend the four fingers (everything past the knuckle line) around the grip axis
   with a constant curve, like wrapping a handle. Baked once per body into a second vertex/normal set. */
const TH_ANG = -1.1;
function gripMesh(m, M, sign = -1) {
  const key = 'grip' + sign; if (m[key]) return m[key];
  const pos = m.pos.slice(), nrm = m.nrm.slice(), n = M.n, R = 0.032, k = 1 / R;
  for (const [bone, p] of [[11, 'L_'], [12, 'R_']]) {
    const J = m.J, h = J[p + 'hand'], f1 = J[p + 'finger_1_1'], f3 = J[p + 'finger_3_1'], f5 = J[p + 'finger_5_1'];
    const f = V.norm(V.sub(f3, h)), a0 = V.sub(f5, f1), a = V.norm(V.sub(a0, V.mul(f, V.dot(a0, f)))), nn = V.mul(V.norm([f[1] * a[2] - f[2] * a[1], f[2] * a[0] - f[0] * a[2], f[0] * a[1] - f[1] * a[0]]), sign * (p === 'L_' ? 1 : -1));
    const s5 = V.dot(V.sub(f5, f3), a), d5 = V.dot(V.sub(f5, f3), f), slope = Math.abs(s5) > 1e-4 ? d5 / s5 : 0;
    for (let i = 0; i < n; i++) {
      let w = 0; for (let q = 0; q < 4; q++) if (M.bi[i * 4 + q] === bone) w += M.bw[i * 4 + q] / 255; if (w < 0.5) continue;
      const v = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]], r = V.sub(v, f3), sa = V.dot(r, a), d = V.dot(r, f) - sa * slope;
      if (d <= 0) { // thumb: the part sticking out past the index side swings over toward the palm
        const r1 = V.sub(v, f1), out = -V.dot(r1, a), along = V.dot(V.sub(v, h), f);
        if (out > 0.004 && along > 0.01) { const wgt = Math.min(1, (out - 0.004) / 0.02), th = TH_ANG * wgt, c = Math.cos(th), sn = Math.sin(th), ra = V.dot(r1, a), rn = V.dot(r1, nn), rf = V.dot(r1, f);
          const np = V.add(f1, V.add(V.mul(f, rf), V.add(V.mul(a, ra * c - rn * sn), V.mul(nn, ra * sn + rn * c)))); pos[i * 3] = np[0]; pos[i * 3 + 1] = np[1]; pos[i * 3 + 2] = np[2];
          const nv = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], na = V.dot(nv, a), nf = V.dot(nv, f), nh = V.dot(nv, nn), rv = V.add(V.mul(f, nf), V.add(V.mul(a, na * c - nh * sn), V.mul(nn, na * sn + nh * c))); nrm[i * 3] = rv[0]; nrm[i * 3 + 1] = rv[1]; nrm[i * 3 + 2] = rv[2]; }
        continue; }
      const hh = V.dot(r, nn), phi = Math.min(d * k, 2.9), c = Math.cos(phi), sn = Math.sin(phi);
      // point on the bent centreline + the vertex's offset off that line, both rotated by phi
      const base = V.add(V.add(f3, V.mul(a, sa)), V.add(V.mul(f, d * (d > 0 ? 0 : 1) + Math.sin(phi) / k + (V.dot(r, f) - d - sa * slope) * 0), V.mul(nn, (1 - c) / k)));
      const off = V.add(V.mul(nn, hh * c), V.mul(f, -hh * sn)), np = V.add(V.add(base, off), V.mul(f, sa * slope));
      pos[i * 3] = np[0]; pos[i * 3 + 1] = np[1]; pos[i * 3 + 2] = np[2];
      const nv = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], na = V.dot(nv, a), nf = V.dot(nv, f), nh = V.dot(nv, nn);
      const rn = V.add(V.mul(a, na), V.add(V.mul(f, nf * c - nh * sn), V.mul(nn, nf * sn + nh * c)));
      nrm[i * 3] = rn[0]; nrm[i * 3 + 1] = rn[1]; nrm[i * 3 + 2] = rn[2];
    }
  }
  return (m[key] = { pos, nrm });
}
const GRIP_PROPS = new Set(['ball', 'db', 'bar', 'barhip', 'kb', 'grips', 'fixbar', 'rails', 'cable', 'cable2', 'rope', 'smith', 'tbar', 'handles']);
const grips = def => def.hands !== 'floor' && (def.grip || (def.props || []).some(p => GRIP_PROPS.has(p.t)));
const BONE_ORDER = ['torso', 'uaR', 'uaL', 'faR', 'faL', 'thR', 'thL', 'shR', 'shL', 'ftR', 'ftL', 'hdR', 'hdL'];
/* current pose → 11 bone matrices (column-major 4x4), M = [Fc * Fr^T | a_cur - R a_rest] */
function boneMats(J, m, out, hands) {
  const cur = { torso: [J.pelvis, frame3(J.pelvis, V.add(J.pelvis, J.up), J.fwd)] };
  for (const [s] of SIDES) {
    cur['ua' + s] = [J['sh' + s], frame3(J['sh' + s], J['el' + s], J['eb' + s])]; cur['fa' + s] = [J['el' + s], frame3(J['el' + s], J['ha' + s], J['eb' + s])];
    cur['th' + s] = [J['hip' + s], frame3(J['hip' + s], J['kn' + s], J['kf' + s])]; cur['sh' + s] = [J['kn' + s], frame3(J['kn' + s], J['an' + s], J['kf' + s])];
    cur['ft' + s] = [J['an' + s], frame3(J['an' + s], J['toe' + s], V.sub(J['kn' + s], J['an' + s]))];
    if (hands === 'floor') cur['hd' + s] = [J['ha' + s], frame3(J['ha' + s], V.add(J['ha' + s], [0, -0.25, 1]), [0, 1, 0.25])];   // palms flat, fingers forward
  }
  BONE_ORDER.forEach((k, bi) => { const o = bi * 16; if (!cur[k]) { const src = (k === 'hdR' ? 3 : 4) * 16; for (let i = 0; i < 16; i++) out[o + i] = out[src + i]; return; }   // hands ride the forearm unless posed
    const [ac, fc] = cur[k], [ar, fr] = m.rest[k], R = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R[r * 3 + c] = fc[0][r] * fr[0][c] + fc[1][r] * fr[1][c] + fc[2][r] * fr[2][c];
    const t = [ac[0] - (R[0] * ar[0] + R[1] * ar[1] + R[2] * ar[2]), ac[1] - (R[3] * ar[0] + R[4] * ar[1] + R[5] * ar[2]), ac[2] - (R[6] * ar[0] + R[7] * ar[1] + R[8] * ar[2])];
    out[o] = R[0]; out[o + 1] = R[3]; out[o + 2] = R[6]; out[o + 3] = 0; out[o + 4] = R[1]; out[o + 5] = R[4]; out[o + 6] = R[7]; out[o + 7] = 0; out[o + 8] = R[2]; out[o + 9] = R[5]; out[o + 10] = R[8]; out[o + 11] = 0; out[o + 12] = t[0]; out[o + 13] = t[1]; out[o + 14] = t[2]; out[o + 15] = 1; });
  return out;
}
/* which mesh regions each muscle lights up (regions are baked per vertex) */
const MUS_REG = { quads: [1], hamstrings: [2], glutes: [14], adductors: [1, 2], abductors: [14, 15], calves: [4], chest: [10], abs: [12], obliques: [12], lats: [11], upper_back: [11, 9], lower_back: [13], traps: [9], delts: [8], side_delts: [8], rear_delts: [8], biceps: [6], triceps: [6], forearms: [7] };
const C3 = { body: [0.80, 0.815, 0.86], cloth: [0.2, 0.215, 0.27], on: [1, 0.46, 0.27], onCloth: [0.8, 0.36, 0.2], bar: [0.6, 0.63, 0.7], dark: [0.26, 0.28, 0.35], pad: [0.2, 0.215, 0.28], cable: [0.45, 0.48, 0.55], floor: [0.075, 0.078, 0.095], ring: [0.13, 0.135, 0.16], shadow: [0.02, 0.02, 0.028] };

const VS3 = `attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol; attribute vec4 aBi; attribute vec4 aBw; attribute vec3 aEx;
uniform mat4 uBones[13]; uniform mat4 uVP; uniform mat3 uVR; uniform mediump float uSkin; varying vec3 vN; varying vec3 vC; varying vec3 vR; varying vec3 vE;
void main(){ vec4 p = vec4(aPos,1.0); vec3 n = aNrm;
  if (uSkin > 0.5) { mat4 m = uBones[int(aBi.x)]*aBw.x + uBones[int(aBi.y)]*aBw.y + uBones[int(aBi.z)]*aBw.z + uBones[int(aBi.w)]*aBw.w; p = m*p; n = mat3(m[0].xyz,m[1].xyz,m[2].xyz)*n; }
  gl_Position = uVP*vec4(p.xyz,1.0); vN = uVR*n; vC = aCol; vR = aPos; vE = aEx; }`;
const FS3 = `precision mediump float; varying vec3 vN; varying vec3 vC; varying vec3 vR; varying vec3 vE; uniform float uFlat; uniform mediump float uSkin; uniform vec2 uShorts; uniform vec4 uTop;
void main(){ vec3 n = normalize(vN); vec3 L = normalize(vec3(-0.45,0.65,0.62)); float lam = dot(n,L); float h = lam*0.5+0.5;
  float fill = max(0.0, dot(n, normalize(vec3(0.7,0.1,0.5))))*0.16; float rim = clamp(n.z*2.4,0.0,1.0);
  float sh = (0.2 + 0.86*h*h*(0.55+0.45*h) + fill)*(0.55+0.45*rim); float sp = pow(max(0.0, dot(n, normalize(L+vec3(0.0,0.0,1.0)))), 40.0)*0.16;
  vec3 base = vC; float gloss = 1.0;
  if (uSkin > 0.5) { // vE = (highlight, weight on torso+thighs, weight on torso)
    float ax = abs(vR.x); float f = (vR.y - uTop.x)/(uTop.y - uTop.x);          // 0 at the hips, 1 at the shoulders
    // fitted shorts: waistband just under the navel, hems a little lower on the outside of the thigh
    float shorts = step(0.5, vE.y)*step(uShorts.x - ax*0.12, vR.y)*step(vR.y, uShorts.y - ax*0.1);
    // sports bra: a band round the ribs, a scooped neckline, cut-in armholes and two straps over the shoulders
    float band = step(0.56, f)*step(f, 0.8);
    float up = clamp((f - 0.8)/0.2, 0.0, 1.0); float inner = mix(-0.01, 0.062, sqrt(up)); float outer = mix(uTop.z*0.74, 0.118, up);
    float upper = step(0.8, f)*step(f, 1.08)*step(inner, ax)*step(ax, outer);
    float top = uTop.w*step(0.5, vE.z)*max(band*step(ax, uTop.z*0.8), upper);
    float cl = max(shorts, top); float hi = smoothstep(0.32, 0.6, vE.x);
    base = mix(mix(vec3(0.80,0.815,0.86), vec3(0.36,0.385,0.46), cl), mix(vec3(1.0,0.46,0.27), vec3(0.86,0.38,0.22), cl), hi); gloss = 1.0 - 0.75*cl; }
  vec3 c = mix(base*sh + sp*gloss, base, uFlat); gl_FragColor = vec4(c,1.0); }`;

function g3Setup(cv, def, sex) {
  const gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false }); if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS3)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS3)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(pr)); gl.useProgram(pr);
  const A = n => gl.getAttribLocation(pr, n), U = n => gl.getUniformLocation(pr, n), M = G3.mesh, m = M[sex], n = M.n;
  const buf = (data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
  // per-vertex extras: [soft highlight for the working muscles, weight on torso+thighs (shorts), weight on torso (top)]
  const on = new Set(), mus = (EX_MUSCLES[keyOf((library().get(keyOf(def.name)) || {}).name || def.name)] || [''])[0].split(' ').filter(Boolean); mus.forEach(x => (MUS_REG[x] || []).forEach(r => on.add(r)));
  let hi = new Float32Array(n), tmp = new Float32Array(n), cnt = new Uint16Array(n); for (let i = 0; i < n; i++) hi[i] = on.has(m.reg[i]) ? 1 : 0;
  for (let it = 0; it < 3; it++) { tmp.fill(0); cnt.fill(0); const ix = M.idx; for (let k = 0; k < ix.length; k += 3) { const a0 = ix[k], b0 = ix[k + 1], c0 = ix[k + 2], sm = hi[a0] + hi[b0] + hi[c0]; tmp[a0] += sm; tmp[b0] += sm; tmp[c0] += sm; cnt[a0] += 3; cnt[b0] += 3; cnt[c0] += 3; } for (let i = 0; i < n; i++) hi[i] = cnt[i] ? tmp[i] / cnt[i] : hi[i]; }
  const ex = new Float32Array(n * 3), bw = new Float32Array(n * 4), bi = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { let wt = 0, wl = 0; for (let k = 0; k < 4; k++) { const b = M.bi[i * 4 + k], w = M.bw[i * 4 + k] / 255; bw[i * 4 + k] = w; bi[i * 4 + k] = b; if (b === 0) wt += w; if (b === 5 || b === 6) wl += w; } ex[i * 3] = hi[i]; ex[i * 3 + 1] = wt + wl; ex[i * 3 + 2] = wt; }
  const col = new Float32Array(3), hipY = m.pel[1], fy = f => m.pel[1] + f * (m.shm[1] - m.pel[1]), top = sex === 'female';
  return { gl, pr, m, n, nIdx: M.idx.length, a: { pos: A('aPos'), nrm: A('aNrm'), col: A('aCol'), bi: A('aBi'), bw: A('aBw'), ex: A('aEx') }, u: { bones: U('uBones[0]'), vp: U('uVP'), vr: U('uVR'), skin: U('uSkin'), flat: U('uFlat'), shorts: U('uShorts'), top: U('uTop') },
    cloth: { shorts: [9, 9], top: [m.pel[1], m.shm[1], m.build.sw, 0] },   // plain single-colour figures, no painted clothing
    b: { pos: buf(grips(def) ? gripMesh(m, M).pos : m.pos), nrm: buf(grips(def) ? gripMesh(m, M).nrm : m.nrm), ex: buf(ex), bi: buf(bi), bw: buf(bw), idx: buf(M.idx, gl.ELEMENT_ARRAY_BUFFER), prop: gl.createBuffer() }, bones: new Float32Array(13 * 16), hl: on.size > 0 };
}
/* equipment + floor are rebuilt each frame as plain triangles: [x,y,z, nx,ny,nz, r,g,b] */
function propGeo(def, q, J, m) {
  const o = [], tri = (a, b, c, na, nb, nc, col) => { o.push(a[0], a[1], a[2], na[0], na[1], na[2], col[0], col[1], col[2], b[0], b[1], b[2], nb[0], nb[1], nb[2], col[0], col[1], col[2], c[0], c[1], c[2], nc[0], nc[1], nc[2], col[0], col[1], col[2]); };
  const basis = d => { const x = V.norm(d), r = Math.abs(x[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], y = V.norm(V.sub(r, V.mul(x, V.dot(r, x)))); return [x, y, [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]]; };
  const cyl = (a, b, r, col, n = 10, caps = 0) => { const d = V.sub(b, a); if (V.len(d) < 1e-5) return; const [x, y, z] = basis(d), ring = k => { const an = k / n * Math.PI * 2; return V.add(V.mul(y, Math.cos(an)), V.mul(z, Math.sin(an))); };
    for (let k = 0; k < n; k++) { const n0 = ring(k), n1 = ring(k + 1), a0 = V.add(a, V.mul(n0, r)), a1 = V.add(a, V.mul(n1, r)), b0 = V.add(b, V.mul(n0, r)), b1 = V.add(b, V.mul(n1, r)); tri(a0, b0, b1, n0, n0, n1, col); tri(a0, b1, a1, n0, n1, n1, col);
      if (caps) { const nx = V.mul(x, -1); tri(a, a1, a0, nx, nx, nx, col); tri(b, b0, b1, x, x, x, col); } } };
  const ball = (c, r, col, la = 6, lo = 10) => { const pt = (i, j) => { const t = i / la * Math.PI, p = j / lo * Math.PI * 2; return [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)]; };
    for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const n00 = pt(i, j), n01 = pt(i, j + 1), n10 = pt(i + 1, j), n11 = pt(i + 1, j + 1), P = nn => V.add(c, V.mul(nn, r)); tri(P(n00), P(n01), P(n11), n00, n01, n11, col); tri(P(n00), P(n11), P(n10), n00, n11, n10, col); } };
  const slab = (a, b, w, col, th = 0.05, off) => { const d = V.sub(b, a); let wd = [d[2], 0, -d[0]]; if (V.len(wd) < 1e-4) wd = [1, 0, 0]; wd = V.mul(V.norm(wd), w / 2); const x = V.norm(d), up = V.norm([x[1] * wd[2] - x[2] * wd[1], x[2] * wd[0] - x[0] * wd[2], x[0] * wd[1] - x[1] * wd[0]]), dn = V.mul(up, up[1] >= 0 ? -th : th), o2 = off || [0, 0, 0];
    const t = [V.add(a, wd), V.add(b, wd), V.sub(b, wd), V.sub(a, wd)].map(p => V.add(p, o2)), bt = t.map(p => V.add(p, dn)), face = (p0, p1, p2, p3) => { const nn = V.norm((u => [u[0], u[1], u[2]])((() => { const e1 = V.sub(p1, p0), e2 = V.sub(p2, p0); return [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; })())); tri(p0, p1, p2, nn, nn, nn, col); tri(p0, p2, p3, nn, nn, nn, col); };
    face(t[3], t[2], t[1], t[0]); face(bt[0], bt[1], bt[2], bt[3]); for (let k = 0; k < 4; k++) face(t[k], t[(k + 1) % 4], bt[(k + 1) % 4], bt[k]); };
  const disc = (c, r, col, y, n = 40) => { const up = [0, 1, 0]; for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; tri([c[0], y, c[2]], [c[0] + Math.cos(a1) * r, y, c[2] + Math.sin(a1) * r], [c[0] + Math.cos(a0) * r, y, c[2] + Math.sin(a0) * r], up, up, up, col); } };
  // floor (drawn unlit: marked by a zero normal)
  const rectY = (x0, x1, z0, z1, y, col) => { const up = [0, 1, 0]; tri([x0, y, z0], [x1, y, z1], [x1, y, z0], up, up, up, col); tri([x0, y, z0], [x0, y, z1], [x1, y, z1], up, up, up, col); };
  if (def.court) { const C = def.court, L = 0.006 * C.k * 39.37 / 2, line = [0.62, 0.55, 0.47];   // flat court: floor, painted lane, baseline, free-throw line
    rectY(-6, 6, C.z0, C.z1, -0.005, [0.16, 0.13, 0.115]); rectY(-C.lane / 2, C.lane / 2, C.ft, C.base, -0.004, [0.19, 0.12, 0.11]);
    rectY(-6, 6, C.base - L, C.base + L, -0.003, line); rectY(-C.lane / 2, C.lane / 2, C.ft - L, C.ft + L, -0.003, line);
    for (const sx of [-1, 1]) rectY(sx * C.lane / 2 - L, sx * C.lane / 2 + L, C.ft, C.base, -0.003, line);
    for (let i = 0; i < 28; i++) { const a0 = Math.PI * i / 28, a1 = Math.PI * (i + 1) / 28, R = C.ftr, cx = 0, cz = C.ft; const up = [0, 1, 0], p0 = [cx + Math.cos(a0) * R, -0.003, cz - Math.sin(a0) * R], p1 = [cx + Math.cos(a1) * R, -0.003, cz - Math.sin(a1) * R], n0 = V.mul(V.norm(V.sub(p0, [cx, -0.003, cz])), L), n1 = V.mul(V.norm(V.sub(p1, [cx, -0.003, cz])), L); tri(V.sub(p0, n0), V.add(p0, n0), V.add(p1, n1), up, up, up, line); tri(V.sub(p0, n0), V.add(p1, n1), V.sub(p1, n1), up, up, up, line); }
  } else { disc(def.c, def.r * 0.98, C3.ring, -0.004); disc(def.c, def.r * 0.965, C3.floor, -0.003); disc(def.c, def.r * 0.56, C3.ring, -0.002); disc(def.c, def.r * 0.545, C3.floor, -0.001); }
  disc(q.p, Math.max(0.12, 0.27 - Math.max(0, q.p[1] - 0.95) * 0.12 + Math.max(0, 0.6 - q.p[1]) * 0.25), C3.shadow, 0);
  if (def._ball) disc(def._ball, Math.max(0.03, (def.ballR || 0.12) * (1.1 - def._ball[1] * 0.25)), C3.shadow, 0.0005);
  const nFlat = o.length / 9;
  const fist = s => { const rf = m && m.rest && m.rest['fist' + s]; if (!rf || !grips(def)) return null; const [ar, fr] = m.rest['fa' + s], fc = frame3(J['el' + s], J['ha' + s], J['eb' + s]), d = V.sub(rf, ar); return V.add(J['el' + s], V.add(V.mul(fc[0], V.dot(d, fr[0])), V.add(V.mul(fc[1], V.dot(d, fr[1])), V.mul(fc[2], V.dot(d, fr[2]))))); };
  const grip = s => fist(s) || V.add(J['ha' + s], V.mul(V.norm(V.sub(J['ha' + s], J['el' + s])), 0.075)), gR = grip('R'), gL = grip('L'), mid = V.mul(V.add(gR, gL), 0.5), G = { R: gR, L: gL };
  /* the way the handle runs through each fist: follows the forearm's twist (hammer vs palms-up) */
  const gax = s => { if (def.hands === 'floor') return [1, 0, 0]; const fa = frame3(J['el' + s], J['ha' + s], J['eb' + s]), l = (m && m.rest && m.rest['grip' + s]) || [0, 1, 0], k = Math.hypot(l[1], l[2]) || 1; return V.norm(V.add(V.mul(fa[1], l[1] / k), V.mul(fa[2], l[2] / k))); };
  const GA = { R: gax('R'), L: gax('L') };
  const JA = (() => { const j = animJoints(def.a, def.build); j.mid = V.mul(V.add(j.haR, j.haL), 0.5); return j; })();   // start pose: anchors fixed machine parts
  const barbell = (cx, y, z) => { cyl([cx - 0.98, y, z], [cx + 0.98, y, z], 0.016, C3.bar); for (const sx of [-1, 1]) { cyl([cx + sx * 0.8, y, z], [cx + sx * 0.86, y, z], 0.21, C3.dark, 22, 1); cyl([cx + sx * 0.74, y, z], [cx + sx * 0.92, y, z], 0.035, C3.bar, 10, 1); } };
  for (const pr of def.props || []) {
    if (pr.t === 'bar') { if (pr.short) { const half = Math.max(0.3, Math.abs(gR[0] - gL[0]) / 2 + 0.12); cyl([mid[0] - half, mid[1], mid[2]], [mid[0] + half, mid[1], mid[2]], 0.016, C3.bar, 10, 1); } else barbell(mid[0], mid[1], mid[2]); }
    else if (pr.t === 'barhip') { const c = V.add(q.p, [0, 0.15, 0.08]); barbell(0, c[1], c[2]); }
    else if (pr.t === 'db' && pr.side) { const s = pr.side, h = G[s], ax = GA[s], P = d => V.add(h, V.mul(ax, d)); cyl(P(-0.12), P(0.12), 0.017, C3.bar); for (const dz of [-0.12, 0.12]) cyl(P(dz - 0.035), P(dz + 0.035), 0.062, C3.dark, 14, 1); }
    else if (pr.t === 'hoop') { // regulation hoop scaled to the figure: 18" rim, 72"x42" board, 15" from board to rim centre
      const k = pr.k, y0 = pr.y, y = pr.y - (def._rimDy || 0), z = pr.z, rr = 9 * k, bz = z + 15 * k, col = [0.95, 0.42, 0.13], nn = 24;
      for (let i = 0; i < nn; i++) { const a0 = i / nn * Math.PI * 2, a1 = (i + 1) / nn * Math.PI * 2; cyl([Math.cos(a0) * rr, y, z + Math.sin(a0) * rr], [Math.cos(a1) * rr, y, z + Math.sin(a1) * rr], 0.45 * k, col, 6); }
      for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2; cyl([Math.cos(a0) * rr, y, z + Math.sin(a0) * rr], [Math.cos(a0 + 0.5) * rr * 0.62, y - 15 * k, z + Math.sin(a0 + 0.5) * rr * 0.62], 0.18 * k, [0.92, 0.93, 0.96], 4); }
      cyl([0, y, z + rr], [0, y0, bz], 0.6 * k, col, 6);
      slab([0, y0 - 6 * k, bz + 1 * k], [0, y0 + 36 * k, bz + 1 * k], 72 * k, [0.9, 0.92, 0.96], 2 * k);
      slab([0, y0, bz], [0, y0 + 18 * k, bz], 24 * k, [0.95, 0.42, 0.13], 0.6 * k);
      cyl([0, y0 + 10 * k, bz + 3 * k], [0, y0 + 10 * k, bz + 40 * k], 2.5 * k, C3.dark, 10); cyl([0, 0, bz + 40 * k], [0, y0 + 10 * k, bz + 40 * k], 3 * k, C3.dark, 12, 1); }
    else if (pr.t === 'ball') { const h = G.R, up = V.norm(V.sub(J.haR, J.elR)), c = def._ball || V.add(h, V.mul(up, pr.r * 0.9)); ball(c, pr.r, [0.88, 0.42, 0.14], 10, 16); for (const [ax, ay] of [[1, 0], [0, 1]]) { for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2, P = a => ax ? [c[0], c[1] + Math.cos(a) * pr.r * 1.01, c[2] + Math.sin(a) * pr.r * 1.01] : [c[0] + Math.cos(a) * pr.r * 1.01, c[1] + Math.sin(a) * pr.r * 1.01, c[2]]; cyl(P(a0), P(a1), pr.r * 0.04, [0.18, 0.1, 0.06], 4); } } }
    else if (pr.t === 'hline') { const c = pr.col || C3.on; cyl([pr.x || 0, pr.y, pr.z - pr.w], [pr.x || 0, pr.y, pr.z + pr.w * 0.4], pr.th || 0.008, c, 6); }
    else if (pr.t === 'smith') { const z = pr.z ?? JA.mid[2], top = 2.15; for (const sx of [-1, 1]) { cyl([sx * 0.7, 0, z], [sx * 0.7, top, z], 0.03, C3.dark, 10, 1); cyl([sx * 0.7, 0, z - 0.32], [sx * 0.7, 0, z + 0.32], 0.035, C3.dark, 8, 1); cyl([sx * 0.66, mid[1] - 0.04, z], [sx * 0.66, mid[1] + 0.04, z], 0.04, C3.bar, 10, 1); } cyl([-0.72, top, z], [0.72, top, z], 0.03, C3.dark, 10, 1); }
    else if (pr.t === 'rack') { const z = pr.z ?? JA.mid[2], y = pr.y ?? JA.mid[1] - 0.05; for (const sx of [-1, 1]) for (const dz of [-0.32, 0.32]) cyl([sx * 0.62, 0, z + dz], [sx * 0.62, 2.25, z + dz], 0.028, C3.dark, 8, 1); for (const sx of [-1, 1]) { cyl([sx * 0.62, 2.25, z - 0.32], [sx * 0.62, 2.25, z + 0.32], 0.026, C3.dark); cyl([sx * 0.62, y, z + 0.32], [sx * 0.62, y, z + 0.42], 0.022, C3.bar); cyl([sx * 0.62, 0.95, z - 0.32], [sx * 0.62, 0.95, z + 0.32], 0.024, C3.bar); } cyl([-0.62, 2.25, z - 0.32], [0.62, 2.25, z - 0.32], 0.026, C3.dark); }
    else if (pr.t === 'benchrack') { const z = pr.z, h = pr.h; for (const sx of [-1, 1]) { cyl([sx * 0.56, 0, z], [sx * 0.56, h + 0.08, z], 0.028, C3.dark, 8, 1); cyl([sx * 0.56, h, z], [sx * 0.56, h, z + 0.09], 0.02, C3.bar); cyl([sx * 0.56, 0, z - 0.25], [sx * 0.56, 0, z + 0.25], 0.03, C3.dark, 8, 1); } }
    else if (pr.t === 'roller' || pr.t === 'roller2') { // leg-machine pad: across both legs at the ankles (or knees), on the front (dir 1) or back (dir -1) of the shin
      const at = pr.at || 'an', c = V.mul(V.add(J[at + 'R'], J[at + 'L']), 0.5), sd = V.norm(V.sub(J.anR, J.knR)), kf = J.kfR; let pv = V.sub(kf, V.mul(sd, V.dot(kf, sd))); pv = V.norm(V.len(pv) < 1e-3 ? [0, 0, 1] : pv);
      const off = pr.at === 'kn' ? V.add(V.mul(V.norm(V.sub(J.knR, J.hipR)), -0.08), [0, 0.085, 0]) : V.mul(pv, (pr.dir || 1) * 0.085), cc = V.add(c, off);
      cyl([cc[0] - 0.24, cc[1], cc[2]], [cc[0] + 0.24, cc[1], cc[2]], 0.055, C3.pad, 14, 1);
      if (pr.lever) { const pvt = V.mul(V.add(J.knR, J.knL), 0.5), piv = [0.32, pvt[1], pvt[2]]; cyl(piv, [0.3, cc[1], cc[2]], 0.022, C3.dark); cyl([0.3, piv[1], piv[2]], [0.36, piv[1], piv[2]], 0.05, C3.dark, 12, 1); } }
    else if (pr.t === 'kneepads') for (const [s, sx] of SIDES) { const k = V.add(J['kn' + s], [sx * 0.085, 0, 0]); cyl(V.add(k, [0, -0.08, 0]), V.add(k, [0, 0.08, 0]), 0.045, C3.pad, 12, 1); cyl(V.add(k, [sx * 0.05, 0, 0]), [sx * 0.3, k[1] - 0.25, k[2] - 0.2], 0.018, C3.dark); }
    else if (pr.t === 'chestpad') { const P = JA, a2 = V.add(P.pelvis, V.mul(P.fwd, 0.15)), b2 = V.add(P.chest, V.add(V.mul(P.fwd, 0.15), V.mul(P.up, 0.12))); slab(a2, b2, 0.36, C3.pad, 0.06); cyl(a2, [a2[0], 0, a2[2]], 0.025, C3.dark); cyl(b2, [b2[0], 0, b2[2] - 0.05], 0.025, C3.dark); if (pr.seat) slab([0, pr.seat, a2[2] - 0.42], [0, pr.seat, a2[2] - 0.06], 0.34, C3.pad); }
    else if (pr.t === 'thighpad') { const c = V.add(V.mul(V.add(JA.knR, JA.knL), 0.5), [0, 0.1, -0.05]); cyl([-0.26, c[1], c[2]], [0.26, c[1], c[2]], 0.05, C3.pad, 14, 1); cyl([0, c[1], c[2] + 0.04], [0, 0, c[2] + 0.12], 0.025, C3.dark); }
    else if (pr.t === 'tbar') { const piv = [0, 0.04, -0.95], d = V.norm(V.sub(mid, piv)), end = V.add(mid, V.mul(d, 0.32)); cyl(piv, end, 0.02, C3.bar); cyl(V.add(mid, V.mul(d, 0.12)), V.add(mid, V.mul(d, 0.16)), 0.2, C3.dark, 22, 1); cyl([mid[0] - 0.14, mid[1], mid[2]], [mid[0] + 0.14, mid[1], mid[2]], 0.017, C3.bar, 10, 1); cyl([-0.06, 0.04, -0.95], [0.06, 0.04, -0.95], 0.05, C3.dark, 10, 1); }
    else if (pr.t === 'rope') { const knot = V.add(mid, V.mul(V.norm(V.sub(pr.a, mid)), 0.13)); cyl(pr.a, knot, 0.006, C3.cable, 6); for (const s of ['R', 'L']) cyl(knot, G[s], 0.013, C3.dark, 8); ball(knot, 0.022, C3.dark, 5, 8); if (pr.a[1] > 2) cyl([pr.a[0] - 0.25, pr.a[1], pr.a[2]], [pr.a[0] + 0.25, pr.a[1], pr.a[2]], 0.022, C3.dark, 10, 1); else cyl([pr.a[0], 0, pr.a[2]], [pr.a[0], Math.max(0.3, pr.a[1]), pr.a[2]], 0.02, C3.dark); }
    else if (pr.t === 'levers') for (const [s, sx] of SIDES) { const a = [sx * pr.a[0], pr.a[1], pr.a[2]]; cyl(a, G[s], 0.02, C3.dark); ball(a, 0.035, C3.dark, 5, 8); }
    else if (pr.t === 'block') { const tz = (JA.toeR[2] + JA.toeL[2]) / 2, an = (JA.anR[2] + JA.anL[2]) / 2, z0 = Math.min(tz, an) + (tz - an) * 0.35; slab([0, 0.09, z0 - 0.05], [0, 0.09, Math.max(tz, an) + 0.12], 0.56, C3.pad, 0.09); }
    else if (pr.t === 'shoulderpads') { for (const [s, sx] of SIDES) { const sp = V.add(J['sh' + s], [sx * -0.02, 0.075, 0]); cyl(V.add(sp, [0, 0, -0.1]), V.add(sp, [0, 0, 0.1]), 0.05, C3.pad, 12, 1); cyl([sx * 0.42, 0, sp[2] - 0.2], [sx * 0.42, 2.0, sp[2] - 0.2], 0.03, C3.dark, 8, 1); cyl(V.add(sp, [0, 0, -0.1]), [sx * 0.42, sp[1], sp[2] - 0.2], 0.02, C3.dark); } }
    else if (pr.t === 'hack') { const a2 = V.add(J.pelvis, V.mul(J.fwd, -0.14)), b2 = V.add(J.neck, V.mul(J.fwd, -0.13)); slab(a2, b2, 0.4, C3.pad, 0.06); for (const [s, sx] of SIDES) { const sp = V.add(J['sh' + s], [sx * -0.03, 0.07, 0.02]); cyl(V.add(sp, [0, 0, -0.08]), V.add(sp, [0, 0, 0.1]), 0.045, C3.pad, 12, 1); }
      const ft = V.mul(V.add(JA.anR, JA.anL), 0.5); slab([0, 0.12, ft[2] - 0.22], [0, 0.04, ft[2] + 0.3], 0.62, C3.dark, 0.05); const dir = V.norm(V.sub(JA.neck, JA.pelvis)), base = [0, 0.05, JA.pelvis[2] - 0.32]; for (const sx of [-0.24, 0.24]) cyl([sx, base[1], base[2]], V.add([sx, base[1], base[2]], V.mul(dir, 2.0)), 0.025, C3.bar, 8, 1); }
    else if (pr.t === 'hippad') { const c = V.add(q.p, [0, 0.16, 0.06]); cyl([c[0] - 0.3, c[1], c[2]], [c[0] + 0.3, c[1], c[2]], 0.07, C3.pad, 14, 1); for (const sx of [-0.4, 0.4]) cyl([sx, 0, c[2]], [sx, c[1], c[2]], 0.025, C3.dark); cyl([-0.4, c[1], c[2]], [-0.3, c[1], c[2]], 0.025, C3.dark); cyl([0.3, c[1], c[2]], [0.4, c[1], c[2]], 0.025, C3.dark); }
    else if (pr.t === 'preacher') { slab(pr.a, pr.b, 0.5, C3.pad, 0.07); cyl([0, 0, (pr.a[2] + pr.b[2]) / 2], [0, Math.min(pr.a[1], pr.b[1]) - 0.08, (pr.a[2] + pr.b[2]) / 2], 0.03, C3.dark); }
    else if (pr.t === 'db') for (const s of ['R', 'L']) { const h = G[s], ax = GA[s], P = d => V.add(h, V.mul(ax, d)); cyl(P(-0.12), P(0.12), 0.017, C3.bar); for (const dz of [-0.12, 0.12]) cyl(P(dz - 0.035), P(dz + 0.035), 0.062, C3.dark, 14, 1); }
    else if (pr.t === 'kb') { ball([mid[0], mid[1] - 0.12, mid[2]], 0.1, C3.dark, 8, 12); cyl([mid[0] - 0.06, mid[1], mid[2]], [mid[0] + 0.06, mid[1], mid[2]], 0.015, C3.bar); }
    else if (pr.t === 'grips') for (const s of ['R', 'L']) { const h = G[s], ax = GA[s]; cyl(V.add(h, V.mul(ax, -0.09)), V.add(h, V.mul(ax, 0.09)), 0.017, C3.bar, 10, 1); }
    else if (pr.t === 'slab') { slab(pr.a, pr.b, pr.w, C3.pad); if (pr.legs) for (const e of [pr.a, pr.b]) cyl([e[0], e[1] - 0.04, e[2]], [e[0], 0, e[2]], 0.018, C3.dark); }
    else if (pr.t === 'fixbar') cyl([-0.6, pr.y, 0], [0.6, pr.y, 0], 0.017, C3.bar, 10, 1);
    else if (pr.t === 'rails') { if (pr.cross) cyl([-pr.x - 0.15, pr.y, pr.z], [pr.x + 0.15, pr.y, pr.z], 0.017, C3.bar, 10, 1); else for (const sx of [-1, 1]) { cyl([sx * pr.x, pr.y, -0.35], [sx * pr.x, pr.y, 0.35], 0.017, C3.bar, 10, 1); cyl([sx * pr.x, pr.y, -0.35], [sx * pr.x, 0, -0.35], 0.015, C3.dark); } }
    else if (pr.t === 'cable') { const to = pr.to ? J[pr.to] : mid; cyl(pr.a, to, 0.006, C3.cable, 6); if (pr.a[1] < 2) cyl([pr.a[0], 0, pr.a[2]], [pr.a[0], Math.max(pr.a[1], 0.3), pr.a[2]], 0.02, C3.dark); else cyl([pr.a[0] - 0.25, pr.a[1], pr.a[2]], [pr.a[0] + 0.25, pr.a[1], pr.a[2]], 0.022, C3.dark, 10, 1); }
    else if (pr.t === 'cable2') for (const [s, sx] of SIDES) { const a = [pr.a[0] * sx, pr.a[1], pr.a[2]]; cyl(a, G[s], 0.006, C3.cable, 6); cyl([a[0], 0, a[2]], a, 0.02, C3.dark); }
    else if (pr.t === 'plate') { const f = V.mul(V.add(J.toeR, J.toeL), 0.5), an = V.mul(V.add(J.anR, J.anL), 0.5), nn = V.norm(V.sub(f, an)), back = [0, -nn[2], nn[1]]; slab(V.add(an, V.mul(nn, -0.2)), V.add(an, V.mul(nn, 0.42)), 0.62, C3.pad, 0.04, V.mul(back, -0.085)); }
    else if (pr.t === 'wall') slab([0, 0, pr.z - 0.12], [0, 1.8, pr.z - 0.12], 1.0, [0.12, 0.125, 0.16], 0.04);
  }
  return { data: new Float32Array(o), nFlat };
}
function g3Draw(cv, G, def, t, yawDeg, cycle) {
  const gl = G.gl, W = cv.width, H = cv.height, S = Math.min(W, H * 1.12) / (2 * def.r) * 0.96, q = def.qAt ? def.qAt(t) : animPose(def, t, cycle), J = animJoints(q, def.build);
  const ya = yawDeg * Math.PI / 180, pa = 11 * Math.PI / 180, cy = Math.cos(ya), sy = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa), kx = S / (W / 2), ky = S / (H / 2), kz = 0.25, c = def.c;
  // view rows: x1 = x cy - z sy ; y1 = y cp - (x sy + z cy) sp ; z2 = y sp + (x sy + z cy) cp
  const r0 = [cy, 0, -sy], r1 = [-sy * sp, cp, -cy * sp], r2 = [sy * cp, sp, cy * cp], tx = -(r0[0] * c[0] + r0[1] * c[1] + r0[2] * c[2]), ty = -(r1[0] * c[0] + r1[1] * c[1] + r1[2] * c[2]), tz = -(r2[0] * c[0] + r2[1] * c[1] + r2[2] * c[2]);
  const vp = new Float32Array([r0[0] * kx, r1[0] * ky, -r2[0] * kz, 0, r0[1] * kx, r1[1] * ky, -r2[1] * kz, 0, r0[2] * kx, r1[2] * ky, -r2[2] * kz, 0, tx * kx, ty * ky - 0.04, -tz * kz, 1]);
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.uniformMatrix4fv(G.u.vp, false, vp); gl.uniformMatrix3fv(G.u.vr, false, new Float32Array([r0[0], r1[0], r2[0], r0[1], r1[1], r2[1], r0[2], r1[2], r2[2]]));
  // equipment + floor
  const pg = propGeo(def, q, J, G.m), a = G.a, F = 36;
  gl.bindBuffer(gl.ARRAY_BUFFER, G.b.prop); gl.bufferData(gl.ARRAY_BUFFER, pg.data, gl.DYNAMIC_DRAW);
  for (const k of ['pos', 'nrm', 'col']) gl.enableVertexAttribArray(a[k]); for (const k of ['bi', 'bw', 'ex']) if (a[k] >= 0) gl.disableVertexAttribArray(a[k]);
  gl.vertexAttribPointer(a.pos, 3, gl.FLOAT, false, F, 0); gl.vertexAttribPointer(a.nrm, 3, gl.FLOAT, false, F, 12); gl.vertexAttribPointer(a.col, 3, gl.FLOAT, false, F, 24);
  gl.uniform1f(G.u.skin, 0); gl.uniform1f(G.u.flat, 1); gl.depthMask(false); gl.drawArrays(gl.TRIANGLES, 0, pg.nFlat); gl.depthMask(true);
  gl.uniform1f(G.u.flat, 0); gl.drawArrays(gl.TRIANGLES, pg.nFlat, pg.data.length / 9 - pg.nFlat);
  // body
  gl.uniformMatrix4fv(G.u.bones, false, boneMats(J, G.m, G.bones, def.hands)); gl.uniform1f(G.u.skin, 1); gl.uniform2fv(G.u.shorts, G.cloth.shorts); gl.uniform4fv(G.u.top, G.cloth.top);
  const bind = (b, loc, n) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
  bind(G.b.pos, a.pos, 3); bind(G.b.nrm, a.nrm, 3); bind(G.b.ex, a.ex, 3); bind(G.b.bi, a.bi, 4); bind(G.b.bw, a.bw, 4); if (a.col >= 0) { gl.disableVertexAttribArray(a.col); gl.vertexAttrib3f(a.col, 0.8, 0.8, 0.8); }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.b.idx); gl.drawElements(gl.TRIANGLES, G.nIdx, gl.UNSIGNED_SHORT, 0);
}
