import { toScreen, type Camera } from "../map/mapRenderer.ts";
import { overlaps, type Box } from "./mapLabels.ts";
import type { Screen } from "./screen.ts";

export type SheetCopyStep = "noName" | "askAgain";

export const SHEET_COPY: Record<SheetCopyStep, Box[]> = {
  noName: [
    { x0: 64, y0: 150, x1: 780, y1: 290 },
    { x0: 64, y0: 304, x1: 840, y1: 500 },
    { x0: 64, y0: 540, x1: 272, y1: 608 },
  ],
  askAgain: [
    { x0: 64, y0: 228, x1: 806, y1: 528 },
    { x0: 64, y0: 150, x1: 412, y1: 200 },
    { x0: 52, y0: 618, x1: 760, y1: 712 },
  ],
};

export const POINT_FOOTPRINT: Record<SheetCopyStep, Box[]> = {
  noName: [
    { x0: -122, y0: -122, x1: 122, y1: 122 },
    { x0: 134, y0: -16, x1: 400, y1: 16 },
  ],
  askAgain: [
    { x0: -180, y0: -176, x1: 180, y1: 6 },
    { x0: -6, y0: -12, x1: 90, y1: 3 },
  ],
};

const MARGIN = 24;
const COMPACT_COPY_TOP = 0.38;

export function footprintAt(step: SheetCopyStep, x: number, y: number, scale = 1): Box[] {
  return POINT_FOOTPRINT[step].map((b) => ({ x0: x + b.x0 * scale, y0: y + b.y0 * scale, x1: x + b.x1 * scale, y1: y + b.y1 * scale }));
}

export function collidesWithCopy(step: SheetCopyStep, x: number, y: number) {
  return footprintAt(step, x, y).some((f) => SHEET_COPY[step].some((c) => overlaps(f, c, MARGIN)));
}

function stageShift(step: SheetCopyStep, x: number, y: number) {
  const feet = footprintAt(step, x, y);
  const hits = SHEET_COPY[step].filter((c) => feet.some((f) => overlaps(f, c, MARGIN)));
  if (hits.length === 0) return 0;
  const left = Math.min(...POINT_FOOTPRINT[step].map((b) => b.x0));
  return Math.max(...hits.map((c) => c.x1)) + MARGIN + 1 - left - x;
}

function compactTarget(step: SheetCopyStep, screen: Screen, x: number, y: number): [number, number] {
  const u = Math.min(screen.W, screen.H) / 640;
  const foot = POINT_FOOTPRINT[step][0];
  const x0 = 16 - foot.x0 * u;
  const x1 = screen.W - 16 - foot.x1 * u;
  const y0 = 56 - foot.y0 * u;
  const y1 = Math.max(y0, COMPACT_COPY_TOP * screen.H - foot.y1 * u);
  return [Math.min(Math.max(x, x0), Math.max(x0, x1)), Math.min(Math.max(y, y0), y1)];
}

const OVERVIEW_AREA = { x0: 846, y0: 112, x1: 1404, y1: 832 };
const MARK_MARGIN = 14;

export function overviewCamera(screen: Screen, points: { x: number; y: number }[]): Camera | null {
  if (points.length === 0) return null;
  const x0 = Math.min(...points.map((p) => p.x)) - MARK_MARGIN;
  const x1 = Math.max(...points.map((p) => p.x)) + MARK_MARGIN;
  const y0 = Math.min(...points.map((p) => p.y)) - MARK_MARGIN;
  const y1 = Math.max(...points.map((p) => p.y)) + MARK_MARGIN;
  const { W, H, fit, ox, oy } = screen;
  if (screen.compact) {
    const top = 56;
    const bottom = COMPACT_COPY_TOP * H - 8;
    const z = Math.min((W - 32) / ((x1 - x0) * fit), (bottom - top) / ((y1 - y0) * fit));
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, ax: 0.5, ay: (top + bottom) / 2 / H };
  }
  const a = OVERVIEW_AREA;
  const z = Math.min((a.x1 - a.x0) / (x1 - x0), (a.y1 - a.y0) / (y1 - y0));
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, ax: (ox + ((a.x0 + a.x1) / 2) * fit) / W, ay: (oy + ((a.y0 + a.y1) / 2) * fit) / H };
}

export function clearOfCopy(step: SheetCopyStep, screen: Screen, camera: Camera, point: { x: number; y: number }): Camera {
  const { W, H, fit, ox, oy } = screen;
  const [sx, sy] = toScreen({ W, H, fit, camera }, point.x, point.y);
  if (screen.compact) {
    const [tx, ty] = compactTarget(step, screen, sx, sy);
    if (tx === sx && ty === sy) return camera;
    return { ...camera, ax: camera.ax + (tx - sx) / W, ay: camera.ay + (ty - sy) / H };
  }
  const shift = stageShift(step, (sx - ox) / fit, (sy - oy) / fit);
  if (shift <= 0) return camera;
  return { ...camera, ax: camera.ax + (shift * fit) / W };
}
