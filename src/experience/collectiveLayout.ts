import { toScreen, type Camera } from "@/map/mapRenderer";
import { TRENCH_CAPTION } from "@/map/trench";
import { COLLECTIVE_COLUMN, COMPACT_COPY_TOP } from "./copyClearance";
import type { Box } from "./mapLabels";
import type { Screen } from "./screen";

export { CARTOUCHE, NEXT_ACTION } from "./copyClearance";

export function collectiveObstacles(screen: Screen, unit: number): Box[] {
  const scale = { x0: screen.W - 48 * unit - 340, y0: 24 * unit, x1: screen.W, y1: 36 * unit + 40 };
  if (screen.compact) return [scale, { x0: 0, y0: COMPACT_COPY_TOP * screen.H, x1: screen.W, y1: screen.H }];
  const column = { x0: 0, y0: 0, x1: screen.ox + COLLECTIVE_COLUMN.x1 * screen.fit, y1: screen.H };
  return [column, scale, { x0: screen.W - 800, y0: screen.H - 42, x1: screen.W, y1: screen.H }];
}

export const SEA_TITLE = { w: 360, h: 28 };

export function trenchCaptionBox(view: { W: number; H: number; fit: number; camera: Camera }, unit: number): Box {
  const [x, y] = toScreen(view, TRENCH_CAPTION.x, TRENCH_CAPTION.y);
  const u = Math.max(0.85, unit);
  return { x0: x - (SEA_TITLE.w / 2) * u, y0: y - (SEA_TITLE.h / 2) * u, x1: x + (SEA_TITLE.w / 2) * u, y1: y + (SEA_TITLE.h / 2) * u };
}
