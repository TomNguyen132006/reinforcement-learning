// "Lưới 3×3 Q-learning" — Whiteboard Explainer (sibling of ../1D/q-corridor). Numbers = real run of ../2DGrid.py with random.seed(1) (gen_numbers.py -> numbers.json).
import * as W from './engine/wb.js';
import { clamp, lerp, TAU, mulberry } from '/core/lib.js';

export const END = 114;
export const F = 1.05;   // global slow-down: every board time is stretched by F on output
const C = { ink: '#14181f', teal: '#0b7a6b', orange: '#a8470b', amber: '#8a5a00', red: '#b3261e' };
const MINUS = '−';
const NAMES = ['left', 'right', 'up', 'down'];
const fmt = v => v === 0 ? '0' : (v < 0 ? MINUS : '') + (Number.isInteger(v) ? Math.abs(v).toFixed(1) : Math.abs(v).toString());   // 5.0 like Python prints
const ACT = [[0, -1], [0, 1], [-1, 0], [1, 0]];                                                               // 2DGrid.py: 0 left, 1 right, 2 up, 3 down  (row, col)

export async function build() {
  await W.loadFont('tech', 'fonts/EMSTech.json');
  const num = await (await fetch('numbers.json')).json();
  const code = (await (await fetch('2DGrid.py')).text()).split(String.fromCharCode(10)).map(l => l.trimEnd());   // real source, shown on the code cards
  const tl = new W.Timeline();
  const K = new W.Pen('black', C.ink, { park: [2200, 1320] });
  const G = { color: C.teal };           // one marker only: G / O / A are just ink colours for it
  const O = { color: C.orange };
  const A = { color: C.amber };
  const R = { color: C.red };
  
  const T = W.text;
  const D = (pen, shapes, a, b, o = {}) => tl.draw(K, shapes, a, { by: b, color: pen.color, ...o });

  // ── layout (world units)
  const GX = 250, GY = 330, S = 260;                                              // 3x3 grid, cell 260
  const cx = c => GX + S * c + S / 2, cy = r => GY + S * r + S / 2;
  const TX = 1350, TY = 300, TC = [1450, 1625, 1775, 1925, 2075];                // Q-table: 9 rows x (cell + 4 actions)
  const rowTop = i => TY + 80 + 80 * i, baseY = i => rowTop(i) + 55;
  const WALLS = num.walls, TRAPS = num.traps, isW = (r, c) => WALLS.some(w => w[0] === r && w[1] === c), isT = (r, c) => TRAPS.some(w => w[0] === r && w[1] === c);
  const blocked = (r, c, a) => { const nr = r + ACT[a][0], nc = c + ACT[a][1]; return nr < 0 || nc < 0 || nr > 2 || nc > 2 || isW(nr, nc); };   // same rule as Grid2D.step
  const vText = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));

  // ghost marks of old lessons
  const ghosts = [], gR = mulberry(9);
  for (let i = 0; i < 40; i++) {
    const x = gR() * 7600 + 200, y = gR() * 3000 + 100, k = gR(), o = { w: 12, alpha: .05 + gR() * .05, color: gR() < .2 ? '#8aa0c8' : '#9aa0a8' };
    if (k < .35) ghosts.push(...T(['a+b', 'f(x)', 'n=3', '→ 3', 'ok?', 'x²', 'Σ'][i % 7].replace('Σ', 'S'), x, y, { h: 50 + gR() * 40, ...o }));
    else if (k < .6) ghosts.push(W.circle(x, y, 40 + gR() * 100, o));
    else if (k < .8) ghosts.push(...W.arrow(x, y, x + (gR() - .5) * 500, y + (gR() - .5) * 300, o));
    else ghosts.push(W.line(x, y, x + 200 + gR() * 500, y + (gR() - .5) * 80, o));
  }

  // ═════════ A1 · the grid (0–6.5)
  D(K, T('Q-learning 2D', 250, 220, { h: 110, w: 12 }), .3, 2.3, { minGap: .03, maxGap: .08 });
  D(G, W.curve([[240, 262], [700, 252], [1180, 266]], { w: 12, over: 20 }), 2.35, 2.8);
  D(K, [...W.rect(GX, GY, 3 * S, 3 * S, { w: 9 }), ...[1, 2].flatMap(i => [W.line(GX + S * i, GY, GX + S * i, GY + 3 * S, { w: 7 }), W.line(GX, GY + S * i, GX + 3 * S, GY + S * i, { w: 7 })])], 2.9, 4.2);
  const cells = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
  D(K, cells.flatMap(([r, c]) => T(r + ',' + c, GX + S * c + 22, GY + S * r + 44, { h: 34, w: 6 })), 4.25, 5.2);
  D(A, T('goal', cx(2), cy(2) - 5, { h: 54, w: 8, align: 'center' }), 5.25, 5.75);
  D(K, T('?', 1090, cy(2) + 40, { h: 110, w: 10 }), 6.7, 7.2);
  const [wr, wc] = WALLS[0], [tr0, tc0] = TRAPS[0];                    // wall + trap (7.3–8.85), the fills are drawn on the canvas layer
  D(K, T('wall', cx(wc), cy(wr) + 14, { h: 54, w: 8, align: 'center' }), 7.3, 7.85);
  D(R, [...T('trap', cx(tc0), cy(tr0) - 5, { h: 54, w: 8, align: 'center' }), ...T(MINUS + '10', cx(tc0), cy(tr0) + 80, { h: 62, w: 9, align: 'center' })], 7.9, 8.85);

  // ═════════ A2 · rules (6.5–14.4)
  D(K, cells.filter(([r, c]) => r + c < 4 && !isW(r, c) && !isT(r, c)).flatMap(([r, c]) => T(MINUS + '1', GX + S * c + S - 62, GY + S * r + 46, { h: 40, w: 7, align: 'center' })), 8.9, 10.5);
  D(A, T('+10', cx(2), cy(2) + 88, { h: 70, w: 10, align: 'center' }), 10.6, 11.6);
  D(K, [W.line(238, GY + 10, 238, GY + S - 10, { w: 24, bow: 0 }), ...[0, 1, 2, 3].map(k => W.line(222, GY + 20 + k * 62, 176, GY + 70 + k * 62, { w: 7 }))], 12.0, 12.8);

  // ═════════ B1 · the Q-table, all zero (14.4–24.5)
  const tabLines = [...W.rect(TX, TY, 800, 800, { w: 9 }), W.line(TX, TY + 80, TX + 800, TY + 80, { w: 8 }),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => W.line(TX, rowTop(i), TX + 800, rowTop(i), { w: 6 })),
    ...[1550, 1700, 1850, 2000].map(x => W.line(x, TY, x, TY + 800, { w: 7 }))];
  D(K, tabLines, 15.3, 17.2);
  D(K, [...T('cell', TC[0], TY + 55, { h: 38, w: 6, align: 'center' }), ...['left', 'right', 'up', 'down'].flatMap((a, k) => T(a, TC[1 + k], TY + 55, { h: 38, w: 6, align: 'center' }))], 17.2, 18.4);
  D(K, cells.flatMap(([r, c], i) => T(r + ',' + c, TC[0], baseY(i), { h: 38, w: 6, align: 'center' })), 18.4, 19.6);
  const zeros = [];
  for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) zeros.push(...T('0', TC[1 + k], baseY(i), { h: 38, w: 6, align: 'center' }));
  D(G, zeros, 19.6, 21.4);
  D(K, T('all 0 = tie', 2230, 460, { h: 44, w: 7 }), 21.6, 22.3);
  D(K, T('→ first = left', 2230, 530, { h: 44, w: 7 }), 22.3, 23.3);
  D(G, W.roundRect(1552, TY + 6, 146, 68, 12, { w: 8 }), 23.4, 23.9);

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

  // ═════════ E · first two goal updates + table snapshots (50.6 →)
  const sweep = (x, y, w, h, n) => { const p = []; for (let i = 0; i <= n; i++) { const yy = y + h * i / n; p.push(...(i % 2 ? [[x + w, yy], [x, yy]] : [[x, yy], [x + w, yy]])); } return p; };   // boustrophedon passes
  const snap = (t0, vals, tag, tagErase) => {                       // erase the table body (a ghost stays), write the real numbers
    tl.erase(sweep(1590, 450, 520, 580, 7), t0, 1.0, { width: 120, strength: .97 });   // horizontal passes: the zigzag helper leaves the edge columns untouched
    if (tagErase) tl.erase([[TX - 10, 262], [TX + 440, 262]], t0, .5, { width: 70, strength: .9 });
    D(K, [...[1550, 1700, 1850, 2000, 2150].map(x => W.line(x, TY + 80, x, TY + 800, { w: 7 })), ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => W.line(1550, rowTop(i), TX + 800, rowTop(i), { w: 6 }))], t0 + 1.0, t0 + 2.2);   // the eraser ghosts the grid lines: ink them again
    const out = [];
    for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) out.push(...T(fmt(vals[i][k]), TC[1 + k], baseY(i), { h: 34, w: 6, align: 'center', color: C.teal }));
    D(K, T(tag, TX, 275, { h: 34, w: 6 }), t0 + 2.25, t0 + 2.9);
    D(G, out, t0 + 2.95, t0 + 5.6);
    tl.cue(t0, 'wipe');
  };
  const last1 = num.train['1'].at(-1), last2 = num.train['2'].at(-1);                 // the step that reaches the goal in episode 1 / 2
  const qi = s => 3 * s.s[0] + s.s[1], qname = s => `Q[${s.s[0]},${s.s[1]}][${NAMES[s.a]}]`;
  const qa = num.table['1'][qi(last1)][last1.a], qb = num.table['2'][qi(last2)][last2.a];   // 5 and 7.5 with seed 1
  const ringAt = (i, a) => W.roundRect(1550 + 150 * a + 4, rowTop(i) + 4, 142, 72, 12, { w: 8 });
  const U1 = 52.6, p1 = T(`${qname(last1)} = 0 + 0.5 × (10 ${MINUS} 0) =`, 2230, 680, { h: 40, w: 7 });
  D(K, p1, U1, U1 + 3.4);
  D(G, T(String(qa), 2230 + p1.width + 24, 688, { h: 70, w: 11 }), U1 + 3.5, U1 + 4.1);
  tl.cue(U1 + 3.6, 'ding', { k: 0 });
  D(G, ringAt(qi(last1), last1.a), U1 + 4.2, U1 + 4.6);
  const S1 = U1 + 5.0; snap(S1, num.table['1'], 'after episode 1', false);
  const nearTrap = [];                                                               // table-1 entries that walk INTO the trap and are already very negative
  for (let i = 0; i < 9; i++) for (let a = 0; a < 4; a++) { const r = Math.floor(i / 3), c = i % 3, nr = r + ACT[a][0], nc = c + ACT[a][1]; if (nr >= 0 && nc >= 0 && nr < 3 && nc < 3 && isT(nr, nc) && num.table['1'][i][a] < -2) nearTrap.push([i, a]); }
  D(R, T('into the trap = very negative', 2230, 600, { h: 34, w: 6 }), S1 + 5.7, S1 + 6.7);
  D(R, nearTrap.map(([i, a]) => ringAt(i, a)), S1 + 6.75, S1 + 7.4);
  const U2 = S1 + 7.9, p2 = T(`${qname(last2)} = ${qa} + 0.5 × (10 ${MINUS} ${qa}) =`, 2230, 820, { h: 40, w: 7 });
  D(K, p2, U2, U2 + 3.3);
  D(G, T(String(qb), 2230 + p2.width + 24, 828, { h: 70, w: 11 }), U2 + 3.4, U2 + 4.0);
  tl.cue(U2 + 3.5, 'ding', { k: 1 });
  D(G, ringAt(qi(last2), last2.a), U2 + 4.1, U2 + 4.5);
  const S2 = U2 + 4.9; snap(S2, num.table['2'], 'after episode 2', true);
  tl.erase(sweep(2230, 470, 1100, 400, 5), S2 + 1.0, 1.4, { width: 130, strength: .95 });   // clear the two formulas + the notes before the finale
  const E_END = S2 + 5.7;

  // ═════════ F · greedy tests (ε = 0)
  const EX = 6100, EY = 200, ES = 150, ex = c => EX + ES / 2 + ES * c, ey = r => EY + ES / 2 + ES * r;
  const FC = E_END + 1.5, FS = FC + .3;                              // camera arrives / first drawing
  D(K, T('greedy test', EX, 150, { h: 70, w: 9 }), FS, FS + .9);
  D(K, W.curve([[EX - 10, 178], [EX + 360, 172], [EX + 700, 182]], { w: 8 }), FS + .95, FS + 1.2);
  D(K, [...W.rect(EX, EY, 3 * ES, 3 * ES, { w: 8 }), ...[1, 2].flatMap(i => [W.line(EX + ES * i, EY, EX + ES * i, EY + 3 * ES, { w: 6 }), W.line(EX, EY + ES * i, EX + 3 * ES, EY + ES * i, { w: 6 })])], FS + 1.3, FS + 2.2);
  const t = num.test, EPS = [1, 2, 3, 4, 5, 8];                       // eps 1-4 get stuck (a bit further each time), 5 and 8 walk out
  let tc = FS + 3.0;
  const RUNS = EPS.map(ep => {
    const z = t[ep - 1], stuck = z.steps >= 50, R = { ep, stuck, t0: tc, dt: stuck ? .035 : ep === 5 ? .4 : .3, dur: stuck ? 0 : ep === 5 ? .36 : .27, path: z.path, steps: z.steps };
    R.end = R.t0 + R.steps * R.dt + R.dur; tc = R.end + 1.5; return R;
  });
  const ROWY = EPS.map((_, i) => 785 + 65 * i);
  tl.cue(FS + 2.4, 'magnet');
  RUNS.forEach((R, i) => {
    const y = ROWY[i], lp = R.path[R.steps];
    const l1 = T('ep ' + R.ep + '   ' + (R.stuck ? `stuck at ${lp[0]},${lp[1]}   50 steps` : 'reaches goal   ' + R.steps + ' steps'), EX, y, { h: 36, w: 6 });
    D(K, l1, R.end + .1, R.end + .8);
    if (!R.stuck) D(G, T('✓', EX + l1.width + 30, y, { h: 36, w: 8 }), R.end + .85, R.end + 1.0);
    if (R.stuck) for (let k = 0; k < R.steps; k += 5) tl.cue(R.t0 + k * R.dt, 'bump');
    else { for (let k = 0; k < R.steps; k++) tl.cue(R.t0 + k * R.dt + R.dur * .85, 'estep', { k }); tl.cue(R.end + .05, 'egoal'); }
  });
  const aiE = tt => {
    if (tt < FS + 2.4 || tt > RUNS.at(-1).end + 1.0) return null;
    let ci = -1; RUNS.forEach((R, i) => { if (tt >= R.t0) ci = i; });
    const at = P => [ex(P[1]), ey(P[0])];
    if (ci < 0) { const [x, y] = at(RUNS[0].path[0]); return { x, y, lift: tt < FS + 2.9 ? (1 - (tt - FS - 2.4) / .5) ** 2 : 0, ep: 1, k: 0, show: false }; }
    const R = RUNS[ci], nx = RUNS[ci + 1], j = Math.floor((tt - R.t0) / R.dt);
    if (nx && tt >= nx.t0 - .45) {                                    // fly back to the start before the next run
      const v = clamp((tt - nx.t0 + .45) / .4), e = v * v * (3 - 2 * v), a = at(R.path[R.steps]), b = at(nx.path[0]);
      return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), lift: Math.sin(Math.PI * v) * .5, ep: R.ep, k: R.steps, show: false };
    }
    if (j >= R.steps) { const [x, y] = at(R.path[R.steps]); return { x, y, lift: 0, ep: R.ep, k: R.steps, show: true }; }
    const p = R.path[j], q = R.path[j + 1], a = at(p), b = at(q), same = p[0] === q[0] && p[1] === q[1];
    let u = R.dur ? clamp((tt - R.t0 - j * R.dt) / R.dur) : ((tt - R.t0) / R.dt) % 1; u = u * u * (3 - 2 * u);
    if (same) return { x: a[0] - 16 * Math.sin(Math.PI * Math.min(1, u * 1.4)), y: a[1], lift: 0, ep: R.ep, k: j + 1, show: true };
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), lift: Math.sin(Math.PI * u) * .3, ep: R.ep, k: j + 1, show: true };
  };
  const F_END = RUNS.at(-1).end + 1.3;

  // ═════════ G · the final Q-table, the value spreading backward, the clean walk
  const GC = F_END + 1.5, GS = GC + .3;
  const S3 = GS; snap(S3, num.final, 'after 200 episodes', true);
  const vm = num.final.map(r => Math.max(...r));                     // best value per cell
  const order = cells.filter(([r, c]) => !isW(r, c) && !isT(r, c) && !(r === 2 && c === 2)).sort((a, b) => vm[3 * b[0] + b[1]] - vm[3 * a[0] + a[1]]);   // wall, trap and goal are skipped: nothing is written on them
  const vals = [...new Set(order.map(([r, c]) => vm[3 * r + c]))];   // distinct best values, high -> low = 1 step, 2 steps ...
  let ts = S3 + 6.0;
  const AN0 = ts, PT = [];                                           // analysis: a pointer visits each cell, finds its max Q, then the best direction is drawn
  vals.forEach((v, li) => {
    D(K, T(`${li + 1} step${li ? 's' : ''}  ${vText(v)}`, 1065, 470 + 72 * li, { h: 28, w: 5 }), ts, ts + .6);
    ts += .7;
    for (const [r, c] of order.filter(([r, c]) => vm[3 * r + c] === v)) {
      const i = 3 * r + c, q = num.final[i], a = q.indexOf(Math.max(...q)), [dr, dc] = ACT[a];   // first max, like choose_action
      PT.push({ t0: ts, t1: ts + 1.5, r, c, i, a });
      D(G, T(vText(vm[i]), cx(c), cy(r) + 100, { h: 56, w: 8, align: 'center' }), ts + .55, ts + 1.0);
      D(G, W.arrow(cx(c) - dc * 48, cy(r) - 14 - dr * 48, cx(c) + dc * 48, cy(r) - 14 + dr * 48, { w: 9, head: 22 }), ts + 1.05, ts + 1.4);
      tl.cue(ts + 1.4, 'ding', { k: Math.min(li, 4) });
      ts += 1.5;
    }
  });
  const AN1 = ts + .5;
  tl.cue(AN1 - .3, 'silence');
  const greedy = [[0, 0]]; while (greedy.length < 12 && !(greedy.at(-1)[0] === 2 && greedy.at(-1)[1] === 2)) {
    const [r, c] = greedy.at(-1), q = num.final[3 * r + c], a = q.indexOf(Math.max(...q));
    greedy.push(blocked(r, c, a) ? [r, c] : [r + ACT[a][0], c + ACT[a][1]]);
  }
  const stepAt = greedy.slice(1).map((_, i) => ts + 1.4 + i * 1.0);
  const WALK_END = stepAt.at(-1) + .7;
  D(A, [W.circle(cx(2), cy(2), 165, { w: 9, a0: -1.6 }), W.circle(cx(2), cy(2), 185, { w: 9, a0: -1.3 })], WALK_END + .2, WALK_END + 1.4);
  D(G, T('reward', 640, 1215, { h: 110, w: 14, align: 'center' }), WALK_END + 1.6, WALK_END + 3.4, { minGap: .03, maxGap: .08 });
  D(G, [W.curve([[330, 1252], [640, 1244], [950, 1256]], { w: 12, over: 20 })], WALK_END + 3.5, WALK_END + 4.0);
  const REAL_END = WALK_END + 5.4;
  tl.end();

  // ═════════ D · training: ε = 0.7 random walk, real seed-1 episodes 1 and 2 (37.8–50)
  const pos = s => [cx(s[1]), cy(s[0])];
  const TR = [{ t0: 38.5, dt: .22, st: num.train['1'], ep: 1 }, { t0: 46.6, dt: .22, st: num.train['2'], ep: 2 }];
  const TRESET = [46.2, 46.5];
  for (const r of TR) r.st.forEach((s, i) => tl.cue(r.t0 + i * r.dt + r.dt * .8, 'tstep', { r: s.r, k: i % 5 }));
  tl.cue(38.5, 'magnet');
  const trainState = tt => {
    if (tt >= TRESET[0] && tt < TRESET[1]) { const u = (tt - TRESET[0]) / (TRESET[1] - TRESET[0]), e = u * u * (3 - 2 * u), a = pos(TR[0].st.at(-1).n), b = pos([0, 0]); return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), lift: Math.sin(Math.PI * u) * .5, none: true }; }
    if (tt >= TRESET[1] && tt < TR[1].t0) return { x: cx(0), y: cy(0), lift: 0, none: true };
    for (let q = TR.length - 1; q >= 0; q--) {
      const r = TR[q]; if (tt < r.t0) continue;
      const f = (tt - r.t0) / r.dt, i = Math.floor(f);
      if (i >= r.st.length) { const a = pos(r.st.at(-1).n); return q === TR.length - 1 && tt > r.t0 + r.st.length * r.dt + .1 ? null : { x: a[0], y: a[1], lift: 0, ep: r.ep, k: r.st.length, n: r.st.length, rnd: r.st.reduce((s, z) => s + z.r, 0), end: true, trp: r.st.filter(z => z.rw === -10).length, r_: r, i: r.st.length - 1 }; }
      const s = r.st[i], a = pos(s.s), b = pos(s.n), u = f - i, e = u * u * (3 - 2 * u), same = a[0] === b[0] && a[1] === b[1];
      const nudge = 42 * Math.sin(Math.PI * Math.min(1, u * 1.4));    // bump: push toward the wall the way the AI tried to go
      return { x: same ? a[0] + ACT[s.a][1] * nudge : lerp(a[0], b[0], e), y: same ? a[1] + ACT[s.a][0] * nudge : lerp(a[1], b[1], e), lift: same ? 0 : Math.sin(Math.PI * u) * .3, ep: r.ep, k: i + 1, n: r.st.length, rnd: r.st.slice(0, i + 1).reduce((z, w) => z + w.r, 0), r: s.r, rw: s.rw, trp: r.st.slice(0, i + 1).filter(z => z.rw === -10).length, bump: same, r_: r, i };
    }
    return null;
  };

  // ── AI magnet path: bump on the left wall (12.7, 13.35), then the clean walk at the end
  const bumpAt = [12.7, 13.35];
  const ai = tt => {
    if (tt < 3.4 || (tt >= AN0 && tt < stepAt[0] - .05)) return null;     // hidden while the pointer analyses the cells
    let x = cx(0), y = cy(0), lift = 0;
    if (tt < 4.1) lift = (1 - (tt - 3.4) / .7) ** 2;
    for (const b of bumpAt) if (tt > b && tt < b + .5) { const u = (tt - b) / .5; x -= 55 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * .6); }
    stepAt.forEach((s, i) => { const u = clamp((tt - s) / .7), e = u * u * (3 - 2 * u), a = pos(greedy[i]), b = pos(greedy[i + 1]); if (tt >= s) { x = lerp(a[0], b[0], e); y = lerp(a[1], b[1], e); lift = Math.sin(Math.PI * u) * .35; } });
    if (tt > stepAt.at(-1) + .7) { [x, y] = pos(greedy.at(-1)); }
    const tr = trainState(tt); if (tr) return { x: tr.x, y: tr.y, lift: tr.lift, ts: tr };
    return { x, y, lift };
  };
  tl.cue(3.4, 'magnet'); bumpAt.forEach(b => tl.cue(b, 'bump')); stepAt.forEach((s, i) => tl.cue(s + .65, 'step', { k: i }));
  [14.4, 24.3, 36.5, 50.6, E_END, F_END].forEach(x => tl.cue(x, 'whip'));
  tl.cue(49.8, 'silence'); tl.cue(WALK_END + .2, 'goal');
  tl.ev.sort((a, b) => a.t - b.t);

  // ── camera
  const cam = new W.Camera([
    [0, 1250, 700, .78], [6, 1200, 700, .85, 0, 'io'], [8.4, 1100, 690, .9, 0, 'io'], [14.4, 1100, 690, .9, 0, 'l'],
    [15.8, 1750, 740, .85, 0, 'io'], [24.3, 1750, 740, .85, 0, 'l'],
    [25.7, 4650, 430, 1.0, 0, 'io'], [30.9, 4650, 440, 1.0, 0, 'l'],
    [32.1, 4650, 960, 1.0, 0, 'io'], [36.5, 4650, 960, 1.0, 0, 'l'],
    [37.8, 1100, 690, .9, 0, 'io'], [50.6, 1100, 690, .9, 0, 'l'],
    [51.9, 2450, 740, .8, 0, 'io'], [E_END, 2450, 740, .8, 0, 'l'],
    [FC, 6450, 700, .85, 0, 'io'], [F_END, 6450, 700, .85, 0, 'l'],
    [GC, 1250, 760, .8, 0, 'io'], [REAL_END, 1250, 760, .8, 0, 'l'],
  ]);
  const END_T = REAL_END + .6;

  const board = new W.Board(tl, { ghosts });
  const goalFill = (x, y, w, h, t0) => ({ draw: (ctx, tt, c) => {
    const a = clamp((tt - t0) / .8) * .95; if (a <= 0) return;
    W.applyCam(ctx, c); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a; ctx.fillStyle = '#f3d98e';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  } });
  board.objs.push(goalFill(GX + 2 * S + 5, GY + 2 * S + 5, S - 10, S - 10, 5.3));
  board.objs.push(goalFill(EX + 2 * ES + 4, EY + 2 * ES + 4, ES - 8, ES - 8, FS + 2.0));
  const blockFill = (kind, gx0, gy0, sz, r, c, t0) => ({ draw: (ctx, tt, cm) => {      // wall = grey hatched block, trap = red tint (both multiply, so the ink stays readable)
    const a = clamp((tt - t0) / .6); if (a <= 0) return;
    const x = gx0 + sz * c + 5, y = gy0 + sz * r + 5, w = sz - 10;
    W.applyCam(ctx, cm); ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * .95;
    if (kind === 'wall') {
      ctx.fillStyle = '#b3b8c0'; ctx.fillRect(x, y, w, w); ctx.strokeStyle = '#6e737c'; ctx.lineWidth = Math.max(3, sz / 40); ctx.beginPath();
      for (let k = -w; k < w; k += sz / 6) { ctx.moveTo(x + Math.max(0, k), y + Math.max(0, -k)); ctx.lineTo(x + Math.min(w, k + w), y + Math.min(w, w - k)); } ctx.stroke();
    } else { ctx.fillStyle = '#f0a79c'; ctx.fillRect(x, y, w, w); }
    ctx.restore();
  } });
  board.objs.push(blockFill('wall', GX, GY, S, wr, wc, 7.3), blockFill('trap', GX, GY, S, tr0, tc0, 7.9));
  board.objs.push(blockFill('wall', EX, EY, ES, wr, wc, FS + 2.0), blockFill('trap', EX, EY, ES, tr0, tc0, FS + 2.0));
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
  board.objs.push({ draw: (ctx, tt, c) => {
    const p = ai(tt); if (!p) return;
    const ts = p.ts;
    if (ts && !ts.none && ts.r_) {                                    // orange trail of the steps taken so far in this episode
      W.applyCam(ctx, c); ctx.save(); ctx.strokeStyle = C.orange; ctx.globalAlpha = .3; ctx.lineWidth = 12; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath();
      const pts = [pos(ts.r_.st[0].s), ...ts.r_.st.slice(0, ts.i + 1).map(s => pos(s.n))]; pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
    }
    drawAI(ctx, c, p, 62);
    if (!ts || ts.none) return;
    W.applyCam(ctx, c); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    if (!ts.end) { ctx.font = '40px PH'; ctx.fillStyle = ts.r ? C.orange : C.teal; ctx.fillText(ts.r ? 'random' : 'max Q', p.x, p.y + 100 + p.lift * 10); }
    ctx.textAlign = 'left'; ctx.font = '40px PH'; ctx.fillStyle = C.ink;
    ctx.fillText(`episode ${ts.ep}   step ${ts.k}/${ts.n}`, 250, 314); ctx.fillStyle = C.orange; ctx.fillText(`random ${ts.rnd}`, 700, 314); ctx.fillStyle = C.teal; ctx.fillText(`max Q ${ts.k - ts.rnd}`, 930, 314); ctx.fillStyle = C.red; ctx.fillText(`trap ${ts.trp}`, 1140, 314);
    if (!ts.end && ts.rw === -10) { ctx.textAlign = 'center'; ctx.font = '60px PH'; ctx.fillStyle = C.red; ctx.fillText(MINUS + '10', p.x, p.y - 84 - p.lift * 20); }
  } });
  board.objs.push({ draw: (ctx, tt, c) => {                              // finale pointer: cell under analysis, its table row, the max Q
    const p = PT.find(q => tt >= q.t0 && tt < q.t1); if (!p) return;
    const f = clamp((tt - p.t0) / .25), g = clamp((tt - p.t0 - .4) / .2), x = cx(p.c), y = cy(p.r), bob = 7 * Math.sin(tt * 9);
    W.applyCam(ctx, c); ctx.save(); ctx.globalAlpha = f;
    ctx.strokeStyle = C.orange; ctx.lineWidth = 10; ctx.beginPath(); ctx.roundRect(GX + S * p.c + 9, GY + S * p.r + 9, S - 18, S - 18, 14); ctx.stroke();
    ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(x, y - 62 + bob); ctx.lineTo(x - 26, y - 104 + bob); ctx.lineTo(x + 26, y - 104 + bob); ctx.closePath(); ctx.fill();   // pointer
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#f3d98e'; ctx.fillRect(TX + 4, rowTop(p.i) + 3, 792, 74); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = g; ctx.strokeStyle = C.teal; ctx.lineWidth = 9; ctx.beginPath(); ctx.roundRect(1550 + 150 * p.a + 5, rowTop(p.i) + 7, 140, 66, 12); ctx.stroke();           // the max Q
    ctx.restore();
  } });
  board.objs.push({ draw: (ctx, tt, c) => {                              // mini AI + counter of the greedy test
    const p = aiE(tt); if (!p) return;
    drawAI(ctx, c, p, 38);
    if (p.show) { W.applyCam(ctx, c); ctx.font = '56px PH'; ctx.fillStyle = C.teal; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(`ep ${p.ep}   steps ${p.k}`, EX, 720); }
  } });
  board.objs.push({ draw: (ctx, tt, c) => { for (const e of tl.erasers) W.drawEraser(ctx, e, tt, c); } });
  board.objs.push({ draw: (ctx, tt, c) => { const sg = K.segs.find(z => z.t1 >= tt) || K.segs.at(-1); W.drawMarker(ctx, { ...K, color: sg ? sg.s.color : C.ink }, W.penPose(K, tt, cam), c, tt); } });

  // ── Vietnamese captions (burned in), technical terms stay English
  const subs = [
    [3.3, 6.4, 'The AI starts on cell (0,0) of the 3×3 grid. The goal is cell (2,2), but it does not know that.'],
    [7.3, 8.85, 'The grid has a wall on cell (1,2) and a trap on cell (1,1).'],
    [9.0, 11.9, 'Every step costs ' + MINUS + '1, the trap costs ' + MINUS + '10, reaching the goal gives +10 reward.'],
    [12.1, 14.3, 'Walking off the grid: it hits the wall and stays put.'],
    [16.2, 19.8, 'Q-table: one score for every (cell, action). 9 cells × 4 actions.'],
    [20.0, 24.6, 'At the start everything is 0 → a tie → greedy picks left (the first index): stuck at the wall.'],
    [25.9, 30.4, 'ε = 0.7: 70% of the moves are random (explore). Training runs 200 episodes.'],
    [32.2, 34.3, 'After every step, update the Q-table.'],
    [34.5, 37.0, 'At the goal the target is just the reward: nothing comes after it.'],
    [38.0, 45.9, 'Training: the AI moves randomly with ε = 0.7 (orange), otherwise it picks the max Q (green). The trap costs ' + MINUS + '10.'],
    [46.6, 49.6, 'Episode 2 is much shorter: the AI happens to avoid the trap and reaches the goal.'],
    [52.0, 53.8, 'First time at the goal, from cell (2,1) going right:'],
    [53.9, U1 + 4.7, `${qname(last1)} = 0 + 0.5 × (10 ${MINUS} 0) = ${qa}`],
    [S1 + .2, S1 + 5.5, 'After episode 1: one positive cell (5.0); actions into the trap were punished hard.'],
    [S1 + 5.7, U2 - .2, 'Red circles: actions that walk into the trap (1,1) have a very negative Q. The AI will learn to avoid them.'],
    [U2 + .1, U2 + 4.6, `Episode 2 reaches the goal from cell (2,1) again: ${qa} → ${qb}.`],
    [S2 + .2, E_END - .1, 'The Q of the cell next to the goal grows, and the cell before it starts to turn positive.'],
    [FS + .4, FS + 2.9, 'Test run (ε = 0, follow Q only) after every episode.'],
    [FS + 3.0, RUNS[3].end + 1.2, 'Episodes 1 → 4: the AI is still stuck, 50 steps and it gives up — but it gets a bit further each time.'],
    [RUNS[4].t0 - .3, RUNS[4].end + 1.2, 'Episode 5: the AI walks to the goal on its own in 4 steps, around the trap and the wall.'],
    [RUNS[5].t0, F_END - .1, 'Later episodes still take 4 steps, while Q keeps growing.'],
    [S3 + .3, S3 + 5.9, 'After 200 episodes the Q-table is full of numbers.'],
    [AN0, AN0 + 5.5, 'The AI checks each cell: the pointer shows the cell, and its Q row lights up in the table.'],
    [AN0 + 5.6, AN0 + 11.5, 'Take the max Q of the row (green circle) and write it in the cell with an arrow: the best direction.'],
    [AN0 + 11.6, stepAt[0] - .2, 'Wall and trap cells are skipped. Every arrow points away from the trap and toward the goal.'],
    [stepAt[0] + .5, WALK_END, 'The AI takes the action with the biggest Q: around the trap, 4 steps to the goal.'],
    [WALK_END + .3, END_T - .4, 'Nobody told it where the goal is: it learned only from reward.'],
  ].map(([t0, t1, text]) => ({ t0, t1, text }));
  board.overlays.push({ draw: (ctx, tt) => {
    const s = subs.find(s => tt >= s.t0 && tt < s.t1); if (!s) return;
    const a = Math.min(1, (tt - s.t0) / .12, (s.t1 - tt) / .12);
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


  // ── cards: the board freezes, a full-screen card explains (intro / real code of 2DGrid.py / a worked table), then the film resumes
  const NOTE = 3.6, LEAD = .8;
  const row0 = e => num.test[e - 1], best = q => q.indexOf(Math.max(...q));
  const greedyLine = e => {                                           // one line of the "why stuck" table, built from the real test paths + Q-tables
    const z = row0(e), lp = z.path[z.steps], uniq = z.path.filter((p, i) => !i || p[0] !== z.path[i - 1][0] || p[1] !== z.path[i - 1][1]);
    const route = uniq.map(p => `(${p[0]},${p[1]})`).join('->');
    if (z.steps < 50) return `after ep ${e}   ${route}   reaches the goal in ${z.steps} steps`;
    const q = num.table[String(e)][3 * lp[0] + lp[1]], a = best(q);
    return `after ep ${e}   ${route}   stuck: best at (${lp[0]},${lp[1]}) = ${NAMES[a]} (${q[a]}) -> wall`;
  };
  const greedyPanel = ['before learning   Q = 0 everywhere -> tie -> first = left -> wall', ...[1, 2, 3, 4, 5].map(greedyLine)];
  const INTRO = ['Imagine we drop a little AI into a 3×3 maze.', 'It starts in the top-left corner. The exit is in the bottom-right corner.',
    'On the way there is a wall that blocks it, and a trap,', 'so how does it find its way out? Let’s figure it out.'];
  const cards = [
    { at: .05, type: 'intro', title: 'Q-learning · a 3×3 maze', notes: INTRO.map(t => [null, t, 3.2]) },
    { at: .1, title: 'The environment: class Grid2D (3×3 grid)', rng: [4, 25], notes: [
      [[5, 9], 'Grid2D(rows, cols, walls, traps): besides the grid size, it takes a set of walls and a set of traps.', 5],
      [[11, 13], 'reset(): put the AI back on cell (0,0) at the start of every episode.'],
      [[16, 25], 'step(action): every action is one direction:\n0 = left\n1 = right\n2 = up\n3 = down', 5]] },
    { at: 6.5, below: 1, title: 'step(): walls, traps and rewards', rng: [26, 41], notes: [
      [[26, 29], 'Bumping into the edge: x and y are clamped to the range 0..2 (max / min).'],
      [[31, 32], 'WALL: if the cell it wants to enter is in walls, self.pos is not updated, so the AI stays where it is, just like at the edge.', 5],
      [[33, 35], 'Reaching the last cell (2,2): done = True and reward = +10.'],
      [[36, 37], 'TRAP: standing in traps gives reward = −10 (much worse than −1), but the episode keeps going.', 5],
      [[38, 41], 'Otherwise every step costs reward = −1. Finally it returns (position, reward, done).']] },
    { at: 14.35, below: 1, title: 'Setup: environment, parameters and Q-table', rng: [46, 53], notes: [
      [[46, 46], 'env = Grid2D(3,3,{(1,2)},{(1,1)}): a 3×3 grid, wall on cell (1,2), trap on cell (1,1).', 5],
      [[47, 47], 'α (alpha) = how much you believe NEW information.\nExample: you think a game is worth 0 points. A friend tells you: "It is worth 10!"\nα = 0.5 → you believe half of it: 0 + 0.5 × (10 − 0) = 5.\nα = 1 → you believe your friend completely: 10.\nα = 0.1 → you barely listen: only 1.', 10],
      [[48, 48], 'γ (gamma) = how much you care about treats that come LATER.\nExample: a cookie (+10) is one step away. A cookie later is worth a little less than a cookie now: 0.9 × 10 = 9, minus 1 for the walk = 8.\nγ = 0 → you only care about right now and never plan ahead.\nγ close to 1 → you are patient and plan far ahead.', 10],
      [[50, 53], 'Q_table: every cell (row, col) has 4 numbers, one per action:\n0 = left\n1 = right\n2 = up\n3 = down\nAt the start they are all 0.', 6]] },
    { at: 21.5, below: 1, title: 'choose_action: picking an action', rng: [55, 60], notes: [
      [[56, 57], 'With probability ε: pick a random action 0–3 (explore).'],
      [[58, 60], 'Otherwise: take the action with the biggest Q. On a tie, index() returns the first position → 0 = left.']] },
    { at: 36.45, below: 1, title: 'The training loop', rng: [83, 91], notes: [
      [[83, 86], 'Every episode: put the AI back on (0,0), then run until done.'],
      [[88, 89], 'Pick an action with ε = 0.7 and take one step: get the new cell, reward and done. A wall means it stays put, a trap costs −10.', 5],
      [[90, 91], 'Call update_q to learn from the step it just took, then move on to the new cell.']] },
    { at: 50.55, below: 1, title: 'update_q: updating the Q-table', rng: [63, 68], notes: [
      [[64, 65], 'If the goal was reached: target = reward (nothing comes after it).'],
      [[66, 67], 'Otherwise: target = reward + γ × the max Q of the next cell. The reward can be −1 or −10 (trap), so paths into the trap sink very low.', 5],
      [[68, 68], 'New Q = old Q + α × (target − old Q): move the old Q a fraction α toward the target.']] },
    { at: E_END - .01, below: 1, title: 'run_greedy: a test run with no randomness', rng: [71, 81], notes: [
      [[72, 75], 'Run one episode with ε = 0: no learning, just see what the AI picks by itself.'],
      [[76, 80], 'Every step takes the action with the biggest Q and records the path; at most 50 steps.'],
      [[81, 81], 'Return the path and the number of steps.']] },
    { at: FS + 2.95, below: 1, title: 'Why is the AI stuck in the first episodes?', panel: greedyPanel, notes: [
      [[1, 1], 'At first the AI has learned nothing: the Q-table is all 0, so every action ties. Greedy picks the first action = left → bumps into the wall.', 4.5],
      [[2, 3], 'After episodes 1 and 2: at (0,0) the "least negative" direction is still left — a wall! The AI keeps bumping into it, standing still on (0,0) for 50 steps.', 6],
      [[4, 5], 'After episodes 3 and 4: the Q of (0,0) and (0,1) has changed, so the AI gets one cell further each time. But in the new cell the least negative direction is a wall again (up, then right) → stuck again.', 7],
      [[6, 6], 'After episode 5: Q is good enough for the AI to walk (0,0) → (1,0) → (2,0) → (2,1) → (2,2) in 4 steps — around the trap (1,1) and the wall (1,2).', 6]] },
  ].map(c => {
    c.lines = c.panel ? c.panel.map((txt, i) => ({ n: i + 1, txt, plain: 1 })) : c.rng ? Array.from({ length: c.rng[1] - c.rng[0] + 1 }, (_, i) => ({ n: c.rng[0] + i, txt: code[c.rng[0] + i - 1] })).filter(l => l.txt.trim()) : [];
    let t0 = LEAD; c.starts = c.notes.map(n => { const s = t0; t0 += n[2] ?? NOTE; return s; });
    return { ...c, R: t0 };
  });
  const cardSum = cards.reduce((a, c) => a + c.R, 0);
  const shiftT = t => t * F + cards.reduce((a, c) => a + (c.at < t ? c.R : 0), 0);   // board time -> output time
  const wrap = (ctx, text, w) => text.split('\n').flatMap(par => { const out = []; let line = ''; for (const wd of par.split(' ')) { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > w && line) { out.push(line); line = wd; } else line = t2; } out.push(line); return out; });
  function drawCard(ctx, c, local) {
    const a = Math.min(1, local / .35, (c.R - local) / .35);
    let k = -1; c.starts.forEach((s, i) => { if (local >= s) k = i; });
    ctx.save(); ctx.globalAlpha = a * .97; ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = a;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = '58px PH'; ctx.fillStyle = C.teal; ctx.fillText(c.title, 90, 100);
    ctx.fillRect(90, 118, 220, 5);
    if (c.type === 'intro') {                                           // English intro: lines appear one by one; the last (green) line replaces them all
      const last = c.notes.length - 1, fin = k === last;
      ctx.font = '54px PH'; let y = 240;
      c.notes.forEach(([, text], i) => {
        if (i > k) return;
        if (i === last) { const rows = wrap(ctx, text, 940), age = Math.min(1, (local - c.starts[i]) / .5); ctx.globalAlpha = a * age; ctx.fillStyle = C.teal; rows.forEach(r => { ctx.fillText(r, 90, y); y += 66; }); return; }
        const fade = 1;   // all lines stay: the green line finishes the sentence
        const rows = wrap(ctx, text, 940), age = Math.min(1, (local - c.starts[i]) / .5); ctx.globalAlpha = a * age * fade; ctx.fillStyle = C.ink; rows.forEach(r => { ctx.fillText(r, 90, y); y += 66; }); y += 22;
      });
      ctx.globalAlpha = a; const gx = 1200, gy = 300, s = 180;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.strokeRect(gx, gy, 3 * s, 3 * s); ctx.beginPath(); for (let i = 1; i < 3; i++) { ctx.moveTo(gx + s * i, gy); ctx.lineTo(gx + s * i, gy + 3 * s); ctx.moveTo(gx, gy + s * i); ctx.lineTo(gx + 3 * s, gy + s * i); } ctx.stroke();
      ctx.fillStyle = '#f3d98e'; ctx.fillRect(gx + 2 * s + 4, gy + 2 * s + 4, s - 8, s - 8); ctx.fillStyle = C.amber; ctx.font = '44px PH'; ctx.textAlign = 'center'; ctx.fillText('exit', gx + 2.5 * s, gy + 2.5 * s + 14);
      for (const [wr, wc] of WALLS) { ctx.fillStyle = '#b8bcc4'; ctx.fillRect(gx + wc * s + 4, gy + wr * s + 4, s - 8, s - 8); ctx.fillStyle = C.ink; ctx.fillText('wall', gx + (wc + .5) * s, gy + (wr + .5) * s + 14); }
      for (const [tr, tc] of TRAPS) { ctx.fillStyle = '#f0a79c'; ctx.fillRect(gx + tc * s + 4, gy + tr * s + 4, s - 8, s - 8); ctx.fillStyle = C.red; ctx.fillText('trap', gx + (tc + .5) * s, gy + (tr + .5) * s + 14); }
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(gx + s / 2, gy + s / 2, 52, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '44px PH'; ctx.fillText('AI', gx + s / 2, gy + s / 2 + 14);
      ctx.fillStyle = C.ink; ctx.font = '60px PH'; ctx.fillText('?', gx + 2.5 * s + 140, gy + 2.5 * s - 40);
      ctx.restore(); return;
    }
    const L = c.lines, below = !!c.below, hl = k >= 0 ? c.notes[k][0] : null;
    const lh = Math.min(c.panel ? 36 : 44, (below ? 560 : 760) / L.length), fs = Math.round(lh * .74), cx0 = 90, cy0 = 170, cw = below ? 1740 : 1000, ph = L.length * lh + 50;
    ctx.fillStyle = '#fffdf8'; ctx.strokeStyle = '#d8d2c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, below ? ph : Math.min(ph, 880), 18); ctx.fill(); ctx.stroke();   // the bubble wraps the whole code
    ctx.font = `${fs}px Consolas, "Courier New", monospace`;
    L.forEach((l, j) => {
      const y = cy0 + 36 + j * lh, on = !hl || (l.n >= hl[0] && l.n <= hl[1]);
      if (hl && on) { ctx.fillStyle = 'rgba(243,217,142,.6)'; ctx.fillRect(cx0 + 8, y - lh * .74, cw - 16, lh); ctx.fillStyle = C.teal; ctx.fillRect(cx0 + 8, y - lh * .74, 6, lh); }
      ctx.globalAlpha = a * (on ? 1 : .35);
      if (!l.plain) { ctx.fillStyle = '#9a9a9a'; ctx.fillText(String(l.n).padStart(2), cx0 + 26, y); }
      const txt = l.txt.replace(/\t/g, '  '), ci = l.plain ? -1 : txt.indexOf('#'), body = ci < 0 ? txt : txt.slice(0, ci), tx = cx0 + (l.plain ? 30 : 86);
      ctx.fillStyle = C.ink; ctx.fillText(body, tx, y);
      if (ci >= 0) { ctx.fillStyle = '#7a8a7a'; ctx.fillText(txt.slice(ci), tx + ctx.measureText(body).width, y); }
      ctx.globalAlpha = a;
    });
    if (k >= 0) {                                                       // the explanation of the highlighted part: below the code, or beside it for tall code
      const nx = below ? 90 : 1140, ny = below ? cy0 + ph + 30 : 300, nw = below ? 1740 : 690, nfs = below ? 42 : 46, lg = nfs + 14;
      ctx.font = `${nfs}px PH`; const rows = wrap(ctx, c.notes[k][1], nw - 70), nh = 60 + rows.length * lg;
      ctx.shadowColor = 'rgba(30,30,40,.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; ctx.fillStyle = '#fdfcf8';
      ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 18); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = C.teal; ctx.fillRect(nx + 30, ny + nh - 22, 44, 5);
      ctx.fillStyle = C.ink; rows.forEach((r, i) => ctx.fillText(r, nx + 35, ny + 52 + i * lg));
      ctx.font = '36px PH'; ctx.fillStyle = C.orange; ctx.fillText(`${k + 1} / ${c.notes.length}`, nx + nw - 100, ny + nh + 46);
    }
    ctx.restore();
  }

  // ── frame render with motion blur on whips
  const off = new OffscreenCanvas(1920, 1080), oc = off.getContext('2d');
  const qs = new URLSearchParams(location.search);
  if (qs.has('nosubs')) board.overlays.length = 0;
  function render(ctx, T_) {
    let cum = 0, fz = null;                                              // cards freeze the board: find where output time T_ sits
    for (const c of cards) { const s0 = c.at * F + cum; if (T_ >= s0 && T_ < s0 + c.R) { fz = { c, local: T_ - s0 }; break; } if (T_ >= s0 + c.R) cum += c.R; else break; }
    if (fz) { board.render(ctx, fz.c.at, cam); drawCard(ctx, fz.c, fz.local); return; }
    const tt = (T_ - cum) / F, dt = 1 / 24 / F, a = cam.at(tt), b = cam.at(Math.max(0, tt - dt));
    const sp = Math.hypot((a.x - b.x) * a.z, (a.y - b.y) * a.z) + Math.abs(Math.log(a.z / b.z)) * 900;
    const N = sp > 14 ? Math.min(12, Math.ceil(sp * .5 / 4)) : 1;
    if (N === 1) { board.render(ctx, tt, cam); return; }
    const ov = board.overlays; board.overlays = [];
    for (let i = 0; i < N; i++) { board.render(oc, tt - dt * .5 * i / (N - 1), cam); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(off, 0, 0); }
    ctx.globalAlpha = 1; board.overlays = ov;
    for (const o of ov) { ctx.save(); o.draw(ctx, tt); ctx.restore(); }
  }
  const ev = [...tl.ev].sort((a, b) => a.t - b.t);
  for (const e of ev) if (e.x != null) { const c = cam.at(e.t), [px, py] = W.toScreen(c, e.x, e.y); e.pan = +clamp((px - 960) / 1400, -.7, .7).toFixed(2); e.z = +c.z.toFixed(2); e.on = px > -100 && px < 2020 && py > -100 && py < 1180 ? 1 : 0; }
  const evS = ev.map(e => ({ ...e, t: +shiftT(e.t).toFixed(3), ...(e.dur != null ? { dur: +(e.dur * F).toFixed(3) } : {}) }));
  const subsS = subs.map(s => ({ ...s, t0: shiftT(s.t0), t1: shiftT(s.t1) }));
  return { dur: END_T * F + cardSum, render, ev: evS, subs: subsS, cam, tl };
}
