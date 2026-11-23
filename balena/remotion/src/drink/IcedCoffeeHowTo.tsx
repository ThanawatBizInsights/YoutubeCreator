import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio, Video } from "@remotion/media";
import { cuts, grade, music, shots, TOTAL_FRAMES, type Shot } from "./config";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** One shot of the take: real-time playback, optional slow crop/zoom and dissolve. No text, no audio. */
const ShotClip: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const c = shot.crop;
  return (
    <AbsoluteFill
      style={{
        opacity: shot.dissolveIn ? interpolate(frame, [0, shot.dissolveIn * fps], [0, 1], clamp) : 1,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transformOrigin: c ? `${c.x * 100}% ${c.y * 100}%` : "50% 50%",
          scale: c ? interpolate(frame, [0, durationInFrames], [c.from, c.to], { ...clamp, output: "perceptual-scale" }) : 1,
          filter: `url(#natural-grade) ${grade.css}`,
        }}
      >
        <Video src={staticFile("drink/take_2160x3840_sdr.mp4")} trimBefore={Math.round(shot.srcIn * fps)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const IcedCoffeeHowTo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="natural-grade" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={grade.matrix} />
        </filter>
      </svg>

      {shots.map((shot, i) => {
        const start = cuts[i];
        const end = i + 1 < shots.length ? cuts[i + 1] : TOTAL_FRAMES;
        // a dissolving shot starts a little early so it overlaps the previous one
        const pre = shot.dissolveIn ? Math.round(shot.dissolveIn * fps) : 0;
        return (
          <Sequence key={shot.name} name={shot.name} from={start - pre} durationInFrames={end - start + pre}>
            <ShotClip shot={{ ...shot, srcIn: shot.srcIn - pre / fps }} />
          </Sequence>
        );
      })}

      {/* Music only (original clip audio is muted). Starts on a downbeat of the master; fades in and out. */}
      <Audio
        name="Music · Balena series master (88 BPM)"
        src={staticFile(music.file)}
        trimBefore={Math.round(music.startAt * fps)}
        durationInFrames={TOTAL_FRAMES}
        volume={(f) => {
          const t = f / fps;
          const total = TOTAL_FRAMES / fps;
          return (
            music.volume *
            interpolate(t, [0, music.fadeIn], [0, 1], clamp) *
            interpolate(t, [total - music.fadeOut, total], [1, 0], clamp)
          );
        }}
      />
    </AbsoluteFill>
  );
};
