"""Content-addressed cache for generated audio, so re-renders never call paid APIs again.

key = sha256(json({kind, text, voice_id, model_id, settings}))  ->  cache/<kind>/<key>.mp3
cache/manifest.json records provenance (generation id, flow, credits, date) for every file.
"""
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "cache", "manifest.json")

def key(kind, text, voice_id=None, model_id=None, settings=None):
    blob = json.dumps({"kind": kind, "text": text, "voice_id": voice_id, "model_id": model_id,
                       "settings": settings or {}}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()[:20]

def path(kind, k):
    return os.path.join(ROOT, "cache", kind, f"{k}.mp3")

def manifest():
    return json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}

def lookup(kind, text, voice_id=None, model_id=None, settings=None):
    """Return the cached file for these exact inputs, or None (= needs a new generation)."""
    p = path(kind, key(kind, text, voice_id, model_id, settings))
    return p if os.path.exists(p) else None

def register(kind, src, text, voice_id=None, model_id=None, settings=None, **provenance):
    k = key(kind, text, voice_id, model_id, settings)
    dst = path(kind, k); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.abspath(src) != os.path.abspath(dst):
        with open(src, "rb") as a, open(dst, "wb") as b: b.write(a.read())
    m = manifest()
    m[k] = {"kind": kind, "file": os.path.relpath(dst, ROOT), "text": text, "voice_id": voice_id,
            "model_id": model_id, "settings": settings or {}, **provenance}
    json.dump(m, open(MANIFEST, "w"), ensure_ascii=False, indent=1)
    return dst

if __name__ == "__main__":
    print(json.dumps(manifest(), ensure_ascii=False, indent=1))
