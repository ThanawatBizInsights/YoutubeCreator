import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { Caption, duck, FullScreenCard, Shot } from "../components";
import { theme } from "../theme";
import { audio, cards, ep, graphics as g, speechWindows, TOTAL } from "./config";
import {
  AmberHighlight,
  ComponentLabel,
  FirstCrackPulse,
  InfoLabel,
  MoistureRelease,
  ReactionLabel,
  StageChip,
  SurfaceLipidCallout,
} from "./graphics";

loadFont({ family: theme.font.family, url: staticFile("fonts/KanitBalena-SemiBold.ttf"), weight: "600" });
loadFont({ family: theme.font.family, url: staticFile("fonts/KanitBalena-Medium.ttf"), weight: "500" });

export type BalenaEP04Props = { showCaptions: boolean };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const T = ep.timeline_seconds;

/** A named overlay shown from `from` to `to` (seconds). */
const Seq: React.FC<{ name: string; from: number; to: number; children: React.ReactNode }> = ({ name, from, to, children }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence name={name} from={Math.round(from * fps)} durationInFrames={Math.round((to - from) * fps)}>
      {children}
    </Sequence>
  );
};

/** EP.04 คั่วต่างกัน รสเปลี่ยนไหม? — voice-driven timeline from episodes/ep04.json. */
export const BalenaEP04: React.FC<BalenaEP04Props> = ({ showCaptions }) => {
  const { fps } = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);
  const inCrackGap = (t: number) => interpolate(t, [audio.crackGap[0] - 0.1, audio.crackGap[0], audio.crackGap[1], audio.crackGap[1] + 0.1], [1, 0, 0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ---------- FOOTAGE: one continuous roast, light -> medium -> dark (clean cuts) ---------- */}
      <Sequence name="Clip 1 · green → light (cutaway)" from={s(T.clip_light.from)} durationInFrames={s(T.clip_light.dur)}>
        <Shot src="ep04/source.mp4" srcIn={T.clip_light.src_in} rate={T.clip_light.rate} fadeIn={T.clip_light.fade_in} />
      </Sequence>
      <Sequence name="Clip 2 · medium (cutaway)" from={s(T.clip_medium.from)} durationInFrames={s(T.clip_medium.dur)}>
        <Shot src="ep04/source.mp4" srcIn={T.clip_medium.src_in} rate={T.clip_medium.rate} />
      </Sequence>
      <Sequence name="Clip 3 · dark (cutaway)" from={s(T.clip_dark.from)} durationInFrames={s(T.clip_dark.dur)}>
        <Shot src="ep04/source.mp4" srcIn={T.clip_dark.src_in} rate={T.clip_dark.rate} />
      </Sequence>

      {/* ---------- EDUCATIONAL GRAPHICS (footage only; max two labels at once) ---------- */}
      <Seq name="Graphic · components (sugar, amino acids)" from={g.components.from} to={g.components.to}>
        {g.components.items.map((it) => (
          <ComponentLabel key={it.text} text={it.text} icon={it.icon} label={it.label} target={it.target} />
        ))}
      </Seq>
      <Seq name="Graphic · moisture release" from={g.moisture.from} to={g.moisture.to}>
        <MoistureRelease label={g.moisture.label} drops={g.moisture.drops} />
      </Seq>
      <Seq name="Graphic · Maillard highlight" from={g.reaction.from + g.reaction.highlight.at} to={g.reaction.from + g.reaction.highlight.until}>
        <AmberHighlight {...g.reaction.highlight} />
      </Seq>
      <Seq name="Graphic · Maillard reaction steps" from={g.reaction.from} to={g.reaction.to}>
        <ReactionLabel steps={g.reaction.steps} />
      </Seq>
      <Seq name="Graphic · first crack pulse" from={g.crack.from} to={g.crack.to}>
        <FirstCrackPulse ellipse={g.crack.ellipse} pulses={g.crack.pulses} label={g.crack.label} />
      </Seq>
      <Seq name="Graphic · medium: reactions continue" from={g.mediumContinue.from} to={g.mediumContinue.to}>
        <InfoLabel text={g.mediumContinue.text} y={g.mediumContinue.y} />
      </Seq>
      <Seq name="Graphic · medium: browning highlight" from={g.mediumDevelop.from} to={g.mediumDevelop.to}>
        <AmberHighlight {...g.mediumDevelop.highlight} />
      </Seq>
      <Seq name="Graphic · medium: colour & aroma develop" from={g.mediumDevelop.from} to={g.mediumDevelop.to}>
        <InfoLabel text={g.mediumDevelop.text} y={g.mediumDevelop.y} />
      </Seq>
      <Seq name="Graphic · medium: some acids change" from={g.mediumAcids.from} to={g.mediumAcids.to}>
        <InfoLabel text={g.mediumAcids.text} y={g.mediumAcids.y} small={g.mediumAcids.small} />
      </Seq>
      <Seq name="Graphic · dark: heat changes compounds" from={g.darkChange.from} to={g.darkChange.to}>
        <InfoLabel text={g.darkChange.text} y={g.darkChange.y} />
      </Seq>
      <Seq name="Graphic · dark: general trend" from={g.darkTrend.from} to={g.darkTrend.to}>
        <InfoLabel text={g.darkTrend.text} y={g.darkTrend.y} />
      </Seq>
      {g.lipid.enabled ? (
        <Seq name="Graphic · surface lipids (only if sheen visible)" from={g.lipid.from} to={g.lipid.to}>
          <SurfaceLipidCallout text={g.lipid.text} label={g.lipid.label} target={g.lipid.target} />
        </Seq>
      ) : null}
      {g.stages.map((st) => (
        <Seq key={st.text} name={`Stage chip · ${st.text}`} from={st.from} to={st.to}>
          <StageChip text={st.text} />
        </Seq>
      ))}

      {/* ---------- CAPTIONS: roasting footage only ---------- */}
      {showCaptions
        ? ep.captions_burned.map((c, i) => (
            <Seq key={i} name={`Caption ${i + 1} · ${c.lines.join(" ")}`} from={c.start} to={c.end}>
              <Caption lines={c.lines} />
            </Seq>
          ))
        : null}

      {/* ---------- FULL-SCREEN CARDS (static; short fades only; no overlays) ---------- */}
      <Sequence name="Opening card (full screen)" from={0} durationInFrames={s(T.opening_card.dur)}>
        <FullScreenCard src={cards.opening} />
      </Sequence>
      <Sequence name="Ending card (full screen)" from={s(T.ending_card.from)} durationInFrames={s(TOTAL - T.ending_card.from)}>
        <FullScreenCard src={cards.ending} fadeIn={T.ending_card.fade_in} />
      </Sequence>

      {/* ---------- AUDIO: narration (chunks placed at measured pauses) ---------- */}
      {ep.narration.flatMap((n) =>
        n.chunks.map((c, i) => (
          <Audio
            key={`${n.id}-${i}`}
            name={`VO ${n.id} · part ${i + 1}`}
            from={s(c.at)}
            trimBefore={s(c.from)}
            durationInFrames={s(c.to - c.from)}
            src={staticFile(`ep04/vo_${n.id}.mp3`)}
          />
        )),
      )}

      {/* ---------- AUDIO: music (series master; natural ending lands on the last frame) ---------- */}
      <Audio
        name="Music · Balena series master"
        src={staticFile("ep04/music_master.wav")}
        trimBefore={s(audio.musicTrimBefore)}
        durationInFrames={s(TOTAL)}
        volume={(f) => {
          const t = f / fps;
          const fadeIn = interpolate(t, [0, 1.0], [0, 1], clamp);
          const tail = interpolate(t, [TOTAL - 0.4, TOTAL], [1, 0], clamp);
          const gap = 0.55 + 0.45 * inCrackGap(t); // dip under the crack
          return 0.42 * fadeIn * tail * gap * duck(t, speechWindows, 0.3, 0.2);
        }}
      />

      {/* ---------- AUDIO: effects ---------- */}
      <Sequence name="Bed · roasting drum hum (EP02 loop)" from={s(T.clip_light.from)} durationInFrames={s(T.ending_card.from + 0.4 - T.clip_light.from)} layout="none">
        <Audio
          loop
          src={staticFile("ep04/roasting_drum_bed_loop.wav")}
          volume={(f) => {
            const t = T.clip_light.from + f / fps;
            const env = interpolate(t, [T.clip_light.from, T.clip_light.from + 0.6, T.ending_card.from - 0.2, T.ending_card.from + 0.4], [0, 1, 1, 0], clamp);
            return 0.16 * env * (0.35 + 0.65 * inCrackGap(t)) * duck(t, speechWindows, 0.6);
          }}
        />
      </Sequence>
      <Audio name="SFX · first crack (แคร๊ก) — light clip only" from={s(audio.crackAt)} src={staticFile("ep04/first_crack_ticks.wav")} volume={0.9} />
      <Audio name="SFX · ending-card accent (EP01)" from={s(audio.accentAt)} durationInFrames={s(1.5)} src={staticFile("ep04/soft_transition_accent.wav")} volume={0.32} />
    </AbsoluteFill>
  );
};
