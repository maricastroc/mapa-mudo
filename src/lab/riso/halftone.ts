export type Shade = (x: number, y: number) => number;

export type HalftoneArea = { x: number; y: number; w: number; h: number };

export function halftone(
  ctx: CanvasRenderingContext2D,
  area: HalftoneArea,
  cell: number,
  angleDeg: number,
  shade: Shade,
  color: string,
) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const corners = [
    [area.x, area.y],
    [area.x + area.w, area.y],
    [area.x, area.y + area.h],
    [area.x + area.w, area.y + area.h],
  ];
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (const [px, py] of corners) {
    const gi = (px * c + py * s) / cell;
    const gj = (-px * s + py * c) / cell;
    minI = Math.min(minI, gi);
    maxI = Math.max(maxI, gi);
    minJ = Math.min(minJ, gj);
    maxJ = Math.max(maxJ, gj);
  }
  ctx.beginPath();
  for (let i = Math.floor(minI); i <= Math.ceil(maxI); i++) {
    for (let j = Math.floor(minJ); j <= Math.ceil(maxJ); j++) {
      const gx = i * cell;
      const gy = j * cell;
      const px = gx * c - gy * s;
      const py = gx * s + gy * c;
      if (px < area.x - cell || py < area.y - cell || px > area.x + area.w + cell || py > area.y + area.h + cell) continue;
      const v = shade(px, py);
      if (v <= 0.02) continue;
      const r = cell * 0.56 * Math.sqrt(Math.min(1, v));
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = color;
  ctx.fill();
}

export function dotPattern(ctx: CanvasRenderingContext2D, color: string, cell: number, radius: number) {
  const tile = document.createElement("canvas");
  const size = Math.max(2, Math.round(cell * 2));
  tile.width = size;
  tile.height = size;
  const t = tile.getContext("2d");
  if (!t) return color;
  t.fillStyle = color;
  const r = (radius * size) / (cell * 2);
  for (const [x, y] of [
    [size * 0.25, size * 0.25],
    [size * 0.75, size * 0.75],
  ]) {
    t.beginPath();
    t.arc(x, y, r, 0, Math.PI * 2);
    t.fill();
  }
  return ctx.createPattern(tile, "repeat") ?? color;
}
