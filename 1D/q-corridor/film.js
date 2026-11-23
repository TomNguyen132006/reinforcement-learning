// "Hành lang Q-learning" — Whiteboard Explainer. Numbers = real output of 1DGrid.py with random.seed(1) (see numbers.json / run_seed1.py).
import * as W from './engine/wb.js';
import { clamp, lerp, TAU, mulberry } from '/core/lib.js';

export const END = 100.5;
export const F = 1.12;   // global slow-down: every board time is stretched by F on output
const C = { ink: '#14181f', teal: '#0b7a6b', orange: '#a8470b', amber: '#8a5a00' };   // = the HTML demo's palette
const MINUS = '−';
const fmt = v => (v < 0 ? MINUS : '') + (Number.isInteger(v) ? Math.abs(v).toFixed(1) : Math.abs(v).toString());   // 5.0 like Python prints

export async function build() {
  await W.loadFont('tech', 'fonts/EMSTech.json');
  const num = await (await fetch('numbers.json')).json();
  const tl = new W.Timeline();
  const K = new W.Pen('black', C.ink, { park: [2200, 1320] });
  const G = new W.Pen('teal', C.teal, { park: [2350, 1150] });
  const O = new W.Pen('orange', C.orange, { park: [2100, 1420] });
  const A = new W.Pen('amber', C.amber, { park: [2250, 1250] });
  const PENS = [K, G, O, A];
  const T = W.text;
  const D = (pen, shapes, a, b, o = {}) => tl.draw(pen, shapes, a, { by: b, ...o });

  // ── layout (world units)
  const CY0 = 480, CH = 300, cx = i => 400 + 300 * i, CMY = CY0 + CH / 2;       // corridor: 5 cells x 300
  const TX = 2500, TC = [2565, 2770, 3050], rowTop = r => 190 + 100 * r;        // Q-table
  const baseY = r => rowTop(r) + 75;

  // ghost marks of old lessons
  const ghosts = [], gR = mulberry(9);
  for (let i = 0; i < 40; i++) {
    const x = gR() * 7600 + 200, y = gR() * 3000 + 100, k = gR(), o = { w: 12, alpha: .05 + gR() * .05, color: gR() < .2 ? '#8aa0c8' : '#9aa0a8' };
    if (k < .35) ghosts.push(...T(['a+b', 'f(x)', 'n=5', '→ 3', 'ok?', 'x²', 'Σ'][i % 7].replace('Σ', 'S'), x, y, { h: 50 + gR() * 40, ...o }));
    else if (k < .6) ghosts.push(W.circle(x, y, 40 + gR() * 100, o));
    else if (k < .8) ghosts.push(...W.arrow(x, y, x + (gR() - .5) * 500, y + (gR() - .5) * 300, o));
    else ghosts.push(W.line(x, y, x + 200 + gR() * 500, y + (gR() - .5) * 80, o));
  }

  // ═════════ A1 · the corridor (0–6.5)
  D(K, T('Q-learning', 250, 220, { h: 110, w: 12 }), .3, 2.2, { minGap: .03, maxGap: .08 });
  D(G, W.curve([[240, 262], [700, 252], [1180, 266]], { w: 12, over: 20 }), 2.25, 2.7);
  D(K, [...W.rect(250, CY0, 1500, CH, { w: 9 }), ...[1, 2, 3, 4].map(i => W.line(250 + 300 * i, CY0, 250 + 300 * i, CY0 + CH, { w: 7 }))], 2.3, 3.7);
  D(K, [0, 1, 2, 3, 4].flatMap(i => T(String(i), cx(i), CY0 - 40, { h: 60, w: 8, align: 'center' })), 3.75, 4.6);
  D(A, T('goal', cx(4), CY0 - 105, { h: 46, w: 7, align: 'center' }), 4.65, 5.1);
  D(K, T('?', 1790, CY0 - 40, { h: 110, w: 10 }), 6.7, 7.2);

  // ═════════ A2 · rules (6.5–14.4)
  D(K, [0, 1, 2, 3].flatMap(i => T(MINUS + '1', cx(i), CY0 + CH - 25, { h: 46, w: 7, align: 'center' })), 8.9, 10.5);
  D(A, T('+10', cx(4), CY0 + 105, { h: 80, w: 11, align: 'center' }), 10.6, 11.6);
  D(K, [W.line(238, CY0 - 10, 238, CY0 + CH + 10, { w: 24, bow: 0 }), ...[0, 1, 2, 3, 4].map(k => W.line(222, CY0 + 20 + k * 65, 176, CY0 + 70 + k * 65, { w: 7 }))], 12.0, 12.8);

  // ═════════ B1 · the Q-table, all zero (14.4–24.5)
  const tabLines = [...W.rect(TX, 100, 690, 590, { w: 9 }), W.line(TX, 190, TX + 690, 190, { w: 8 }),
    ...[1, 2, 3, 4].map(r => W.line(TX, rowTop(r), TX + 690, rowTop(r), { w: 6 })),
    W.line(2630, 100, 2630, 690, { w: 7 }), W.line(2910, 100, 2910, 690, { w: 7 })];
  D(K, tabLines, 15.3, 17.0);
  D(K, [...T('cell', TC[0], 165, { h: 38, w: 6, align: 'center' }), ...T('left', TC[1], 167, { h: 44, w: 7, align: 'center' }), ...T('right', TC[2], 167, { h: 44, w: 7, align: 'center' })], 17.0, 18.0);
  D(K, [0, 1, 2, 3, 4].flatMap(r => T(String(r), TC[0], baseY(r), { h: 50, w: 8, align: 'center' })), 18.0, 18.8);
  const zeros = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) zeros.push(...T('0', TC[1 + c], baseY(r), { h: 50, w: 8, align: 'center' }));
  D(G, zeros, 18.8, 19.9);
  D(K, T('tie', 2130, 330, { h: 50, w: 8 }), 20.1, 20.5);
  D(K, T('→ left', 2230, 330, { h: 50, w: 8 }), 20.5, 21.1);
  D(K, W.arrow(2440, 305, 2660, 250, { w: 7, head: 22, curve: [2540, 280] }), 21.2, 21.7);
  D(K, T('first = left', 2130, 420, { h: 40, w: 7 }), 21.9, 23.0);

  // ═════════ C1 · parameters + exploration (24.5–30.4)
  D(K, T('α = 0.5   γ = 0.9   ε = 0.7', 3960, 250, { h: 80, w: 10 }), 25.4, 27.2, { minGap: .02, maxGap: .06 });
  const sq = k => [4000 + 110 * k, 340];
  for (let k = 0; k < 10; k++) {
    const [x, y] = sq(k), pen = k < 7 ? O : G;
    D(pen, [...W.rect(x, y, 100, 90, { w: 7, over: 3 }), W.poly([[x + 12, y + 12], [x + 88, y + 26], [x + 12, y + 42], [x + 88, y + 58], [x + 12, y + 72], [x + 88, y + 82]], { w: 6, alpha: .7, jitter: .5 })], 27.3 + k * .15, 27.3 + k * .15 + .14);
  }
  D(O, T('explore 70%', 4000, 530, { h: 44, w: 7 }), 28.9, 29.4);
  D(G, T('max Q 30%', 4790, 530, { h: 44, w: 7 }), 29.45, 29.95);
  D(K, T('200 episodes', 3960, 700, { h: 80, w: 10 }), 30.0, 30.9);

  // ═════════ C2 · the update rule (31.6–36.4)
  D(K, T('Q += α × (target ' + MINUS + ' Q)', 3960, 850, { h: 80, w: 10 }), 32.2, 33.8, { minGap: .02, maxGap: .06 });
  D(G, T('target = reward + γ × max Q(next)', 3960, 980, { h: 56, w: 8 }), 33.9, 35.4);
  D(A, T('at the goal: target = reward', 3960, 1100, { h: 56, w: 8 }), 35.5, 36.4);

  // ═════════ B2 · first update, ep 1 snapshot (48.6–47)
  const U1y = 800, U2y = 910;
  const p1 = T('Q[3][right] = 0 + 0.5 × (10 ' + MINUS + ' 0) =', TX, U1y, { h: 50, w: 7 });
  D(K, p1, 50.4, 53.8);
  D(G, T('5', TX + p1.width + 24, U1y + 8, { h: 80, w: 12 }), 53.9, 54.5);
  D(G, W.roundRect(2915, 495, 270, 90, 14, { w: 9 }), 54.6, 55.0);
  tl.cue(54.0, 'ding', { k: 0 });
  const snap = (t0, vals, tag, tagErase) => {                       // erase the table body (a ghost stays), write the real numbers
    tl.erase(W.zigzag(2640, 200, 540, 390, 6), t0, 1.0, { width: 120, strength: .9 });
    if (tagErase) tl.erase([[TX - 10, 45], [TX + 440, 45]], t0, .5, { width: 70, strength: .9 });
    const out = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) out.push(...T(fmt(vals[r][c]), TC[1 + c], baseY(r), { h: 50, w: 8, align: 'center', color: C.teal }));
    D(G, out, t0 + 1.15, t0 + 2.6);
    D(K, T(tag, TX, 70, { h: 34, w: 6 }), t0 + 1.0, t0 + 2.0);
  };
  snap(55.4, num.table1, 'after episode 1', false);

  // ═════════ B3 · second update, ep 2 snapshot (58.3–54)
  const q1 = T('Q[3][right] = 5 + 0.5 × (10 ' + MINUS + ' 5) =', TX, U2y, { h: 50, w: 7 });
  D(K, q1, 58.4, 61.5);
  D(G, T('7.5', TX + q1.width + 24, U2y + 8, { h: 80, w: 12 }), 61.6, 62.3);
  tl.cue(61.9, 'ding', { k: 1 });
  // eraser clears old body + old tag; then ep 2 numbers
  tl.erase(W.zigzag(2640, 200, 540, 390, 6), 62.6, 1.0, { width: 120, strength: .9 });
  tl.erase([[TX - 10, 70 - 14], [TX + 440, 70 - 14]], 62.6, .5, { width: 70, strength: .9 });
  {
    const out = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) out.push(...T(fmt(num.table2[r][c]), TC[1 + c], baseY(r), { h: 50, w: 8, align: 'center', color: C.teal }));
    D(G, out, 63.75, 64.9);
    D(K, T('after episode 2', TX, 70, { h: 34, w: 6 }), 63.65, 64.6);
  }

  // ═════════ E · greedy test runs: the AI walks by itself after the updates (66.3–81.2)
  const EX = 6100, ex = i => EX + 95 + 190 * i, EY = 230, EH = 130, EMY = EY + EH / 2;
  D(K, T('greedy test', EX, 150, { h: 70, w: 9 }), 66.6, 67.5);
  D(K, W.curve([[EX - 10, 178], [EX + 360, 172], [EX + 700, 182]], { w: 8 }), 67.55, 67.8);
  D(K, [...W.rect(EX, EY, 950, EH, { w: 8 }), ...[1, 2, 3, 4].map(i => W.line(EX + 190 * i, EY, EX + 190 * i, EY + EH, { w: 6 }))], 67.9, 68.7);
  const RUNS = [{ ep: 1, stuck: 1, t0: 69.5, n: 50, dt: .048 }, { ep: 2, t0: 72.9, dt: .45, dur: .42 }, { ep: 3, t0: 76.1, dt: .30, dur: .27 }, { ep: 8, t0: 78.6, dt: .30, dur: .27 }];
  const RESETS = [[75.7, 76.0], [78.2, 78.5]];
  const rowsE = [
    { ep: 1, y: 540, path: 'stuck at 0   50 steps', r: num.test[0].right, ok: false, t: 72.0 },
    { ep: 2, y: 660, path: '0→1→2→3→4   4 steps', r: num.test[1].right, ok: true, t: 74.8 },
    { ep: 3, y: 780, path: '0→1→2→3→4   4 steps', r: num.test[2].right, ok: true, t: 77.4 },
    { ep: 8, y: 960, path: '0→1→2→3→4   4 steps', r: num.test[7].right, ok: true, t: 79.9 },
  ];
  for (const R of rowsE) {
    if (R.ep === 8) D(K, T('...', EX + 20, 900, { h: 46, w: 9 }), 78.2, 78.45);   // K must draw it before the ep 8 row
    const l1 = T('ep ' + R.ep + '   ' + R.path, EX, R.y, { h: 46, w: 7 });
    D(K, l1, R.t, R.t + .6);
    if (R.ok) D(G, T('✓', EX + l1.width + 30, R.y, { h: 46, w: 9 }), R.t + .6, R.t + .75);
    D(G, T('right: ' + R.r.map(fmt).join('   '), EX, R.y + 56, { h: 34, w: 6 }), R.t + .75, R.t + 1.2, { speed: 1800 });
  }
  tl.cue(68.9, 'magnet');
  for (const r of RUNS) {
    if (r.stuck) { for (let k = 0; k < r.n; k += 5) tl.cue(r.t0 + k * r.dt, 'bump'); }
    else { for (let i = 0; i < 4; i++) tl.cue(r.t0 + i * r.dt + r.dur * .85, 'estep', { k: i }); tl.cue(r.t0 + 3 * r.dt + r.dur + .05, 'egoal'); }
  }
  const aiE = t => {                                                  // the mini AI of the greedy test
    if (t < 68.9 || t > 81.3) return null;
    let x = ex(0), lift = 0, ep = 1, k = 0, show = false;
    if (t < 69.4) lift = (1 - (t - 68.9) / .5) ** 2;
    for (const r of RUNS) {
      if (t < r.t0) break; ep = r.ep; show = true; x = ex(0); k = 0;
      if (r.stuck) { const e = r.t0 + r.n * r.dt; if (t < e) { const q = (t - r.t0) / r.dt; k = Math.floor(q) + 1; x = ex(0) - 16 * Math.sin(Math.PI * Math.min(1, (q % 1) * 1.4)); } else k = r.n; }
      else for (let i = 0; i < 4; i++) { const s0 = r.t0 + i * r.dt; if (t >= s0) { k = i + 1; const u = clamp((t - s0) / r.dur), e = u * u * (3 - 2 * u); x = lerp(ex(i), ex(i + 1), e); lift = Math.sin(Math.PI * u) * .3; } }
    }
    for (const [a, b] of RESETS) if (t >= a && t < b) { const u = (t - a) / (b - a), e = u * u * (3 - 2 * u); x = lerp(ex(4), ex(0), e); lift = Math.sin(Math.PI * u) * .5; show = false; }
    return { x, y: EMY, lift, ep, k, show };
  };

  // ═════════ A3 · the value flows backward (66–74)
  const vy = 930;
  D(G, T('right', 60, vy - 25, { h: 44, w: 7 }), 82.9, 83.3);
  D(A, W.arrow(1540, 800, 1385, 850, { w: 7, head: 18, curve: [1480, 800] }), 83.2, 83.6);
  const vals = num.final_right;                                       // [4.58, 6.2, 8.0, 10.0] for cells 0..3
  const vText = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));
  D(G, T(vText(vals[3]), cx(3), vy, { h: 90, w: 12, align: 'center' }), 83.7, 84.6);
  tl.cue(84.6, 'ding', { k: 2 });
  const backs = [[3, 2, 84.8, 86.0], [2, 1, 86.4, 87.6], [1, 0, 88.0, 89.4]];
  for (const [a, b, t0, t1] of backs) {
    D(G, W.arrow(cx(a) - 40, vy + 35, cx(b) + 40, vy + 35, { w: 7, head: 20, curve: [(cx(a) + cx(b)) / 2, vy + 75] }), t0, t0 + .4);
    D(K, T('×0.9 ' + MINUS + ' 1', (cx(a) + cx(b)) / 2, vy + 130, { h: 34, w: 6, align: 'center' }), t0 + .4, t0 + .9);
    D(G, T(vText(vals[b]), cx(b), vy, { h: 90, w: 12, align: 'center' }), t0 + .95, t1);
    tl.cue(t1, 'ding', { k: 3 - b });
  }

  // ═════════ A4 · the clean walk + ending (74–100.5)
  D(A, [W.circle(cx(4), CMY, 185, { w: 9, a0: -1.6 }), W.circle(cx(4), CMY, 205, { w: 9, a0: -1.3 })], 94.8, 96.0);
  D(G, T('reward', 1000, 1235, { h: 140, w: 16, align: 'center' }), 96.3, 98.2, { minGap: .03, maxGap: .08 });
  D(G, [W.curve([[640, 1275], [1000, 1265], [1380, 1280]], { w: 12, over: 20 })], 98.3, 98.8);
  tl.end();

  // ═════════ TRAIN · random walk with ε = 0.7: the AI learns by wandering (real seed-1 episodes 1 and 2)
  const TR = [{ t0: 38.2, dt: .28, st: num.train['1'], ep: 1 }, { t0: 44.4, dt: .12, st: num.train['2'], ep: 2 }];
  const TRESET = [43.9, 44.2];
  for (const r of TR) {
    r.to = []; let cur = 0; r.st.forEach((s, i) => { cur = Math.min(4, Math.max(0, s.s + (s.a ? 1 : -1))); r.to.push(cur); });
    r.st.forEach((s, i) => tl.cue(r.t0 + i * r.dt + r.dt * .8, 'tstep', { r: s.r, k: i % 5 }));
  }
  tl.cue(38.2, 'magnet');
  const trainState = t => {                                            // → {x, lift, label, rnd, ep, k, n, r} while the training episodes run
    if (t >= TRESET[0] && t < TRESET[1]) { const u = (t - TRESET[0]) / (TRESET[1] - TRESET[0]), e = u * u * (3 - 2 * u); return { x: lerp(cx(4), cx(0), e), lift: Math.sin(Math.PI * u) * .5, none: true }; }
    if (t >= TRESET[1] && t < TR[1].t0) return { x: cx(0), lift: 0, none: true };
    for (let q = TR.length - 1; q >= 0; q--) {
      const r = TR[q]; if (t < r.t0) continue;
      const f = (t - r.t0) / r.dt, i = Math.floor(f);
      if (i >= r.st.length) return q === TR.length - 1 && t > r.t0 + r.st.length * r.dt + .1 ? null : { x: cx(4), lift: 0, ep: r.ep, k: r.st.length, n: r.st.length, rnd: r.st.reduce((a, s) => a + s.r, 0), end: true };
      const from = i ? r.to[i - 1] : 0, to = r.to[i], u = f - i, e = u * u * (3 - 2 * u);
      const x = from === to ? cx(from) - 42 * Math.sin(Math.PI * Math.min(1, u * 1.4)) : lerp(cx(from), cx(to), e);
      return { x, lift: from === to ? 0 : Math.sin(Math.PI * u) * .3, ep: r.ep, k: i + 1, n: r.st.length, rnd: r.st.slice(0, i + 1).reduce((a, s) => a + s.r, 0), r: r.st[i].r, bump: from === to };
    }
    return null;
  };

  // ── AI magnet path
  const stepAt = [91.3, 92.3, 93.3, 94.2], bumpAt = [12.7, 13.35];
  const ai = t => {
    if (t < 3.4) return null;
    let x = cx(0), lift = 0;
    if (t < 4.1) lift = 1 - (t - 3.4) / .7 * (1);                      // drop (lift 1 → 0), eased below
    if (t < 4.1) lift = (1 - (t - 3.4) / .7) ** 2;
    for (const b of bumpAt) if (t > b && t < b + .5) { const u = (t - b) / .5; x -= 55 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * .6); }
    stepAt.forEach((s, i) => { const u = clamp((t - s) / .7), e = u * u * (3 - 2 * u); if (t >= s) { x = lerp(cx(i), cx(i + 1), e); lift = Math.sin(Math.PI * u) * .35; } });
    if (t > stepAt[3] + .7) x = cx(4);
    const ts = trainState(t); if (ts) return { x: ts.x, y: CMY, lift: ts.lift, ts };
    return { x, y: CMY, lift };
  };
  const hit = t => { const p = ai(t); return p; };
  // sound cues
  tl.cue(3.4, 'magnet'); bumpAt.forEach(b => tl.cue(b, 'bump')); stepAt.forEach((s, i) => tl.cue(s + .65, 'step', { k: i }));
  [14.4, 24.3, 36.5, 47.4, 64.9, 81.2].forEach(t => tl.cue(t, 'whip'));
  tl.cue(55.4, 'wipe'); tl.cue(62.6, 'wipe'); tl.cue(49.3, 'silence'); tl.cue(89.6, 'silence');
  tl.cue(94.9, 'goal');

  // ── camera
  const cam = new W.Camera([
    [0, 1000, 540, .88], [6, 1000, 560, .95, 0, 'io'], [8.4, 1000, 560, 1.1, 0, 'io'], [14.4, 1000, 560, 1.1, 0, 'l'],
    [15.8, 2900, 520, .95, 0, 'io'], [24.3, 2900, 520, .95, 0, 'l'],
    [25.7, 4650, 430, 1.0, 0, 'io'], [30.9, 4650, 440, 1.0, 0, 'l'],
    [32.1, 4650, 960, 1.0, 0, 'io'], [36.5, 4650, 960, 1.0, 0, 'l'],
    [37.8, 1000, 560, 1.1, 0, 'io'], [47.4, 1000, 560, 1.1, 0, 'l'],
    [48.7, 2900, 560, .85, 0, 'io'], [64.9, 2900, 560, .85, 0, 'l'],
    [66.3, 6650, 600, .9, 0, 'io'], [81.2, 6650, 600, .9, 0, 'l'],
    [82.6, 1000, 640, .95, 0, 'io'], [90.8, 1000, 640, .95, 0, 'l'],
    [92.8, 900, 760, .8, 0, 'io'], [END, 900, 760, .8, 0, 'l'],
  ]);

  const board = new W.Board(tl, { ghosts });
  const goalFill = { draw: (ctx, t, c) => {
    const a = clamp((t - 4.9) / .8) * .95; if (a <= 0) return;
    W.applyCam(ctx, c); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.fillStyle = '#f3d98e';
    ctx.beginPath(); ctx.roundRect(250 + 1200 + 5, CY0 + 5, 290, CH - 10, 8); ctx.fill();
  } };
  board.objs.push(goalFill);
  const drawAI = (ctx, c, p, r0) => {
    const [sx, sy] = W.toScreen(c, p.x, p.y), z = c.z, r = r0 * z, up = p.lift * r0 * .85 * z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.filter = `blur(${(6 + p.lift * 12) * z}px)`; ctx.fillStyle = `rgba(20,40,40,${.34 - p.lift * .15})`;
    ctx.beginPath(); ctx.ellipse(sx + 8 * z + up * .6, sy + 12 * z + up, r * 1.0, r * .95, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(sx, sy - up); ctx.scale(1 + p.lift * .08, 1 + p.lift * .08);
    const g = ctx.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1); g.addColorStop(0, '#5fd1bd'); g.addColorStop(.45, C.teal); g.addColorStop(1, '#064c42');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r * .38, -r * .5, r * .22, r * .1, -.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `${Math.round(r * .8)}px PH`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AI', 0, r * .04);
    ctx.restore();
  };
  board.objs.push({ draw: (ctx, t, c) => {
    const p = ai(t); if (!p) return;
    drawAI(ctx, c, p, 70);
    const ts = p.ts; if (!ts || ts.none) return;
    W.applyCam(ctx, c); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    if (!ts.end) { ctx.font = '42px PH'; ctx.fillStyle = ts.r ? C.orange : C.teal; ctx.fillText(ts.r ? 'random' : 'max Q', p.x, CY0 + 48); }
    ctx.textAlign = 'left'; ctx.font = '50px PH'; ctx.fillStyle = C.ink;
    ctx.fillText(`episode ${ts.ep}   step ${ts.k}/${ts.n}`, 250, 835); ctx.fillStyle = C.orange; ctx.fillText(`random ${ts.rnd}`, 250, 895); ctx.fillStyle = C.teal; ctx.fillText(`max Q ${ts.k - ts.rnd}`, 560, 895);
  } });
  board.objs.push({ draw: (ctx, t, c) => {                              // goal fill + AI + step counter of the greedy test
    const a = clamp((t - 68.7) / .6) * .95; if (a <= 0) return;
    W.applyCam(ctx, c); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.fillStyle = '#f3d98e';
    ctx.beginPath(); ctx.roundRect(EX + 760 + 4, EY + 4, 182, EH - 8, 6); ctx.fill(); ctx.restore();
    const p = aiE(t); if (!p) return;
    drawAI(ctx, c, p, 46);
    if (p.show) { W.applyCam(ctx, c); ctx.font = '62px PH'; ctx.fillStyle = C.teal; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`ep ${p.ep}   steps ${p.k}`, EX, 450); }
  } });
  board.objs.push({ draw: (ctx, t, c) => { for (const e of tl.erasers) W.drawEraser(ctx, e, t, c); } });
  board.objs.push({ draw: (ctx, t, c) => { for (const p of PENS) W.drawMarker(ctx, p, W.penPose(p, t, cam), c, t); } });

  // ── Vietnamese captions (burned in), technical terms stay English
  const subs = [
    [3.3, 6.4, 'Con AI đứng ở ô 0 của hành lang 5 ô.'],
    [6.5, 8.95, 'Đích là ô 4, nhưng nó không biết điều đó.'],
    [9.0, 11.9, 'Mỗi bước bị ' + MINUS + '1. Tới đích được +10 reward.'],
    [12.1, 15.2, 'Đi trái ở ô 0: đụng tường, đứng yên.'],
    [16.2, 19.8, 'Q-table: mỗi (ô, action) có một điểm. Ban đầu toàn 0.'],
    [20.0, 24.6, 'Điểm bằng nhau → greedy chọn left (index đầu tiên): kẹt ở tường.'],
    [25.9, 30.4, 'ε = 0.7: 70% bước đi ngẫu nhiên (explore). Huấn luyện 200 episode.'],
    [32.2, 34.3, 'Sau mỗi bước, cập nhật Q-table.'],
    [34.5, 37.0, 'Ở đích, target chỉ là reward: sau đó không còn gì.'],
    [38.0, 43.7, 'Huấn luyện: AI đi ngẫu nhiên với ε = 0.7 (cam), còn lại chọn max Q (xanh).'],
    [43.9, 47.4, 'Episode 2 cũng vậy: AI chưa biết đường, chỉ thử rồi học.'],
    [48.8, 50.65, 'Lần đầu tới đích:'],
    [50.7, 55.2, 'Q[3][right] = 0 + 0.5 × (10 ' + MINUS + ' 0) = 5'],
    [55.4, 58.1, 'Sau episode 1, Q-table đã khác.'],
    [58.3, 62.4, 'Lần hai: 5 + 0.5 × (10 ' + MINUS + ' 5) = 7.5'],
    [62.6, 65.7, 'Mỗi lần tới đích, Q[3][right] lại tiến gần 10.'],
    [67.2, 72.3, 'Test (ε = 0, chỉ theo Q) sau episode 1: vẫn kẹt, 50 bước rồi bỏ cuộc.'],
    [72.5, 75.7, 'Sau episode 2: AI tự đi 0 → 1 → 2 → 3 → 4, chỉ 4 bước.'],
    [75.9, 81.2, 'Các episode sau vẫn 4 bước, còn Q thì cứ tăng dần.'],
    [82.7, 86.3, 'Điểm "right" lan ngược từ đích: ô 3 = 10.0.'],
    [86.5, 91.0, 'Mỗi ô = ô kế tiếp × 0.9 ' + MINUS + ' 1:  8.0, 6.2, 4.58.'],
    [91.2, 94.9, 'Sau 200 episode, AI không đi ngẫu nhiên nữa: chọn action có Q lớn nhất.'],
    [95.1, 100.0, 'Nó không hề được chỉ đích ở đâu: chỉ học từ reward.'],
  ].map(([t0, t1, text]) => ({ t0, t1, text }));
  board.overlays.push({ draw: (ctx, t) => {
    const s = subs.find(s => t >= s.t0 && t < s.t1); if (!s) return;
    const a = Math.min(1, (t - s.t0) / .12, (s.t1 - t) / .12);
    ctx.font = '44px PH';
    let rows = [s.text];
    if (ctx.measureText(s.text).width > 1250) {
      const ws = s.text.split(' '); let best = 1, bd = 1e9;
      for (let i = 1; i < ws.length; i++) { const d = Math.abs(ctx.measureText(ws.slice(0, i).join(' ')).width - ctx.measureText(ws.slice(i).join(' ')).width); if (d < bd) { bd = d; best = i; } }
      rows = [ws.slice(0, best).join(' '), ws.slice(best).join(' ')];
    }
    const w = Math.max(...rows.map(r => ctx.measureText(r).width)) + 64, h = 70 + (rows.length - 1) * 52, y0 = 1038 - h;
    ctx.globalAlpha = a * .92; ctx.fillStyle = '#fdfcf8'; ctx.shadowColor = 'rgba(30,30,40,.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.roundRect(960 - w / 2, y0, w, h, 14); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.globalAlpha = a;
    ctx.fillStyle = C.teal; ctx.fillRect(960 - w / 2 + 22, y0 + h - 12, 36, 4);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rows.forEach((r, i) => ctx.fillText(r, 960, y0 + 37 + i * 52));
  } });

  // ── frame render with motion blur on whips
  const off = new OffscreenCanvas(1920, 1080), oc = off.getContext('2d');
  const qs = new URLSearchParams(location.search);
  if (qs.has('nosubs')) board.overlays.length = 0;
  function render(ctx, T) {
    const t = T / F, dt = 1 / 24 / F, a = cam.at(t), b = cam.at(Math.max(0, t - dt));
    const sp = Math.hypot((a.x - b.x) * a.z, (a.y - b.y) * a.z) + Math.abs(Math.log(a.z / b.z)) * 900;
    const N = sp > 14 ? Math.min(12, Math.ceil(sp * .5 / 4)) : 1;
    if (N === 1) { board.render(ctx, t, cam); return; }
    const ov = board.overlays; board.overlays = [];
    for (let i = 0; i < N; i++) { board.render(oc, t - dt * .5 * i / (N - 1), cam); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(off, 0, 0); }
    ctx.globalAlpha = 1; board.overlays = ov;
    for (const o of ov) { ctx.save(); o.draw(ctx, t); ctx.restore(); }
  }
  const ev = [...tl.ev].sort((a, b) => a.t - b.t);
  for (const e of ev) if (e.x != null) { const c = cam.at(e.t), [px, py] = W.toScreen(c, e.x, e.y); e.pan = +clamp((px - 960) / 1400, -.7, .7).toFixed(2); e.z = +c.z.toFixed(2); e.on = px > -100 && px < 2020 && py > -100 && py < 1180 ? 1 : 0; }
  const evS = ev.map(e => ({ ...e, t: +(e.t * F).toFixed(3), ...(e.dur != null ? { dur: +(e.dur * F).toFixed(3) } : {}) }));
  const subsS = subs.map(s => ({ ...s, t0: s.t0 * F, t1: s.t1 * F }));
  return { dur: END * F, render, ev: evS, subs: subsS, cam, tl };
}
