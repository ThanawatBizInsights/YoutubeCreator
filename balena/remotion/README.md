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
