import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Pt } from "./config";

// Educational overlay kit for Balena reels. Each component is placed inside its own <Sequence>, so
// useCurrentFrame() is local (0 = the moment it appears). Restrained: fades, short draws, small drifts.

export const palette = {
  navy: "#10264A",
  cream: "#FFF7E8",
  cyan: "#3FC3E8",
  amber: "#F2A541",
  peach: "#F4AE8C",
  font: "Kanit Balena",
} as const;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 -> 1 -> 0 envelope: entrance 0.25 s, exit 0.18 s (exits faster than entrances). */
const useEnvelope = (inS = 0.25, outS = 0.18) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return interpolate(f, [0, inS * fps, durationInFrames - outS * fps, durationInFrames], [0, 1, 1, 0], clamp);
};

// ---------- small concept icons (symbols, not molecular structures) ----------
const SugarIcon: React.FC = () => (
  <svg width={40} height={40} viewBox="0 0 40 40">
    <rect x={7} y={7} width={26} height={26} rx={6} fill={palette.amber} />
    <rect x={12} y={12} width={8} height={8} rx={2} fill={palette.cream} opacity={0.65} />
  </svg>
);
const AminoIcon: React.FC = () => (
  <svg width={46} height={40} viewBox="0 0 46 40">
    <line x1={10} y1={26} x2={23} y2={14} stroke={palette.peach} strokeWidth={4} />
    <line x1={23} y1={14} x2={36} y2={26} stroke={palette.peach} strokeWidth={4} />
    <circle cx={10} cy={26} r={7} fill={palette.peach} />
    <circle cx={23} cy={14} r={7} fill={palette.peach} />
    <circle cx={36} cy={26} r={7} fill={palette.peach} />
  </svg>
);
export const Drop: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 30 39">
    <path d="M15 2 C15 2 3 17 3 25 a12 12 0 0 0 24 0 C27 17 15 2 15 2 Z" fill={palette.cyan} stroke={palette.cream} strokeWidth={2} />
  </svg>
);

/** Cream pill with navy rounded Thai text (Kanit). */
export const Pill: React.FC<{ text: string; icon?: React.ReactNode; small?: boolean; style?: React.CSSProperties }> = ({ text, icon, small, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      background: palette.cream,
      color: palette.navy,
      fontFamily: palette.font,
      fontWeight: 600,
      fontSize: small ? 42 : 52,
      lineHeight: 1.35,
      padding: small ? "6px 22px 9px" : "8px 26px 12px",
      borderRadius: 999,
      boxShadow: "0 6px 18px rgba(16,38,74,0.28)",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {icon}
    {text}
  </div>
);

/** Thin leader line that draws from `a` to `b` (0.35 s) and ends in a small dot. */
const Leader: React.FC<{ a: Pt; b: Pt; color?: string; delay?: number }> = ({ a, b, color = palette.cream, delay = 0.1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const p = interpolate(f, [delay * fps, (delay + 0.35) * fps], [0, 1], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.navy} strokeOpacity={0.55} strokeWidth={6} strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={3} strokeDasharray={len} strokeDashoffset={len * (1 - p)} strokeLinecap="round" />
      <circle cx={b.x} cy={b.y} r={7} fill={color} stroke={palette.navy} strokeWidth={2} opacity={p >= 1 ? 1 : 0} />
    </svg>
  );
};

// ---------- 1. ComponentLabel ----------
/** A labelled component with a leader line into the bean interior. */
export const ComponentLabel: React.FC<{ text: string; icon: "sugar" | "amino"; label: Pt; target: Pt }> = ({ text, icon, label, target }) => {
  const o = useEnvelope();
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Leader a={{ x: label.x + (text.length > 8 ? 160 : 130), y: label.y + 70 }} b={target} />
      <div style={{ position: "absolute", left: label.x, top: label.y }}>
        <Pill text={text} icon={icon === "sugar" ? <SugarIcon /> : <AminoIcon />} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 2. MoistureRelease ----------
/** A few cyan moisture marks leaving the edge (drift outward and fade). No droplets inside the cells. */
export const MoistureRelease: React.FC<{
  label: { text: string; pos: Pt; target: Pt };
  drops: ReadonlyArray<{ x: number; y: number; dx: number; dy: number; delay: number }>;
}> = ({ label, drops }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = useEnvelope();
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {drops.map((d, i) => {
        const t = interpolate(f, [d.delay * fps, (d.delay + 1.4) * fps], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x - 17,
              top: d.y - 22,
              translate: `${d.dx * t}px ${d.dy * t}px`,
              opacity: interpolate(t, [0, 0.15, 0.7, 1], [0, 0.95, 0.75, 0], clamp),
            }}
          >
            <Drop />
          </div>
        );
      })}
      <Leader a={{ x: label.pos.x + 200, y: label.pos.y + 70 }} b={label.target} color={palette.cyan} />
      <div style={{ position: "absolute", left: label.pos.x, top: label.pos.y }}>
        <Pill text={label.text} icon={<Drop size={26} />} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3. ReactionLabel ----------
/** Soft amber emphasis on the existing cell walls (soft-light blend, no glowing objects). */
export const AmberHighlight: React.FC<{ cx: number; cy: number; rx: number; ry: number; opacity: number }> = ({ cx, cy, rx, ry, opacity }) => {
  const o = useEnvelope(0.5, 0.4);
  return (
    <AbsoluteFill
      style={{
        opacity: o * opacity,
        mixBlendMode: "soft-light",
        background: `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, ${palette.amber} 0%, ${palette.amber} 45%, rgba(242,165,65,0) 100%)`,
      }}
    />
  );
};

/** Stacked explanatory steps (max two visible), each with its own in/out time relative to the sequence. */
export const ReactionLabel: React.FC<{
  steps: ReadonlyArray<{ text: string; at: number; until: number; y: number; arrow?: boolean; accent?: boolean }>;
}> = ({ steps }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {steps.map((s, i) => {
        const o = interpolate(f, [s.at * fps, (s.at + 0.25) * fps, (s.until - 0.18) * fps, s.until * fps], [0, 1, 1, 0], clamp);
        const dy = interpolate(f, [s.at * fps, (s.at + 0.25) * fps], [12, 0], clamp);
        return (
          <div key={i} style={{ position: "absolute", top: s.y, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: o, translate: `0px ${dy}px` }}>
            {s.arrow ? (
              <div style={{ position: "absolute", top: -44, fontFamily: palette.font, fontWeight: 600, fontSize: 40, color: palette.cream, textShadow: "0 2px 8px rgba(16,38,74,0.8)" }}>↓</div>
            ) : null}
            <Pill text={s.text} style={s.accent ? { background: palette.amber, color: palette.navy } : undefined} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- 4. FirstCrackPulse ----------
/** Restrained outward ring(s) just outside the intact bean outline, plus a short label. */
export const FirstCrackPulse: React.FC<{
  ellipse: { cx: number; cy: number; rx: number; ry: number };
  pulses: ReadonlyArray<number>;
  label: { text: string; y: number };
}> = ({ ellipse, pulses, label }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = useEnvelope();
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {pulses.map((p, i) => {
          const t = interpolate(f, [p * fps, (p + 0.55) * fps], [0, 1], clamp);
          const s = 1.01 + 0.045 * t;
          return (
            <ellipse key={i} cx={ellipse.cx} cy={ellipse.cy} rx={ellipse.rx * s} ry={ellipse.ry * s} fill="none"
              stroke={palette.cream} strokeWidth={4} opacity={t > 0 && t < 1 ? 0.7 * (1 - t) : 0} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", top: label.y, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: o }}>
        <Pill text={label.text} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5. SurfaceLipidCallout ----------
/** Thin leader toward the outer surface; use only when a sheen is visible in the footage. */
export const SurfaceLipidCallout: React.FC<{ text: string; label: Pt; target: Pt }> = ({ text, label, target }) => {
  const o = useEnvelope();
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Leader a={{ x: label.x + 220, y: label.y + 70 }} b={target} />
      <div style={{ position: "absolute", left: label.x, top: label.y }}>
        <Pill text={text} small />
      </div>
    </AbsoluteFill>
  );
};

// ---------- centred info label + stage chip ----------
export const InfoLabel: React.FC<{ text: string; y: number; small?: boolean }> = ({ text, y, small }) => {
  const o = useEnvelope();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", translate: `0px ${interpolate(f, [0, 0.25 * fps], [12, 0], clamp)}px` }}>
        <Pill text={text} small={small} />
      </div>
    </AbsoluteFill>
  );
};

export const StageChip: React.FC<{ text: string }> = ({ text }) => {
  const o = useEnvelope();
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: "absolute", left: 56, top: 250 }}>
        <div style={{ background: palette.navy, color: palette.cream, fontFamily: palette.font, fontWeight: 600, fontSize: 40, lineHeight: 1.35, padding: "6px 22px 9px", borderRadius: 14, border: `3px solid ${palette.amber}` }}>
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
