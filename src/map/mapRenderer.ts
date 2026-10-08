import type { FieldPoint, Peak, Shape, TerrainField } from "./terrainField.ts";
import { bounds, cellExtremes, contains, traceContours, type Polyline } from "./contours.ts";

export const SHEET = { w: 1440, h: 900 };

export type Camera = { x: number; y: number; z: number; ax: number; ay: number };
export type Lens = { x: number; y: number; w: number; h: number; r: number; o: number };

export type Scene = {
  camera: Camera;
  strata: number;
  portrait: number;
  portraitMask: number;
  lens: Lens;
  lensInk: number;
  intervalLock: number;
  lockedInterval: number;
  density: number;
  portraitFrame: { x: number; y: number; r: number };
  highlight: string | null;
  newContour: string | null;
  newContourKind: "rock" | "reef";
  settle: number;
  settleFrom: number | null;
  highlightSettles: boolean;
  minInterval: number;
};

export type Channel = "camera" | "strata" | "portrait" | "portraitMask" | "lens" | "lensInk" | "intervalLock" | "density" | "peaks" | "settle";
export type Timing = { delay: number; duration: number };
export type ReliefPoint = FieldPoint;
export type SceneTarget = { scene: Scene; timings: Partial<Record<Channel, Timing>>; relief: ReliefPoint[] };

export type View = {
  W: number;
  H: number;
  fit: number;
  camera: Camera;
  lens: Lens;
  newContour: { x: number; y: number; r: number; emphasis: number } | null;
};

type Frame = Scene["portraitFrame"];
type RGB = [number, number, number];
type Transition<T> = { from: T; to: T; start: number; duration: number };
type ScalarChannel = "strata" | "portrait" | "portraitMask" | "lensInk" | "intervalLock" | "lockedInterval" | "density" | "settle";
type ContourLevel = { value: number; alpha: number; index: number; coastline: boolean; lines: Polyline[] };

export function toScreen(v: { W: number; H: number; fit: number; camera: Camera }, x: number, y: number): [number, number] {
  const e = v.camera.z * v.fit;
  return [v.camera.ax * v.W + (x - v.camera.x) * e, v.camera.ay * v.H + (y - v.camera.y) * e];
}

export function sheetFit(W: number, H: number) {
  return Math.min(W / SHEET.w, H / SHEET.h);
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);


function progress<T>(tr: Transition<T>, now: number) {
  if (tr.duration <= 0) return now >= tr.start ? 1 : 0;
  return clamp((now - tr.start) / tr.duration, 0, 1);
}

function interpolateCamera(a: Camera, b: Camera, t: number, W: number, H: number, fit: number): Camera {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const ref = b.z >= a.z ? b : a;
  const s0 = toScreen({ W, H, fit, camera: a }, ref.x, ref.y);
  const s1 = toScreen({ W, H, fit, camera: b }, ref.x, ref.y);
  const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
  return {
    x: ref.x,
    y: ref.y,
    z,
    ax: (s0[0] + (s1[0] - s0[0]) * t) / W,
    ay: (s0[1] + (s1[1] - s0[1]) * t) / H,
  };
}

function interpolateLens(a: Lens, b: Lens, t: number): Lens {
  if (t >= 1) return b;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
    r: a.r + (b.r - a.r) * t,
    o: a.o + (b.o - a.o) * t,
  };
}

function interpolateFrame(a: Frame, b: Frame, t: number): Frame {
  if (t >= 1) return b;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: a.r + (b.r - a.r) * t };
}

function readRGB(value: string, fallback: RGB): RGB {
  const v = value.trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: RGB, b: RGB, t: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;

function strokePolyline(ctx: CanvasRenderingContext2D, l: Polyline, cell: number) {
  const p = l.pts;
  const n = p.length / 2;
  if (n < 2) return;
  if (n < 3) {
    ctx.moveTo(p[0] * cell, p[1] * cell);
    ctx.lineTo(p[2] * cell, p[3] * cell);
    return;
  }
  if (l.closed) {
    ctx.moveTo(((p[0] + p[2 * n - 2]) / 2) * cell, ((p[1] + p[2 * n - 1]) / 2) * cell);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      ctx.quadraticCurveTo(
        p[2 * i] * cell,
        p[2 * i + 1] * cell,
        ((p[2 * i] + p[2 * j]) / 2) * cell,
        ((p[2 * i + 1] + p[2 * j + 1]) / 2) * cell,
      );
    }
    ctx.closePath();
    return;
  }
  ctx.moveTo(p[0] * cell, p[1] * cell);
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(
      p[2 * i] * cell,
      p[2 * i + 1] * cell,
      ((p[2 * i] + p[2 * i + 2]) / 2) * cell,
      ((p[2 * i + 1] + p[2 * i + 3]) / 2) * cell,
    );
  }
  ctx.lineTo(p[2 * n - 2] * cell, p[2 * n - 1] * cell);
}

export class MapRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly field: TerrainField;
  private readonly waterCanvas: HTMLCanvasElement;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private fit = 1;
  private cell = 8;
  private scene: Scene;
  private cameraTransition: Transition<Camera>;
  private lensTransition: Transition<Lens>;
  private frameTransition: Transition<Frame>;
  private scalars: Record<ScalarChannel, Transition<number>>;
  private peakTransitions = new Map<string, Record<"amp" | "presence" | "reef" | "reefTop", Transition<number>>>();
  private targetRelief: Record<string, { recall: number; reef: number }> = {};
  private smoothedLevelExp: number | null = null;
  private terrainRange = { min: 0, max: 1 };
  private colors = {
    line: [154, 168, 177] as RGB,
    indexLine: [104, 124, 138] as RGB,
    isobath: [166, 182, 193] as RGB,
    isobathIndex: [111, 135, 150] as RGB,
    ink: [15, 42, 61] as RGB,
    accent: [200, 50, 26] as RGB,
    water: [207, 224, 232] as RGB,
    waterAlpha: 0.6,
  };
  private raf = 0;
  private readonly listeners = new Set<(v: View) => void>();
  private currentView: View;
  private T = new Float64Array(0);
  private V = new Float64Array(0);
  private G = new Float64Array(0);
  private cmin = new Float32Array(0);
  private cmax = new Float32Array(0);
  private gmin = new Float32Array(0);
  private gmax = new Float32Array(0);
  private waterImage: ImageData | null = null;
  private destroyed = false;
  reducedMotion = false;

  constructor(canvas: HTMLCanvasElement, field: TerrainField, initial: SceneTarget) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.ctx = ctx;
    this.canvas = canvas;
    this.field = field;
    this.waterCanvas = document.createElement("canvas");
    this.scene = {
      ...initial.scene,
      camera: { ...initial.scene.camera },
      lens: { ...initial.scene.lens },
      portraitFrame: { ...initial.scene.portraitFrame },
    };
    this.targetRelief = Object.fromEntries(initial.relief.map((r) => [r.id, { recall: r.recall, reef: r.reef }]));
    const now = 0;
    this.cameraTransition = { from: this.scene.camera, to: this.scene.camera, start: now, duration: 0 };
    this.lensTransition = { from: this.scene.lens, to: this.scene.lens, start: now, duration: 0 };
    this.frameTransition = { from: this.scene.portraitFrame, to: this.scene.portraitFrame, start: now, duration: 0 };
    const still = (v: number): Transition<number> => ({ from: v, to: v, start: now, duration: 0 });
    this.scalars = {
      strata: still(this.scene.strata),
      portrait: still(this.scene.portrait),
      portraitMask: still(this.scene.portraitMask),
      lensInk: still(this.scene.lensInk),
      intervalLock: still(this.scene.intervalLock),
      lockedInterval: still(this.scene.lockedInterval),
      density: still(this.scene.density),
      settle: still(this.scene.settle),
    };
    this.currentView = { W: 1, H: 1, fit: 1, camera: this.scene.camera, lens: this.scene.lens, newContour: null };
    this.readColors();
    this.setTarget(initial, true);
  }

  readColors() {
    const s = getComputedStyle(this.canvas);
    this.colors = {
      line: readRGB(s.getPropertyValue("--terrain-line"), this.colors.line),
      indexLine: readRGB(s.getPropertyValue("--terrain-line-index"), this.colors.indexLine),
      isobath: readRGB(s.getPropertyValue("--isobath"), this.colors.isobath),
      isobathIndex: readRGB(s.getPropertyValue("--isobath-index"), this.colors.isobathIndex),
      ink: readRGB(s.getPropertyValue("--ink"), this.colors.ink),
      accent: readRGB(s.getPropertyValue("--accent"), this.colors.accent),
      water: readRGB(s.getPropertyValue("--water"), this.colors.water),
      waterAlpha: parseFloat(s.getPropertyValue("--water-alpha")) || this.colors.waterAlpha,
    };
    this.waterImage = null;
    this.wake();
  }

  view() {
    return this.currentView;
  }

  subscribe(fn: (v: View) => void) {
    this.listeners.add(fn);
    fn(this.currentView);
    return () => {
      this.listeners.delete(fn);
    };
  }

  resize(W: number, H: number, dpr: number) {
    this.W = Math.max(1, W);
    this.H = Math.max(1, H);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.fit = sheetFit(this.W, this.H);
    this.cell = clamp(Math.round(Math.sqrt((this.W * this.H) / 20000)), 6, 12);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.smoothedLevelExp = null;
    this.waterImage = null;
    this.wake();
  }

  setTarget(target: SceneTarget, instant: boolean) {
    const now = performance.now();
    this.advance(now);
    const timing = (c: Channel): Timing => (instant ? { delay: 0, duration: 0 } : (target.timings[c] ?? { delay: 0, duration: 0 }));
    const transition = <T,>(from: T, to: T, c: Channel): Transition<T> => {
      const t = timing(c);
      return { from, to, start: now + t.delay, duration: t.duration };
    };
    this.cameraTransition = transition({ ...this.scene.camera }, { ...target.scene.camera }, "camera");
    this.lensTransition = transition({ ...this.scene.lens }, { ...target.scene.lens }, "lens");
    this.frameTransition = transition({ ...this.scene.portraitFrame }, { ...target.scene.portraitFrame }, "lens");
    this.scalars = {
      strata: transition(this.scene.strata, target.scene.strata, "strata"),
      portrait: transition(this.scene.portrait, target.scene.portrait, "portrait"),
      portraitMask: transition(this.scene.portraitMask, target.scene.portraitMask, "portraitMask"),
      lensInk: transition(this.scene.lensInk, target.scene.lensInk, "lensInk"),
      intervalLock: transition(this.scene.intervalLock, target.scene.intervalLock, "intervalLock"),
      lockedInterval: transition(this.scene.lockedInterval, target.scene.lockedInterval, "intervalLock"),
      density: transition(this.scene.density, target.scene.density, "density"),
      settle: transition(target.scene.settleFrom ?? this.scene.settle, target.scene.settle, "settle"),
    };
    const present = new Set<string>();
    for (const r of target.relief) {
      present.add(r.id);
      if (!this.field.peak(r.id) && r.recall <= 0 && r.reef <= 0) continue;
      this.field.addPeak(r);
      this.schedulePeak(r.id, this.field.target(r), transition);
    }
    for (const peak of this.field.peaks) {
      if (!present.has(peak.id)) this.schedulePeak(peak.id, { amp: peak.amp, presence: 0, reef: 0, reefTop: peak.reefTop }, transition);
    }
    this.targetRelief = Object.fromEntries(target.relief.map((r) => [r.id, { recall: r.recall, reef: r.reef }]));
    this.scene.highlight = target.scene.highlight;
    this.scene.newContour = target.scene.newContour;
    this.scene.newContourKind = target.scene.newContourKind;
    this.scene.highlightSettles = target.scene.highlightSettles;
    this.scene.minInterval = target.scene.minInterval;
    if (instant) this.smoothedLevelExp = null;
    this.wake();
  }

  private schedulePeak(id: string, shape: Shape, transition: <T>(from: T, to: T, c: Channel) => Transition<T>) {
    const current = this.field.shape(id);
    if (!current) return;
    const keys = ["amp", "presence", "reef", "reefTop"] as const;
    if (keys.every((k) => Math.abs(current[k] - shape[k]) < 1e-9)) return;
    this.peakTransitions.set(id, {
      amp: transition(current.amp, shape.amp, "peaks"),
      presence: transition(current.presence, shape.presence, "peaks"),
      reef: transition(current.reef, shape.reef, "peaks"),
      reefTop: transition(current.reefTop, shape.reefTop, "peaks"),
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.listeners.clear();
  }

  private wake() {
    if (this.destroyed || this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.destroyed) return;
    const animating = this.advance(now);
    const settling = this.draw();
    for (const fn of this.listeners) fn(this.currentView);
    if (animating || settling) this.raf = requestAnimationFrame(this.frame);
  };

  private advance(now: number) {
    let animating = false;
    const track = <T,>(tr: Transition<T>) => {
      if (now < tr.start + tr.duration) animating = true;
      return easeInOut(progress(tr, now));
    };
    this.scene.camera = interpolateCamera(
      this.cameraTransition.from,
      this.cameraTransition.to,
      track(this.cameraTransition),
      this.W,
      this.H,
      this.fit,
    );
    this.scene.lens = interpolateLens(this.lensTransition.from, this.lensTransition.to, track(this.lensTransition));
    this.scene.portraitFrame = interpolateFrame(this.frameTransition.from, this.frameTransition.to, track(this.frameTransition));
    for (const k of Object.keys(this.scalars) as ScalarChannel[]) {
      const tr = this.scalars[k];
      this.scene[k] = tr.from + (tr.to - tr.from) * track(tr);
    }
    for (const [id, tr] of this.peakTransitions) {
      const t = progress(tr.amp, now);
      if (now < tr.amp.start + tr.amp.duration) animating = true;
      const e = 1 - Math.pow(1 - t, 3);
      const at = (c: Transition<number>) => c.from + (c.to - c.from) * e;
      this.field.setShape(id, { amp: at(tr.amp), presence: at(tr.presence), reef: at(tr.reef), reefTop: at(tr.reefTop) });
      if (t >= 1) this.peakTransitions.delete(id);
    }
    return animating;
  }

  private draw() {
    const { W, H, cell, ctx } = this;
    const scene = this.scene;
    const cam = scene.camera;
    const scale = cam.z * this.fit;
    const cols = Math.ceil(W / cell) + 2;
    const rows = Math.ceil(H / cell) + 2;
    const n = cols * rows;
    if (this.T.length !== n) {
      this.T = new Float64Array(n);
      this.V = new Float64Array(n);
      this.G = new Float64Array(n);
      this.cmin = new Float32Array((cols - 1) * (rows - 1));
      this.cmax = new Float32Array((cols - 1) * (rows - 1));
      this.gmin = new Float32Array((cols - 1) * (rows - 1));
      this.gmax = new Float32Array((cols - 1) * (rows - 1));
      this.waterImage = null;
    }
    const T = this.T;
    const V = this.V;
    const ox = cam.x - (cam.ax * W) / scale;
    const oy = cam.y - (cam.ay * H) / scale;
    const worldCell = cell / scale;
    const octaves = clamp(Math.log2(250 / (2.2 * worldCell)), 1, 22);
    const r = clamp(scene.portrait, 0, 1);
    const e = clamp(scene.strata, 0, 1);
    const mask = clamp(scene.portraitMask, 0, 1);
    const ground = mask > 0.002;
    const wT = (1 - e) * (1 - r);
    const wE = e * (1 - r);
    const groundT = ground ? 1 - e : wT;
    const pf = scene.portraitFrame;
    const G = this.G;
    const active: Peak[] = this.field.activePeaks(ox, oy, ox + (cols * cell) / scale, oy + (rows * cell) / scale);

    if (groundT > 0.002) {
      let tmin = Infinity;
      let tmax = -Infinity;
      for (let j = 0; j < rows; j++) {
        const wy = oy + j * worldCell;
        for (let i = 0; i < cols; i++) {
          const v = this.field.terrain(ox + i * worldCell, wy, octaves, active);
          T[j * cols + i] = v;
          if (v < tmin) tmin = v;
          if (v > tmax) tmax = v;
        }
      }
      this.terrainRange = { min: tmin, max: tmax };
    }
    const fmin = this.terrainRange.min;
    const famp = Math.max(1e-6, this.terrainRange.max - this.terrainRange.min);
    let vmin = Infinity;
    let vmax = -Infinity;
    for (let j = 0; j < rows; j++) {
      const sy = j * cell;
      for (let i = 0; i < cols; i++) {
        const sx = i * cell;
        const k = j * cols + i;
        const strata = e > 0.002 && (wE > 0.002 || ground) ? fmin + famp * this.field.strata((sx - W / 2) / H, sy / H) : 0;
        let v = wT > 0.002 ? wT * T[k] : 0;
        if (wE > 0.002) v += wE * strata;
        if (r > 0.002) v += r * (fmin + famp * this.field.portrait((sx - pf.x) / pf.r, (sy - pf.y) / pf.r));
        V[k] = v;
        if (ground) G[k] = (1 - e) * T[k] + e * strata;
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
      }
    }

    const targetExp = Math.max(
      Math.log2(Math.max(1e-9, vmax - vmin) / scene.density),
      Math.log2(Math.max(1e-9, scene.minInterval)),
    );
    if (this.smoothedLevelExp === null || this.reducedMotion) this.smoothedLevelExp = targetExp;
    else this.smoothedLevelExp += (targetExp - this.smoothedLevelExp) * 0.16;
    const settling = Math.abs(targetExp - this.smoothedLevelExp) > 0.004;
    const kEf = this.smoothedLevelExp * (1 - scene.intervalLock) + scene.lockedInterval * scene.intervalLock;
    const kb = Math.floor(kEf);
    const levelStep = Math.pow(2, kb);

    cellExtremes(V, cols, rows, this.cmin, this.cmax);

    const levels: ContourLevel[] = [];
    let first = Math.ceil(vmin / levelStep);
    const last = Math.floor(vmax / levelStep);
    if (last - first > 220) first = last - 220;
    for (let m = first; m <= last; m++) {
      const value = m * levelStep;
      let zeros = 30;
      if (m !== 0) {
        zeros = 0;
        let q = Math.abs(m);
        while ((q & 1) === 0 && zeros < 30) {
          q >>= 1;
          zeros++;
        }
      }
      const s = kb + zeros - kEf;
      const alpha = clamp(s + 1, 0, 1);
      if (alpha < 0.02) continue;
      const coastline = m === 0 && wT > 0.5;
      levels.push({
        value,
        alpha,
        index: coastline ? 0 : clamp((s - 1.6) / 0.8, 0, 1),
        coastline,
        lines: traceContours(V, cols, rows, value, this.cmin, this.cmax),
      });
    }

    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (wT > 0.01) this.paintWater(cols, rows, wT);

    const thin = clamp(this.fit, 0.75, 1.3);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const paint = (level: ContourLevel, color: string, alpha: number, width: number) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const l of level.lines) strokePolyline(ctx, l, cell);
      ctx.stroke();
    };

    const lens = scene.lens;
    const lensShape = () => ctx.roundRect(lens.x - lens.w / 2, lens.y - lens.h / 2, lens.w, lens.h, Math.min(lens.r, lens.w / 2, lens.h / 2));
    const levelColor = (level: ContourLevel) => {
      if (level.coastline) return mix(this.colors.ink, this.colors.ink, 0);
      if (level.value < 0) return mix(this.colors.isobath, this.colors.isobathIndex, level.index);
      return mix(this.colors.line, this.colors.indexLine, level.index);
    };
    const paintLevels = (opacity: number) => {
      for (const level of levels) {
        const alpha = level.coastline ? 0.9 : level.alpha * (0.85 + 0.15 * level.index);
        paint(level, levelColor(level), opacity * alpha, level.coastline ? thin * 1.5 : thin * (0.9 + 0.8 * level.index));
      }
    };

    if (ground) {
      cellExtremes(G, cols, rows, this.gmin, this.gmax);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      lensShape();
      ctx.clip("evenodd");
      for (const level of levels) {
        const lines = traceContours(G, cols, rows, level.value, this.gmin, this.gmax);
        paint({ ...level, lines, coastline: false }, levelColor({ ...level, coastline: false }), mask * level.alpha * (0.85 + 0.15 * level.index), thin * (0.9 + 0.8 * level.index));
      }
      if (mask < 0.998) paintLevels(1 - mask);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      lensShape();
      ctx.clip();
      paintLevels(1);
      ctx.restore();
    } else {
      paintLevels(1);
    }

    if (wT > 0.5) this.paintCoral(active, ox, oy, scale, cols, rows, wT);

    if (lens.o > 0.01 && scene.lensInk > 0.01) {
      ctx.save();
      ctx.beginPath();
      lensShape();
      ctx.clip();
      const ink = mix(this.colors.ink, this.colors.ink, 0);
      for (const level of levels) {
        paint(level, ink, level.alpha * scene.lensInk * lens.o * (0.75 + 0.25 * level.index), thin * (1 + 0.7 * level.index));
      }
      ctx.restore();
    }

    const accent = mix(this.colors.accent, this.colors.accent, 0);
    if (scene.highlight) {
      const p = this.field.peak(scene.highlight);
      if (p) {
        const [sx, sy] = toScreen({ W, H, fit: this.fit, camera: cam }, p.summitX, p.summitY);
        const gx = sx / cell;
        const gy = sy / cell;
        const limit = ((5.2 / Math.sqrt(2 * p.k)) * scale) / cell;
        const ink = mix(this.colors.ink, this.colors.ink, 0);
        const emphasis = scene.highlightSettles ? 1 - clamp(scene.settle, 0, 1) : 1;
        for (const level of levels) {
          if (level.value < 0) continue;
          const rings = level.lines.filter((l) => {
            if (!l.closed) return false;
            const c = bounds(l.pts);
            return c.x1 - c.x0 < limit && c.y1 - c.y0 < limit && contains(l.pts, gx, gy);
          });
          if (rings.length && emphasis > 0.01) paint({ ...level, lines: rings }, ink, emphasis * Math.max(0.55, level.alpha) * 0.85, thin * (1.1 + 0.6 * level.index));
        }
      }
    }

    let newContour: View["newContour"] = null;
    if (scene.newContour) {
      const p = this.field.peak(scene.newContour);
      const relief = this.targetRelief[scene.newContour];
      if (p && relief) {
        const reef = scene.newContourKind === "reef";
        const value = reef ? 0 : p.baseLevel + relief.recall * this.field.step;
        const [sx, sy] = toScreen({ W, H, fit: this.fit, camera: cam }, p.summitX, p.summitY);
        const gx = sx / cell;
        const gy = sy / cell;
        const lines = traceContours(V, cols, rows, value, this.cmin, this.cmax).filter((l) => l.closed && contains(l.pts, gx, gy));
        if (lines.length) {
          const ring = lines.reduce((a, b) => {
            const ca = bounds(a.pts);
            const cb = bounds(b.pts);
            return cb.x1 - cb.x0 < ca.x1 - ca.x0 ? b : a;
          });
          const emphasis = 1 - clamp(scene.settle, 0, 1);
          const tone = reef ? accent : mix(this.colors.ink, this.colors.ink, 0);
          if (emphasis > 0.01) paint({ value, alpha: 1, index: 0, coastline: false, lines: [ring] }, tone, emphasis, thin * (1.2 + 1.6 * emphasis));
          const c = bounds(ring.pts);
          newContour = {
            x: ((c.x0 + c.x1) / 2) * cell,
            y: ((c.y0 + c.y1) / 2) * cell,
            r: (Math.max(c.x1 - c.x0, c.y1 - c.y0) / 2) * cell,
            emphasis,
          };
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    this.currentView = { W, H, fit: this.fit, camera: { ...cam }, lens: { ...lens }, newContour };
    return settling;
  }

  private paintCoral(active: Peak[], ox: number, oy: number, scale: number, cols: number, rows: number, weight: number) {
    if (scale > 16) return;
    const reefs = active.filter((p) => p.reef > 0.5 && p.reefTop >= 0);
    if (reefs.length === 0) return;
    const { ctx, cell, T, W, H } = this;
    const closeness = Math.max(1, scale / this.fit);
    const spacing = Math.pow(2, Math.round(Math.log2((3.4 * Math.pow(closeness, 0.45)) / scale)));
    const radius = clamp(0.95 * this.fit * Math.pow(closeness, 0.2), 0.75, 1.8);
    const height = (sx: number, sy: number) => {
      const gx = clamp(sx / cell, 0, cols - 1.001);
      const gy = clamp(sy / cell, 0, rows - 1.001);
      const i = Math.floor(gx);
      const j = Math.floor(gy);
      const fx = gx - i;
      const fy = gy - j;
      const k = j * cols + i;
      const top = T[k] + (T[k + 1] - T[k]) * fx;
      const bottom = T[k + cols] + (T[k + cols + 1] - T[k + cols]) * fx;
      return top + (bottom - top) * fy;
    };
    const jitter = (i: number, j: number, seed: number) => {
      let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ seed;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
    };
    ctx.save();
    ctx.globalAlpha = 0.95 * weight;
    ctx.fillStyle = mix(this.colors.accent, this.colors.accent, 0);
    ctx.beginPath();
    for (const p of reefs) {
      const extent = (p.reef + 2) * Math.max(p.ex, p.ey) + 24;
      const x0 = Math.max(p.cx - extent, ox);
      const x1 = Math.min(p.cx + extent, ox + W / scale);
      const y0 = Math.max(p.cy - extent, oy);
      const y1 = Math.min(p.cy + extent, oy + H / scale);
      for (let i = Math.floor(x0 / spacing); i <= Math.ceil(x1 / spacing); i++) {
        for (let j = Math.floor(y0 / spacing); j <= Math.ceil(y1 / spacing); j++) {
          const wx = (i + 0.7 * jitter(i, j, 11)) * spacing;
          const wy = (j + 0.7 * jitter(i, j, 29)) * spacing;
          const sx = (wx - ox) * scale;
          const sy = (wy - oy) * scale;
          if (sx < 0 || sy < 0 || sx > W || sy > H) continue;
          if (this.field.coral(wx, wy, [p], height(sx, sy)) < 0.5) continue;
          ctx.moveTo(sx + radius, sy);
          ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
    ctx.restore();
  }

  private paintWater(cols: number, rows: number, weight: number) {
    if (!this.waterImage || this.waterImage.width !== cols || this.waterImage.height !== rows) {
      this.waterCanvas.width = cols;
      this.waterCanvas.height = rows;
      this.waterImage = new ImageData(cols, rows);
    }
    const data = this.waterImage.data;
    const [r, g, b] = this.colors.water;
    const maxAlpha = 255 * this.colors.waterAlpha * weight;
    const T = this.T;
    for (let k = 0; k < cols * rows; k++) {
      const t = T[k];
      const a = t >= 0 ? 0 : t > -16 ? 1 : t > -28 ? 0.42 : 0;
      data[4 * k] = r;
      data[4 * k + 1] = g;
      data[4 * k + 2] = b;
      data[4 * k + 3] = a * maxAlpha;
    }
    const wctx = this.waterCanvas.getContext("2d");
    if (!wctx) return;
    wctx.putImageData(this.waterImage, 0, 0);
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.waterCanvas, -this.cell / 2, -this.cell / 2, cols * this.cell, rows * this.cell);
    ctx.restore();
  }
}
