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
    tag = n["id"] + ("_" + n["role"].replace(" ", "_") if n.get("role") else "")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"cache/voice/{n['file_key']}.mp3", "-ar", "48000", "-c:a", "pcm_s24le",
                    f"{out['voice_dir']}/{ep['code']}_VO_{tag}.wav"], check=True)
if out.get("narration_wav"):   # one timed narration stem, chunks placed exactly as in the video
    ins, fc = [], []
    for n in ep["narration"]:
        for c in n.get("chunks", [{"from": 0, "to": 999, "at": n.get("at", 0)}]):
            ins += ["-i", f"cache/voice/{n['file_key']}.mp3"]; k = len(ins) // 2 - 1
            fc.append(f"[{k}:a]atrim={c['from']}:{c['to']},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono,"
                      f"afade=t=in:d=0.01,adelay={round(c['at'] * 1000)}:all=1[v{k}]")
    n_in = len(ins) // 2
    fc.append("".join(f"[v{i}]" for i in range(n_in)) + f"amix=inputs={n_in}:normalize=0,apad=whole_dur={ep['timeline_seconds']['total']},atrim=0:{ep['timeline_seconds']['total']}[o]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[o]", "-c:a", "pcm_s24le", out["narration_wav"]], check=True)
    print("wrote", out["narration_wav"])
print("wrote", out["srt"], "and", len(ep["narration"]), "voiceover files")
