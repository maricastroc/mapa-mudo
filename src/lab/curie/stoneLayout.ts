export type Point = { x: number; y: number };
export type Slot = Point & { index: number; scale: number };

export type StoneLayout = {
  W: number;
  H: number;
  portrait: boolean;
  tableY: number;
  slots: Slot[];
  stoneR: number;
  hitR: number;
  flask: { x: number; base: number; w: number; h: number };
  meter: { x: number; y: number; r: number };
};

export const SLOT_COUNT = 6;
export const RISE_HEIGHT = 1.15;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function stoneLayout(width: number, height: number): StoneLayout {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const portrait = W < H * 0.9;
  if (portrait) {
    const stoneR = clamp(Math.min(W * 0.1, H * 0.055), 26, 80);
    const cols = [0.2, 0.5, 0.8];
    const rows = [0.5, 0.67];
    const slots = rows.flatMap((ry, r) => cols.map((cx, c) => ({ index: r * 3 + c, x: W * cx, y: H * ry, scale: r === 0 ? 0.92 : 1 })));
    return {
      W,
      H,
      portrait,
      tableY: H * 0.42,
      slots,
      stoneR,
      hitR: stoneR * 1.45,
      flask: { x: W * 0.5, base: H * 0.95, w: Math.min(W * 0.2, H * 0.09), h: H * 0.16 },
      meter: { x: W * 0.72, y: H * 0.35, r: Math.min(W * 0.12, H * 0.06) },
    };
  }
  const stoneR = clamp(Math.min(H * 0.072, W * 0.05), 26, 92);
  const cols = [0.16, 0.36, 0.56];
  const rows = [0.62, 0.81];
  const slots = rows.flatMap((ry, r) => cols.map((cx, c) => ({ index: r * 3 + c, x: W * (cx + (r === 0 ? 0.02 : 0)), y: H * ry, scale: r === 0 ? 0.9 : 1 })));
  return {
    W,
    H,
    portrait,
    tableY: H * 0.5,
    slots,
    stoneR,
    hitR: stoneR * 1.45,
    flask: { x: W * 0.82, base: H * 0.9, w: Math.min(W * 0.1, H * 0.17), h: H * 0.4 },
    meter: { x: W * 0.82, y: H * 0.27, r: Math.min(H * 0.1, W * 0.07) },
  };
}

export function stoneCenter(layout: StoneLayout, slot: Slot, height: number): Point {
  return { x: slot.x, y: slot.y - height * layout.stoneR * slot.scale * RISE_HEIGHT };
}

export function slotAt(layout: StoneLayout, x: number, y: number): Slot | null {
  let best: Slot | null = null;
  let bestDistance = Infinity;
  for (const slot of layout.slots) {
    const cy = slot.y - layout.stoneR * slot.scale * 0.75;
    const d = Math.hypot((x - slot.x) / 1.1, y - cy);
    if (d < layout.hitR * slot.scale && d < bestDistance) {
      best = slot;
      bestDistance = d;
    }
  }
  return best;
}
