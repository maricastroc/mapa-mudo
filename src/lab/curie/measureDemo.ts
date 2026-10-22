export type SampleKey = "uranium" | "chalcolite" | "pitchblende";

export type Sample = {
  key: SampleKey;
  reading: number;
  expected: number | null;
  enter: number;
  read: number;
  bar: number;
  leave: number | null;
  x: number;
};

export const T = {
  real: 0,
  gameGlowFade: 0.7,
  measure: 2.0,
  surprise: 5.0,
  circleChalcolite: 5.0,
  circlePitch: 5.4,
  discover: 6.5,
  split: 6.5,
  tiles: 7.2,
  stamps: 8.0,
  couple: 8.5,
  closing: 9.6,
  end: 10.6,
};

export const SAMPLES: Sample[] = [
  { key: "uranium", reading: 0.4, expected: null, enter: -1, read: 0.8, bar: 1.0, leave: 2.0, x: 320 },
  { key: "chalcolite", reading: 0.62, expected: 0.25, enter: 2.1, read: 2.5, bar: 2.6, leave: 3.35, x: 394 },
  { key: "pitchblende", reading: 0.92, expected: 0.3, enter: 3.45, read: 3.85, bar: 4.0, leave: null, x: 468 },
];

export const BAR_W = 50;
export const CHART = { x: 300, y: 40, w: 280, h: 230, base: 250, scale: 180 };
export const METER = { x: 150, y: 128, r: 72 };
export const PLATE = { x: 150, y: 238 };
export const TILES = [
  { symbol: "Po", number: 84, x: 172, y: 56 },
  { symbol: "Ra", number: 88, x: 326, y: 56 },
];
export const TILE = { w: 104, h: 124 };

export type Act = "real" | "measure" | "surprise" | "discover" | "closing";

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function easeOutBack(t: number) {
  const k = clamp01(t);
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
}

export function actAt(t: number): Act {
  if (t < T.measure) return "real";
  if (t < T.surprise) return "measure";
  if (t < T.discover) return "surprise";
  if (t < T.closing) return "discover";
  return "closing";
}

export function sample(key: SampleKey) {
  return SAMPLES.find((s) => s.key === key)!;
}

export function onPlate(t: number) {
  for (const s of SAMPLES) {
    const enter = s.enter < 0 ? 1 : ease((t - s.enter) / 0.4);
    const leave = s.leave === null ? 0 : ease((t - s.leave) / 0.35);
    if (t >= s.enter && (s.leave === null || t < s.leave + 0.35)) return { sample: s, x: -190 * (1 - enter) + 210 * leave };
  }
  return null;
}

export function gameGlow(t: number) {
  return 1 - ease((t - T.gameGlowFade) / 0.6);
}

export function needleAt(t: number) {
  const pitch = sample("pitchblende");
  if (t >= T.split) return pitch.reading + ((pitch.expected ?? 0) - pitch.reading) * ease((t - T.split - 0.2) / 0.8);
  let value = 0;
  for (const s of SAMPLES) {
    if (t < s.read) break;
    const rise = easeOutBack((t - s.read) / 0.45);
    const fall = s.leave === null ? 0 : ease((t - s.leave) / 0.3);
    value = s.reading * rise * (1 - fall);
  }
  return value;
}

export function barHeight(key: SampleKey, t: number) {
  const s = sample(key);
  return s.reading * ease((t - s.bar) / 0.7);
}

export function expectedLine(key: SampleKey, t: number) {
  const s = sample(key);
  return s.expected === null ? 0 : clamp01((t - s.bar) / 0.4);
}

export function liftAt(t: number) {
  return ease((t - T.split) / 0.7);
}

export function circleAt(key: SampleKey, t: number) {
  const start = key === "chalcolite" ? T.circleChalcolite : key === "pitchblende" ? T.circlePitch : Infinity;
  return clamp01((t - start) / 0.5);
}

export function tileProgress(index: number, t: number) {
  const start = T.tiles + index * 0.25;
  return { grow: easeOutBack((t - start) / 0.6), stamp: clamp01((t - (T.stamps + index * 0.3)) / 0.25) };
}
