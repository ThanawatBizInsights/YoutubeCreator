# Iced coffee how-to (silent, music-only)

The edit is the Remotion composition `Iced-Coffee-HowTo` in `balena/remotion/src/drink/`. Shots, beat lengths, crops, the grade and music settings are all in `config.ts`.

| | |
|---|---|
| Source | `IMG_8273 2.MOV` from the shared Drive folder: one 123 s locked-off iPhone take, 4K HLG HDR, portrait, 24 fps. Not in git. |
| Output | `drink/output/Iced_Coffee_HowTo.mp4`: 1080×1920, 24 fps, H.264 High + AAC, 47.7 s, fast-start |
| Audio | Only the Balena series music master, `balena/assets/music/balena_series_music_master.mp3`, the most recent ElevenLabs music in the project. It starts on a downbeat 10.917 s into the master, fades in over 1.0 s and out over 1.4 s, and its own ending resolves under the final hero shot. The original clip audio is muted. |
| Picture | Cuts sit on the 88 BPM beat grid. Shot order follows the take: ice → syrup → milk → coffee → stir, opened and closed with the finished drink. There's a gentle warm white-balance and contrast grade, and no text of any kind. |

## Rebuild

1. Make the SDR proxy from `drink/`. This tone-maps the HDR and renders at full resolution, so the close-up crops stay sharp:

```bash
ffmpeg -i source/IMG_8273_2.MOV -map 0:v:0 -an -vf "zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" -r 24 -c:v libx264 -crf 15 -g 12 -profile:v high -level 5.2 -pix_fmt yuv420p work/proxy_2160x3840_sdr.mp4
```

2. Stage the media. From `balena/remotion`, copy `work/proxy_2160x3840_sdr.mp4` to `public/drink/take_2160x3840_sdr.mp4`, and copy the music master into `public/drink/`.

3. Render from `balena/remotion`. `NODE_USE_ENV_PROXY=1` is only needed behind a proxy:

```bash
NODE_USE_ENV_PROXY=1 npx remotion render Iced-Coffee-HowTo out/Iced_Coffee_HowTo_remotion.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k
```

4. Finish the loudness and fast-start, from `balena/remotion`:

```bash
sh ../tools/finalize_remotion.sh out/Iced_Coffee_HowTo_remotion.mp4 ../../drink/output/Iced_Coffee_HowTo.mp4 -15 -2.0
```
