#!/bin/sh
# Builds the 9:16 reel from source/original.mov. Run from the repo root: sh reel/build.sh
set -e
SRC=source/original.mov; W=work; OUT=output/blocks-night-reel-9x16.mp4
# cut list (source seconds): intro+pizza, fox, last moment
A0=2.9;  A1=17.8
B0=18.3; B1=22.3
C0=26.7; C1=29.5
TOTAL=21.7
TM="zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,eq=contrast=1.06:saturation=1.12:gamma=1.05,colorbalance=rm=0.03:bm=-0.03"
CROP="crop=1215:2160:1390:0,scale=1080:1920:flags=lanczos"
seg() { # $1 label $2 start $3 end
  echo "[0:v]trim=$2:$3,setpts=PTS-STARTPTS[v$1];[0:a]atrim=$2:$3,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=$(echo "$3-$2-0.03" | bc):d=0.03[a$1];"
}
FC="$(seg A $A0 $A1)$(seg B $B0 $B1)$(seg C $C0 $C1)"
FC="$FC[vA][aA][vB][aB][vC][aC]concat=n=3:v=1:a=1[vcat][acat];"
FC="$FC[vcat]$CROP,$TM,ass=reel/subs.ass:fontsdir=$W/fonts,fade=t=in:d=0.4,fade=t=out:st=$(echo "$TOTAL-0.8" | bc):d=0.8[v];"
FC="$FC[acat]highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=10:release=200:makeup=2,asplit=2[voice][key];"
FC="$FC[1:a]volume=0.55[mus];[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[musd];"
FC="$FC[voice][musd]amix=inputs=2:normalize=0:duration=first,afade=t=out:st=$(echo "$TOTAL-1" | bc):d=1[mix]"
ffmpeg -v error -y -i $SRC -i $W/music.wav -filter_complex "$FC" -map "[v]" -map "[mix]" -c:v ffv1 -c:a pcm_s24le $W/reel_master.mkv
# two-pass loudness to YouTube's -14 LUFS, strip all metadata
J=$(ffmpeg -hide_banner -nostats -i $W/reel_master.mkv -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
LN="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000"
ffmpeg -v error -y -i $W/reel_master.mkv -map_metadata -1 -af "$LN" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 192k -movflags +faststart $OUT
echo "built $OUT"
