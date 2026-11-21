"""Stage an episode's assets into the Remotion project's public/ folder. No network, no paid APIs.

Usage (from balena/):  python3 tools/prepare_remotion.py episodes/ep03.json
- Narration is copied from the hash cache (cache/voice/<file_key>.mp3). A missing file stops with a clear
  message; generate it once with tools/tts_elevenlabs.py, the renderer never calls an API.
- Effects are levelled to -30 dBFS RMS so Remotion volumes (max 1.0) can set the mix.
- Cards, source footage and the Kanit font are copied unchanged.
"""
import json, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(HERE)
ep = json.load(open(sys.argv[1])); code = ep["code"].lower()
pub = os.path.join("remotion", "public", code); os.makedirs(pub, exist_ok=True)
def cp(src, name): shutil.copy(src, os.path.join(pub, name)); print("  ", name)
def level(src, name, target=-30.0):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    mean = float(r.split("mean_volume:")[1].split("dB")[0]); gain = target - mean
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", f"volume={gain:.2f}dB", "-ar", "48000", "-c:a", "pcm_s16le",
                    os.path.join(pub, name)], check=True); print(f"   {name} ({gain:+.1f} dB)")
print("narration:")
for n in ep["narration"]:
    f = f"cache/voice/{n['file_key']}.mp3"
    if not os.path.exists(f): sys.exit(f"missing cached narration {n['id']} ({f}); generate it once with tools/tts_elevenlabs.py")
    cp(f, f"vo_{n['id']}.mp3")
print("effects / music:")
if "stage" in ep:   # EP04+: config lists what to stage and the RMS level for each
    for name, src in ep["stage"]["audio"].items():
        level(src, f"{name}.wav", ep["stage"]["level_dbfs"].get(name, -30.0))
else:               # EP03 (original list)
    for name in ("roasting_drum_bed_loop", "beans_cascade_tray", "cooling_fan_airflow_loop", "cooling_tray_stirring_loop", "soft_transition_accent"):
        level(f"assets/sfx/{name}.mp3", f"{name}.wav")
print("picture + font:")
cp(ep["source_video"], "source.mp4")
cp(ep["timeline_seconds"]["opening_card"]["image"], "opening_card.webp")
cp(ep["timeline_seconds"]["ending_card"]["image"], "ending_card.webp")
os.makedirs("remotion/public/fonts", exist_ok=True)
for w in ("SemiBold", "Medium"): shutil.copy(f"assets/fonts/KanitBalena-{w}.ttf", f"remotion/public/fonts/KanitBalena-{w}.ttf")
print("done ->", pub)
