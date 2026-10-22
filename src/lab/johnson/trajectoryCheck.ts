export type Point = { x: number; y: number };

const DEG = Math.PI / 180;

export const VIEW = { w: 600, h: 300 };
export const GLOBE = { cx: 190, cy: 168, r: 112 };
export const ORBIT = { rx: 166, ry: 56, tilt: -10 * DEG };
export const RETRO_THETA = 0.55;
export const LAPS = 3;
export const LANDING: Point = { x: GLOBE.cx + 0.55 * GLOBE.r, y: GLOBE.cy + 0.42 * GLOBE.r };
export const CARD = { x: 380, y: 52, w: 200, h: 196 };

export const T = {
  computing: 2.6,
  verify: 4.0,
  confirmed: 5.3,
  landing: 5.4,
  depart: 5.8,
  splash: 7.8,
  closing: 8.0,
  end: 9.0,
};

export const ROW_COUNT = 4;

export type Act = "challenge" | "computing" | "landing" | "closing";

export function actAt(t: number): Act {
  if (t < T.computing) return "challenge";
  if (t < T.landing) return "computing";
  if (t < T.closing) return "landing";
  return "closing";
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

function rotate(x: number, y: number): Point {
  const c = Math.cos(ORBIT.tilt);
  const s = Math.sin(ORBIT.tilt);
  return { x: GLOBE.cx + x * c - y * s, y: GLOBE.cy + x * s + y * c };
}

export function orbitPoint(theta: number): Point {
  return rotate(ORBIT.rx * Math.cos(theta), ORBIT.ry * Math.sin(theta));
}

export function orbitHeading(theta: number): Point {
  const p = rotate(-ORBIT.rx * Math.sin(theta), ORBIT.ry * Math.cos(theta));
  const dx = p.x - GLOBE.cx;
  const dy = p.y - GLOBE.cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function inFront(theta: number) {
  return Math.sin(theta) > 0;
}

export function orbitPath(from: number, to: number, steps = 90) {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) points.push(orbitPoint(from + ((to - from) * i) / steps));
  return points;
}

const START = orbitPoint(RETRO_THETA);
const HEADING = orbitHeading(RETRO_THETA);

export const DESCENT: [Point, Point, Point, Point] = [
  START,
  { x: START.x + HEADING.x * 30, y: START.y + HEADING.y * 30 },
  { x: LANDING.x + 14, y: LANDING.y - 28 },
  LANDING,
];

export function bezier([a, b, c, d]: [Point, Point, Point, Point], k: number): Point {
  const u = 1 - k;
  return {
    x: u * u * u * a.x + 3 * u * u * k * b.x + 3 * u * k * k * c.x + k * k * k * d.x,
    y: u * u * u * a.y + 3 * u * u * k * b.y + 3 * u * k * k * c.y + k * k * k * d.y,
  };
}

export function curvePoints(curve: [Point, Point, Point, Point], from = 0, to = 1, steps = 40) {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) points.push(bezier(curve, from + ((to - from) * i) / steps));
  return points;
}

export function toPath(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

export const GUESSES: [Point, Point, Point, Point][] = [0.22, 0.4, 0.72, 0.9].map((theta, i) => {
  const from = orbitPoint(theta);
  const heading = orbitHeading(theta);
  const ends: Point[] = [
    { x: GLOBE.cx + 0.88 * GLOBE.r, y: GLOBE.cy + 0.18 * GLOBE.r },
    { x: GLOBE.cx + 0.2 * GLOBE.r, y: GLOBE.cy + 0.62 * GLOBE.r },
    { x: GLOBE.cx - 0.25 * GLOBE.r, y: GLOBE.cy + 0.8 * GLOBE.r },
    { x: GLOBE.cx + 0.72 * GLOBE.r, y: GLOBE.cy + 0.55 * GLOBE.r },
  ];
  const to = ends[i];
  return [from, { x: from.x + heading.x * 34, y: from.y + heading.y * 34 }, { x: to.x + 10, y: to.y - 30 }, to];
});

const ORBIT_SPEED = (2 * Math.PI * LAPS) / T.depart;

export type CapsuleState = { stage: "orbit" | "descent" | "landed"; point: Point; heading: Point; front: boolean; k: number; lap: number };

export function descentProgress(t: number) {
  const k = clamp01((t - T.depart) / (T.splash - T.depart));
  return 1 - Math.pow(1 - k, 1.7);
}

export function capsuleAt(t: number): CapsuleState {
  if (t < T.depart) {
    const theta = RETRO_THETA - (T.depart - Math.max(0, t)) * ORBIT_SPEED;
    const lap = Math.min(LAPS, Math.floor((Math.max(0, t) * ORBIT_SPEED) / (2 * Math.PI)) + 1);
    return { stage: "orbit", point: orbitPoint(theta), heading: orbitHeading(theta), front: inFront(theta), k: 0, lap };
  }
  const k = descentProgress(t);
  const point = bezier(DESCENT, k);
  const ahead = bezier(DESCENT, Math.min(1, k + 0.02));
  const behind = bezier(DESCENT, Math.max(0, k - 0.02));
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const len = Math.hypot(dx, dy) || 1;
  return { stage: t >= T.splash ? "landed" : "descent", point, heading: { x: dx / len, y: dy / len }, front: true, k, lap: LAPS };
}

export const FOCUS = (() => {
  const w = VIEW.w / 1.9;
  const h = VIEW.h / 1.9;
  const cx = (START.x + LANDING.x) / 2 - 22;
  const cy = (START.y + LANDING.y) / 2 + 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
})();

export function viewBoxAt(zoom: number) {
  const z = clamp01(zoom);
  return {
    x: FOCUS.x * z,
    y: FOCUS.y * z,
    w: VIEW.w + (FOCUS.w - VIEW.w) * z,
    h: VIEW.h + (FOCUS.h - VIEW.h) * z,
  };
}

export function zoomAt(t: number) {
  return ease((t - T.landing) / 1.2);
}

export function cardOpacity(t: number) {
  return ease((t - T.computing) / 0.5) * (1 - ease((t - T.landing) / 0.6));
}
