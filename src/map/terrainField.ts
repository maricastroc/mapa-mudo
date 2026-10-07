import { createNoise, fbm, type Noise } from "./noise.ts";

export type FieldPoint = { id: string; x: number; y: number; mentions: number };

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
  summitX: number;
  summitY: number;
  anchor: number;
  baseLevel: number;
  presence: number;
  baseAmp: number;
  baseMentions: number;
  flattens: boolean;
  plateau: number;
};

const RIVER: [number, number][] = [
  [1130, 720],
  [1092, 590],
  [1046, 470],
  [1004, 360],
  [978, 270],
  [970, 196],
  [962, 110],
  [956, 30],
];

const RIVER_WIDTH = 5.5;
export const NEW_RING_GAUSS = 0.75;
const PLATEAU_LIFT = 0.05;
const PLATEAU_SPREAD = 3.2;
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
  readonly peaks: Peak[];
  private readonly byId = new Map<string, Peak>();
  private readonly land: Noise = createNoise(11);
  private readonly warp: Noise = createNoise(23);
  private readonly shoreline: Noise = createNoise(37);
  private readonly layers: Noise = createNoise(53);

  private readonly predicted = new Map<string, Peak>();

  readonly step: number;

  constructor(points: FieldPoint[], step = 1) {
    this.step = step;
    this.peaks = points.filter((p) => p.mentions > 0).map((p) => this.createPeak(p));
    for (const p of this.peaks) this.byId.set(p.id, p);
    const mentions = new Map(points.map((p) => [p.id, p.mentions]));
    this.calibrate(this.peaks, mentions);
  }

  private createPeak(p: FieldPoint): Peak {
    const sigma = 32 + 0.12 * (p.mentions / this.step);
    const angle = hash(p.id) * Math.PI;
    const stretch = 0.82 + hash(p.id + "e") * 0.42;
    return {
      id: p.id,
      cx: p.x,
      cy: p.y,
      amp: p.mentions,
      k: 1 / (2 * sigma * sigma),
      ex: 1 / stretch,
      ey: stretch,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      reach: 3.2 * sigma * Math.max(stretch, 1 / stretch),
      summitX: p.x,
      summitY: p.y,
      anchor: this.baseRelief(p.x, p.y, SHEET_OCTAVES),
      baseLevel: 0,
      presence: 1,
      baseAmp: p.mentions,
      baseMentions: p.mentions,
      flattens: false,
      plateau: 0,
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
        const current = this.terrain(p.summitX, p.summitY, SHEET_OCTAVES, this.peaks);
        if (pass === 0) p.baseLevel = Math.max(0, Math.round((current - p.amp) / this.step) * this.step);
        p.amp += p.baseLevel + (mentions.get(p.id) ?? 0) + this.step / 2 - current;
      }
    }
    for (const p of targets) {
      p.baseAmp = p.amp;
      p.baseMentions = mentions.get(p.id) ?? 0;
    }
  }

  private predict(point: FieldPoint) {
    const ready = this.predicted.get(point.id);
    if (ready) return ready;
    const fresh = this.createPeak({ ...point, mentions: this.step });
    fresh.flattens = true;
    const ground = this.terrain(fresh.cx, fresh.cy, SHEET_OCTAVES, this.peaks);
    fresh.baseLevel = Math.max(0, Math.floor(ground / this.step) * this.step);
    fresh.plateau = fresh.baseLevel + PLATEAU_LIFT * this.step;
    fresh.amp = (fresh.baseLevel + this.step - fresh.plateau) / NEW_RING_GAUSS;
    fresh.baseAmp = fresh.amp;
    fresh.baseMentions = this.step;
    this.peaks.push(fresh);
    const [x, y] = this.climb(fresh);
    this.peaks.pop();
    fresh.summitX = x;
    fresh.summitY = y;
    fresh.presence = 0;
    this.predicted.set(point.id, fresh);
    return fresh;
  }

  summit(point: FieldPoint) {
    const p = this.byId.get(point.id) ?? this.predict(point);
    return { x: p.summitX, y: p.summitY, sigma: 1 / Math.sqrt(2 * p.k), fresh: p.flattens, elongation: Math.max(p.ex, p.ey) };
  }

  growthRadius(point: FieldPoint) {
    const p = this.byId.get(point.id) ?? this.predict(point);
    const amp = Math.max(1e-6, p.baseAmp + (point.mentions - p.baseMentions));
    const below = p.flattens ? p.plateau + amp - (p.baseLevel + point.mentions) : this.step / 2;
    const g = Math.min(0.99999, Math.max(0.02, 1 - below / amp));
    return Math.sqrt(2 * Math.log(1 / g)) / Math.sqrt(2 * p.k);
  }

  addPeak(point: FieldPoint) {
    const existing = this.byId.get(point.id);
    if (existing) return existing;
    const fresh = this.predict(point);
    this.predicted.delete(point.id);
    this.peaks.push(fresh);
    this.byId.set(fresh.id, fresh);
    return fresh;
  }

  private baseRelief(x: number, y: number, octaves: number) {
    return 50 * fbm(this.land, x / 260, y / 260, octaves, 0.58);
  }

  peak(id: string) {
    return this.byId.get(id);
  }

  setAmplitude(id: string, amp: number, presence: number) {
    const p = this.byId.get(id);
    if (!p) return;
    p.amp = amp;
    p.presence = presence;
  }

  activePeaks(x0: number, y0: number, x1: number, y1: number) {
    return this.peaks.filter(
      (p) => p.cx + p.reach > x0 && p.cx - p.reach < x1 && p.cy + p.reach > y0 && p.cy - p.reach < y1,
    );
  }

  private climb(p: Peak) {
    let px = p.summitX;
    let py = p.summitY;
    let step = 5;
    const limit = 0.45 / Math.sqrt(2 * p.k);
    for (let i = 0; i < 80; i++) {
      const h = 0.4;
      const gx = this.terrain(px + h, py, SHEET_OCTAVES, this.peaks) - this.terrain(px - h, py, SHEET_OCTAVES, this.peaks);
      const gy = this.terrain(px, py + h, SHEET_OCTAVES, this.peaks) - this.terrain(px, py - h, SHEET_OCTAVES, this.peaks);
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

  coast(x: number, y: number) {
    const line = 86 + 30 * this.shoreline(x / 240, 0.37) + 9 * this.shoreline(x / 64, 3.1);
    return -14 + 54 * Math.tanh((y - line) / 44);
  }

  river(x: number, y: number) {
    let d2 = Infinity;
    for (let i = 0; i < RIVER.length - 1; i++) {
      const [ax, ay] = RIVER[i];
      const [bx, by] = RIVER[i + 1];
      const vx = bx - ax;
      const vy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
      const dx = x - ax - vx * t;
      const dy = y - ay - vy * t;
      const d = dx * dx + dy * dy;
      if (d < d2) d2 = d;
    }
    const upstream = Math.max(0, Math.min(1, (700 - y) / 260));
    return -46 * upstream * Math.exp(-d2 / (2 * RIVER_WIDTH * RIVER_WIDTH));
  }

  terrain(x: number, y: number, octaves: number, active: Peak[]) {
    const qx = x + 22 * this.warp(x / 170, y / 170);
    const qy = y + 22 * this.warp(x / 170 + 17.3, y / 170 + 5.9);
    let sum = 0;
    let weight = 0;
    let anchors = 0;
    let flatWeight = 0;
    let flatLevel = 0;
    let flatSum = 0;
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      const dx = qx - p.cx;
      const dy = qy - p.cy;
      const u = (dx * p.cos + dy * p.sin) * p.ex;
      const v = (dy * p.cos - dx * p.sin) * p.ey;
      const e = (u * u + v * v) * p.k;
      if (e > 10) continue;
      const g = Math.exp(-e);
      if (p.flattens) {
        const w = Math.min(1, PLATEAU_SPREAD * g) * p.presence;
        flatWeight += w;
        flatLevel += p.plateau * w;
        flatSum += p.amp * g * p.presence;
        continue;
      }
      sum += p.amp * g * p.presence;
      const gd = g * g * p.presence;
      weight += gd;
      anchors += p.anchor * gd;
    }
    const free = this.baseRelief(x, y, octaves);
    const d = weight > 1 ? 1 : weight;
    const relief = weight > 1e-9 ? free * (1 - d) + (anchors / weight) * d : free;
    const ground = relief + this.coast(x, y) + this.river(qx, qy) + sum;
    if (flatWeight <= 0) return ground;
    const fw = flatWeight > 1 ? 1 : flatWeight;
    return ground * (1 - fw) + (flatLevel / flatWeight) * fw + flatSum;
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
