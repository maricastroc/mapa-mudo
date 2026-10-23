export const T = {
  morph: 0.7,
  book: 1.2,
  lens: 1.8,
  cold: 2.5,
  extract: 3.6,
  sink: 3.8,
  chill: 4.3,
  drops: 4.8,
  molecule: 5.9,
  year: 6.5,
  note: 6.8,
  act: 7.7,
  cell: 7.8,
  dose: 8.3,
  crack: 9.1,
  clear: 9.8,
  closing: 10.7,
  end: 11.7,
};

export type Act = "plant" | "extract" | "act" | "closing";

export const PLANT = { x: 130, y: 262 };
export const BOOK = { x: 330, y: 70, w: 240, h: 150 };
export const FLASK = { x: 170, y: 250, w: 120, h: 130 };
export const VIAL = { x: 300, y: 250 };
export const MOLECULE = { x: 470, y: 130 };
export const CELL = { x: 300, y: 150, r: 92 };

export const DROPS = 4;

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function easeOutBack(t: number) {
  const k = clamp01(t);
  if (k === 0) return 0;
  return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
}

export function actAt(t: number): Act {
  if (t < T.extract) return "plant";
  if (t < T.act) return "extract";
  if (t < T.closing) return "act";
  return "closing";
}

export function actOpacity(act: Exclude<Act, "closing">, t: number) {
  if (act === "plant") return 1 - ease((t - T.extract + 0.1) / 0.35);
  if (act === "extract") return ease((t - T.extract) / 0.35) * (1 - ease((t - T.act + 0.1) / 0.35));
  return ease((t - T.act) / 0.35);
}

export function morphAt(t: number) {
  return ease((t - T.morph) / 0.5);
}

export function lensAt(t: number) {
  const k = ease((t - T.lens) / 1.2);
  return { x: BOOK.x + 40 + k * (BOOK.w - 90), y: BOOK.y + 50 + Math.sin(k * Math.PI) * 30, visible: clamp01((t - T.lens) / 0.25) * (1 - clamp01((t - T.extract + 0.3) / 0.3)) };
}

export function sinkAt(t: number) {
  return ease((t - T.sink) / 0.5);
}

export function chillAt(t: number) {
  return ease((t - T.chill) / 0.5);
}

export function dropAt(index: number, t: number) {
  const start = T.drops + index * 0.22;
  return clamp01((t - start) / 0.35);
}

export function vialLevel(t: number) {
  let level = 0;
  for (let i = 0; i < DROPS; i++) if (dropAt(i, t) >= 1) level += 1 / DROPS;
  return level;
}

export function moleculeAt(t: number) {
  return { grow: easeOutBack((t - T.molecule) / 0.55), bond: clamp01((t - T.molecule - 0.4) / 0.4) };
}

export function attackAt(index: number, t: number) {
  return ease((t - T.dose - index * 0.18) / 0.7);
}

export function parasiteAt(t: number) {
  return { crack: clamp01((t - T.crack) / 0.5), fade: ease((t - T.crack - 0.4) / 0.5) };
}
