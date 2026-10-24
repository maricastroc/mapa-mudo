import { VISIBLE, type Crossing } from "./kidPlan.ts";

export type Lane = { y: number; size: number };
export type KidLayout = { W: number; H: number; portrait: boolean; lanes: Lane[]; margin: number };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function kidLayout(width: number, height: number): KidLayout {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const portrait = W < H * 0.9;
  const margin = clamp(Math.min(W, H) * 0.025, 10, 30);
  const front = portrait ? clamp(W * 0.4, 90, 230) : clamp(Math.min(H * 0.38, W * 0.22), 100, 360);
  const ys = portrait ? [0.56, 0.72, 0.88] : [0.6, 0.76, 0.93];
  const scales = [0.7, 0.85, 1];
  return { W, H, portrait, margin, lanes: ys.map((k, i) => ({ y: H * k, size: front * scales[i] })) };
}

export function laneLength(layout: KidLayout) {
  return layout.W / (VISIBLE[1] - VISIBLE[0]);
}

export type KidSpot = { x: number; y: number; size: number; dir: 1 | -1 };

export function kidSpot(layout: KidLayout, crossing: Pick<Crossing, "lane" | "dir">, u: number): KidSpot {
  const lane = layout.lanes[crossing.lane];
  const along = (u - VISIBLE[0]) * laneLength(layout);
  return { x: crossing.dir === 1 ? along : layout.W - along, y: lane.y, size: lane.size, dir: crossing.dir };
}

export function hitScore(spot: KidSpot, x: number, y: number) {
  const rx = Math.max(spot.size * 0.36, 32);
  const ry = Math.max(spot.size * 0.56, 44);
  return Math.hypot((x - spot.x) / rx, (y - (spot.y - spot.size * 0.5)) / ry);
}
