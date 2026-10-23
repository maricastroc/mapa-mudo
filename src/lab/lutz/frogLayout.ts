import { VISIBLE, type Motion } from "./frogMotion.ts";
import { SPECIES_COUNT, type Crossing } from "./frogPlan.ts";

export type Rect = { x: number; y: number; w: number; h: number };
export type Lane = { y: number; size: number };

export type FrogLayout = {
  W: number;
  H: number;
  portrait: boolean;
  lanes: Lane[];
  tab: Rect;
  panel: Rect;
  header: number;
  cells: Rect[];
  margin: number;
};

export const COLUMNS = 2;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function frogLayout(width: number, height: number): FrogLayout {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const portrait = W < H * 0.9;
  const margin = clamp(Math.min(W, H) * 0.025, 10, 30);
  const front = portrait ? clamp(W * 0.22, 48, 150) : clamp(Math.min(H * 0.16, W * 0.1), 50, 190);
  const ys = portrait ? [0.565, 0.725, 0.89] : [0.52, 0.7, 0.885];
  const scales = [0.64, 0.8, 1];
  const lanes = ys.map((k, i) => ({ y: H * k, size: front * scales[i] }));

  const tabH = portrait ? clamp(W * 0.12, 40, 54) : clamp(H * 0.065, 42, 70);
  const tabW = tabH * 2.7;
  const right = W - margin * 1.4;
  const top = portrait ? Math.max(H * 0.112, 78) : margin;
  const tab = { x: right - tabW, y: top, w: tabW, h: tabH };

  const panelW = portrait ? right - margin : clamp(Math.min(W * 0.36, H * 0.62), 250, 680);
  const bottom = H * (portrait ? 0.62 : 0.74);
  const panel = { x: portrait ? margin : right - panelW, y: top, w: panelW, h: bottom - top };
  const header = tabH;
  const pad = clamp(panelW * 0.03, 6, 16);
  const rows = Math.ceil(SPECIES_COUNT / COLUMNS);
  const cellW = (panelW - pad * 2) / COLUMNS;
  const cellH = (panel.h - header - pad) / rows;
  const cells = Array.from({ length: SPECIES_COUNT }, (_, i) => ({
    x: panel.x + pad + (i % COLUMNS) * cellW,
    y: panel.y + header + Math.floor(i / COLUMNS) * cellH,
    w: cellW,
    h: cellH,
  }));
  return { W, H, portrait, lanes, tab, panel, header, cells, margin };
}

export function inside(rect: Rect, x: number, y: number, pad = 0) {
  return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}

export function mixRect(a: Rect, b: Rect, k: number): Rect {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k };
}

export function laneLength(layout: FrogLayout) {
  return layout.W / (VISIBLE[1] - VISIBLE[0]);
}

export function hopHeight(layout: FrogLayout, crossing: Pick<Crossing, "hops" | "lane">) {
  const lane = layout.lanes[crossing.lane];
  const stride = laneLength(layout) / crossing.hops;
  return Math.min(stride * 0.38, lane.size * 1.25);
}

export type FrogSpot = { x: number; y: number; ground: number; size: number; facing: 1 | -1 };

export function frogSpot(layout: FrogLayout, crossing: Pick<Crossing, "hops" | "lane" | "dir">, motion: Motion): FrogSpot {
  const lane = layout.lanes[crossing.lane];
  const length = laneLength(layout);
  const along = (motion.u - VISIBLE[0]) * length;
  const x = crossing.dir === 1 ? along : layout.W - along;
  return { x, y: lane.y - motion.lift * hopHeight(layout, crossing), ground: lane.y, size: lane.size, facing: crossing.dir };
}

export function hitCenter(spot: FrogSpot) {
  return { x: spot.x + spot.facing * spot.size * 0.06, y: spot.y - spot.size * 0.3 };
}

export function hitScore(spot: FrogSpot, x: number, y: number) {
  const c = hitCenter(spot);
  const rx = Math.max(spot.size * 0.72, 34);
  const ry = Math.max(spot.size * 0.5, 30);
  return Math.hypot((x - c.x) / rx, (y - c.y) / ry);
}
