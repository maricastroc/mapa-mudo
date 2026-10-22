export type Point = { x: number; y: number };

export const VIEW = { w: 600, h: 360, top: 96 };
export const EARTH = { cx: 300, cy: 700, r: 430 };
export const ORBIT_R = 560;
export const ATMOSPHERE_R = 458;

const LAUNCH_ANGLE = -0.55;
const JOIN_ANGLE = -0.32;
const RETRO_ANGLE = 0.3;
const SPLASH_ANGLE = 0.46;

function polar(r: number, angle: number): Point {
  return { x: EARTH.cx + r * Math.sin(angle), y: EARTH.cy - r * Math.cos(angle) };
}

function tangent(angle: number): Point {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function cubic(a: Point, b: Point, c: Point, d: Point, steps: number) {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    });
  }
  return out;
}

export const LAUNCH = polar(EARTH.r, LAUNCH_ANGLE);
export const SPLASH = polar(EARTH.r, SPLASH_ANGLE);
export const RETRO = polar(ORBIT_R, RETRO_ANGLE);

const join = polar(ORBIT_R, JOIN_ANGLE);
const joinDir = tangent(JOIN_ANGLE);
const retroDir = tangent(RETRO_ANGLE);

export const ASCENT = cubic(LAUNCH, { x: LAUNCH.x, y: LAUNCH.y - 64 }, { x: join.x - 38 * joinDir.x, y: join.y - 38 * joinDir.y }, join, 40);

export const ORBIT: Point[] = Array.from({ length: 61 }, (_, i) => polar(ORBIT_R, JOIN_ANGLE + ((RETRO_ANGLE - JOIN_ANGLE) * i) / 60));

export const DESCENT = cubic(RETRO, { x: RETRO.x + 46 * retroDir.x, y: RETRO.y + 46 * retroDir.y }, { x: SPLASH.x + 18, y: SPLASH.y - 70 }, SPLASH, 50);

export const ROUTE: Point[] = [...ASCENT, ...ORBIT.slice(1), ...DESCENT.slice(1)];

export function cumulative(points: Point[]) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return lengths;
}

const ROUTE_LENGTHS = cumulative(ROUTE);
export const ROUTE_LENGTH = ROUTE_LENGTHS[ROUTE_LENGTHS.length - 1];
const DESCENT_LENGTHS = cumulative(DESCENT);
export const DESCENT_LENGTH = DESCENT_LENGTHS[DESCENT_LENGTHS.length - 1];

function along(points: Point[], lengths: number[], distance: number): { point: Point; direction: Point; index: number } {
  const total = lengths[lengths.length - 1];
  const d = Math.max(0, Math.min(total, distance));
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < d) i++;
  const a = points[i - 1];
  const b = points[i];
  const span = lengths[i] - lengths[i - 1] || 1;
  const k = (d - lengths[i - 1]) / span;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { point: { x: a.x + dx * k, y: a.y + dy * k }, direction: { x: dx / len, y: dy / len }, index: i };
}

export function routeAt(fraction: number) {
  return along(ROUTE, ROUTE_LENGTHS, fraction * ROUTE_LENGTH);
}

export function descentAt(fraction: number) {
  return along(DESCENT, DESCENT_LENGTHS, fraction * DESCENT_LENGTH);
}

export function routeUpTo(fraction: number): Point[] {
  if (fraction <= 0) return [ROUTE[0]];
  const { point, index } = routeAt(fraction);
  return [...ROUTE.slice(0, index), point];
}

export function descentUpTo(fraction: number): Point[] {
  if (fraction <= 0) return [DESCENT[0]];
  const { point, index } = descentAt(fraction);
  return [...DESCENT.slice(0, index), point];
}

function fractionOf(target: Point) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < ROUTE.length; i++) {
    const d = Math.hypot(ROUTE[i].x - target.x, ROUTE[i].y - target.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return ROUTE_LENGTHS[best] / ROUTE_LENGTH;
}

export type CheckpointId = "launch" | "orbit" | "retro" | "splash";

export type Checkpoint = { id: CheckpointId; label: string; at: Point; fraction: number; labelSide: "above" | "below" | "left" | "right" };

const ORBIT_TOP = polar(ORBIT_R, 0);

export const CHECKPOINTS: Checkpoint[] = [
  { id: "launch", label: "lançamento", at: LAUNCH, fraction: 0, labelSide: "right" },
  { id: "orbit", label: "3 voltas na Terra", at: ORBIT_TOP, fraction: fractionOf(ORBIT_TOP), labelSide: "below" },
  { id: "retro", label: "retrofoguetes", at: RETRO, fraction: fractionOf(RETRO), labelSide: "above" },
  { id: "splash", label: "resgate", at: SPLASH, fraction: 1, labelSide: "left" },
];

export function toPath(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export const TIMING = { check: 2.8, pause: 0.35, fly: 2.4, settle: 0.6 };
export const TOTAL_SECONDS = TIMING.check + TIMING.pause + TIMING.fly + TIMING.settle;

export type DemoPhase = "idle" | "checking" | "flying" | "done";

export function phaseAt(seconds: number): { phase: DemoPhase; check: number; fly: number } {
  if (seconds < 0) return { phase: "idle", check: 0, fly: 0 };
  if (seconds < TIMING.check) return { phase: "checking", check: seconds / TIMING.check, fly: 0 };
  const flyStart = TIMING.check + TIMING.pause;
  if (seconds < flyStart) return { phase: "checking", check: 1, fly: 0 };
  if (seconds < flyStart + TIMING.fly) return { phase: "flying", check: 1, fly: (seconds - flyStart) / TIMING.fly };
  return { phase: "done", check: 1, fly: 1 };
}
