# Q-learning trong hành lang 5 ô — Whiteboard Explainer (~75 s, no voice)

Source of truth for numbers: `1DGrid.py` run with `random.seed(1)` (`run_seed1.py`, output in `out/1DGrid_seed1_output.txt`, parsed into `numbers.json`); colours from `Hành lang Q-learning.html`. N=5, α=0.5, γ=0.9, ε=0.7, 200 episodes, reward −1 / +10, terminal target = reward only.
Real seed-1 facts used: first goal update Q[3][right] 0→5.0, second 5.0→7.5; greedy test after episode 1 = stuck, 50 steps; from episode 2 = 0→1→2→3→4 in 4 steps; final right scores 4.58 / 6.2 / 8.0 / 10.0 for cells 0–3. The Q-table on the board is a real snapshot after episode 1 and after episode 2.

## Three candidate structures
1. **Single journey**: the board is the corridor; follow the AI from stuck → random walk → first lucky goal → value flows back → clean walk.
2. **Before / after split board**: left half "Q-table all 0" (stuck), right half "trained"; the camera whips between them.
3. **Equation-first**: write the update formula big, then unpack each term with the corridor as an insert.

**Chosen: 1, with a bit of 3.** The story has a turn (the lucky first goal) and the native move fits it: the *pen rides the line backward* from the goal while the numbers get written cell by cell. The formula is written once, then used with real numbers.

## Logline / arc
A tiny AI that doesn't know where the goal is learns the way only from reward.
Setup (stuck, rules) → turn (random luck, one update) → value spreads backward → ending (walks straight, "chỉ học từ reward").

## Benchmark
Learn: RSA Animate (one board, camera travels), minutephysics (one sentence = one drawing). Not copied: their drawings, hands, music.

## Colours (held for the whole film, = HTML palette)
- dark ink `#14181f` — things and structure (corridor, text)
- teal `#0b7a6b` — the AI / Q values / process (HTML --accent)
- orange `#a8470b` — exploration, random moves (HTML --explore)
- gold `#8a5a00` on `#fbf0d6` — goal cell (HTML --goal / --goal-bg)
(Accent per region: gold for goal. Four hues, mapped to HTML; the gold is a fill, not a pen.)

## Shots / beats (1920×1080, 24 fps)
| t | shot | content (captions VI, tech terms EN) |
|---|---|---|
| 0–6 | wide, board draws corridor of 5 cells, magnet "AI" drops on ô 0, goal cell filled gold | "Con AI đứng ở ô 0. Đích ở ô 4 — nhưng nó không biết." |
| 6–13 | push in on rules, pen writes −1 per step, +10 at goal, thick wall left of ô 0, AI bumps | "Mỗi bước −1 reward. Tới đích +10. Đi trái ở ô 0: đụng tường, đứng yên." |
| 13–22 | whip to Q-table region: 5 rows × 2 columns of 0, greedy AI nudges the wall twice | "Q-table: mỗi (ô, action) một điểm. Ban đầu toàn 0 → greedy kẹt ở ô 0." |
| 22–32 | track along corridor, orange random walk path, ε = 0.7 chip | "ε = 0.7: 70% đi ngẫu nhiên (explore), còn lại chọn Q lớn nhất." |
| 32–44 | hold on formula written term by term; α, γ chips | "Sau mỗi bước: Q += α·(reward + γ·max Q' − Q)" |
| 44–54 | push into cell 3→4: pen writes the numbers `Q(3,→) += 0.5 × (10 − 0) = 5.0`; table cell fills teal | "Bước vào đích: 0.5 × (10 − 0) = 5.0" |
| 54–65 | pen rides line backward ô 3 → 2 → 1: 1.75, 0.29 written under cells; teal intensity fades with distance | "Giá trị lan ngược từ đích: ô 3, rồi ô 2, ô 1…" |
| 65–72 | eraser wipes the orange random path (the rewind), many episodes: table shows 4.6 6.2 8.0 10 | "Sau nhiều episode…" |
| 72–80 | AI magnet slides 0→4 straight, circle the goal twice; end card written | "Đi thẳng tới đích. Nó chỉ học từ reward." |

Camera moves: pull from tiny drawing (open), push-in, whip, ride-the-line (twice), hold still, split-free full-board end. ≥ 4 moves.
Native move at the peak: the pen rides the line backward from the goal, writing the spreading values.

## Sound (no voice)
- Ambience: low room tone.
- Foley: marker strokes (felt hiss + squeak), magnet click on drop/slide, eraser rub, bump thump at the wall.
- Music: sparse marimba/pizzicato, one instrument added per step of the mechanism; full stop (silence) before the first +10 update; rising whistle/ping as each value is written.
- Two silences: before the +10 update (~43 s) and before the end card (~71 s).

## Subtitles
Burned: off-white rounded label, handwriting-like face (Architects Daughter; has Vietnamese glyphs? — checked at build, else Patrick Hand / Kalam), teal dash, ≤ 44 chars/line, bottom 12% free. Hold ≥ 1.8 s and `readcheck.mjs` passes. `subtitles_vi.srt` exported.

## As built
Runtime 83.5 s, 24 fps. The shot table above is the plan; the final beat sheet is in `film.js` (captions + timings). Board text uses only English terms/numbers (the single-line font has no Vietnamese diacritics); Vietnamese is in the burned captions (Patrick Hand) and `subtitles_vi.srt`.
