// Stick-figure exercise animations, drawn as SVG and tweened between two poses.
// Angles are degrees. Limbs: 0 = straight down, 90 = forward (right), 180 = up, -90 = back.
// Torso: 0 = upright, positive leans forward, -90 lies flat with the head to the left.

const LEN = { torso: 50, neck: 13, head: 9, ua: 28, fa: 26, th: 38, sh: 36, foot: 12 };
const FLOOR = 156, ANK = 152;
export const VIEWBOX = '0 -44 200 210';
const rad = (a) => (a * Math.PI) / 180;
const dir = (a, l) => [Math.sin(rad(a)) * l, Math.cos(rad(a)) * l];
const dirL = (a, l) => [-Math.sin(rad(a)) * l, Math.cos(rad(a)) * l];
const tvec = (t, l) => [Math.sin(rad(t)) * l, -Math.cos(rad(t)) * l];
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
const sub = (p, v) => [p[0] - v[0], p[1] - v[1]];
const f = (n) => n.toFixed(1);

// Two-link IK: elbow position for a hand at W. bend picks the solution: down/up/back/front/out/in.
function ik(S, W, bend, mirror = false) {
  const a = LEN.ua, b = LEN.fa;
  const dx = W[0] - S[0], dy = W[1] - S[1];
  const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
  const th = Math.atan2(dy, dx), al = Math.acos((a * a + d * d - b * b) / (2 * a * d));
  const c = [th + al, th - al].map((x) => [S[0] + a * Math.cos(x), S[1] + a * Math.sin(x)]);
  const key = { down: (e) => e[1], up: (e) => -e[1], front: (e) => e[0], back: (e) => -e[0], out: (e) => (mirror ? -e[0] : e[0]), in: (e) => (mirror ? e[0] : -e[0]) }[bend || 'down'];
  return key(c[0]) >= key(c[1]) ? c[0] : c[1];
}

function sideGeom(p) {
  const tl = p.tl ?? LEN.torso, r = p.rel ? p.t : 0;
  const ua = p.ua + r, fa = p.fa + r, ua2 = (p.ua2 ?? p.ua) + r, fa2 = (p.fa2 ?? p.fa) + r;
  const foot = p.foot ?? 90;
  const [k, at] = p.anchor;
  let H;
  if (k === 'hip') H = at;
  else if (k === 'ankle') H = sub(sub(at, dir(p.sh, LEN.sh)), dir(p.th, LEN.th));
  else if (k === 'toe') H = sub(sub(sub(at, dir(foot, LEN.foot)), dir(p.sh, LEN.sh)), dir(p.th, LEN.th));
  else H = sub(sub(sub(at, dir(fa, LEN.fa)), dir(ua, LEN.ua)), tvec(p.t, tl));
  const S = add(H, tvec(p.t, tl));
  let E = add(S, dir(ua, LEN.ua)), W = add(E, dir(fa, LEN.fa));
  if (p.hand) { W = add(S, p.hand); E = ik(S, W, p.bend); }
  else if (p.uh != null) { E = add(S, [Math.cos(rad(p.uh)) * LEN.ua, 0]); W = add(E, dir(fa, LEN.fa)); }
  let E2 = add(S, dir(ua2, LEN.ua)), W2 = add(E2, dir(fa2, LEN.fa));
  if (p.hand || p.uh != null) { E2 = E; W2 = W; }
  const K = add(H, dir(p.th, LEN.th)), A = add(K, dir(p.sh, LEN.sh)), T = add(A, dir(foot, LEN.foot));
  const th2 = p.th2 ?? p.th, sh2 = p.sh2 ?? p.sh;
  const K2 = add(H, dir(th2, LEN.th)), A2 = add(K2, dir(sh2, LEN.sh)), T2 = add(A2, dir(p.foot2 ?? foot, LEN.foot));
  const head = add(S, tvec(p.t, LEN.neck));
  return { H, S, E, W, E2, W2, K, A, T, K2, A2, T2, head, t: p.t };
}

function frontGeom(p) {
  const tl = p.tl ?? LEN.torso, sy = p.sy ?? 0;
  const ua = p.ua, fa = p.fa;
  let H;
  const [k, at] = p.anchor;
  if (k === 'hip') H = at;
  else if (k === 'ankle') H = add(sub(sub(at, dirL(p.sh, LEN.sh)), dirL(p.th, LEN.th)), [8, 0]);
  else H = add(sub(sub(sub(at, dirL(fa, LEN.fa)), dirL(ua, LEN.ua)), [0, sy]), [14, tl]);
  const S = [H[0], H[1] - tl];
  const SL = [S[0] - 14, S[1] + sy], SR = [S[0] + 14, S[1] + sy];
  const HL = [H[0] - 8, H[1]], HR = [H[0] + 8, H[1]];
  let EL, ER, WL, WR;
  if (p.arc != null) {
    const P = add([S[0], S[1] + sy], dir(p.arc, 50));
    WL = WR = P; EL = [(SL[0] + P[0]) / 2, (SL[1] + P[1]) / 2]; ER = [(SR[0] + P[0]) / 2, (SR[1] + P[1]) / 2];
  } else if (p.hand) {
    WR = add(SR, p.hand); WL = add(SL, [-p.hand[0], p.hand[1]]);
    ER = ik(SR, WR, p.bend); EL = ik(SL, WL, p.bend, true);
  } else if (p.fh != null) {
    // Elbow pinned at the side, forearm rotating in a horizontal plane (seen end-on at 0).
    ER = add(SR, [2, LEN.ua]); WR = add(ER, [Math.sin(rad(p.fh)) * LEN.fa, 0]);
    EL = add(SL, [-2, LEN.ua]); WL = add(EL, [0, LEN.fa]);
  } else if (p.ah != null) {
    // Straight arms at shoulder height swinging in a horizontal plane.
    const x = Math.sin(rad(p.ah)) * (LEN.ua + LEN.fa);
    WR = add(SR, [x, 0]); WL = add(SL, [-x, 0]);
    ER = add(SR, [x / 2, 0]); EL = add(SL, [-x / 2, 0]);
  } else {
    EL = add(SL, dirL(ua, LEN.ua)); WL = add(EL, dirL(fa, LEN.fa));
    ER = add(SR, dir(ua, LEN.ua)); WR = add(ER, dir(fa, LEN.fa));
  }
  const KL = add(HL, dirL(p.th, LEN.th)), AL = add(KL, dirL(p.sh, LEN.sh));
  const KR = add(HR, dir(p.th, LEN.th)), AR = add(KR, dir(p.sh, LEN.sh));
  const head = [S[0], S[1] - LEN.neck + (p.headDrop ?? 0)];
  return { H, S, SL, SR, EL, ER, WL, WR, HL, HR, KL, KR, AL, AR, head };
}

// Lying on a bench, seen from the feet.
function endGeom(p) {
  const SL = [72, 104], SR = [128, 104];
  const EL = add(SL, dirL(p.ua, LEN.ua)), WL = add(EL, dirL(p.fa, LEN.fa));
  const ER = add(SR, dir(p.ua, LEN.ua)), WR = add(ER, dir(p.fa, LEN.fa));
  return { SL, SR, EL, ER, WL, WR };
}

const line = (a, b, cls = 'limb') => `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`;
const poly = (pts, cls = 'limb') => `<polyline class="${cls}" points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}"/>`;
const circ = (c, r, cls) => `<circle class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" r="${r}"/>`;

function equipment(eq, g, def) {
  const pt = (k) => (typeof k === 'string' ? g[k] : k);
  return eq.map((e) => {
    switch (e.k) {
      case 'plate': return circ(pt(e.at || 'W'), e.r || 16, 'plate') + circ(pt(e.at || 'W'), 2.5, 'hub');
      case 'db': return [e.at || ['W']].flat().map((k) => circ(pt(k), e.r || 6, 'db')).join('');
      case 'barH': {
        const a = g.WL, b = g.WR, ext = 30;
        const L = [a[0] - ext, a[1]], R = [b[0] + ext, b[1]];
        return line(L, R, 'bar') + `<rect class="plate-f" x="${f(L[0] - 3)}" y="${f(L[1] - 17)}" width="7" height="34" rx="2"/><rect class="plate-f" x="${f(R[0] - 4)}" y="${f(R[1] - 17)}" width="7" height="34" rx="2"/>`;
      }
      case 'cable': return line(pt(e.from), pt(e.to || 'W'), e.band ? 'band' : 'cable');
      case 'line': return poly(e.pts.map(pt), e.cls || 'static');
      case 'rect': return `<rect class="${e.cls || 'static-f'}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="2"/>`;
      case 'dot': return circ(pt(e.at), e.r || 3, e.cls || 'bar-end');
      case 'pad': {
        // Bench pad under the torso (side view), plus legs to the floor.
        const v = tvec(g.t, 1), n = [v[1], -v[0]];
        const o = (p, d) => add(p, [n[0] * d, n[1] * d]);
        const a = o(add(g.H, [-v[0] * (e.back ?? 14), -v[1] * (e.back ?? 14)]), 8);
        const b = o(add(g.S, [v[0] * 10, v[1] * 10]), 8);
        const legs = (e.legs || []).map((x) => line([x, Math.max(a[1], b[1]) + 2], [x, FLOOR], 'static')).join('');
        return legs + line(a, b, 'pad');
      }
      default: return '';
    }
  }).join('');
}

function drawSide(g, def) {
  return line(g.H, g.K2, 'limb far') + line(g.K2, g.A2, 'limb far') + line(g.A2, g.T2, 'limb far')
    + (def.oneArm ? '' : line(g.S, g.E2, 'limb far') + line(g.E2, g.W2, 'limb far'))
    + line(g.H, g.S, 'torso') + circ(g.head, LEN.head, 'head')
    + line(g.H, g.K) + line(g.K, g.A) + line(g.A, g.T) + line(g.S, g.E) + line(g.E, g.W);
}

function drawFront(g) {
  return line(g.HL, g.KL) + line(g.KL, g.AL) + line(g.HR, g.KR) + line(g.KR, g.AR)
    + `<polygon class="trunk" points="${[g.SL, g.SR, g.HR, g.HL].map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}"/>`
    + circ(g.head, LEN.head, 'head')
    + line(g.SL, g.EL) + line(g.EL, g.WL) + line(g.SR, g.ER) + line(g.ER, g.WR);
}

function drawEnd(g) {
  return '<rect class="static-f" x="60" y="112" width="80" height="8" rx="2"/>' + line([80, 120], [80, FLOOR], 'static') + line([120, 120], [120, FLOOR], 'static')
    + `<rect class="trunk" x="72" y="100" width="56" height="12" rx="5"/>` + circ([100, 96], LEN.head, 'head')
    + line(g.SL, g.EL) + line(g.EL, g.WL) + line(g.SR, g.ER) + line(g.ER, g.WR);
}

const DEFAULTS = { sy: 0, foot: 90, headDrop: 0 };
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
function lerpPose(a, b, x) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    const av = a[k] ?? DEFAULTS[k];
    if (typeof b[k] === 'number' && typeof av === 'number') out[k] = av + (b[k] - av) * x;
    else if (Array.isArray(b[k]) && Array.isArray(a[k]) && k !== 'anchor') out[k] = b[k].map((v, i) => a[k][i] + (v - a[k][i]) * x);
    else if (k === 'anchor' && a.anchor && b.anchor) out.anchor = [b.anchor[0], [a.anchor[1][0] + (b.anchor[1][0] - a.anchor[1][0]) * x, a.anchor[1][1] + (b.anchor[1][1] - a.anchor[1][1]) * x]];
    else if (!(k in a)) out[k] = b[k];
  }
  return out;
}

export function frameSVG(def, x) {
  const p = lerpPose(def.a, def.b, ease(x));
  const view = def.view || 'side';
  const g = view === 'front' ? frontGeom(p) : view === 'end' ? endGeom(p) : sideGeom(p);
  const before = equipment((def.eq || []).filter((e) => e.behind || e.k === 'pad' || e.k === 'rect' || e.k === 'line'), g, def);
  const after = equipment((def.eq || []).filter((e) => !(e.behind || e.k === 'pad' || e.k === 'rect' || e.k === 'line')), g, def);
  const body = view === 'front' ? drawFront(g) + (p.fh != null || p.ah != null ? circ(g.WL, 3.5, 'hand') + circ(g.WR, 3.5, 'hand') : '') : view === 'end' ? drawEnd(g) : drawSide(g, def);
  const floor = def.floor === false ? '' : `<line class="floor" x1="4" y1="${FLOOR}" x2="196" y2="${FLOOR}"/>`;
  const out = `${floor}${before}${body}${after}`;
  return def.zoom ? `<g transform="translate(100 62) scale(${def.zoom}) translate(-100 -50)">${out}</g>` : out;
}

// Hold start, move (lift), hold, return slowly.
const PHASES = [0.4, 1.0, 0.4, 1.6];
const CYCLE = PHASES.reduce((a, b) => a + b, 0);
function progress(t) {
  let s = t % CYCLE;
  if ((s -= PHASES[0]) < 0) return 0;
  if (s < PHASES[1]) return s / PHASES[1];
  if ((s -= PHASES[1]) < PHASES[2]) return 1;
  s -= PHASES[2];
  return 1 - s / PHASES[3];
}

export function mountAnimation(el, id) {
  const def = ANIM[id];
  if (!def) return () => {};
  el.innerHTML = `<svg class="anim" viewBox="${VIEWBOX}" role="img" aria-label="Animation of the movement"><g></g></svg>${def.view === 'end' ? '<p class="muted small center">Seen from your feet, lying on the bench</p>' : ''}`;
  const gEl = el.querySelector('g');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let raf, start = performance.now();
  const step = (now) => {
    gEl.innerHTML = frameSVG(def, progress((now - start) / 1000));
    if (!reduce) raf = requestAnimationFrame(step);
  };
  step(start + PHASES[0] * 1000);
  return () => cancelAnimationFrame(raf);
}

// ---------- poses ----------

const STAND = { anchor: ['ankle', [100, ANK]], t: 0, th: 0, sh: 0, ua: 0, fa: 0 };
const FRONT = { anchor: ['ankle', [88, ANK]], th: 3, sh: 3, ua: 8, fa: 8 };
const LIE = { anchor: ['hip', [128, 106]], t: -90, th: 68, sh: 2 };
const INC = { anchor: ['hip', [118, 118]], t: -55, th: 88, sh: 2 };
const SEAT = { anchor: ['hip', [78, 118]], t: 0, th: 90, sh: 18 };
const BACK_BAR = { rel: true, ua: -55, fa: 165 };
const benchPad = { k: 'pad', legs: [60, 130] };
const incPad = { k: 'pad', back: 4, legs: [80, 128] };
const seat = { k: 'rect', x: 56, y: 122, w: 46, h: 6, cls: 'static-f' };
const seatLeg = { k: 'line', pts: [[79, 128], [79, FLOOR]] };

const POST_L = { k: 'rect', x: 2, y: 20, w: 4, h: 136, cls: 'static-f' };
const POST_R = { k: 'rect', x: 194, y: 20, w: 4, h: 136, cls: 'static-f' };
const bench = (arms, eq = [{ k: 'plate', r: 15 }]) => ({ a: { ...LIE, ...arms[0] }, b: { ...LIE, ...arms[1] }, eq: [benchPad, ...eq] });
const incline = (eq) => ({ a: { ...INC, hand: [0, -53] }, b: { ...INC, hand: [13, -16] }, eq: [incPad, ...eq] });
const lyingExt = { a: { ...LIE, ua: 196, fa: 196 }, b: { ...LIE, ua: 196, fa: 290 }, eq: [benchPad, { k: 'plate', r: 12 }] };
const overheadExt = (rope) => ({
  a: { ...STAND, t: 30, th: 12, sh: -4, th2: -14, sh2: -8, ua: 150, fa: -50 },
  b: { ...STAND, t: 30, th: 12, sh: -4, th2: -14, sh2: -8, ua: 150, fa: -210 },
  eq: [{ k: 'cable', from: [8, 6] }, ...(rope ? [{ k: 'dot', at: 'W', r: 3.5, cls: 'db' }] : [])],
});
const deadlift = (start, r = 20) => ({ a: { ...STAND, ...start }, b: STAND, eq: [{ k: 'plate', r }] });

export const ANIM = {
  'band-external-rotation': { view: 'front', zoom: 1.7, a: { ...FRONT, fh: -75 }, b: { ...FRONT, fh: 70 }, eq: [{ k: 'cable', from: [6, 57], to: 'WR', band: true, behind: true }, POST_L] },
  'band-internal-rotation': { view: 'front', zoom: 1.7, a: { ...FRONT, fh: 70 }, b: { ...FRONT, fh: -75 }, eq: [{ k: 'cable', from: [194, 57], to: 'WR', band: true, behind: true }, POST_R] },
  'band-pull-apart': { view: 'front', zoom: 1.7, a: { ...FRONT, ah: 12 }, b: { ...FRONT, ah: 88 }, eq: [{ k: 'cable', from: 'WL', to: 'WR', band: true }] },
  'band-face-pull': {
    a: { ...STAND, uh: 0, fa: 90 }, b: { ...STAND, uh: 108, fa: 172 },
    eq: [{ k: 'cable', from: [194, 26], band: true }, POST_R],
  },
  'barbell-bench-press': bench([{ hand: [6, -53] }, { hand: [14, -18] }]),
  'barbell-close-grip-bench-press': bench([{ hand: [6, -53] }, { hand: [12, -18] }]),
  'barbell-incline-bench-press': incline([{ k: 'plate', r: 15 }]),
  'barbell-close-grip-incline-bench-press': incline([{ k: 'plate', r: 15 }]),
  'dumbbell-incline-bench-press': incline([{ k: 'db' }]),
  'barbell-squat': { a: { ...STAND, ...BACK_BAR }, b: { ...STAND, ...BACK_BAR, th: 82, sh: -28, t: 38 }, eq: [{ k: 'plate', r: 12 }] },
  'barbell-deadlift': deadlift({ t: 55, th: 72, sh: -20 }),
  'hex-bar-deadlift': deadlift({ t: 38, th: 66, sh: -18 }, 18),
  'barbell-romanian-deadlift': { a: STAND, b: { ...STAND, t: 72, th: 22, sh: -8 }, eq: [{ k: 'plate', r: 18 }] },
  'barbell-bent-over-row': { a: { ...STAND, t: 58, th: 28, sh: -12, ua: 0, fa: 0 }, b: { ...STAND, t: 58, th: 28, sh: -12, ua: -62, fa: 8 }, eq: [{ k: 'plate', r: 16 }] },
  'barbell-shrug': { view: 'front', a: { ...FRONT, ua: 4, fa: 4, sy: 0 }, b: { ...FRONT, ua: 4, fa: 4, sy: -11 }, eq: [{ k: 'barH' }] },
  'barbell-curl': { a: { ...STAND, ua: 2, fa: 2 }, b: { ...STAND, ua: 8, fa: 158 }, eq: [{ k: 'plate', r: 14 }] },
  'dumbbell-hammer-curl': { a: { ...STAND, ua: 2, fa: 2 }, b: { ...STAND, ua: 8, fa: 158 }, eq: [{ k: 'db' }] },
  'barbell-lying-tricep-extension': lyingExt,
  'ez-bar-lying-tricep-extension': lyingExt,
  'barbell-standing-calf-raise': {
    a: { ...STAND, ...BACK_BAR, anchor: ['toe', [112, ANK + 2]], foot: 90 },
    b: { ...STAND, ...BACK_BAR, anchor: ['toe', [112, ANK + 2]], foot: 48 }, eq: [{ k: 'plate', r: 12 }],
  },
  'barbell-overhead-press': { a: { ...STAND, hand: [13, 0], bend: 'down' }, b: { ...STAND, hand: [3, -53], bend: 'front' }, eq: [{ k: 'plate', r: 14 }] },
  'inverted-row': {
    floor: true,
    a: { anchor: ['ankle', [182, ANK]], t: -84, th: 84, sh: 84, ua: 180, fa: 180, foot: 0 },
    b: { anchor: ['ankle', [182, ANK]], t: -70, th: 70, sh: 70, ua: 120, fa: -118, foot: 0 },
    eq: [{ k: 'dot', at: 'W', r: 4 }],
  },
  'single-arm-landmine-press': {
    oneArm: true,
    a: { ...STAND, t: 8, th: 10, sh: 0, th2: -20, sh2: -6, ua: 22, fa: 160, ua2: 0, fa2: 10 },
    b: { ...STAND, t: 8, th: 10, sh: 0, th2: -20, sh2: -6, ua: 135, fa: 135, ua2: 0, fa2: 10 },
    eq: [{ k: 'cable', from: [14, FLOOR - 2] }, { k: 'plate', r: 12 }],
  },
  'landmine-row': {
    a: { ...STAND, t: 62, th: 30, sh: -12 }, b: { ...STAND, t: 62, th: 30, sh: -12, ua: -55, fa: 12 },
    eq: [{ k: 'cable', from: [196, FLOOR - 2] }, { k: 'plate', r: 13 }],
  },
  'landmine-squat': {
    a: { ...STAND, rel: true, ua: 18, fa: 150 }, b: { ...STAND, rel: true, ua: 18, fa: 150, th: 82, sh: -28, t: 30 },
    eq: [{ k: 'cable', from: [196, FLOOR - 2] }, { k: 'plate', r: 12 }],
  },
  'landmine-twist': { view: 'front', a: { ...FRONT, arc: -38 }, b: { ...FRONT, arc: -322 }, eq: [{ k: 'cable', from: [100, FLOOR - 2], to: 'WL', behind: true }, { k: 'plate', at: 'WL', r: 11 }] },
  'dumbbell-lateral-raise': { view: 'front', a: { ...FRONT, ua: 10, fa: 12 }, b: { ...FRONT, ua: 84, fa: 88 }, eq: [{ k: 'db', at: ['WL', 'WR'] }] },
  'dumbbell-rear-delt-fly': { view: 'front', a: { ...FRONT, tl: 30, headDrop: 14, th: 6, sh: 0, ua: 4, fa: 4 }, b: { ...FRONT, tl: 30, headDrop: 14, th: 6, sh: 0, ua: 80, fa: 82 }, eq: [{ k: 'db', at: ['WL', 'WR'] }] },
  'dumbbell-fly': { view: 'end', a: { ua: 206, fa: 202 }, b: { ua: 100, fa: 92 }, eq: [{ k: 'db', at: ['WL', 'WR'] }] },
  'cable-standing-fly': { view: 'front', a: { ...FRONT, ua: 96, fa: 102 }, b: { ...FRONT, ua: -24, fa: -14 }, eq: [{ k: 'cable', from: [6, 20], to: 'WL' }, { k: 'cable', from: [194, 20], to: 'WR' }] },
  'dumbbell-shoulder-press': { view: 'front', a: { ...FRONT, hand: [27, -24], bend: 'out' }, b: { ...FRONT, hand: [10, -53], bend: 'out' }, eq: [{ k: 'db', at: ['WL', 'WR'] }] },
  'pull-up': {
    view: 'front', floor: false,
    a: { anchor: ['hand', [57, 14]], th: 2, sh: 2, ua: 152, fa: 152 }, b: { anchor: ['hand', [57, 14]], th: 2, sh: 2, ua: 96, fa: 174 },
    eq: [{ k: 'line', pts: [[22, 14], [178, 14]], cls: 'bar' }],
  },
  'chin-up': {
    floor: false,
    a: { anchor: ['hand', [100, 12]], t: 0, th: 6, sh: -8, ua: 180, fa: 180 }, b: { anchor: ['hand', [100, 12]], t: 0, th: 6, sh: -8, ua: 34, fa: 172 },
    eq: [{ k: 'dot', at: [100, 12], r: 4 }],
  },
  'tricep-dip': {
    a: { anchor: ['hand', [104, 76]], t: 14, th: 12, sh: -62, ua: 0, fa: 0, foot: 30 }, b: { anchor: ['hand', [104, 76]], t: 22, th: 18, sh: -55, ua: -78, fa: 16, foot: 30 },
    eq: [{ k: 'rect', x: 84, y: 76, w: 42, h: 5, cls: 'static-f' }, { k: 'line', pts: [[120, 81], [120, FLOOR]] }],
  },
  'hanging-straight-leg-hip-raise': {
    floor: false,
    a: { anchor: ['hand', [110, 8]], t: 0, th: 0, sh: 0, ua: 90, fa: 180 }, b: { anchor: ['hand', [110, 8]], t: -10, th: 96, sh: 96, ua: 90, fa: 180, foot: 180 },
    eq: [{ k: 'line', pts: [[60, 8], [160, 8]], cls: 'bar' }, { k: 'cable', from: [110, 8], to: 'E', band: true }],
  },
  'machine-seated-row': {
    a: { ...SEAT, ua: 88, fa: 88 }, b: { ...SEAT, t: -6, ua: -28, fa: 84 },
    eq: [seat, seatLeg, { k: 'rect', x: 132, y: 116, w: 5, h: 40, cls: 'static-f' }, { k: 'cable', from: [196, 70] }],
  },
  'cable-tricep-pushdown-rope': { a: { ...STAND, t: 10, ua: 6, fa: 160 }, b: { ...STAND, t: 10, ua: 6, fa: 6 }, eq: [{ k: 'cable', from: [138, 4] }] },
  'cable-bent-over-tricep-extension-rope': overheadExt(true),
  'cable-bent-over-tricep-extension': overheadExt(false),
};
