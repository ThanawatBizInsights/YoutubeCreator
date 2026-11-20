import { Easing } from "remotion";

// Balena Roastery reel theme. Same caption look as EP01/EP02: cream Kanit on a navy box,
// butter-yellow / ocean-blue highlights.
export const theme = {
  color: {
    navy: "rgba(16, 38, 74, 0.90)",
    navySoft: "rgba(16, 38, 74, 0.62)",
    cream: "#FFF7E8",
    butter: "#FFD65A",
    ocean: "#7CC8FF",
  },
  font: {
    family: "Kanit Balena",
    caption: 74,
    label: 56,
    note: 40,
  },
  // Reels lose roughly the top 12 % and bottom 20 % to the app UI (design-rules.md, safe zones).
  safe: { top: 0.12 * 1920, bottom: 0.2 * 1920, side: 0.06 * 1080 },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
    inOut: Easing.bezier(0.65, 0, 0.35, 1),
  },
  fade: { in: 0.18, out: 0.12 }, // seconds; exits faster than entrances
} as const;
