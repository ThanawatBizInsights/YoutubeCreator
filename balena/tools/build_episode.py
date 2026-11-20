"""Render a Balena Roastery reel from an episode config. No network, no paid APIs: narration and
effects come only from the hash-addressed cache (tools/cache.py).

Usage (from balena/):  python3 tools/build_episode.py episodes/ep01.json
Layers (rendered separately, then combined):
  picture  : intro card -> footage shots -> ending card            (work/<code>/picture_clean.mkv)
  graphics : time-lapse note (in both versions)
  captions : Thai phrase captions, ASS burned in final only         (work/<code>/captions.ass, output SRT)
  audio    : narration chunks + source ambience (ducked) + sfx (+ music when approved) -> mix.wav
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "tools")); import cache

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit(f"command failed:\n{' '.join(args)[:600]}\n{r.stderr[-2000:]}")
    return r

ep = json.load(open(sys.argv[1])); os.chdir(HERE)
P, A, V = ep["picture"], ep["audio"], ep["voice"]
W, H = P["size"]; FPS = P["fps"]
work = os.path.join("work", ep["code"]); os.makedirs(work, exist_ok=True); os.makedirs("output", exist_ok=True)
FONT_DIR = "assets/fonts"
NAVY, CREAM = (16, 38, 74), (255, 247, 232)

# ---------- 1. narration from cache only ----------
vo = {}
for seg in ep["narration"]:
    f = cache.lookup("voice", seg["tts_input"], V["voice_id"], V["model_id"], V["settings"])
    if not f:
        sys.exit(f"Narration '{seg['id']}' is not cached for these inputs (key "
                 f"{cache.key('voice', seg['tts_input'], V['voice_id'], V['model_id'], V['settings'])}). "
                 "Generate it once (tools/tts_elevenlabs.py) - the renderer never calls paid APIs.")
    vo[seg["id"]] = f
for seg_id, out in (("explanation", ep["outputs"]["voice_explanation"]), ("ending", ep["outputs"]["voice_ending"])):
    run(["ffmpeg", "-v", "error", "-y", "-i", vo[seg_id], "-ar", "48000", "-c:a", "pcm_s24le", out])

# ---------- 2. card stills: card at reduced scale, rounded, shadow, over a soft blurred copy ----------
def card_layers(img_path, tag):
    src = Image.open(img_path).convert("RGB")
    bg = src.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(40))
    bg = Image.blend(bg, Image.new("RGB", (W, H), CREAM), 0.55)
    s = P["card_layout"]["scale"]; cw = round(W * s); ch = round(cw * src.height / src.width)
    card = src.resize((cw, ch), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (cw, ch), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), P["card_layout"]["radius"], fill=255)
    card.putalpha(mask)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); x = (W - cw) // 2; y = P["card_layout"]["top"]
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 14, x + cw, y + ch + 14), P["card_layout"]["radius"], fill=(40, 28, 10, 90))
    bg = Image.alpha_composite(bg.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(22)))
    bg.convert("RGB").save(f"{work}/{tag}_bg.png"); card.save(f"{work}/{tag}_card.png")
    return x, y, cw, ch

def card_clip(spec, tag):
    x, y, cw, ch = card_layers(spec["image"], tag); d = spec["dur"]; z = spec["push"]
    # whole-card push-in only (uniform scale, card never warped), centred on the card's own centre
    vf = (f"[1:v]scale=w='trunc({cw}*(1+{z}*t/{d})/2)*2':h='trunc({ch}*(1+{z}*t/{d})/2)*2':eval=frame:flags=lanczos[c];"
          f"[0:v][c]overlay=x='{x + cw/2}-w/2':y='{y + ch/2}-h/2':eval=frame,format=yuv420p,setsar=1[v]")
    out = f"{work}/{tag}.mkv"
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-t", str(d), "-i", f"{work}/{tag}_bg.png",
         "-loop", "1", "-framerate", str(FPS), "-t", str(d), "-i", f"{work}/{tag}_card.png",
         "-filter_complex", vf, "-map", "[v]", "-r", str(FPS), "-c:v", "ffv1", out])
    return out

intro = card_clip(P["intro_card"], "intro")
ending = card_clip(P["ending_card"], "ending")

# ---------- 3. footage shots: trims in chronological order, optional gentle push-in ----------
shots = []
for s in P["shots"]:
    d, z = s["dur"], s["push"]
    vf = f"trim=start={s['src_in']}:duration={d},setpts=PTS-STARTPTS"
    if z:  # digital push-in: scale up a little each frame, crop back to frame size (centre)
        vf += (f",scale=w='trunc({W}*(1+{z}*t/{d})/2)*2':h='trunc({H}*(1+{z}*t/{d})/2)*2':eval=frame:flags=lanczos,"
               f"crop={W}:{H}:'(in_w-{W})/2':'(in_h-{H})/2'")
    vf += f",fps={FPS},format=yuv420p,setsar=1"
    out = f"{work}/shot_{s['id']}.mkv"
    run(["ffmpeg", "-v", "error", "-y", "-i", ep["source_video"], "-vf", vf, "-an", "-c:v", "ffv1", out]); shots.append((s, out))

# ---------- 4. assemble clean picture (+ time-lapse note, which belongs to both versions) ----------
inputs = [intro] + [o for _, o in shots] + [ending]
fc = [f"[{i}:v]fps={FPS},settb=1/{FPS},setsar=1[n{i}]" for i in range(len(inputs))]
cur = "n0"; t = P["intro_card"]["dur"]
for i, (s, _) in enumerate(shots, start=1):
    xf = s["xfade_in"]
    if xf: fc.append(f"[{cur}][{i}:v]xfade=transition=fade:duration={xf}:offset={t - xf:.3f}[x{i}]".replace(f"[{i}:v]", f"[n{i}]")); t += s["dur"] - xf
    else:  fc.append(f"[{cur}][n{i}]concat=n=2:v=1:a=0,settb=1/{FPS}[x{i}]"); t += s["dur"]
    cur = f"x{i}"
xf = P["ending_card"]["xfade_in"]; n = len(inputs) - 1
fc.append(f"[{cur}][n{n}]xfade=transition=fade:duration={xf}:offset={t - xf:.3f}[xe]"); total = t - xf + P["ending_card"]["dur"]
fc.append(f"[xe]fade=t=out:st={total - P['fade_out']:.3f}:d={P['fade_out']}[pic]")
args = ["ffmpeg", "-v", "error", "-y"]
for f in inputs: args += ["-i", f]
run(args + ["-filter_complex", ";".join(fc), "-map", "[pic]", "-c:v", "ffv1", f"{work}/picture_raw.mkv"])

# ---------- 5. ASS: note layer + caption layer ----------
def ass_t(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h}:{m:02d}:{s:05.2f}"
def colour(rgb, a=0): return f"&H{a:02X}{rgb[2]:02X}{rgb[1]:02X}{rgb[0]:02X}"
YELLOW, BLUE = (255, 214, 90), (124, 200, 255)
def markup(line):  # {x} butter yellow, [x] ocean blue
    line = re.sub(r"\{([^}]*)\}", lambda m: "{\\c" + colour(YELLOW) + "}" + m.group(1) + "{\\c" + colour(CREAM) + "}", line)
    return re.sub(r"\[([^\]]*)\]", lambda m: "{\\c" + colour(BLUE) + "}" + m.group(1) + "{\\c" + colour(CREAM) + "}", line)
card_band_y = P["card_layout"]["top"] - 90           # caption band above the card, inside the top safe margin
head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Kanit Balena SemiBold,76,{colour(CREAM)},{colour(CREAM)},{colour(NAVY, 0x18)},{colour(NAVY, 0x18)},0,0,0,0,100,100,0,0,3,16,0,2,150,150,{H - 1420},222
Style: CapCard,Kanit Balena SemiBold,68,{colour(CREAM)},{colour(CREAM)},{colour(NAVY, 0x10)},{colour(NAVY, 0x10)},0,0,0,0,100,100,0,0,3,14,0,5,150,150,0,222
Style: Note,Kanit Balena Medium,46,{colour(CREAM)},{colour(CREAM)},{colour(NAVY, 0x50)},{colour(NAVY, 0x50)},0,0,0,0,100,100,0,0,3,10,0,7,0,0,0,222

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
note = ep["timelapse_note"]
note_ev = f"Dialogue: 2,{ass_t(note['start'])},{ass_t(note['end'])},Note,,0,0,0,,{{\\pos(64,290)\\fad(250,250)}}{note['text']}\n"
caps = ""
for c in ep["captions"]:
    text = "\\N".join(markup(l) for l in c["lines"])
    if c["zone"] == "card":
        caps += f"Dialogue: 1,{ass_t(c['start'])},{ass_t(c['end'])},CapCard,,0,0,0,,{{\\pos({W//2},{card_band_y})\\fad(120,120)}}{text}\n"
    else:
        caps += f"Dialogue: 1,{ass_t(c['start'])},{ass_t(c['end'])},Cap,,0,0,0,,{{\\fad(120,120)}}{text}\n"
open(f"{work}/note.ass", "w").write(head + note_ev)
open(f"{work}/captions.ass", "w").write(head + note_ev + caps)

def srt_t(x): ms = round(x * 1000); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
with open(ep["outputs"]["srt"], "w", encoding="utf-8") as f:
    for i, c in enumerate(ep["captions"], 1):
        f.write(f"{i}\n{srt_t(c['start'])} --> {srt_t(c['end'])}\n" + "\n".join(re.sub(r"[{}\[\]]", "", l) for l in c["lines"]) + "\n\n")

# ---------- 6. audio mix ----------
srcs = ["-i", vo["explanation"], "-i", vo["ending"], "-i", ep["source_video"]]
for s in A["sfx"]: srcs += ["-i", s["file"]]
fa = []; vlabels = []
for seg, idx in (("explanation", 0), ("ending", 1)):
    for c in next(n for n in ep["narration"] if n["id"] == seg)["chunks"]:
        lab = f"v{c['id']}"
        fa.append(f"[{idx}:a]atrim={c['from']}:{c['to']},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono,"
                  f"afade=t=in:d=0.02,afade=t=out:st={c['to'] - c['from'] - 0.03:.3f}:d=0.03,adelay={round(c['at']*1000)}:all=1[{lab}]")
        vlabels.append(f"[{lab}]")
fa.append("".join(vlabels) + f"amix=inputs={len(vlabels)}:normalize=0,highpass=f=70,"
          "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150:makeup=1.5,"
          f"apad=whole_dur={total:.3f},asplit=2[voice][key]")
# ambience: the source's own sound under each shot, short crossfades at cuts, gone by the ending card
amb = []; t = P["intro_card"]["dur"]
for i, (s, _) in enumerate(shots):
    start = t - s["xfade_in"]
    fa.append(f"[2:a]atrim=start={s['src_in']}:duration={s['dur']},asetpts=PTS-STARTPTS,aresample=48000,"
              f"afade=t=in:d={max(s['xfade_in'], 0.12)},afade=t=out:st={s['dur'] - 0.12:.3f}:d=0.12,"
              f"adelay={round(start*1000)}:all=1[amb{i}]"); amb.append(f"[amb{i}]"); t = start + s["dur"]
fa.append("".join(amb) + f"amix=inputs={len(amb)}:normalize=0,volume={A['ambience_gain_db']}dB,apad=whole_dur={total:.3f}[ambraw]")
fa.append("[ambraw][key]sidechaincompress=threshold=0.02:ratio=4:attack=30:release=350[ambd]" if A["ambience_duck"] else "[ambraw]anull[ambd]")
sfx = []
for i, s in enumerate(A["sfx"]):
    fa.append(f"[{3+i}:a]aresample=48000,volume={s['gain_db']}dB,afade=t=out:st=1.2:d=0.3,atrim=0:1.5,adelay={round(s['at']*1000)}:all=1[s{i}]"); sfx.append(f"[s{i}]")
fa.append("[voice][ambd]" + "".join(sfx) + f"amix=inputs={2+len(sfx)}:normalize=0,atrim=0:{total:.3f},"
          f"afade=t=in:d=0.05,afade=t=out:st={total - 0.6:.3f}:d=0.6[mix]")
run(["ffmpeg", "-v", "error", "-y", *srcs, "-filter_complex", ";".join(fa), "-map", "[mix]", "-ac", "2", "-c:a", "pcm_s24le", f"{work}/mix_raw.wav"])
J = run(["ffmpeg", "-hide_banner", "-nostats", "-i", f"{work}/mix_raw.wav", "-af",
         f"loudnorm=I={A['target_lufs']}:TP={A['true_peak']}:LRA=11:print_format=json", "-f", "null", "-"]).stderr
m = json.loads(J[J.rindex("{"):J.rindex("}") + 1])
ln = (f"loudnorm=I={A['target_lufs']}:TP={A['true_peak']}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
      f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
run(["ffmpeg", "-v", "error", "-y", "-i", f"{work}/mix_raw.wav", "-af", ln, "-c:a", "pcm_s24le", f"{work}/mix.wav"])

# ---------- 7. encode final (captions) and clean (no narration captions) ----------
enc = ["-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p",
       "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k",
       "-movflags", "+faststart", "-map_metadata", "-1"]
for ass, out in ((f"{work}/captions.ass", ep["outputs"]["final"]), (f"{work}/note.ass", ep["outputs"]["clean"])):
    run(["ffmpeg", "-v", "error", "-y", "-i", f"{work}/picture_raw.mkv", "-i", f"{work}/mix.wav",
         "-vf", f"ass={ass}:fontsdir={FONT_DIR},format=yuv420p", "-map", "0:v", "-map", "1:a", *enc, "-t", f"{total:.3f}", out])
json.dump({"total_duration": round(total, 3), "loudnorm_first_pass": m}, open(f"{work}/render_report.json", "w"), indent=1)
print(f"rendered {ep['outputs']['final']} and {ep['outputs']['clean']}  ({total:.2f} s)")
