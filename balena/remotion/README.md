# Balena Roastery reels in Remotion (EP.03 onward)

The editable Remotion project for Balena's reels. Each clip, card, caption, label and audio item is its own named JSX node in `src/BalenaEP03.tsx`, with timings written as seconds × fps. The "Final" and "Clean" compositions share one component and differ only in `showCaptions`.

## Render EP.03

Run from the `balena/` folder:

```bash
python3 tools/prepare_remotion.py episodes/ep03.json
```

This stages the cached narration, levelled effects, cards, source footage and font into `remotion/public/`. It never calls an API.

```bash
cd remotion && NODE_USE_ENV_PROXY=1 npx remotion render Balena-EP03-Final out/Balena_EP03_Final_remotion.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k
```

```bash
cd remotion && NODE_USE_ENV_PROXY=1 npx remotion render Balena-EP03-Clean out/Balena_EP03_Clean_remotion.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k
```

```bash
sh tools/finalize_remotion.sh remotion/out/Balena_EP03_Final_remotion.mp4 output/Balena_EP03_Final_TH.mp4
```

```bash
sh tools/finalize_remotion.sh remotion/out/Balena_EP03_Clean_remotion.mp4 output/Balena_EP03_Clean.mp4
```

```bash
python3 tools/export_srt_vo.py episodes/ep03.json
```

What these steps do:

- **`finalize_remotion.sh`** runs two-pass loudnorm to −15 LUFS / −1.5 dBTP, copies the video stream untouched, adds fast-start and strips metadata. Remotion has no loudness normaliser of its own.
- **`export_srt_vo.py`** writes `output/Balena_EP03_TH.srt` and the four voiceover WAVs.
- **`NODE_USE_ENV_PROXY=1`** is only needed where outbound traffic goes through a proxy, as in the cloud session. It lets Remotion download its bundled Chrome Headless Shell from `remotion.media` on first use.

To preview in Studio, run `npm run dev` from `remotion/`.

## Licence

Remotion is free for individuals and companies with up to 3 employees. Larger companies need a paid Remotion licence and should pass `--license-key=…` to every render (see https://www.remotion.dev/docs/license). These EP.03 renders were made **without** a licence key, so check which case applies to Balena Roastery.

## Notes for EP.04

- **Looped audio:** `loop` together with `durationInFrames` repeats that short range until the composition ends. Bound each looped bed with its own `<Sequence>` and omit `durationInFrames` on the `<Audio>`, as `BalenaEP03.tsx` does.
- **Cards:** keep them full-screen and static (`FullScreenCard`). Don't put narration captions over them; those lines go in the SRT only.
- **Delivery tags:** don't put a delivery tag right before a phrase that starts with "เสียง…". With a tag there, `eleven_v4` performed a sound instead of saying the words.

## Render EP.04

Run from the `balena/` folder:

```bash
python3 tools/prepare_remotion.py episodes/ep04.json
```

This stages the cached narration, the music master, the crack ticks, the bed, the cards, the source and the font.

```bash
cd remotion && NODE_USE_ENV_PROXY=1 npx remotion render Balena-EP04-Final out/Balena_EP04_Final_remotion.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k
```

```bash
cd remotion && NODE_USE_ENV_PROXY=1 npx remotion render Balena-EP04-Clean out/Balena_EP04_Clean_remotion.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k
```

```bash
sh tools/finalize_remotion.sh remotion/out/Balena_EP04_Final_remotion.mp4 output/Balena_EP04_Final_TH.mp4 -15 -2.0
```

```bash
sh tools/finalize_remotion.sh remotion/out/Balena_EP04_Clean_remotion.mp4 output/Balena_EP04_Clean.mp4 -15 -2.0
```

```bash
python3 tools/export_srt_vo.py episodes/ep04.json
```

The `-2.0` true-peak target keeps the crisp crack transient at or below −1 dBTP after encoding. With −1.5 it measured −0.8.

`export_srt_vo.py` writes the SRT, the five voiceover WAVs and `output/Balena_EP04_Narration.wav`.

### Where EP.04 is configured

- **`episodes/ep04.json`:** narration chunks (where each part sits in the timeline), captions, clip in/out points and speeds, card timings, and audio notes.
- **`remotion/src/ep04/config.ts`:** every educational graphic (text, timing and position), the stage chips, the music trim, the crack position and gap, and the lipid callout (`lipid.enabled`).
- **`remotion/src/ep04/graphics.tsx`:** the reusable overlays: `ComponentLabel`, `MoistureRelease`, `ReactionLabel` (with `AmberHighlight`), `FirstCrackPulse`, `SurfaceLipidCallout`, `InfoLabel` and `StageChip`.
- **`remotion/src/ep04/BalenaEP04.tsx`:** the composition. Every clip, card, caption, graphic and audio item is a named `<Sequence>` or `<Audio>`, so all of them show up by name in Studio.

### Series music

- `assets/music/balena_series_music_master.mp3`: the 60 s master, with a natural ending.
- `assets/music/balena_series_music_loop_8bars.wav`: a 22.1 s loop with a seamless join.

Check the provenance JSON for the usage terms before relying on them.
