import { toScreen, type Camera } from "@/map/mapRenderer";
import { TRENCH_CAPTION } from "@/map/trench";
import type { Box } from "./mapLabels";
import type { Screen } from "./screen";

export const CARTOUCHE = { x: 36, y: 30, w: 470, h: 236 };

export const NEXT_ACTION = { x: 36, y: 800, w: 330, h: 64 };

export function collectiveObstacles(screen: Screen, unit: number): Box[] {
  const scale = { x0: screen.W - 48 * unit - 340, y0: 24 * unit, x1: screen.W, y1: 36 * unit + 40 };
  if (screen.compact) return [scale, { x0: 0, y0: screen.H - 340, x1: screen.W, y1: screen.H }];
  const stage = (b: { x: number; y: number; w: number; h: number }): Box => ({
    x0: screen.ox + b.x * screen.fit,
    y0: screen.oy + b.y * screen.fit,
    x1: screen.ox + (b.x + b.w) * screen.fit,
    y1: screen.oy + (b.y + b.h) * screen.fit,
  });
  return [stage(CARTOUCHE), stage(NEXT_ACTION), scale, { x0: screen.W - 800, y0: screen.H - 42, x1: screen.W, y1: screen.H }];
}

export function trenchCaptionBox(view: { W: number; H: number; fit: number; camera: Camera }, unit: number): Box {
  const [x, y] = toScreen(view, TRENCH_CAPTION.x, TRENCH_CAPTION.y);
  const half = 205 * Math.max(0.85, unit);
  return { x0: x - half, y0: y - 16 * unit, x1: x + half, y1: y + 26 * unit };
}
