"""Transcribe an audio file with Whisper large-v3 (Thai) and print word timings as JSON. Usage: align.py in.(mp3|wav) out.json"""
import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, info = m.transcribe(sys.argv[1], language="th", word_timestamps=True, beam_size=5, vad_filter=False)
out = {"text": "", "words": []}
for s in segs:
    out["text"] += s.text
    out["words"] += [[round(w.start, 3), round(w.end, 3), w.word, round(w.probability, 2)] for w in s.words]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(out["text"])
