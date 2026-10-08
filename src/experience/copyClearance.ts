import { toScreen, type Camera } from "../map/mapRenderer.ts";
import { overlaps, type Box } from "./mapLabels.ts";
import type { Screen } from "./screen.ts";

export type SheetCopyStep = "noName" | "askAgain";

export const SHEET_COPY: Record<SheetCopyStep, Box[]> = {
  noName: [
    { x0: 64, y0: 150, x1: 780, y1: 290 },
    { x0: 64, y0: 304, x1: 840, y1: 500 },
    { x0: 80, y0: 540, x1: 288, y1: 608 },
  ],
  askAgain: [
    { x0: 64, y0: 228, x1: 806, y1: 528 },
    { x0: 64, y0: 150, x1: 412, y1: 200 },
    { x0: 68, y0: 548, x1: 760, y1: 712 },
    { x0: 56, y0: 566, x1: 784, y1: 854 },
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

export const CARTOUCHE = { x: 36, y: 30, w: 336, h: 286 };

export const NEXT_ACTION = { x: 36, y: 776, w: 336, h: 64 };

export const COLLECTIVE_COLUMN = { x0: 0, y0: 0, x1: CARTOUCHE.x + CARTOUCHE.w + 16, y1: 900 };

const SHEET_HEIGHT = 900;
const COLLECTIVE_GAP = 28;
const COMPACT_COLLECTIVE_COPY = 352;

export type Disc = { x: number; y: number; r: number };

export function collectiveArea(screen: Screen) {
  const { W, H, fit, ox, oy } = screen;
  if (screen.compact) return { x0: 12, y0: 52, x1: W - 12, y1: H - COMPACT_COLLECTIVE_COPY };
  return {
    x0: ox + (COLLECTIVE_COLUMN.x1 + COLLECTIVE_GAP) * fit,
    y0: Math.max(Math.max(0, oy) + 28 * fit, 36 * fit + 44),
    x1: W - 24 * fit,
    y1: Math.min(H, oy + SHEET_HEIGHT * fit) - 56 * fit,
  };
}

export function collectiveCamera(screen: Screen, discs: Disc[], boxes: Box[] = []): Camera | null {
  if (discs.length === 0) return null;
  const area = collectiveArea(screen);
  if (area.y1 - area.y0 < 140 || area.x1 - area.x0 < 140) return null;
  const x0 = Math.min(...discs.map((d) => d.x - d.r), ...boxes.map((b) => b.x0));
  const x1 = Math.max(...discs.map((d) => d.x + d.r), ...boxes.map((b) => b.x1));
  const y0 = Math.min(...discs.map((d) => d.y - d.r), ...boxes.map((b) => b.y0));
  const y1 = Math.max(...discs.map((d) => d.y + d.r), ...boxes.map((b) => b.y1));
  const e = Math.min((area.x1 - area.x0) / (x1 - x0), (area.y1 - area.y0) / (y1 - y0));
  return {
    x: (x0 + x1) / 2,
    y: (y0 + y1) / 2,
    z: e / screen.fit,
    ax: (area.x0 + area.x1) / 2 / screen.W,
    ay: (area.y0 + area.y1) / 2 / screen.H,
  };
}

const OVERVIEW_AREA = { x0: 846, y0: 112, x1: 1404, y1: 832 };
const MARK_MARGIN = 14;

export function overviewCamera(screen: Screen, points: { x: number; y: number }[], boxes: Box[] = []): Camera | null {
  if (points.length === 0) return null;
  const x0 = Math.min(...points.map((p) => p.x - MARK_MARGIN), ...boxes.map((b) => b.x0));
  const x1 = Math.max(...points.map((p) => p.x + MARK_MARGIN), ...boxes.map((b) => b.x1));
  const y0 = Math.min(...points.map((p) => p.y - MARK_MARGIN), ...boxes.map((b) => b.y0));
  const y1 = Math.max(...points.map((p) => p.y + MARK_MARGIN), ...boxes.map((b) => b.y1));
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
