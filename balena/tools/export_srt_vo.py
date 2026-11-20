"""Write an episode's Thai SRT and separate voiceover WAVs from its config (Remotion episodes, EP03+).
Usage (from balena/): python3 tools/export_srt_vo.py episodes/ep03.json"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(HERE)
ep = json.load(open(sys.argv[1])); out = ep["outputs"]
caps = sorted(ep["captions_burned"] + ep["captions_srt_only_cards"], key=lambda c: c["start"])
st = lambda x: (lambda ms: f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}")(round(x * 1000))
with open(out["srt"], "w", encoding="utf-8") as f:
    for i, c in enumerate(caps, 1):
        f.write(f"{i}\n{st(c['start'])} --> {st(c['end'])}\n" + "\n".join(re.sub(r"[{}\[\]]", "", l) for l in c["lines"]) + "\n\n")
os.makedirs(out["voice_dir"], exist_ok=True)
for n in ep["narration"]:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"cache/voice/{n['file_key']}.mp3", "-ar", "48000", "-c:a", "pcm_s24le",
                    f"{out['voice_dir']}/{ep['code']}_VO_{n['id']}_{n['role'].replace(' ', '_')}.wav"], check=True)
print("wrote", out["srt"], "and", len(ep["narration"]), "voiceover files")
