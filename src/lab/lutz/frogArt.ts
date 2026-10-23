import { INK } from "../riso/inks.ts";

export type Build = "tree" | "toad" | "frog";
export type Skin = "orange" | "blue" | "black";
export type Mark = "plain" | "spots" | "bands" | "stripe";
export type Look = { build: Build; skin: Skin; mark: Mark };

export type Point = { x: number; y: number };

export type FramePose = {
  stretch: number;
  squash: number;
  tilt: number;
  blink: number;
  throat: number;
};

export const REST_POSE: FramePose = { stretch: 0, squash: 0, tilt: 0, blink: 0, throat: 0 };

type Limb = { sit: Point[]; leap: Point[]; widths: number[] };

export type Rig = {
  body: string;
  eye: Point & { r: number };
  pupil: { rx: number; ry: number };
  nostril: Point;
  mouth: string;
  tympanum: (Point & { r: number }) | null;
  hind: Limb;
  fore: Limb;
  discs: number;
  ridge: string;
  gland: string;
  warts: [number, number, number][];
  spots: [number, number, number][];
  bands: string;
  stripe: string;
  belly: string;
  center: Point;
  throat: Point;
  top: number;
};

const p = (x: number, y: number): Point => ({ x, y });

export const RIGS: Record<Build, Rig> = {
  tree: {
    body: "M -34 -15 C -46 -20 -46 -38 -33 -45 C -18 -53 6 -55 24 -50 C 37 -46 46 -39 49 -31 C 46 -25 37 -21 25 -19 C 11 -13 -17 -9 -34 -15 Z",
    eye: { x: 25, y: -47, r: 10 },
    pupil: { rx: 5.4, ry: 3.2 },
    nostril: p(44, -37),
    mouth: "M 48 -29.5 C 41 -26 31 -25 21 -28",
    tympanum: { x: 10, y: -35, r: 3.6 },
    hind: {
      sit: [p(-28, -24), p(8, -11), p(-28, -4), p(12, -1)],
      leap: [p(-28, -24), p(-54, -12), p(-78, -21), p(-100, -15)],
      widths: [14, 8.5, 5],
    },
    fore: { sit: [p(25, -22), p(23, -12), p(29, -3), p(35, -1)], leap: [p(25, -22), p(36, -15), p(46, -9), p(54, -6)], widths: [6.5, 5.5, 4] },
    discs: 3.1,
    ridge: "",
    gland: "",
    warts: [],
    spots: [
      [-24, -37, 5],
      [-8, -45, 4.5],
      [5, -34, 5],
      [-31, -26, 3.6],
      [-13, -26, 4],
    ],
    bands: "M -32 -47 L -25 -50 L -23 -28 L -30 -27 Z M -14 -53 L -7 -54 L -6 -30 L -13 -29 Z M 3 -55 L 9 -54.5 L 10 -33 L 4 -32 Z",
    stripe: "M 15 -51.5 C 0 -52.5 -18 -49 -37 -39 L -39 -33 C -20 -43 0 -46 15 -45.5 Z",
    belly: "M -36 -14 C -18 -10 10 -14 25 -20 C 36 -22 44 -26 48 -30 L 52 -10 L -40 -6 Z",
    center: p(0, -30),
    throat: p(36, -21),
    top: -57,
  },
  toad: {
    body: "M -38 -11 C -52 -18 -50 -40 -32 -47 C -15 -54 9 -54 25 -47 C 37 -42 45 -34 47 -26 C 43 -19 33 -15 21 -13 C 5 -7 -21 -5 -38 -11 Z",
    eye: { x: 24, y: -45, r: 7 },
    pupil: { rx: 4, ry: 2.3 },
    nostril: p(42, -34),
    mouth: "M 46 -24.5 C 39 -20 29 -20 19 -23",
    tympanum: null,
    hind: {
      sit: [p(-31, -21), p(-2, -9), p(-31, -3), p(4, -1)],
      leap: [p(-31, -21), p(-52, -11), p(-71, -19), p(-89, -14)],
      widths: [16.5, 10, 6],
    },
    fore: { sit: [p(22, -18), p(20, -10), p(25, -2), p(30, -1)], leap: [p(22, -18), p(32, -12), p(40, -7), p(47, -4)], widths: [8.5, 7, 5.2] },
    discs: 0,
    ridge: "M 15 -50 C 21 -54.5 29 -53.5 33 -48.5",
    gland: "M 0 -44.5 C 5 -50 15 -49.5 17 -44 C 13 -39.5 4 -39.5 0 -44.5 Z",
    warts: [
      [-30, -36, 2.4],
      [-20, -43, 2.1],
      [-9, -37, 2.6],
      [-25, -25, 2],
      [-6, -27, 2.2],
      [8, -33, 1.8],
      [-37, -22, 1.7],
      [-15, -17, 1.9],
      [2, -20, 1.6],
      [-24, -47, 1.6],
      [-4, -48, 1.7],
    ],
    spots: [
      [-27, -35, 5.5],
      [-10, -43, 5],
      [-14, -25, 4.2],
      [5, -28, 4.5],
      [-35, -22, 3.4],
    ],
    bands: "M -34 -44 L -27 -47.5 L -25 -24 L -32 -22 Z M -16 -51 L -9 -52.5 L -8 -26 L -15 -25 Z M 2 -51 L 9 -50 L 10 -29 L 3 -28 Z",
    stripe: "M -4 -51.5 C -16 -51 -28 -47 -40 -38 L -42 -32 C -30 -41 -16 -45.5 -4 -46 Z",
    belly: "M -40 -11 C -20 -6 6 -9 21 -14 C 32 -16 41 -20 46 -24.5 L 52 -6 L -44 -4 Z",
    center: p(0, -28),
    throat: p(33, -16),
    top: -54,
  },
  frog: {
    body: "M -36 -17 C -48 -23 -45 -39 -31 -43 C -15 -48 6 -48 22 -44 C 36 -40 50 -34 58 -28 C 52 -23 40 -21 28 -19 C 12 -14 -16 -11 -36 -17 Z",
    eye: { x: 24, y: -43, r: 8.2 },
    pupil: { rx: 4.6, ry: 2.7 },
    nostril: p(51, -32),
    mouth: "M 57 -27 C 46 -23.5 34 -23.5 21 -26.5",
    tympanum: { x: 9, y: -33, r: 5.2 },
    hind: {
      sit: [p(-29, -25), p(10, -11), p(-31, -4), p(16, -1)],
      leap: [p(-29, -25), p(-58, -13), p(-86, -22), p(-110, -16)],
      widths: [14, 8, 4.6],
    },
    fore: { sit: [p(27, -22), p(25, -12), p(31, -3), p(37, -1)], leap: [p(27, -22), p(38, -15), p(49, -9), p(57, -6)], widths: [6, 5, 3.8] },
    discs: 0,
    ridge: "M 15 -44.5 C -2 -45 -20 -42 -37 -35",
    gland: "",
    warts: [],
    spots: [
      [-24, -34, 4.8],
      [-9, -41, 4.2],
      [5, -34, 4.6],
      [-31, -24, 3.2],
      [-13, -24, 3.8],
    ],
    bands: "M -31 -44 L -24 -46 L -22 -26 L -29 -25 Z M -13 -48 L -6 -48.5 L -5 -28 L -12 -27 Z M 5 -48 L 11 -47 L 12 -30 L 6 -29 Z",
    stripe: "M 15 -47.5 C -2 -48 -20 -45 -38 -37 L -40 -31.5 C -22 -40 -2 -42.5 15 -42 Z",
    belly: "M -38 -16 C -18 -12 10 -15 28 -20 C 40 -22 50 -25 57 -27.5 L 62 -10 L -42 -8 Z",
    center: p(2, -30),
    throat: p(40, -20),
    top: -52,
  },
};

export const SKIN_COLOR: Record<Skin, string> = { orange: INK.orange, blue: INK.blue, black: INK.black };
export const MARK_COLOR: Record<Skin, string> = { orange: INK.black, blue: INK.paper, black: INK.orange };
export const IRIS_COLOR: Record<Skin, string> = { orange: INK.paper, blue: "#f3d27a", black: INK.orange };
export const BELLY_ALPHA: Record<Skin, number> = { orange: 0.5, blue: 0.32, black: 0.2 };

function mix(a: Point, b: Point, k: number): Point {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

export function limbAt(limb: Limb, stretch: number): Point[] {
  const k = Math.max(0, Math.min(1, stretch));
  return limb.sit.map((point, i) => mix(point, limb.leap[i], k));
}

const paths = new Map<string, Path2D>();

export function shadeDots() {
  const dots: [number, number, number][] = [];
  const cell = 3.4;
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 40; i++) {
      const x = -62 + i * cell + (j % 2) * cell * 0.5;
      const y = -38 + j * cell * 0.87;
      const k = Math.max(0, Math.min(1, (y + 36) / 20));
      const r = cell * 0.5 * Math.sqrt(k) * 0.9;
      if (r > 0.25) dots.push([x, y, r]);
    }
  }
  return dots;
}

const SHADE = (() => {
  if (typeof Path2D === "undefined") return null as unknown as Path2D;
  const shade = new Path2D();
  for (const [x, y, r] of shadeDots()) {
    shade.moveTo(x + r, y);
    shade.arc(x, y, r, 0, Math.PI * 2);
  }
  return shade;
})();

function path(d: string) {
  let cached = paths.get(d);
  if (!cached) {
    cached = new Path2D(d);
    paths.set(d, cached);
  }
  return cached;
}

export type FrogDraw = {
  x: number;
  y: number;
  size: number;
  facing: 1 | -1;
  halo?: number;
  alpha?: number;
};

function polyline(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

function strokeLimb(ctx: CanvasRenderingContext2D, points: Point[], widths: number[], color: string, extra: number) {
  ctx.strokeStyle = color;
  for (let i = 0; i < points.length - 1; i++) {
    ctx.lineWidth = widths[Math.min(i, widths.length - 1)] + extra;
    polyline(ctx, [points[i], points[i + 1]]);
    ctx.stroke();
  }
}

function limbMarks(ctx: CanvasRenderingContext2D, look: Look, points: Point[], widths: number[], color: string) {
  if (look.mark === "plain" || look.mark === "stripe") return;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "butt";
  for (let i = 0; i < Math.min(2, points.length - 1); i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const w = widths[i];
    const stops = i === 0 ? [0.4, 0.72] : [0.5];
    for (const k of stops) {
      const c = mix(a, b, k);
      if (look.mark === "spots") {
        ctx.beginPath();
        ctx.arc(c.x, c.y, w * 0.26, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = w * 0.3;
        ctx.beginPath();
        ctx.moveTo(c.x + nx * w * 0.48, c.y + ny * w * 0.48);
        ctx.lineTo(c.x - nx * w * 0.48, c.y - ny * w * 0.48);
        ctx.stroke();
      }
    }
  }
  ctx.lineCap = "round";
}

function toes(ctx: CanvasRenderingContext2D, rig: Rig, tip: Point, before: Point, skin: string, ink: number, length: number, width: number) {
  const angle = Math.atan2(tip.y - before.y, tip.x - before.x);
  const ends = [-0.42, 0.02, 0.4].map((spread, i) => {
    const a = angle + spread;
    const l = length * (i === 1 ? 1 : 0.8);
    return { x: tip.x + Math.cos(a) * l, y: tip.y + Math.sin(a) * l };
  });
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? skin : INK.black;
    ctx.lineWidth = width + (pass ? 0 : ink * 2);
    for (const e of ends) {
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }
  }
  if (!rig.discs) return;
  for (const e of ends) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, rig.discs * (length > 5 ? 1 : 0.75), 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.lineWidth = ink * 0.8;
    ctx.strokeStyle = INK.black;
    ctx.stroke();
  }
}

export function drawFrog(ctx: CanvasRenderingContext2D, look: Look, pose: FramePose, at: FrogDraw) {
  const rig = RIGS[look.build];
  const skin = SKIN_COLOR[look.skin];
  const markColor = MARK_COLOR[look.skin];
  const unit = at.size / 100;
  const ink = Math.max(1.1, Math.min(3.2, at.size * 0.024)) / unit;
  const hind = limbAt(rig.hind, pose.stretch);
  const fore = limbAt(rig.fore, pose.stretch);
  const squash = Math.max(-0.6, Math.min(0.8, pose.squash));
  const body = path(rig.body);

  ctx.save();
  if (at.alpha !== undefined) ctx.globalAlpha *= at.alpha;
  ctx.translate(at.x, at.y);
  ctx.scale(at.facing * unit * (1 + squash * 0.14), unit * (1 - squash * 0.17));
  ctx.translate(rig.center.x, rig.center.y);
  ctx.rotate(pose.tilt);
  ctx.translate(-rig.center.x, -rig.center.y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const farHind = hind.map((q) => ({ x: q.x - 4, y: q.y - 3 }));
  const farFore = fore.map((q) => ({ x: q.x - 5, y: q.y - 2.5 }));

  if (at.halo) {
    const halo = at.halo / unit;
    strokeLimb(ctx, farHind, rig.hind.widths, INK.paper, halo + ink * 2);
    strokeLimb(ctx, hind, rig.hind.widths, INK.paper, halo + ink * 2);
    strokeLimb(ctx, fore, rig.fore.widths, INK.paper, halo + ink * 2);
    ctx.lineWidth = halo + ink * 2;
    ctx.strokeStyle = INK.paper;
    ctx.stroke(body);
  }

  for (const limb of [farHind, farFore]) {
    const widths = limb === farHind ? rig.hind.widths : rig.fore.widths;
    strokeLimb(ctx, limb, widths, INK.black, ink * 2);
    strokeLimb(ctx, limb, widths, skin, 0);
    strokeLimb(ctx, limb, widths, "rgba(41, 41, 41, 0.38)", 0);
  }

  ctx.fillStyle = skin;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);

  if (look.mark === "spots") {
    ctx.fillStyle = markColor;
    ctx.beginPath();
    for (const [x, y, r] of rig.spots) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (look.mark === "bands") {
    ctx.fillStyle = markColor;
    ctx.fill(path(rig.bands));
  } else if (look.mark === "stripe") {
    ctx.fillStyle = markColor;
    ctx.fill(path(rig.stripe));
    ctx.lineWidth = ink * 0.7;
    ctx.strokeStyle = look.skin === "blue" ? INK.black : skin;
    ctx.stroke(path(rig.stripe));
  }
  ctx.fillStyle = look.skin === "black" ? "rgba(247, 248, 246, 0.16)" : "rgba(41, 41, 41, 0.3)";
  ctx.fill(SHADE);
  ctx.fillStyle = `rgba(247, 248, 246, ${BELLY_ALPHA[look.skin]})`;
  ctx.fill(path(rig.belly));
  if (rig.warts.length) {
    for (const [x, y, r] of rig.warts) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(41, 41, 41, 0.28)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(247, 248, 246, 0.55)";
      ctx.fill();
    }
  }
  if (rig.gland) {
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.fill(path(rig.gland));
  }
  ctx.strokeStyle = "rgba(247, 248, 246, 0.6)";
  ctx.lineWidth = ink * 1.1;
  ctx.beginPath();
  ctx.moveTo(-30, rig.top + 16);
  ctx.quadraticCurveTo(-14, rig.top + 5, 6, rig.top + 5);
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = ink;
  ctx.strokeStyle = INK.black;
  ctx.stroke(body);
  if (rig.gland) ctx.stroke(path(rig.gland));
  if (rig.ridge) {
    ctx.lineWidth = ink * 0.8;
    ctx.stroke(path(rig.ridge));
  }

  toes(ctx, rig, hind[3], hind[2], skin, ink, 8, 2.6);
  strokeLimb(ctx, hind, rig.hind.widths, INK.black, ink * 2);
  strokeLimb(ctx, hind, rig.hind.widths, skin, 0);
  limbMarks(ctx, look, hind, rig.hind.widths, markColor);

  toes(ctx, rig, fore[3], fore[2], skin, ink, 4.5, 2);
  strokeLimb(ctx, fore, rig.fore.widths, INK.black, ink * 2);
  strokeLimb(ctx, fore, rig.fore.widths, skin, 0);

  if (pose.throat > 0.02) {
    const r = 7.5 * pose.throat;
    ctx.beginPath();
    ctx.ellipse(rig.throat.x, rig.throat.y + r * 0.5, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = look.skin === "orange" ? "#f8d3c4" : "#f3e7c0";
    ctx.fill();
    ctx.lineWidth = ink * 0.85;
    ctx.strokeStyle = INK.black;
    ctx.stroke();
  }

  const { eye } = rig;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2);
  ctx.fillStyle = IRIS_COLOR[look.skin];
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = INK.black;
  ctx.beginPath();
  ctx.ellipse(eye.x + eye.r * 0.12, eye.y + eye.r * 0.05, rig.pupil.rx, rig.pupil.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK.paper;
  ctx.beginPath();
  ctx.arc(eye.x + eye.r * 0.38, eye.y - eye.r * 0.36, eye.r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  if (pose.blink > 0.02) {
    ctx.fillStyle = skin;
    ctx.fillRect(eye.x - eye.r, eye.y - eye.r, eye.r * 2, eye.r * 2 * Math.min(1, pose.blink));
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = ink * 0.8;
    ctx.beginPath();
    const lid = eye.y - eye.r + eye.r * 2 * Math.min(1, pose.blink);
    ctx.moveTo(eye.x - eye.r, lid);
    ctx.lineTo(eye.x + eye.r, lid);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = ink;
  ctx.strokeStyle = INK.black;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = ink * 0.85;
  ctx.stroke(path(rig.mouth));
  if (rig.tympanum) {
    ctx.beginPath();
    ctx.arc(rig.tympanum.x, rig.tympanum.y, rig.tympanum.r, 0, Math.PI * 2);
    ctx.lineWidth = ink * 0.7;
    ctx.stroke();
  }
  ctx.fillStyle = INK.black;
  ctx.beginPath();
  ctx.arc(rig.nostril.x, rig.nostril.y, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
