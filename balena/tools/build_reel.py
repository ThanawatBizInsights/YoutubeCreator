"""Balena reel renderer, v2 (EP02 onward). No network, no paid APIs: narration comes only from the hash cache.

Usage (from balena/):  python3 tools/build_reel.py episodes/ep02.json

Changes from build_episode.py (EP01): full-screen static cards with no frame, blur or caption band;
per-shot speed, holds and push-in; scene labels; looping ambience beds and effects with gain automation.

Layers are built separately and combined at the end:
  picture  opening card -> shots -> ending card                    work/<code>/picture.mkv
  labels   scene labels and the "illustration" note (in both versions)
  captions narration captions, burned into the final only           work/<code>/captions.ass + SRT
  audio    voice / beds / sfx (/ music) stems -> mix                 work/<code>/stems/*.wav
"""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "tools")); import cache

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit(f"command failed:\n{' '.join(map(str, args))[:800]}\n{r.stderr[-2500:]}")
    return r

ep = json.load(open(sys.argv[1])); os.chdir(HERE)
P, A, V = ep["picture"], ep["audio"], ep["voice"]
W, H = P["size"]; FPS = P["fps"]
work = os.path.join("work", ep["code"]); stems = os.path.join(work, "stems")
for d in (work, stems, "output", ep["outputs"]["voice_dir"]): os.makedirs(d, exist_ok=True)

# ---------------- narration (cache only) ----------------
segs = []
for n in ep["narration"]:
    f = cache.lookup("voice", n["tts_input"], V["voice_id"], V["model_id"], V["settings"])
    if not f:
        sys.exit(f"Narration {n['id']} is not cached (key {cache.key('voice', n['tts_input'], V['voice_id'], V['model_id'], V['settings'])}). "
                 "Generate it once with tools/tts_elevenlabs.py; the renderer never calls paid APIs.")
    segs.append((n, f))
    run(["ffmpeg", "-v", "error", "-y", "-i", f, "-ar", "48000", "-c:a", "pcm_s24le",
         os.path.join(ep["outputs"]["voice_dir"], f"{ep['code']}_VO_{n['id']}_{n['role'].replace(' ', '_')}.wav")])
last = segs[-1]
total = round(last[0]["at"] + last[0]["phrases"][-1][2] + ep["ending_hold_after_voice"], 3)

# ---------------- picture ----------------
def full_card(img, dur, out):
    # Full-screen: scale by height to the canvas keeping proportions, crop the sub-pixel remainder centred.
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", img,
         "-vf", f"scale=-2:{H}:flags=lanczos,crop={W}:{H},format=yuv420p,setsar=1", "-r", str(FPS), "-c:v", "ffv1", out])

def shot(s, out):
    d_play = s["src_dur"] / s["speed"]; d = d_play + s["hold"]; z0, z1 = s["push"]
    vf = f"trim=start={s['src_in']}:duration={s['src_dur']},setpts=(PTS-STARTPTS)/{s['speed']}"
    if s["speed"] != 1.0:
        vf += f",framerate=fps={FPS}"           # slow motion by frame blending (no optical flow, so beans are not warped)
    vf += f",fps={FPS}"
    if s["hold"]:
        vf += f",tpad=stop_mode=clone:stop_duration={s['hold']}"
    if z1 != 1.0 or z0 != 1.0:
        z = f"({z0}+({z1}-{z0})*t/{d:.3f})"
        vf += (f",scale=w='trunc({W}*{z}/2)*2':h='trunc({H}*{z}/2)*2':eval=frame:flags=lanczos,"
               f"crop={W}:{H}:'(in_w-{W})/2':'(in_h-{H})/2'")
    vf += ",format=yuv420p,setsar=1"
    run(["ffmpeg", "-v", "error", "-y", "-i", ep["source_video"], "-vf", vf, "-an", "-t", f"{d:.3f}", "-c:v", "ffv1", out])
    return d

clips = []; t = P["opening"]["dur"]
full_card(P["opening"]["image"], P["opening"]["dur"], f"{work}/opening.mkv"); clips.append((f"{work}/opening.mkv", 0.0))
for s in P["shots"]:
    out = f"{work}/shot_{s['id']}.mkv"; d = shot(s, out); clips.append((out, s["xfade_in"])); t += d - s["xfade_in"]
end_at = t - P["ending"]["xfade_in"]; end_dur = total - end_at
full_card(P["ending"]["image"], end_dur, f"{work}/ending.mkv"); clips.append((f"{work}/ending.mkv", P["ending"]["xfade_in"]))

fc = [f"[{i}:v]fps={FPS},settb=1/{FPS},setsar=1[n{i}]" for i in range(len(clips))]
cur, t = "n0", P["opening"]["dur"]
durs = [P["opening"]["dur"]] + [s["src_dur"] / s["speed"] + s["hold"] for s in P["shots"]] + [end_dur]
for i in range(1, len(clips)):
    xf = clips[i][1]
    if xf: fc.append(f"[{cur}][n{i}]xfade=transition=fade:duration={xf}:offset={t - xf:.3f}[x{i}]"); t += durs[i] - xf
    else:  fc.append(f"[{cur}][n{i}]concat=n=2:v=1:a=0,settb=1/{FPS}[x{i}]"); t += durs[i]
    cur = f"x{i}"
fc.append(f"[{cur}]fade=t=out:st={total - P['fade_out']:.3f}:d={P['fade_out']},trim=0:{total:.3f}[pic]")
args = ["ffmpeg", "-v", "error", "-y"]
for c, _ in clips: args += ["-i", c]
run(args + ["-filter_complex", ";".join(fc), "-map", "[pic]", "-c:v", "ffv1", f"{work}/picture.mkv"])
timeline = {"opening": [0, P["opening"]["dur"]], "ending_card_from": round(end_at, 3), "total": total}

# ---------------- labels + captions (ASS) and SRT ----------------
NAVY, CREAM, YELLOW, BLUE = (16, 38, 74), (255, 247, 232), (255, 214, 90), (124, 200, 255)
def col(rgb, a=0): return f"&H{a:02X}{rgb[2]:02X}{rgb[1]:02X}{rgb[0]:02X}"
def at(x): return f"{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}"
def markup(s):
    s = re.sub(r"\{([^}]*)\}", lambda m: "{\\c" + col(YELLOW) + "}" + m.group(1) + "{\\c" + col(CREAM) + "}", s)
    return re.sub(r"\[([^\]]*)\]", lambda m: "{\\c" + col(BLUE) + "}" + m.group(1) + "{\\c" + col(CREAM) + "}", s)
head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Kanit Balena SemiBold,76,{col(CREAM)},{col(CREAM)},{col(NAVY, 0x18)},{col(NAVY, 0x18)},0,0,0,0,100,100,0,0,3,16,0,2,150,150,270,222
Style: Label,Kanit Balena SemiBold,60,{col(YELLOW)},{col(YELLOW)},{col(NAVY, 0x30)},{col(NAVY, 0x30)},0,0,0,0,100,100,0,0,3,12,0,8,0,0,0,222
Style: Note,Kanit Balena Medium,42,{col(CREAM)},{col(CREAM)},{col(NAVY, 0x60)},{col(NAVY, 0x60)},0,0,0,0,100,100,0,0,3,9,0,8,0,0,0,222

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lab = ""
for l in ep["labels"]:
    y = 122 if l["style"] == "note" else 196
    lab += f"Dialogue: 2,{at(l['start'])},{at(l['end'])},{l['style'].title()},,0,0,0,,{{\\pos({W//2},{y})\\fad(200,200)}}{l['text']}\n"
cap = "".join(f"Dialogue: 1,{at(c['start'])},{at(c['end'])},Cap,,0,0,0,,{{\\fad(110,110)}}" + "\\N".join(markup(x) for x in c["lines"]) + "\n"
              for c in ep["captions"])
open(f"{work}/labels.ass", "w").write(head + lab)
open(f"{work}/captions.ass", "w").write(head + lab + cap)
def st(x): ms = round(x * 1000); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
with open(ep["outputs"]["srt"], "w", encoding="utf-8") as f:
    for i, c in enumerate(ep["captions"] + ep.get("srt_extra_card_captions", []), 1):
        f.write(f"{i}\n{st(c['start'])} --> {st(c['end'])}\n" + "\n".join(re.sub(r"[{}\[\]]", "", x) for x in c["lines"]) + "\n\n")

# ---------------- audio stems ----------------
def gain_expr(points, base_db):
    """Piecewise-linear gain in dB between breakpoints, as an ffmpeg volume expression (eval=frame)."""
    if not points: return f"{10 ** (base_db / 20):.6f}"
    e = f"pow(10,({base_db}+({points[-1][1]}))/20)"
    for (t0, g0), (t1, g1) in reversed(list(zip(points, points[1:]))):
        e = f"if(lt(t,{t1}),pow(10,({base_db}+({g0})+(({g1})-({g0}))*(t-{t0})/({t1}-{t0}))/20),{e})"
    return f"if(lt(t,{points[0][0]}),pow(10,({base_db}+({points[0][1]}))/20),{e})"

pad = f"apad=whole_dur={total:.3f},atrim=0:{total:.3f}"
# voice stem
args = ["ffmpeg", "-v", "error", "-y"]; fa = []
for i, (n, f) in enumerate(segs):
    args += ["-i", f]
    fa.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=mono,afade=t=in:d=0.02,adelay={round(n['at']*1000)}:all=1[v{i}]")
fa.append("".join(f"[v{i}]" for i in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0,highpass=f=70,"
          f"acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150:makeup=1.5,{pad}[o]")
run(args + ["-filter_complex", ";".join(fa), "-map", "[o]", "-ac", "1", "-c:a", "pcm_s24le", f"{stems}/voice.wav"])
# beds (looped), ducked under the voice
bed_files = []
for i, b in enumerate(A["beds"]):
    out = f"{stems}/bed{i}.wav"
    duck = (f"[b][1:a]sidechaincompress=threshold=0.03:ratio=3:attack=40:release=400[o]" if b.get("duck_under_voice") else "[b]anull[o]")
    run(["ffmpeg", "-v", "error", "-y", "-stream_loop", "-1" if b.get("loop") else "0", "-i", b["file"], "-i", f"{stems}/voice.wav", "-filter_complex",
         f"[0:a]aresample=48000,aformat=channel_layouts=stereo,{pad},volume='{gain_expr(b.get('gain_points_db'), b['base_db'])}':eval=frame[b];" + duck,
         "-map", "[o]", "-c:a", "pcm_s24le", out]); bed_files.append(out)
# effects
fx_files = []
for i, s in enumerate(A["sfx"]):
    # Trim with an input seek, not atrim=start: on ffmpeg 6, atrim with a non-zero start makes adelay drop the delay.
    out = f"{stems}/sfx{i}.wav"; tr = f",atrim=duration={s['max_dur']}" if s.get("max_dur") else ""
    fade = f",afade=t=out:st={s['max_dur'] - 0.3}:d=0.3" if s.get("max_dur") else ""
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(s.get("trim_in", 0)), "-i", s["file"], "-af",
         f"aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS{tr}{fade},afade=t=in:d=0.01,"
         f"adelay={round((s['at'] + s.get('trim_in', 0))*1000)}:all=1,{pad},volume='{gain_expr(s.get('gain_points_db'), s['base_db'])}':eval=frame",
         "-c:a", "pcm_s24le", out]); fx_files.append(out)
music_files = []  # A["music"] is null for EP02: no approved asset (see config music_note)

# mix and two-pass loudness normalisation
ins = [f"{stems}/voice.wav"] + bed_files + fx_files + music_files
args = ["ffmpeg", "-v", "error", "-y"]
for f in ins: args += ["-i", f]
run(args + ["-filter_complex", "".join(f"[{i}:a]" for i in range(len(ins))) + f"amix=inputs={len(ins)}:normalize=0,"
            f"afade=t=in:d=0.03,afade=t=out:st={total - 0.5:.3f}:d=0.5[m]", "-map", "[m]", "-ac", "2", "-c:a", "pcm_s24le", f"{work}/mix_raw.wav"])
J = run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{work}/mix_raw.wav", "-af",
         f"loudnorm=I={A['target_lufs']}:TP={A['true_peak']}:LRA=11:print_format=json", "-f", "null", "-"]).stderr
m = json.loads(J[J.rindex("{"):J.rindex("}") + 1])
ln = (f"loudnorm=I={A['target_lufs']}:TP={A['true_peak']}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
run(["ffmpeg", "-v", "error", "-y", "-i", f"{work}/mix_raw.wav", "-af", ln, "-c:a", "pcm_s24le", f"{work}/mix.wav"])

# ---------------- encode final + clean ----------------
enc = ["-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p",
       "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k",
       "-movflags", "+faststart", "-map_metadata", "-1", "-t", f"{total:.3f}"]
for ass, out in ((f"{work}/captions.ass", ep["outputs"]["final"]), (f"{work}/labels.ass", ep["outputs"]["clean"])):
    run(["ffmpeg", "-v", "error", "-y", "-i", f"{work}/picture.mkv", "-i", f"{work}/mix.wav",
         "-vf", f"ass={ass}:fontsdir=assets/fonts,format=yuv420p", "-map", "0:v", "-map", "1:a", *enc, out])
if ep["outputs"].get("ending_png"):
    run(["ffmpeg", "-v", "error", "-y", "-i", P["ending"]["image"], ep["outputs"]["ending_png"]])          # original resolution
    run(["ffmpeg", "-v", "error", "-y", "-i", P["ending"]["image"], "-vf", f"scale=-2:{H}:flags=lanczos,crop={W}:{H}",
         ep["outputs"]["ending_png"].replace(".png", f"_{W}x{H}.png")])                                       # as shown in the reel
json.dump({"timeline": timeline, "loudnorm_first_pass": m}, open(f"{work}/render_report.json", "w"), indent=1)
print(f"rendered {ep['outputs']['final']} + {ep['outputs']['clean']}  total {total:.2f}s  ending card from {end_at:.2f}s")
