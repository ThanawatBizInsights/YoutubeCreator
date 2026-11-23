// Iced coffee how-to: a silent, music-only edit of one continuous 123 s iPhone take (IMG_8273 2.MOV).
// Every shot is cut on the 88 BPM grid of the Balena series music master. Times in seconds; crops are a
// zoom (scale) around a focal point given as a fraction of the frame, always staying inside the source.

export const FPS = 24;
export const BPM = 88.0;
export const BEAT = 60 / BPM; // 0.6818 s

export type Crop = { x: number; y: number; from: number; to: number }; // focal point + scale at start/end
export type Shot = {
  name: string;
  srcIn: number; // seconds into the source take
  beats: number; // length on the music grid
  crop?: Crop;
  dissolveIn?: number; // seconds of cross-dissolve from the previous shot (0 = clean cut)
};

// Order follows the take exactly (ice -> syrup -> milk -> coffee -> stir); the two hero shots use the
// finished drink from the end of the take.
export const shots: Shot[] = [
  { name: "Hero open · finished drink", srcIn: 119.0, beats: 4, crop: { x: 0.39, y: 0.55, from: 1.28, to: 1.22 } },
  { name: "1 Ice · first scoop", srcIn: 7.15, beats: 3, dissolveIn: 0.25 },
  { name: "1 Ice · second scoop", srcIn: 11.95, beats: 2 },
  { name: "1 Ice · third scoop", srcIn: 15.25, beats: 3 },
  { name: "2 Syrup · bottle into measuring spoon", srcIn: 31.0, beats: 5 },
  { name: "2 Syrup · spoon into glass (close)", srcIn: 35.4, beats: 6, crop: { x: 0.36, y: 0.32, from: 1.38, to: 1.42 } },
  { name: "2 Syrup · measuring cup into glass", srcIn: 39.6, beats: 2 },
  { name: "3 Milk · first pour", srcIn: 59.4, beats: 7 },
  { name: "3 Milk · second pour (close)", srcIn: 69.4, beats: 5, crop: { x: 0.42, y: 0.36, from: 1.3, to: 1.34 } },
  { name: "4 Coffee · pour", srcIn: 88.5, beats: 11 },
  { name: "4 Coffee · layers settle (close)", srcIn: 98.0, beats: 3, crop: { x: 0.39, y: 0.55, from: 1.3, to: 1.36 } },
  { name: "5 Stir · spoon in", srcIn: 106.3, beats: 6 },
  { name: "5 Stir · mixing (close)", srcIn: 113.5, beats: 5, crop: { x: 0.39, y: 0.48, from: 1.28, to: 1.3 } },
  { name: "Hero close · finished drink", srcIn: 117.6, beats: 8, crop: { x: 0.39, y: 0.56, from: 1.0, to: 1.2 }, dissolveIn: 0.25 },
];

export const TOTAL_BEATS = shots.reduce((a, s) => a + s.beats, 0); // 70
export const TOTAL_FRAMES = Math.round(TOTAL_BEATS * BEAT * FPS); // 1145

/** Cut frames sit on the beat grid (rounded to the nearest frame). */
export const cuts = shots.map((_, i) => Math.round(shots.slice(0, i).reduce((a, s) => a + s.beats, 0) * BEAT * FPS));

export const music = {
  file: "drink/balena_series_music_master.mp3", // Balena series master (ElevenLabs Music v2.5, the project's latest music)
  startAt: 10.906, // a downbeat of the master, so cuts land on beats and its natural ending lands at the end
  fadeIn: 1.0,
  fadeOut: 1.4,
  volume: 0.9,
};

// Natural, appetising grade: slight warm white-balance shift (wall measured cool, B/R 1.17), gentle contrast/saturation.
export const grade = {
  matrix: "1.06 0 0 0 0  0 1.0 0 0 0  0 0 0.94 0 0  0 0 0 1 0",
  css: "brightness(1.02) contrast(1.05) saturate(1.08)",
};
