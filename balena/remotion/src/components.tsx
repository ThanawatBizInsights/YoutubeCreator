import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { theme } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Full-screen card: the 941x1672 artwork scaled by height to the 1080x1920 canvas, proportions kept,
 *  static (no zoom/pan), optional short fade-in. objectFit "cover" trims only the 0.5 px sub-pixel remainder. */
export const FullScreenCard: React.FC<{ src: string; fadeIn?: number }> = ({ src, fadeIn = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn ? interpolate(frame, [0, fadeIn * fps], [0, 1], { ...clamp, easing: theme.ease.inOut }) : 1,
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

/** One source shot: trimmed, optionally slowed (frame-accurate, no optical flow), optional push-in and fade-in. */
export const Shot: React.FC<{ srcIn: number; rate: number; push?: [number, number]; fadeIn?: number }> = ({
  srcIn,
  rate,
  push = [1, 1],
  fadeIn = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn ? interpolate(frame, [0, fadeIn * fps], [0, 1], { ...clamp, easing: theme.ease.inOut }) : 1,
        scale: interpolate(frame, [0, durationInFrames], push, { ...clamp, output: "perceptual-scale" }),
      }}
    >
      <Video
        src={staticFile("ep03/source.mp4")}
        trimBefore={Math.round(srcIn * fps)}
        playbackRate={rate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

/** Highlight markup inside caption lines: {word} butter yellow, [word] ocean blue. */
const Marked: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\{[^}]*\}|\[[^\]]*\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{") ? (
          <span key={i} style={{ color: theme.color.butter }}>{p.slice(1, -1)}</span>
        ) : p.startsWith("[") ? (
          <span key={i} style={{ color: theme.color.ocean }}>{p.slice(1, -1)}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};

/** Phrase caption (max two lines), placed above the bottom 20 % reel UI zone. Lives inside its own <Sequence>. */
export const Caption: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: theme.safe.bottom + 40 }}>
      <div
        style={{
          opacity: interpolate(
            frame,
            [0, theme.fade.in * fps, durationInFrames - theme.fade.out * fps, durationInFrames],
            [0, 1, 1, 0],
            clamp,
          ),
          translate: interpolate(frame, [0, theme.fade.in * fps], ["0px 14px", "0px 0px"], { ...clamp, easing: theme.ease.out }),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          maxWidth: 1080 - 2 * theme.safe.side,
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: theme.font.family,
              fontWeight: 600,
              fontSize: theme.font.caption,
              lineHeight: 1.32,
              color: theme.color.cream,
              background: theme.color.navy,
              padding: "6px 26px 10px",
              borderRadius: 14,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <Marked text={l} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Small educational label / note at the top, below the top 12 % reel UI zone. */
export const Label: React.FC<{ text: string; kind: "label" | "note" }> = ({ text, kind }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const note = kind === "note";
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: theme.safe.top + (note ? 10 : 84) }}>
      <div
        style={{
          opacity: interpolate(frame, [0, 0.25 * fps, durationInFrames - 0.18 * fps, durationInFrames], [0, 1, 1, 0], clamp),
          fontFamily: theme.font.family,
          fontWeight: note ? 500 : 600,
          fontSize: note ? theme.font.note : theme.font.label,
          lineHeight: 1.3,
          color: note ? theme.color.cream : theme.color.butter,
          background: note ? theme.color.navySoft : theme.color.navy,
          padding: note ? "4px 18px 7px" : "6px 24px 10px",
          borderRadius: 12,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Ducking factor while narration plays: 1 outside speech, `depth` inside, with short ramps. */
export const duck = (t: number, windows: [number, number][], depth: number, ramp = 0.15) => {
  let g = 1;
  for (const [a, b] of windows) {
    g = Math.min(g, interpolate(t, [a - ramp, a, b, b + ramp], [1, depth, depth, 1], clamp));
  }
  return g;
};
