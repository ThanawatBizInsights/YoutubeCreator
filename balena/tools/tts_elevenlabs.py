"""Generate narration that is missing from the cache, via the ElevenLabs API (paid: only on a cache miss).

Usage (from balena/):  ELEVENLABS_API_KEY=... python3 tools/tts_elevenlabs.py episodes/ep02.json
- The key is read from the environment only; it is never printed, logged or written to disk.
- Voice/model come from the episode config (voice.voice_id / voice.model_id), or from
  ELEVENLABS_VOICE_ID if the config leaves voice_id empty.
- Segments already in the cache are skipped, so re-running costs nothing.
- Uses the /with-timestamps endpoint and stores its character alignment next to the audio,
  for exact caption timing.
NOTE: written for local use; it was not run in the cloud session that produced EP01 (EP01 audio came
from the ElevenLabs connector and is already cached).
"""
import base64, json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import cache

key = os.environ.get("ELEVENLABS_API_KEY")
if not key: sys.exit("Set ELEVENLABS_API_KEY in your environment (never paste it into code or chat).")
ep = json.load(open(sys.argv[1])); v = ep["voice"]
voice_id = v.get("voice_id") or os.environ.get("ELEVENLABS_VOICE_ID")
if not voice_id: sys.exit("No voice_id in the config and ELEVENLABS_VOICE_ID is not set.")
for seg in ep["narration"]:
    if cache.lookup("voice", seg["tts_input"], voice_id, v["model_id"], v["settings"]):
        print(f"{seg['id']}: cached, skipped"); continue
    body = {"text": seg["tts_input"], "model_id": v["model_id"]}
    if v["settings"]: body["voice_settings"] = v["settings"]
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        res = json.load(r)
    tmp = f"/tmp/{seg['id']}.mp3"; open(tmp, "wb").write(base64.b64decode(res["audio_base64"]))
    dst = cache.register("voice", tmp, seg["tts_input"], voice_id, v["model_id"], v["settings"],
                         provider="elevenlabs-api", endpoint="text-to-speech/with-timestamps")
    json.dump(res.get("alignment"), open(dst[:-4] + ".alignment.json", "w"), ensure_ascii=False)
    print(f"{seg['id']}: generated -> {dst}  (review it, then set chunk/phrase times in the config)")
