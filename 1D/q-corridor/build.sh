#!/bin/sh
# Q-learning corridor — Whiteboard Explainer. One command: sh build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/c/Users/minht/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out"
python "$HERE/run_seed1.py" > "$HERE/out/1DGrid_seed1_output.txt"     # real output of 1DGrid.py, random.seed(1)
cd "$LIB"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/mix.wav" "$HERE/q-corridor.mp4" 24 0
