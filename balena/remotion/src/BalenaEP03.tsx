import React from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { Caption, duck, FullScreenCard, Label, Shot } from "./components";
import { theme } from "./theme";

loadFont({ family: theme.font.family, url: staticFile("fonts/KanitBalena-SemiBold.ttf"), weight: "600" });
loadFont({ family: theme.font.family, url: staticFile("fonts/KanitBalena-Medium.ttf"), weight: "500" });

export type BalenaEP03Props = { showCaptions: boolean };

// Narration windows (seconds, measured from the generated audio) used for ducking effects under speech.
const SPEECH: [number, number][] = [
  [0.42, 2.73],
  [3.47, 9.79],
  [10.2, 17.05],
  [19.7, 24.32],
];

/** EP.03 หยุดคั่วแล้ว…ทำไมต้องรีบเย็น? — timeline from balena/episodes/ep03.json (voice-driven, 25.4 s). */
export const BalenaEP03: React.FC<BalenaEP03Props> = ({ showCaptions }) => {
  const { fps } = useVideoConfig();
  const vol = (from: number, base: number, depth: number, fades: [number, number, number, number]) => (f: number) => {
    const t = from + f / fps;
    const [a, b, c, d] = fades;
    const env = t < a ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : t < d ? 1 - (t - c) / (d - c) : 0;
    return base * env * duck(t, SPEECH, depth);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ---------- PICTURE: main footage (chronological, never reversed) ---------- */}
      <Sequence name="Shot 1 · drum, roast endpoint" from={Math.round(2.9 * fps)} durationInFrames={Math.round(4.13 * fps)}>
        <Shot srcIn={0.0} rate={0.92} fadeIn={0.3} />
      </Sequence>
      <Sequence name="Shot 2 · discharge door + pour" from={Math.round(7.03 * fps)} durationInFrames={Math.round(4.7 * fps)}>
        <Shot srcIn={3.97} rate={0.85} />
      </Sequence>
      <Sequence name="Shot 3 · cooling tray stirring" from={Math.round(11.73 * fps)} durationInFrames={Math.round(5.25 * fps)}>
        <Shot srcIn={8.03} rate={0.75} />
      </Sequence>
      <Sequence name="Shot 4 · cooled beans reveal" from={Math.round(16.98 * fps)} durationInFrames={Math.round(2.4 * fps)}>
        <Shot srcIn={12.03} rate={1} push={[1.0, 1.04]} />
      </Sequence>

      {/* ---------- PICTURE: full-screen cards (static, short fades only) ---------- */}
      <Sequence name="Opening card (full screen)" from={0} durationInFrames={Math.round(3.2 * fps)}>
        <FullScreenCard src="ep03/opening_card.webp" />
      </Sequence>
      <Sequence name="Ending card (full screen)" from={Math.round(19.03 * fps)} durationInFrames={Math.round(6.37 * fps)}>
        <FullScreenCard src="ep03/ending_card.webp" fadeIn={0.35} />
      </Sequence>

      {/* ---------- GRAPHICS: educational note + labels (both versions) ---------- */}
      <Sequence name="Note · ภาพจำลองแบบย่นเวลา" from={Math.round(3.2 * fps)} durationInFrames={Math.round(15.83 * fps)}>
        <Label kind="note" text="ภาพจำลองแบบย่นเวลา" />
      </Sequence>
      <Sequence name="Label · ระบายความร้อน" from={Math.round(14.2 * fps)} durationInFrames={Math.round(2.7 * fps)}>
        <Label kind="label" text="ระบายความร้อน" />
      </Sequence>
      <Sequence name="Label · ลดการคั่วต่อ" from={Math.round(17.35 * fps)} durationInFrames={Math.round(1.6 * fps)}>
        <Label kind="label" text="ลดการคั่วต่อจากความร้อนสะสม" />
      </Sequence>

      {/* ---------- CAPTIONS: main footage only (none over the cards) ---------- */}
      {showCaptions ? (
        <>
          <Sequence name="Caption B1" from={Math.round(3.4 * fps)} durationInFrames={Math.round(1.48 * fps)}>
            <Caption lines={["เสียงแตกครั้งแรก"]} />
          </Sequence>
          <Sequence name="Caption B2" from={Math.round(4.9 * fps)} durationInFrames={Math.round(2.2 * fps)}>
            <Caption lines={["ไม่ได้แปลว่าต้องหยุดคั่วทันที"]} />
          </Sequence>
          <Sequence name="Caption B3" from={Math.round(7.2 * fps)} durationInFrames={Math.round(2.75 * fps)}>
            <Caption lines={["เราเลือก{จบการคั่ว}", "ตามระดับที่ต้องการ"]} />
          </Sequence>
          <Sequence name="Caption C1" from={Math.round(10.12 * fps)} durationInFrames={Math.round(1.98 * fps)}>
            <Caption lines={["จากนั้น ปล่อยเมล็ดลงถาด"]} />
          </Sequence>
          <Sequence name="Caption C2" from={Math.round(12.15 * fps)} durationInFrames={Math.round(1.93 * fps)}>
            <Caption lines={["ใช้ลมช่วย[ระบายความร้อน]"]} />
          </Sequence>
          <Sequence name="Caption C3" from={Math.round(14.1 * fps)} durationInFrames={Math.round(3.2 * fps)}>
            <Caption lines={["เพื่อลดการคั่วต่อ", "จากความร้อนที่ยังสะสมอยู่"]} />
          </Sequence>
        </>
      ) : null}

      {/* ---------- AUDIO: narration (dominant) ---------- */}
      <Audio name="VO A · hook" from={Math.round(0.35 * fps)} src={staticFile("ep03/vo_A.mp3")} />
      <Audio name="VO B · roast endpoint" from={Math.round(3.45 * fps)} src={staticFile("ep03/vo_B.mp3")} />
      <Audio name="VO C · cooling" from={Math.round(10.1 * fps)} src={staticFile("ep03/vo_C.mp3")} />
      <Audio name="VO D · closing" from={Math.round(19.6 * fps)} src={staticFile("ep03/vo_D.mp3")} />

      {/* ---------- AUDIO: ambience + effects (scene-matched, ducked under speech) ---------- */}
      {/* Looped beds: the <Sequence> bounds the bed; `loop` without durationInFrames repeats the whole file
          (with durationInFrames, `loop` would repeat that short range until the composition ends). */}
      <Sequence name="Amb · roasting drum hum (EP02 loop)" from={Math.round(2.9 * fps)} durationInFrames={Math.round(4.7 * fps)} layout="none">
        <Audio loop src={staticFile("ep03/roasting_drum_bed_loop.wav")} volume={vol(2.9, 0.28, 0.6, [2.9, 3.3, 6.9, 7.6])} />
      </Sequence>
      <Audio
        name="SFX · beans cascading onto tray"
        from={Math.round(7.95 * fps)}
        src={staticFile("ep03/beans_cascade_tray.wav")}
        volume={vol(7.95, 0.5, 0.55, [7.95, 8.25, 11.6, 12.4])}
      />
      <Sequence name="Amb · cooling fan airflow (loop)" from={Math.round(11.4 * fps)} durationInFrames={Math.round(7.9 * fps)} layout="none">
        <Audio loop src={staticFile("ep03/cooling_fan_airflow_loop.wav")} volume={vol(11.4, 0.34, 0.6, [11.4, 12.1, 18.6, 19.3])} />
      </Sequence>
      <Sequence name="Amb · tray stirring (loop)" from={Math.round(11.73 * fps)} durationInFrames={Math.round(5.6 * fps)} layout="none">
        <Audio loop src={staticFile("ep03/cooling_tray_stirring_loop.wav")} volume={vol(11.73, 0.3, 0.65, [11.73, 12.1, 16.7, 17.3])} />
      </Sequence>
      <Audio
        name="SFX · ending-card accent (EP01)"
        from={Math.round(18.75 * fps)}
        durationInFrames={Math.round(1.5 * fps)}
        src={staticFile("ep03/soft_transition_accent.wav")}
        volume={vol(18.75, 0.45, 1, [18.75, 18.76, 19.9, 20.25])}
      />
      {/* Music: intentionally none (no approved asset; see episodes/ep03.json music_note). */}
    </AbsoluteFill>
  );
};
