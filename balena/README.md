# Balena Roastery reels

Reusable pipeline for Balena's Thai educational Reels: one JSON config per episode, cached narration and effects, and an FFmpeg renderer that never calls paid APIs.

```
balena/
  episodes/ep01.json          episode config: script, voice/model, cut list, captions, layout, mix, outputs
  tools/build_episode.py      renderer (picture, graphics, captions, audio mix, final + clean encodes, SRT)
  tools/cache.py              hash cache: sha256(kind, text, voice, model, settings) -> cache/<kind>/<hash>.mp3
  tools/tts_elevenlabs.py     generate missing narration only (needs ELEVENLABS_API_KEY in your env)
  tools/align.py              Whisper large-v3 Thai transcription with word times (QC, local, free)
  cache/manifest.json         provenance for every cached file (generation id, credits, QC note)
  assets/cards/               opening thumbnail and ending card per episode
  assets/sfx/                 reusable effects + provenance JSON
  assets/fonts/               Kanit (SIL OFL 1.1), Thai + Latin merged
  assets/source/              source footage (not in git: *.mp4 is ignored)
  output/                     renders (not in git)
```

## Render

```bash
cd balena && python3 tools/build_episode.py episodes/ep01.json   # EP.01: original renderer
cd balena && python3 tools/build_reel.py episodes/ep02.json      # EP.02 onward
```

`build_reel.py` adds:

- full-screen static cards: proportional scale to 1920 px tall, no frame, blur or caption band;
- per-shot speed with frame blending, last-frame holds and push-ins;
- scene labels;
- looping ambience beds and effects with gain automation (`gain_points_db`);
- separate stems in `work/<code>/stems/`.

Captions are burned onto the footage only. The text spoken over the cards goes in the SRT (`srt_extra_card_captions`).

The renderer needs Python 3 with Pillow and ffmpeg built with libass.

## New episode (EP.03)

1. Copy `episodes/ep02.json` to `ep03.json`. Change the narration, cards, source, shots, captions and labels.
2. Keep `voice.voice_id` and `voice.model_id` so the narrator stays the same across the series.
3. Run `ELEVENLABS_API_KEY=... python3 tools/tts_elevenlabs.py episodes/ep03.json`. It only generates segments that aren't already cached.
4. Check the narration: `python3 tools/align.py cache/voice/<hash>.mp3 out.json`, and listen to it.
5. Set the `phrases`, `captions` and `labels` times from the measured pauses. Check each caption break by cutting the take there and transcribing both parts. Then render.

Effects ready to reuse in `assets/sfx/` (each with a provenance JSON):

- roasting drum bed (loop);
- soft transition whoosh;
- ending accent;
- first crack, which is illustrative and synthesized.

## Voice

- **Narrator:** "Zie – Calm, Friendly Thai Storyteller & Narrator", an ElevenLabs library voice (`bcdIY58WBBzAMmef52NW`).
- **Model:** `eleven_v4`.
- **Thai support:** the official models page lists Thai for `eleven_v4`, `eleven_v4_turbo`, `eleven_v3` and `eleven_v3_conversational`. It does not list Thai for `eleven_multilingual_v2` or `eleven_flash_v2_5`.
- **Why not `eleven_v3`:** it said "เริ่ม" wrong in both takes, which Whisper caught. `eleven_v4` got it right in both takes.
- **Possible upgrade:** this voice was picked from the library, not designed from the brief. A custom Balena voice could be made with Voice Design. Saving it uses one voice slot (0 of 10 are in use).

## Music

Music is omitted from EP01. ElevenLabs' Music Terms list the Starter plan as "For Individual Use Only", and whether a business account qualifies is the owner's decision. To add music:

1. Put an approved track in `assets/music/` with its licence or provenance.
2. Set `audio.music` in the config.
3. Add the music input to the mix in `build_episode.py`, ducked under the voice like the ambience.
