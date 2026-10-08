export const TRENCH = { x: 950, y: 108, a: 400, b: 72 };

export const TRENCH_CAPTION = { x: TRENCH.x - 110, y: TRENCH.y + 16 };

export const TRENCH_SERIES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

const POINTS = 72;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function trenchCalm(x: number, y: number) {
  const d = Math.hypot((x - TRENCH.x) / (TRENCH.a * 1.14), (y - TRENCH.y + 8) / (TRENCH.b * 1.4));
  return 1 - smoothstep(0.82, 1.06, d);
}

export function trenchRing(index: number) {
  const a = TRENCH.a - 31 * index;
  const b = TRENCH.b - 5.6 * index;
  const cx = TRENCH.x - 17 * index;
  const cy = TRENCH.y + 1.4 * index;
  const p1 = 1.3 + index * 2.17;
  const p2 = 4.1 + index * 1.37;
  const p3 = 0.7 + index * 3.11;
  const points: { x: number; y: number }[] = [];
  for (let k = 0; k < POINTS; k++) {
    const t = (2 * Math.PI * k) / POINTS;
    const w = 1 + 0.05 * Math.sin(3 * t + p1) + 0.035 * Math.sin(5 * t + p2) + 0.02 * Math.sin(8 * t + p3);
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    points.push({ x: cx + a * w * cos, y: cy + b * w * sin - 20 * cos * cos + 9 * sin * cos });
  }
  return points;
}

export function trenchBounds() {
  const ring = trenchRing(0);
  return {
    x0: Math.min(...ring.map((p) => p.x)),
    y0: Math.min(...ring.map((p) => p.y)),
    x1: Math.max(...ring.map((p) => p.x)),
    y1: Math.max(...ring.map((p) => p.y)),
  };
}

export function trenchDepths(silences: number) {
  return TRENCH_SERIES.filter((value) => value <= silences);
}
