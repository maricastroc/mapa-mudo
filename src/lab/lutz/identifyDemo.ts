import type { Look } from "./frogArt.ts";

export const T = {
  tap: 0.5,
  real: 1.1,
  magnifier: 1.4,
  callouts: [1.7, 2.2, 2.7],
  ruler: 2.9,
  compare: 3.4,
  cards: [3.5, 3.7, 3.9],
  checks: [4.3, 4.95, 5.6],
  register: 6.6,
  lines: [6.9, 7.35, 7.8],
  stamp: 8.3,
  file: 8.8,
  closing: 9.8,
  end: 10.8,
};

export type Act = "observe" | "compare" | "register" | "closing";

export const SPECIMEN: Look = { build: "tree", skin: "orange", mark: "spots" };

export const CARDS: { look: Look; match: boolean; x: number }[] = [
  { look: { build: "toad", skin: "blue", mark: "plain" }, match: false, x: 330 },
  { look: { build: "tree", skin: "orange", mark: "bands" }, match: false, x: 416 },
  { look: SPECIMEN, match: true, x: 502 },
];

export const CARD = { y: 46, w: 76, h: 98 };
export const FROG = { x: 160, y: 200, size: 138 };
export const TRAY = { x: 36, y: 124, w: 250, h: 104 };
export const DRAWER = { x: 332, y: 214, w: 242, h: 56 };
export const TAG = { x: 334, y: 46, w: 240, h: 116 };
export const MAGNIFIER_PATH = [
  { at: T.magnifier, x: 300, y: 250 },
  { at: T.callouts[0], x: 196, y: 130 },
  { at: T.callouts[1], x: 132, y: 152 },
  { at: T.callouts[2], x: 210, y: 194 },
  { at: T.ruler + 0.3, x: 276, y: 110 },
];

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function easeOutBack(t: number) {
  const k = clamp01(t);
  return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
}

export function actAt(t: number): Act {
  if (t < T.compare) return "observe";
  if (t < T.register) return "compare";
  if (t < T.closing) return "register";
  return "closing";
}

export function realness(t: number) {
  return ease((t - T.real) / 0.5);
}

export function magnifierAt(t: number) {
  const path = MAGNIFIER_PATH;
  if (t < path[0].at) return { ...path[0], visible: 0 };
  const fadeOut = 1 - clamp01((t - T.compare) / 0.3);
  for (let i = 1; i < path.length; i++) {
    if (t < path[i].at) {
      const k = ease((t - path[i - 1].at) / (path[i].at - path[i - 1].at));
      return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * k, y: path[i - 1].y + (path[i].y - path[i - 1].y) * k, visible: clamp01((t - path[0].at) / 0.25) * fadeOut };
    }
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y, visible: fadeOut };
}

export function calloutAt(index: number, t: number) {
  const fade = 1 - clamp01((t - T.compare - 0.2) / 0.4);
  return clamp01((t - T.callouts[index]) / 0.3) * fade;
}

export function cardAt(index: number, t: number) {
  const slide = ease((t - T.cards[index]) / 0.45);
  const away = ease((t - T.register - (CARDS[index].match ? 0.25 : 0)) / 0.4);
  return { slide, away };
}

export function checkAt(index: number, t: number) {
  return { line: clamp01((t - T.checks[index] + 0.35) / 0.3), mark: clamp01((t - T.checks[index]) / 0.2) };
}

export function pointerTarget(t: number) {
  for (let i = CARDS.length - 1; i >= 0; i--) if (t >= T.checks[i] - 0.4 && t < T.register) return i;
  return -1;
}

export function tagAt(t: number) {
  return ease((t - T.register - 0.1) / 0.4);
}

export function lineAt(index: number, t: number) {
  return clamp01((t - T.lines[index]) / 0.4);
}

export function stampAt(t: number) {
  return clamp01((t - T.stamp) / 0.25);
}

export function fileAt(t: number) {
  return ease((t - T.file) / 0.7);
}

export function counterAt(t: number) {
  return t >= T.file + 0.7 ? 1 : 0;
}
