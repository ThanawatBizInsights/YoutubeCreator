// EP.04 configuration. Narration, captions and clip timings come from the episode JSON (single source);
// the educational graphics (texts, timings, positions) are configured here. All times are seconds on the
// composition timeline; positions are pixels on the 1080x1920 canvas, measured from the source frames
// (bean outline per moment, see balena/output/Balena_EP04_assets_and_usage.md).
import episode from "../../../episodes/ep04.json";

export const ep = episode;
export const FPS = 30;
export const TOTAL = ep.timeline_seconds.total;
/** Staged card files keep the artwork's own extension (see tools/prepare_remotion.py). */
const ext = (path: string) => path.slice(path.lastIndexOf("."));
export const cards = {
  opening: `ep04/opening_card${ext(ep.timeline_seconds.opening_card.image)}`,
  ending: `ep04/ending_card${ext(ep.timeline_seconds.ending_card.image)}`,
};

/** Narration windows (absolute seconds) for ducking music / bed. */
export const speechWindows: [number, number][] = ep.narration.flatMap((n) =>
  n.chunks.flatMap((c) =>
    n.phrases
      .filter(([, a]) => (a as number) >= c.from && (a as number) < c.to)
      .map(([, a, b]) => [c.at + (a as number) - c.from, c.at + (b as number) - c.from] as [number, number]),
  ),
);

export type Pt = { x: number; y: number };

// Top band for labels starts just below the reels top UI zone (12 % = 230 px).
const TOP = 250;

export const graphics = {
  // LIGHT 1 · green bean: two example components (the "เช่น" marks them as examples, not the full composition)
  components: {
    from: 4.45, to: 6.15,
    items: [
      { text: "เช่น น้ำตาล", icon: "sugar" as const, label: { x: 64, y: TOP }, target: { x: 405, y: 760 } },
      { text: "กรดอะมิโน", icon: "amino" as const, label: { x: 640, y: TOP }, target: { x: 700, y: 840 } },
    ],
  },
  // LIGHT 2 · moisture leaving the bean (small cyan marks drifting outward from the right edge)
  moisture: {
    from: 6.2, to: 8.4,
    label: { text: "ความชื้นลดลง", pos: { x: 560, y: TOP }, target: { x: 940, y: 820 } },
    drops: [
      { x: 965, y: 820, dx: 70, dy: -10, delay: 0.15 },
      { x: 985, y: 990, dx: 80, dy: 0, delay: 0.45 },
      { x: 960, y: 1160, dx: 70, dy: 12, delay: 0.75 },
    ],
  },
  // LIGHT 3 · Maillard: reducing sugars + amino groups -> Maillard reactions -> colour & aroma compounds
  reaction: {
    from: 8.55, to: 12.25,
    steps: [
      { text: "น้ำตาลรีดิวซ์ + หมู่อะมิโน", at: 0.0, until: 1.9, y: TOP },
      { text: "ปฏิกิริยาเมลลาร์ด", at: 1.0, until: 2.7, y: TOP + 116, arrow: true, accent: true },
      { text: "เกิดสีและสารให้กลิ่น", at: 1.95, until: 3.7, y: TOP + 232, arrow: true },
    ],
    highlight: { cx: 540, cy: 1000, rx: 380, ry: 520, at: 0.3, until: 3.7, opacity: 0.22 },
  },
  // LIGHT 4 · first crack (pulse around the intact bean; the central crease is pre-existing)
  crack: {
    from: 12.86, to: 14.35,
    ellipse: { cx: 530, cy: 950, rx: 505, ry: 757 },
    pulses: [0.0, 0.9],
    label: { text: "แรงดันภายใน → เสียงแตกครั้งแรก", y: TOP },
  },
  // MEDIUM
  mediumContinue: { from: 16.45, to: 18.95, text: "ปฏิกิริยายังดำเนินต่อ", y: TOP + 96 },
  mediumDevelop: {
    from: 19.4, to: 21.6, text: "สีและกลิ่นพัฒนาต่อ", y: TOP + 96,
    highlight: { cx: 540, cy: 980, rx: 470, ry: 700, at: 0.0, until: 2.2, opacity: 0.18 },
  },
  mediumAcids: { from: 21.0, to: 23.3, text: "กรดบางชนิดเปลี่ยนแปลง", y: TOP + 196, small: true },
  // DARK
  darkChange: { from: 23.9, to: 26.8, text: "ความร้อนเปลี่ยนสารภายใน", y: TOP + 96 },
  darkTrend: { from: 29.45, to: 32.4, text: "โดยทั่วไป ขมเพิ่ม • เปรี้ยวลด", y: TOP + 96 },
  // Optional lipid callout: only if a surface sheen is visible. The dark clip is matte, so it is disabled.
  lipid: { enabled: false, from: 30.0, to: 32.0, text: "ไขมันอาจเคลื่อนสู่ผิว", label: { x: 560, y: TOP + 50 }, target: { x: 980, y: 900 } },
  // Stage chips (top-left), scheduled so no more than two labels are ever visible together
  stages: [
    { text: "คั่วอ่อน", from: 14.45, to: 16.0 },
    { text: "คั่วกลาง", from: 21.7, to: 23.4 },
    { text: "คั่วเข้ม", from: 23.5, to: 25.5 },
  ],
} as const;

export const audio = {
  musicTrimBefore: 21.0, // master's natural ending lands on the last frame
  crackAt: 12.73, // first tick at +0.14 s = 12.87 s, on the first visible new fissure
  crackGap: [12.71, 14.03] as [number, number],
  accentAt: 32.45,
};
