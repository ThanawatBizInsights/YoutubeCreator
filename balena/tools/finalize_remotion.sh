#!/bin/sh
# Loudness-normalise a Remotion render without re-encoding the picture.
# Usage (from balena/): sh tools/finalize_remotion.sh remotion/out/X_remotion.mp4 output/X.mp4 [-15] [-1.5]
set -e
IN=$1; OUT=$2; I=${3:--15}; TP=${4:--1.5}
J=$(ffmpeg -hide_banner -nostats -i "$IN" -af loudnorm=I=$I:TP=$TP:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -v error -y -i "$IN" -map 0:v -map 0:a -c:v copy \
  -af "loudnorm=I=$I:TP=$TP:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k -movflags +faststart -map_metadata -1 "$OUT"
echo "finalised $OUT (input $(g input_i) LUFS)"
