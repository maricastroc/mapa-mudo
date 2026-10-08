import { createNoise, fbm, type Noise } from "./noise.ts";
import { trenchCalm } from "./trench.ts";

export type FieldPoint = { id: string; x: number; y: number; recall: number; reef: number };

export type Shape = { amp: number; presence: number; reef: number; reefTop: number };

export type Peak = {
  id: string;
  cx: number;
  cy: number;
  amp: number;
  k: number;
  ex: number;
  ey: number;
  cos: number;
  sin: number;
  reach: number;
  rockReach: number;
  summitX: number;
  summitY: number;
  anchor: number;
  baseLevel: number;
  presence: number;
  baseAmp: number;
  baseMentions: number;
  rock: boolean;
  reef: number;
  reefTop: number;
};

export const SEA_FLOOR = -90;
export const REEF_LAND = 3;
const SEA_RELIEF = 40;
const REEF_FROM_ROCK = 7;
const REEF_ALONE = 12;
const REEF_GROWTH = 5.2;
const REEF_SHELF = 56;
const SHEET_OCTAVES = 3.8;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function ellipseDistance(u: number, v: number, cx: number, cy: number, rx: number, ry: number) {
  return (Math.hypot((u - cx) / rx, (v - cy) / ry) - 1) * Math.min(rx, ry);
}

function boxDistance(u: number, v: number, cx: number, cy: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(u - cx) - hx + r;
  const qy = Math.abs(v - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function smoothMin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function gauss(u: number, v: number, cx: number, cy: number, sx: number, sy: number) {
  const a = (u - cx) / sx;
  const b = (v - cy) / sy;
  return Math.exp(-0.5 * (a * a + b * b));
}

export class TerrainField {
  readonly peaks: Peak[] = [];
  private readonly byId = new Map<string, Peak>();
  private readonly land: Noise = createNoise(11);
  private readonly warp: Noise = createNoise(23);
  private readonly layers: Noise = createNoise(53);

  readonly step: number;
  readonly surfaceAt: number;

  constructor(points: FieldPoint[], step = 1, surfaceAt = 1) {
    this.step = step;
    this.surfaceAt = surfaceAt;
    const present = points.filter((p) => p.recall > 0 || p.reef > 0);
    for (const p of present) this.register(this.createPeak(p));
    const rocks = present.filter((p) => p.recall > 0).map((p) => this.byId.get(p.id) as Peak);
    this.calibrate(rocks, new Map(present.map((p) => [p.id, p.recall * step])));
    for (const p of rocks) p.rock = true;
    for (const p of present) this.setShape(p.id, this.target(p));
  }

  private register(peak: Peak) {
    this.peaks.push(peak);
    this.byId.set(peak.id, peak);
  }

  private sigmaFor(recall: number) {
    return 32 + 0.12 * recall;
  }

  private createPeak(p: FieldPoint): Peak {
    const sigma = this.sigmaFor(p.recall);
    const angle = hash(p.id) * Math.PI;
    const stretch = 0.82 + hash(p.id + "e") * 0.42;
    const rockReach = 3.2 * sigma * Math.max(stretch, 1 / stretch);
    return {
      id: p.id,
      cx: p.x,
      cy: p.y,
      amp: p.recall * this.step,
      k: 1 / (2 * sigma * sigma),
      ex: 1 / stretch,
      ey: stretch,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      reach: rockReach,
      rockReach,
      summitX: p.x,
      summitY: p.y,
      anchor: this.relief(p.x, p.y, SHEET_OCTAVES),
      baseLevel: 0,
      presence: p.recall > 0 ? 1 : 0,
      baseAmp: p.recall * this.step,
      baseMentions: p.recall * this.step,
      rock: false,
      reef: 0,
      reefTop: REEF_LAND,
    };
  }

  private calibrate(targets: Peak[], mentions: Map<string, number>) {
    for (let pass = 0; pass < 4; pass++) {
      for (const p of targets) {
        const [x, y] = this.climb(p);
        p.summitX = x;
        p.summitY = y;
      }
      for (const p of targets) {
        const current = this.ground(p.summitX, p.summitY, SHEET_OCTAVES, this.peaks);
        if (pass === 0) p.baseLevel = Math.max(0, Math.round((current - p.amp) / this.step) * this.step);
        p.amp += p.baseLevel + (mentions.get(p.id) ?? 0) + this.step / 2 - current;
      }
    }
    for (const p of targets) {
      p.baseAmp = p.amp;
      p.baseMentions = mentions.get(p.id) ?? 0;
    }
  }

  private raiseRock(p: Peak, recall: number) {
    const sigma = this.sigmaFor(recall);
    const presence = p.presence;
    p.k = 1 / (2 * sigma * sigma);
    p.rockReach = 3.2 * sigma * Math.max(p.ex, p.ey);
    p.reach = Math.max(p.reach, p.rockReach);
    p.amp = recall * this.step;
    p.presence = 1;
    this.calibrate([p], new Map([[p.id, recall * this.step]]));
    p.rock = true;
    p.presence = presence;
    p.amp = p.baseAmp;
  }

  private ensure(point: FieldPoint) {
    let p = this.byId.get(point.id);
    if (!p) {
      p = this.createPeak({ ...point, recall: 0 });
      this.register(p);
    }
    if (point.recall > 0 && !p.rock) this.raiseRock(p, point.recall);
    return p;
  }

  private coastRadius(p: Peak, amp: number, presence: number) {
    if (!p.rock || presence <= 0) return 0;
    const depth = -(SEA_FLOOR + p.anchor);
    if (depth <= 0 || amp <= depth) return 0;
    return Math.sqrt(Math.log(amp / depth) / p.k);
  }

  private reefRadius(p: Peak, amp: number, presence: number, reef: number) {
    if (reef <= 0) return 0;
    const coast = this.coastRadius(p, amp, presence);
    return (coast > 0 ? coast + REEF_FROM_ROCK : REEF_ALONE) + REEF_GROWTH * Math.sqrt(reef);
  }

  target(point: FieldPoint): Shape {
    const p = this.ensure(point);
    const presence = point.recall > 0 ? 1 : 0;
    const amp = p.rock && presence > 0 ? p.baseAmp + (point.recall * this.step - p.baseMentions) : p.amp;
    const reefTop = point.reef >= this.surfaceAt ? REEF_LAND : REEF_LAND - (this.surfaceAt - point.reef) * this.step;
    return { amp, presence, reef: this.reefRadius(p, amp, presence, point.reef), reefTop };
  }

  summit(point: FieldPoint) {
    const p = point.recall > 0 || point.reef > 0 ? this.ensure(point) : this.byId.get(point.id);
    const sigma = p ? 1 / Math.sqrt(2 * p.k) : 32;
    const elongation = p ? Math.max(p.ex, p.ey) : 1;
    if (!p || !p.rock || point.recall <= 0) return { x: point.x, y: point.y, sigma, elongation };
    return { x: p.summitX, y: p.summitY, sigma, elongation };
  }

  growthRadius(point: FieldPoint) {
    const p = this.ensure(point);
    const amp = Math.max(1e-6, p.baseAmp + (point.recall * this.step - p.baseMentions));
    const g = Math.min(0.99999, Math.max(0.02, 1 - this.step / 2 / amp));
    return Math.sqrt(2 * Math.log(1 / g)) / Math.sqrt(2 * p.k);
  }

  reefRadiusOf(point: FieldPoint) {
    return this.target(point).reef;
  }

  addPeak(point: FieldPoint) {
    return this.ensure(point);
  }

  peak(id: string) {
    return this.byId.get(id);
  }

  shape(id: string): Shape | undefined {
    const p = this.byId.get(id);
    return p && { amp: p.amp, presence: p.presence, reef: p.reef, reefTop: p.reefTop };
  }

  setShape(id: string, shape: Shape) {
    const p = this.byId.get(id);
    if (!p) return;
    p.amp = shape.amp;
    p.presence = shape.presence;
    p.reef = shape.reef;
    p.reefTop = shape.reefTop;
    p.reach = Math.max(p.rockReach, (p.reef + REEF_SHELF + 4) * Math.max(p.ex, p.ey));
  }

  activePeaks(x0: number, y0: number, x1: number, y1: number) {
    return this.peaks.filter(
      (p) => p.cx + p.reach > x0 && p.cx - p.reach < x1 && p.cy + p.reach > y0 && p.cy - p.reach < y1,
    );
  }

  private relief(x: number, y: number, octaves: number) {
    return SEA_RELIEF * fbm(this.land, x / 260, y / 260, octaves, 0.58) * (1 - trenchCalm(x, y));
  }

  private climb(p: Peak) {
    let px = p.summitX;
    let py = p.summitY;
    let step = 5;
    const limit = 0.45 / Math.sqrt(2 * p.k);
    for (let i = 0; i < 80; i++) {
      const h = 0.4;
      const gx = this.ground(px + h, py, SHEET_OCTAVES, this.peaks) - this.ground(px - h, py, SHEET_OCTAVES, this.peaks);
      const gy = this.ground(px, py + h, SHEET_OCTAVES, this.peaks) - this.ground(px, py - h, SHEET_OCTAVES, this.peaks);
      const n = Math.hypot(gx, gy);
      if (n < 1e-6) break;
      const nx = px + (gx / n) * step;
      const ny = py + (gy / n) * step;
      if (Math.hypot(nx - p.cx, ny - p.cy) > limit) break;
      px = nx;
      py = ny;
      step *= 0.9;
    }
    return [px, py] as const;
  }

  private warped(x: number, y: number) {
    return [x + 22 * this.warp(x / 170, y / 170), y + 22 * this.warp(x / 170 + 17.3, y / 170 + 5.9)] as const;
  }

  private local(p: Peak, qx: number, qy: number) {
    const dx = qx - p.cx;
    const dy = qy - p.cy;
    const u = (dx * p.cos + dy * p.sin) * p.ex;
    const v = (dy * p.cos - dx * p.sin) * p.ey;
    return u * u + v * v;
  }

  private groundAt(x: number, y: number, qx: number, qy: number, octaves: number, active: Peak[]) {
    let sum = 0;
    let weight = 0;
    let anchors = 0;
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (p.presence <= 0) continue;
      const e = this.local(p, qx, qy) * p.k;
      if (e > 10) continue;
      const g = Math.exp(-e);
      sum += p.amp * g * p.presence;
      const gd = g * g * p.presence;
      weight += gd;
      anchors += p.anchor * gd;
    }
    const free = this.relief(x, y, octaves);
    const d = weight > 1 ? 1 : weight;
    const relief = weight > 1e-9 ? free * (1 - d) + (anchors / weight) * d : free;
    return SEA_FLOOR + relief + sum;
  }

  ground(x: number, y: number, octaves: number, active: Peak[]) {
    const [qx, qy] = this.warped(x, y);
    return this.groundAt(x, y, qx, qy, octaves, active);
  }

  terrain(x: number, y: number, octaves: number, active: Peak[]) {
    const [qx, qy] = this.warped(x, y);
    let h = this.groundAt(x, y, qx, qy, octaves, active);
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (p.reef <= 0 || p.reefTop <= h) continue;
      const rho = Math.sqrt(this.local(p, qx, qy));
      const w = (1 - smoothstep(p.reef - 4, p.reef + REEF_SHELF, rho)) * Math.min(1, p.reef / 8);
      if (w > 0) h += (p.reefTop - h) * w;
    }
    return h;
  }

  coral(x: number, y: number, active: Peak[], height: number) {
    const [qx, qy] = this.warped(x, y);
    let best = 0;
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (p.reef <= 0 || p.reefTop < 0 || height > p.reefTop + 4) continue;
      const rho = Math.sqrt(this.local(p, qx, qy));
      const R = p.reef;
      if (rho > R + 2) continue;
      const band = (1 - smoothstep(R + 0.4, R + 1.8, rho)) * smoothstep(R - 7.5, R - 4.5, rho) * Math.min(1, R / 8);
      if (band > best) best = band;
    }
    return best;
  }

  strata(u: number, v: number) {
    const wave = 0.03 * fbm(this.layers, u * 2.2, v * 2.6, 3, 0.55);
    const rhythm = 0.011 * Math.sin(v * 34 + 3 * this.layers(u * 0.9 + 4.1, v * 1.7));
    return 1 - v + wave + rhythm;
  }

  portrait(u: number, v: number) {
    const head = ellipseDistance(u, v, 0.04, -0.2, 0.235, 0.3);
    const hair = smoothMin(ellipseDistance(u, v, -0.02, -0.25, 0.33, 0.35), ellipseDistance(u, v, -0.04, -0.02, 0.31, 0.3), 0.12);
    const neck = boxDistance(u, v, 0.01, 0.2, 0.12, 0.2, 0.05);
    const shoulders = ellipseDistance(u, v, 0, 1.08, 0.98, 0.66);
    const d = smoothMin(smoothMin(head, hair, 0.05), smoothMin(neck, shoulders, 0.16), 0.08);
    const raw = Math.max(0, -d);
    const inside = raw - Math.max(0, raw - 0.16) * 0.75;
    let h = Math.pow(inside, 0.85) * 2.4;
    h += 0.55 * Math.pow(Math.max(0, -head) / 0.235, 0.9);
    h += 0.03 * gauss(u, v, 0.15, -0.15, 0.03, 0.06);
    h += 0.012 * fbm(this.layers, u * 3.1 + 9, v * 3.1, 2, 0.5) * smoothstep(0, 0.05, inside);
    return h * (1 - smoothstep(0.98, 1.3, Math.hypot(u, v)));
  }
}
