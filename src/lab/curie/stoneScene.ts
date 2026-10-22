import { createNoise, fbm } from "../../map/noise.ts";
import { dotPattern, halftone } from "../riso/halftone.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { Sfx } from "../sound.ts";
import { HAND, HAND_CUFF } from "../johnson/sprites.ts";
import { slotAt, stoneCenter, stoneLayout, type Point, type Slot, type StoneLayout } from "./stoneLayout.ts";
import { ACTIVE_COUNT, RISE, type StonePlan } from "./stonePlan.ts";
import { StoneRound, type RoundStone, type StoneEvent } from "./stoneRound.ts";

export type StoneOutcome = "pending" | "found" | "missed";
export type StonePhase = "idle" | "play" | "done";

export type StoneSnapshot = {
  phase: StonePhase;
  outcomes: StoneOutcome[];
  found: number;
  wrong: number;
  missed: number;
  streak: number;
  bestStreak: number;
  plainUp: boolean;
  crystalUp: boolean;
  seed: number | null;
};

export type StoneOptions = {
  fonts: Fonts;
  reducedMotion: boolean;
  sfx: Sfx;
  onChange: (snapshot: StoneSnapshot) => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string; gravity: number; ring?: boolean };
type Ring = { x: number; y: number; born: number; max: number; color: string; from: number; to: number; width: number };
type Chip = { x: number; y: number; born: number; streak: number };
type Scribble = { x: number; y: number; born: number; text: string };
type Flight = { stone: RoundStone; from: Point; born: number };
type Signal = { from: Point; born: number; strength: number; done: boolean };

const FLIGHT = 0.5;
const SIGNAL = 0.3;

export function glowVisibility(strength: number) {
  return strength <= 0 ? 0 : 0.45 + 0.55 * Math.min(1, strength);
}
const DONE_DELAY = 1.3;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(t: number) {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stonePath(seed: number) {
  const rand = mulberry(seed);
  const n = 9;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.25;
    const r = 0.86 + rand() * 0.2;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82 });
  }
  const path = new Path2D();
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(pts[n - 1], pts[0]);
  path.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    path.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  path.closePath();
  return path;
}

const CRYSTAL = (() => {
  if (typeof Path2D === "undefined") return null;
  const outline = new Path2D("M -0.55 0.6 L -0.7 -0.1 L -0.3 -0.85 L 0.35 -0.95 L 0.72 -0.2 L 0.55 0.62 Z");
  const facets = new Path2D("M -0.3 -0.85 L -0.05 0.62 M 0.35 -0.95 L 0.15 0.62 M -0.7 -0.1 L 0.72 -0.2");
  return { outline, facets };
})();

export class StoneScene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private options: StoneOptions;
  private background: HTMLCanvasElement;
  private layout: StoneLayout = stoneLayout(1, 1);
  private W = 1;
  private H = 1;
  private dpr = 1;
  private frame = 0;
  private last = performance.now();
  private now = 0;
  private phase: StonePhase = "idle";
  private round: StoneRound | null = null;
  private shapes = new Map<number, Path2D>();
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private chips: Chip[] = [];
  private scribbles: Scribble[] = [];
  private flights: Flight[] = [];
  private signals: Signal[] = [];
  private meterFlash = 0;
  private arrived = 0;
  private tickPop = 0;
  private shakes = new Map<number, number>();
  private needle = 0;
  private needleV = 0;
  private needleTarget = 0;
  private needleHold = 0;
  private level = 0;
  private flaskBump = 0;
  private lastInput = -Infinity;
  private interacted = false;
  private orange: CanvasPattern | string = INK.orange;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: StoneOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.canvas = canvas;
    this.options = options;
    this.ctx = ctx;
    this.background = document.createElement("canvas");
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
  }

  setFonts(fonts: Fonts) {
    this.options.fonts = fonts;
  }

  resize(W: number, H: number, dpr: number) {
    this.W = Math.max(1, W);
    this.H = Math.max(1, H);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.layout = stoneLayout(this.W, this.H);
    this.orange = dotPattern(this.ctx, INK.orange, clamp(this.H * 0.0055, 3.4, 6), clamp(this.H * 0.0021, 1.2, 2.4));
    this.renderBackground();
  }

  start(plan: StonePlan) {
    if (this.phase !== "idle") return;
    this.round = new StoneRound(plan);
    this.phase = "play";
    this.lastInput = this.now;
    this.emit();
  }

  tapAt(x: number, y: number) {
    const slot = slotAt(this.layout, x, y);
    if (slot) this.tapSlot(slot.index);
  }

  tapSlot(index: number) {
    if (this.phase !== "play" || !this.round) return;
    this.lastInput = this.now;
    this.interacted = true;
    const event = this.round.tap(index);
    this.react(event);
  }

  pointerOverStone(x: number, y: number) {
    const slot = slotAt(this.layout, x, y);
    return !!slot && !!this.round?.stoneIn(slot.index);
  }

  private snapshot(): StoneSnapshot {
    const round = this.round;
    const actives = round ? round.actives : [];
    const firstOf = (kind: string) => round?.stones.find((s) => s.plan.kind === kind) ?? null;
    const plain = firstOf("plain");
    const crystal = firstOf("crystal");
    return {
      phase: this.phase,
      outcomes: actives.length
        ? actives.map((s) => (s.state === "found" ? "found" : s.state === "missed" ? "missed" : "pending"))
        : Array.from({ length: ACTIVE_COUNT }, () => "pending" as const),
      found: round?.found ?? 0,
      wrong: round?.wrong ?? 0,
      missed: round?.missed ?? 0,
      streak: round?.streak ?? 0,
      bestStreak: round?.bestStreak ?? 0,
      plainUp: plain?.state === "up",
      crystalUp: crystal?.state === "up",
      seed: round?.plan.seed ?? null,
    };
  }

  private emit() {
    this.options.onChange(this.snapshot());
  }

  private slot(index: number): Slot {
    return this.layout.slots[index];
  }

  private shape(stone: RoundStone) {
    let path = this.shapes.get(stone.plan.id);
    if (!path) {
      path = stonePath(stone.plan.shape);
      this.shapes.set(stone.plan.id, path);
    }
    return path;
  }

  private renderBackground() {
    const layer = this.background;
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    const { W, H, dpr, layout } = this;
    const cell = clamp(H * 0.0062, 3.6, 7);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const tableY = layout.tableY;

    ctx.globalCompositeOperation = "multiply";
    const noise = createNoise(1898);
    halftone(ctx, { x: 0, y: 0, w: W, h: tableY }, cell, 15, (x, y) => 0.03 + 0.09 * Math.pow(1 - y / tableY, 1.6) + fbm(noise, x / (H * 0.4), y / (H * 0.4), 2, 0.5) * 0.04, INK.blue);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(41, 41, 41, 0.18)";
    ctx.lineWidth = 1;
    const plank = W / 13;
    for (let x = plank * 0.5; x < W; x += plank) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, tableY);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + plank * 0.3, tableY * (0.2 + ((x * 7) % 5) * 0.12), 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const win = layout.portrait
      ? { x: W * 0.06, y: H * 0.15, w: W * 0.26, h: H * 0.16 }
      : { x: W * 0.05, y: H * 0.12, w: W * 0.15, h: H * 0.27 };
    ctx.fillStyle = INK.paper;
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.globalCompositeOperation = "multiply";
    halftone(ctx, win, cell * 0.9, 15, (_x, y) => 0.15 + 0.35 * ((y - win.y) / win.h), INK.blue);
    ctx.fillStyle = "rgba(41, 41, 41, 0.75)";
    ctx.beginPath();
    ctx.moveTo(win.x, win.y + win.h);
    const roofs = [0, 0.12, 0.18, 0.3, 0.38, 0.46, 0.55, 0.62, 0.74, 0.8, 0.9, 1];
    roofs.forEach((k, i) => ctx.lineTo(win.x + k * win.w, win.y + win.h * (0.72 + (i % 3) * 0.06 - (i === 5 ? 0.16 : 0))));
    ctx.lineTo(win.x + win.w, win.y + win.h);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(win.x + win.w / 2, win.y);
    ctx.lineTo(win.x + win.w / 2, win.y + win.h);
    ctx.moveTo(win.x, win.y + win.h * 0.45);
    ctx.lineTo(win.x + win.w, win.y + win.h * 0.45);
    ctx.stroke();

    if (!layout.portrait) {
      const shelfY = H * 0.33;
      const x0 = W * 0.27;
      const x1 = W * 0.66;
      ctx.fillStyle = INK.paper;
      ctx.fillRect(x0, shelfY, x1 - x0, H * 0.014);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x0, shelfY, x1 - x0, H * 0.014);
      const bottles = [0.04, 0.12, 0.2, 0.34, 0.44, 0.58, 0.7, 0.84];
      bottles.forEach((k, i) => {
        const bx = x0 + (x1 - x0) * k;
        const bh = H * (0.06 + (i % 3) * 0.018);
        const bw = H * (0.03 + (i % 2) * 0.012);
        ctx.fillStyle = INK.paper;
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, shelfY);
        ctx.lineTo(bx - bw / 2, shelfY - bh * 0.7);
        ctx.lineTo(bx - bw / 5, shelfY - bh * 0.82);
        ctx.lineTo(bx - bw / 5, shelfY - bh);
        ctx.lineTo(bx + bw / 5, shelfY - bh);
        ctx.lineTo(bx + bw / 5, shelfY - bh * 0.82);
        ctx.lineTo(bx + bw / 2, shelfY - bh * 0.7);
        ctx.lineTo(bx + bw / 2, shelfY);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = i % 3 === 0 ? "rgba(16, 1, 227, 0.28)" : i % 3 === 1 ? "rgba(238, 112, 76, 0.32)" : "rgba(41, 41, 41, 0.16)";
        ctx.fillRect(bx - bw / 2, shelfY - bh * 0.45, bw, bh * 0.45);
        ctx.globalCompositeOperation = "source-over";
        ctx.stroke();
      });
    }

    const tableBottom = H;
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, tableY, W, tableBottom - tableY);
    ctx.globalCompositeOperation = "multiply";
    halftone(ctx, { x: 0, y: tableY, w: W, h: tableBottom - tableY }, cell, 45, (x, y) => 0.05 + 0.07 * ((y - tableY) / (tableBottom - tableY)) + fbm(noise, x / (H * 0.9), y / (H * 0.03), 2, 0.5) * 0.06, INK.black);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(41, 41, 41, 0.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = tableY + (tableBottom - tableY) * (0.08 + i * 0.11);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 24) {
        const yy = y + Math.sin(x * 0.006 + i * 1.7) * 3 + Math.sin(x * 0.021 + i) * 1.4;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, tableY);
    ctx.lineTo(W, tableY);
    ctx.stroke();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.fillRect(0, tableY, W, H * 0.012);
    ctx.globalCompositeOperation = "source-over";

    for (const slot of layout.slots) this.drawDishBack(ctx, slot);
    this.drawMeterFace(ctx);
  }

  private dish(slot: Slot) {
    const { stoneR } = this.layout;
    return { rx: stoneR * 1.32 * slot.scale, ry: stoneR * 0.42 * slot.scale };
  }

  private drawDishBack(ctx: CanvasRenderingContext2D, slot: Slot) {
    const { rx, ry } = this.dish(slot);
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.fillStyle = "rgba(41, 41, 41, 0.2)";
    ctx.beginPath();
    ctx.ellipse(4, ry * 1.25, rx * 1.05, ry * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK.paper;
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.35, rx, ry * 1.35, 0, 0, Math.PI);
    ctx.lineTo(-rx, 0);
    ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0);
    ctx.fill();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16, 1, 227, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.35, rx, ry * 1.35, 0, 0.15, Math.PI - 0.15);
    ctx.fill();
    ctx.fillStyle = "rgba(41, 41, 41, 0.62)";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.86, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.35, rx, ry * 1.35, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  private drawDishLip(slot: Slot) {
    const { ctx } = this;
    const { rx, ry } = this.dish(slot);
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.fillStyle = INK.paper;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.ellipse(0, 0, rx * 0.86, ry * 0.7, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.86, ry * 0.7, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  private meterAngle(value: number) {
    return Math.PI * (1.08 + 0.84 * clamp(value, 0, 1.05));
  }

  private drawMeterFace(ctx: CanvasRenderingContext2D) {
    const { x, y, r } = this.layout.meter;
    ctx.save();
    ctx.fillStyle = INK.paper;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - r * 1.25, y - r * 1.15, r * 2.5, r * 1.75, r * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(238, 112, 76, 0.28)";
    ctx.fillRect(x - r * 1.25, y + r * 0.32, r * 2.5, r * 0.28);
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    for (let i = 0; i <= 10; i++) {
      const a = this.meterAngle(i / 10);
      const inner = i % 5 === 0 ? 0.78 : 0.86;
      ctx.lineWidth = i % 5 === 0 ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * inner, y + Math.sin(a) * r * inner);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.93, this.meterAngle(0.7), this.meterAngle(1));
    ctx.stroke();
    const size = clamp(r * 0.2, 9, 15);
    ctx.font = `500 ${size}px ${this.options.fonts.mono}`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(size * 0.2).toFixed(1)}px`;
    ctx.fillStyle = INK.black;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MEDIDOR", x, y + r * 0.46);
    ctx.restore();
  }

  private tick = (time: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (time - this.last) / 1000);
    this.last = time;
    this.now += dt * 1000;
    this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    const round = this.round;
    if (round && this.phase === "play") {
      for (const event of round.step(dt)) this.react(event);
      if (round.finished && round.time - round.lastResolvedAt > DONE_DELAY && this.flights.length === 0 && this.signals.every((s) => s.done)) {
        this.phase = "done";
        this.options.sfx.finish(round.found >= ACTIVE_COUNT - 2 ? 10 : 6);
        this.celebrate();
        this.emit();
      }
    }

    this.needleHold = Math.max(0, this.needleHold - dt);
    if (this.needleHold <= 0) this.needleTarget += (0.04 - this.needleTarget) * Math.min(1, dt * 1.6);
    this.needleV += ((this.needleTarget - this.needle) * 120 - this.needleV * 9) * dt;
    this.needle += this.needleV * dt;

    const goal = this.arrived / ACTIVE_COUNT;
    this.level += (goal - this.level) * Math.min(1, dt * 6);
    this.flaskBump = Math.max(0, this.flaskBump - dt * 2.5);
    this.meterFlash = Math.max(0, this.meterFlash - dt * 1.8);
    this.tickPop = Math.max(0, this.tickPop - dt * 2.2);

    for (const signal of this.signals) {
      if (!signal.done && (this.now - signal.born) / 1000 >= SIGNAL) this.measure(signal);
    }
    this.signals = this.signals.filter((s) => (this.now - s.born) / 1000 < SIGNAL + 0.35);

    const landed = this.flights.filter((f) => (this.now - f.born) / 1000 >= FLIGHT);
    for (const flight of landed) this.land(flight);
    this.flights = this.flights.filter((f) => (this.now - f.born) / 1000 < FLIGHT);

    for (const p of this.particles) {
      p.life += dt;
      if (p.life < 0) continue;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.rings = this.rings.filter((r) => (this.now - r.born) / 1000 < r.max);
    this.chips = this.chips.filter((c) => this.now - c.born < 800);
    this.scribbles = this.scribbles.filter((s) => this.now - s.born < 1100);
  }

  private react(event: StoneEvent) {
    const { sfx } = this.options;
    const stone = event.stone;
    const slot = this.slot(event.slot);
    const center = stone ? stoneCenter(this.layout, slot, stone.height) : stoneCenter(this.layout, slot, 0.8);
    if (event.type === "appear") return;
    if (event.type === "empty") return;
    if (event.type === "found" && stone) {
      sfx.rescue(this.round?.streak ?? 1);
      this.signals.push({ from: center, born: this.now, strength: stone.plan.strength, done: false });
      this.flights.push({ stone, from: center, born: this.now + 90 });
      const R = this.layout.stoneR * slot.scale;
      this.rings.push({ x: center.x, y: center.y, born: this.now, max: 0.55, color: INK.orange, from: R * 0.8, to: R * 2.6, width: 5 });
      this.rings.push({ x: center.x, y: center.y, born: this.now + 90, max: 0.55, color: INK.blue, from: R * 0.8, to: R * 2, width: 2 });
      if (!this.options.reducedMotion) {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
          const v = R * (4 + Math.random() * 3);
          this.particles.push({ x: center.x, y: center.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + Math.random() * 0.2, r: R * (0.06 + Math.random() * 0.05), color: i % 3 ? INK.orange : INK.paper, gravity: 0, ring: i % 3 === 0 });
        }
      }
      this.chips.push({ x: center.x, y: center.y - R * 1.6, born: this.now, streak: this.round?.streak ?? 1 });
      this.emit();
      return;
    }
    if (event.type === "wrong" && stone) {
      sfx.thud();
      this.shakes.set(stone.plan.id, this.now);
      this.needleTarget = 0.02;
      this.needleHold = 0.5;
      this.needleV -= 1.5;
      const { meter } = this.layout;
      this.scribbles.push({ x: meter.x + meter.r * 0.2, y: meter.y - meter.r * 1.32, born: this.now, text: "nada" });
      this.emit();
      return;
    }
    if (event.type === "missed" && stone) {
      sfx.fizz();
      const R = this.layout.stoneR * slot.scale;
      this.rings.push({ x: slot.x, y: slot.y - R * 0.2, born: this.now, max: 0.7, color: INK.blue, from: R * 0.6, to: R * 1.6, width: 2 });
      this.emit();
    }
  }

  private measure(signal: Signal) {
    signal.done = true;
    this.needleTarget = 0.5 + 0.5 * glowVisibility(signal.strength);
    this.needleHold = 0.8;
    this.meterFlash = 1;
    this.options.sfx.tick(Math.round(2 + signal.strength * 4));
    const { meter } = this.layout;
    this.rings.push({ x: meter.x, y: meter.y - meter.r * 0.35, born: this.now, max: 0.5, color: INK.orange, from: meter.r * 0.9, to: meter.r * 1.7, width: 4 });
  }

  private signalPath(from: Point) {
    const { meter } = this.layout;
    const to = { x: meter.x, y: meter.y - meter.r * 0.2 };
    const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - this.H * 0.12 };
    return (k: number) => {
      const u = 1 - k;
      return { x: u * u * from.x + 2 * u * k * control.x + k * k * to.x, y: u * u * from.y + 2 * u * k * control.y + k * k * to.y };
    };
  }

  private drawSignals() {
    const { ctx } = this;
    for (const signal of this.signals) {
      const age = (this.now - signal.born) / 1000;
      const k = clamp(age / SIGNAL, 0, 1);
      const e = 1 - Math.pow(1 - k, 2);
      const at = this.signalPath(signal.from);
      const fade = signal.done ? 1 - clamp((age - SIGNAL) / 0.35, 0, 1) : 1;
      const r = clamp(this.H * 0.011, 5, 12);
      ctx.save();
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = INK.orange;
      for (let i = 0; i <= 14; i++) {
        const kk = (i / 14) * e;
        const p = at(kk);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!signal.done) {
        const head = at(e);
        ctx.globalAlpha = 1;
        ctx.fillStyle = INK.paper;
        ctx.beginPath();
        ctx.arc(head.x, head.y, r + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK.orange;
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private flaskMouth(): Point {
    const { flask } = this.layout;
    return { x: flask.x, y: flask.base - flask.h * 0.96 };
  }

  private land(flight: Flight) {
    this.flaskBump = 1;
    this.arrived = Math.min(ACTIVE_COUNT, this.arrived + 1);
    this.tickPop = 1;
    const mouth = this.flaskMouth();
    const { flask } = this.layout;
    this.rings.push({ x: flask.x, y: flask.base - flask.h * (0.08 + this.level * 0.5), born: this.now, max: 0.5, color: INK.paper, from: flask.w * 0.1, to: flask.w * 0.5, width: 3 });
    if (!this.options.reducedMotion) {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const v = this.H * (0.18 + Math.random() * 0.12);
        this.particles.push({ x: mouth.x, y: mouth.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.45, r: flask.w * 0.035, color: INK.orange, gravity: this.H * 1.2 });
      }
    }
    this.shapes.set(flight.stone.plan.id, this.shape(flight.stone));
  }

  private celebrate() {
    const { flask } = this.layout;
    const cx = flask.x;
    const cy = flask.base - flask.h * 0.45;
    for (let k = 0; k < 4; k++) {
      this.rings.push({ x: cx, y: cy, born: this.now + k * 180, max: 1.1, color: k % 2 ? INK.blue : INK.orange, from: flask.w * 0.4, to: flask.w * 2.4, width: 4 });
    }
  }

  private draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawRoomGlow();
    ctx.drawImage(this.background, 0, 0, this.W, this.H);
    this.drawNeedle();
    this.drawFlask();
    this.drawStones();
    this.drawSignals();
    this.drawFlights();
    this.drawRings();
    this.drawParticles();
    this.drawChips();
    this.drawScribbles();
    this.drawGhostHand();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawRoomGlow() {
    const { ctx } = this;
    const { flask } = this.layout;
    const strength = this.level + this.flaskBump * 0.15 + (this.phase === "done" ? 0.2 : 0);
    if (strength <= 0.01) return;
    const cx = flask.x;
    const cy = flask.base - flask.h * 0.45;
    const radius = flask.h * (0.7 + strength * 1.1);
    const g = ctx.createRadialGradient(cx, cy, flask.w * 0.2, cx, cy, radius);
    g.addColorStop(0, `rgba(238, 112, 76, ${(0.38 * strength).toFixed(3)})`);
    g.addColorStop(1, "rgba(238, 112, 76, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  private drawNeedle() {
    const { ctx } = this;
    const { x, y, r } = this.layout.meter;
    const jitter = this.options.reducedMotion ? 0 : Math.sin(this.now / 37) * 0.004;
    const a = this.meterAngle(this.needle + jitter);
    ctx.save();
    if (this.meterFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.85 * this.meterFlash;
      ctx.fillStyle = this.orange;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r * 0.98, Math.PI * 1.08, Math.PI * 1.92);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
    ctx.stroke();
    ctx.fillStyle = INK.orange;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (this.needle > 0.3) {
      ctx.globalAlpha = clamp((this.needle - 0.3) * 1.6, 0, 1);
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const rr = r * (1.06 + k * 0.1);
        ctx.beginPath();
        ctx.arc(x, y, rr, this.meterAngle(0.15), this.meterAngle(0.85));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private flaskPath() {
    const { flask } = this.layout;
    const { x, base, w, h } = flask;
    const neck = w * 0.3;
    const path = new Path2D();
    path.moveTo(x - neck / 2, base - h);
    path.lineTo(x - neck / 2, base - h * 0.62);
    path.lineTo(x - w / 2, base - h * 0.06);
    path.quadraticCurveTo(x - w / 2, base, x - w / 2 + w * 0.08, base);
    path.lineTo(x + w / 2 - w * 0.08, base);
    path.quadraticCurveTo(x + w / 2, base, x + w / 2, base - h * 0.06);
    path.lineTo(x + neck / 2, base - h * 0.62);
    path.lineTo(x + neck / 2, base - h);
    return path;
  }

  private drawFlask() {
    const { ctx } = this;
    const { flask } = this.layout;
    const { x, base, w, h } = flask;
    const path = this.flaskPath();
    const level = clamp(this.level, 0, 1);
    const bump = Math.sin(this.flaskBump * Math.PI) * 0.04;
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(1 + bump, 1 - bump);
    ctx.translate(-x, -base);
    ctx.fillStyle = "rgba(41, 41, 41, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 5, base + 3, w * 0.55, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK.paper;
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16, 1, 227, 0.08)";
    ctx.fillRect(x - w, base - h, w * 2, h);
    if (level > 0.005) {
      const top = this.levelY(level);
      const wave = this.options.reducedMotion ? 0 : Math.sin(this.now / 300) * 2;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(238, 112, 76, 0.35)";
      ctx.beginPath();
      ctx.moveTo(x - w, top + wave);
      ctx.quadraticCurveTo(x, top - wave * 2, x + w, top - wave);
      ctx.lineTo(x + w, base);
      ctx.lineTo(x - w, base);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = this.orange;
      ctx.globalAlpha = 0.5 + level * 0.5;
      ctx.fillRect(x - w, top - 10, w * 2, base - top + 10);
      ctx.restore();
      if (!this.options.reducedMotion) {
        ctx.fillStyle = INK.paper;
        for (let i = 0; i < 6; i++) {
          const k = ((this.now / 1000) * (0.4 + (i % 3) * 0.15) + i * 0.17) % 1;
          const by = base - (base - top) * k;
          const bx = x + Math.sin(i * 2.3 + k * 6) * w * 0.25;
          ctx.globalAlpha = 0.8 * (1 - k);
          ctx.beginPath();
          ctx.arc(bx, by, w * 0.025 + (i % 2) * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(247, 248, 246, 0.9)";
    ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - w * 0.32, base - h * 0.12);
    ctx.lineTo(x - w * 0.1, base - h * 0.5);
    ctx.stroke();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke(path);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, base - h, w * 0.17, w * 0.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 1; i <= ACTIVE_COUNT; i++) {
      const ty = this.levelY(i / ACTIVE_COUNT);
      const k = (ty - (base - h * 0.62)) / (h * 0.56);
      const edge = x + w * 0.15 + (w * 0.5 - w * 0.15) * clamp(k, 0, 1) - 2;
      const filled = i <= this.arrived;
      const pop = filled && i === this.arrived ? 1 + this.tickPop * 0.8 : 1;
      const len = (i % 5 === 0 ? w * 0.2 : w * 0.12) * pop;
      ctx.strokeStyle = filled ? INK.orange : "rgba(41, 41, 41, 0.45)";
      ctx.lineWidth = filled ? 3 : 1.2;
      ctx.beginPath();
      ctx.moveTo(edge, ty);
      ctx.lineTo(edge - len, ty);
      ctx.stroke();
    }
    ctx.restore();
  }

  private levelY(level: number) {
    const { base, h } = this.layout.flask;
    return base - h * 0.06 - (h * 0.56 - h * 0.06) * clamp(level, 0, 1);
  }

  private drawGlow(center: Point, R: number, strength: number, seed: number, alpha: number) {
    const { ctx } = this;
    const vis = glowVisibility(strength);
    if (vis <= 0) return;
    const pulse = this.options.reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(this.now / 260 + seed);
    ctx.save();
    ctx.globalAlpha = alpha * 0.2 * vis;
    ctx.fillStyle = INK.orange;
    ctx.beginPath();
    ctx.arc(center.x, center.y, R * 1.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = this.orange;
    for (const [scale, a] of [
      [2.1, 0.32],
      [1.65, 0.5],
      [1.28, 0.72],
    ]) {
      ctx.globalAlpha = alpha * a * vis * pulse;
      ctx.beginPath();
      ctx.arc(center.x, center.y, R * scale * (0.82 + vis * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    const period = 1.15 - vis * 0.35;
    const k = this.options.reducedMotion ? 0.4 : ((this.now / 1000 + seed * 0.13) % period) / period;
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 2 + vis * 2;
    ctx.globalAlpha = alpha * vis * (1 - k);
    ctx.beginPath();
    ctx.arc(center.x, center.y, R * (1.08 + k * 1.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * vis;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    const spin = this.options.reducedMotion ? 0 : this.now / 2400;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + spin;
      const r0 = R * 1.2;
      const r1 = R * (1.24 + 0.36 * vis);
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(a) * r0, center.y + Math.sin(a) * r0 * 0.9);
      ctx.lineTo(center.x + Math.cos(a) * r1, center.y + Math.sin(a) * r1 * 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRock(stone: RoundStone, center: Point, R: number, rotation: number, rim = 0) {
    const { ctx } = this;
    const path = this.shape(stone);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(rotation);
    ctx.scale(R, R);
    ctx.fillStyle = "#4b4a47";
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16, 1, 227, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0.25, 0.35, 0.9, 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(247, 248, 246, 0.55)";
    const rand = mulberry(stone.plan.shape + 7);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(rand() * 1.6 - 0.8, rand() * 1.3 - 0.65, 0.025 + rand() * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(247, 248, 246, 0.6)";
    ctx.lineWidth = 0.07;
    ctx.beginPath();
    ctx.arc(-0.15, -0.1, 0.55, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
    if (rim > 0) {
      ctx.save();
      ctx.translate(0.07, -0.06);
      ctx.globalAlpha = rim;
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 4.5 / R;
      ctx.stroke(path);
      ctx.restore();
    }
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.8 / R;
    ctx.stroke(path);
    ctx.restore();
  }

  private drawCrystal(stone: RoundStone, center: Point, R: number, rotation: number) {
    const { ctx } = this;
    if (!CRYSTAL) return;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(rotation);
    ctx.scale(R, R);
    ctx.fillStyle = INK.paper;
    ctx.fill(CRYSTAL.outline);
    ctx.save();
    ctx.clip(CRYSTAL.outline);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16, 1, 227, 0.32)";
    ctx.beginPath();
    ctx.moveTo(-0.3, -0.85);
    ctx.lineTo(-0.05, 0.62);
    ctx.lineTo(-0.55, 0.6);
    ctx.lineTo(-0.7, -0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(16, 1, 227, 0.14)";
    ctx.fillRect(0.15, -1, 1, 2);
    ctx.restore();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.8 / R;
    ctx.lineJoin = "round";
    ctx.stroke(CRYSTAL.outline);
    ctx.lineWidth = 1 / R;
    ctx.stroke(CRYSTAL.facets);
    ctx.restore();
    const twinkle = this.options.reducedMotion ? 0.8 : 0.5 + 0.5 * Math.sin(this.now / 180 + stone.plan.id);
    for (const [dx, dy, s] of [
      [0.45, -0.55, 0.42],
      [-0.5, 0.05, 0.3],
      [0.15, 0.35, 0.24],
    ]) {
      const size = R * s * (0.6 + 0.4 * twinkle);
      const px = center.x + dx * R;
      const py = center.y + dy * R;
      ctx.save();
      ctx.fillStyle = INK.paper;
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.quadraticCurveTo(px, py, px + size, py);
      ctx.quadraticCurveTo(px, py, px, py + size);
      ctx.quadraticCurveTo(px, py, px - size, py);
      ctx.quadraticCurveTo(px, py, px, py - size);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawStones() {
    const round = this.round;
    const { ctx } = this;
    for (const slot of this.layout.slots) {
      const stone = round?.stones.find((s) => s.plan.slot === slot.index && (s.state === "up" || (s.state === "wrong" && this.now - this.shakeStart(s) < 450))) ?? null;
      if (stone) {
        const R = this.layout.stoneR * slot.scale;
        const wrongAge = stone.state === "wrong" ? (this.now - this.shakeStart(stone)) / 1000 : 0;
        const height = stone.state === "wrong" ? stone.height * (1 - smooth((wrongAge - 0.15) / 0.3)) : stone.height;
        const center = stoneCenter(this.layout, slot, height);
        const shake = stone.state === "wrong" ? Math.sin(wrongAge * 60) * R * 0.12 * (1 - smooth(wrongAge / 0.4)) : 0;
        const wobble = this.options.reducedMotion ? 0 : Math.sin(this.now / 400 + stone.plan.id) * 0.04;
        const rising = round ? Math.min(1, (round.time - stone.plan.at) / RISE) : 1;
        const squash = rising < 1 ? 1 + Math.sin(rising * Math.PI) * 0.12 : 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.W, slot.y);
        ctx.clip();
        if (stone.plan.kind === "active" && stone.state === "up") this.drawGlow(center, R, stone.plan.strength, stone.plan.id, Math.min(1, height * 1.4));
        ctx.translate(center.x + shake, center.y);
        ctx.scale(1 / squash, squash);
        ctx.translate(-center.x, -center.y);
        if (stone.plan.kind === "crystal") this.drawCrystal(stone, center, R, wobble);
        else this.drawRock(stone, center, R, wobble + ((stone.plan.shape % 100) / 100 - 0.5) * 0.5, stone.plan.kind === "active" && stone.state === "up" ? glowVisibility(stone.plan.strength) * Math.min(1, height * 1.4) : 0);
        if (stone.state === "wrong") {
          ctx.strokeStyle = INK.pencil;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          const s = R * 0.55;
          ctx.beginPath();
          ctx.moveTo(center.x - s, center.y - s * 0.8);
          ctx.lineTo(center.x + s, center.y + s * 0.8);
          ctx.moveTo(center.x + s, center.y - s * 0.8);
          ctx.lineTo(center.x - s, center.y + s * 0.8);
          ctx.stroke();
        }
        ctx.restore();
      }
      this.drawDishLip(slot);
    }
  }

  private shakeStart(stone: RoundStone) {
    return this.shakes.get(stone.plan.id) ?? 0;
  }

  private drawFlights() {
    const { ctx } = this;
    const mouth = this.flaskMouth();
    for (const flight of this.flights) {
      const k = clamp((this.now - flight.born) / 1000 / FLIGHT, 0, 1);
      const e = 1 - Math.pow(1 - k, 2.2);
      const slot = this.slot(flight.stone.plan.slot);
      const R = this.layout.stoneR * slot.scale;
      const lift = Math.sin(e * Math.PI) * this.H * 0.16;
      const x = flight.from.x + (mouth.x - flight.from.x) * e;
      const y = flight.from.y + (mouth.y - flight.from.y) * e - lift;
      const scale = R * (1.1 - e * 0.7);
      const pop = k < 0.15 ? 1 + (k / 0.15) * 0.2 : 1.2 - (k - 0.15) * 0.3;
      if (!this.options.reducedMotion) {
        ctx.save();
        ctx.fillStyle = INK.orange;
        for (let i = 1; i <= 5; i++) {
          const kk = Math.max(0, e - i * 0.05);
          const tx = flight.from.x + (mouth.x - flight.from.x) * kk;
          const ty = flight.from.y + (mouth.y - flight.from.y) * kk - Math.sin(kk * Math.PI) * this.H * 0.16;
          ctx.globalAlpha = 0.5 * (1 - i / 6);
          ctx.beginPath();
          ctx.arc(tx, ty, scale * 0.25 * (1 - i / 7), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      this.drawGlow({ x, y }, scale, 0.9, flight.stone.plan.id, 1 - e * 0.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.translate(-x, -y);
      const misregister = (1 - k) * 4;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = INK.orange;
      ctx.beginPath();
      ctx.arc(x + misregister, y - misregister * 0.7, scale * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      this.drawRock(flight.stone, { x, y }, scale, e * 1.5, 1);
      ctx.restore();
    }
  }

  private drawRings() {
    const { ctx } = this;
    for (const r of this.rings) {
      const age = (this.now - r.born) / 1000 / r.max;
      if (age < 0) continue;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = r.width * (1 - age * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.from + (r.to - r.from) * (1 - Math.pow(1 - age, 2)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      if (p.life < 0) continue;
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.r * (0.5 + k * 0.5)), 0, Math.PI * 2);
      ctx.fill();
      if (p.ring) {
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawChips() {
    const { ctx } = this;
    for (const c of this.chips) {
      const age = (this.now - c.born) / 1000;
      const k = age / 0.8;
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.42 : 1.12 - Math.min(0.12, (age - 0.12) * 0.8);
      const size = clamp(this.H * 0.042, 22, 50);
      const extra = c.streak >= 3 ? `×${c.streak}` : "";
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.65) / 0.35);
      ctx.translate(c.x, c.y - smooth(k) * this.H * 0.035);
      ctx.scale(pop, pop);
      ctx.font = `700 ${size}px ${this.options.fonts.display}`;
      const w1 = ctx.measureText("+1").width;
      ctx.font = `600 ${size * 0.62}px ${this.options.fonts.mono}`;
      const w2 = extra ? ctx.measureText(extra).width + size * 0.3 : 0;
      const w = w1 + w2 + size * 0.7;
      const h = size * 1.18;
      ctx.fillStyle = INK.black;
      ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
      ctx.fillStyle = INK.paper;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-w / 2 + 0.75, -h / 2 + 0.75, w - 1.5, h - 1.5);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = `700 ${size}px ${this.options.fonts.display}`;
      ctx.fillStyle = INK.orange;
      ctx.fillText("+1", -w / 2 + size * 0.35, size * 0.04);
      if (extra) {
        ctx.font = `600 ${size * 0.62}px ${this.options.fonts.mono}`;
        ctx.fillStyle = INK.blue;
        ctx.fillText(extra, -w / 2 + size * 0.35 + w1 + size * 0.3, size * 0.06);
      }
      ctx.restore();
    }
  }

  private drawScribbles() {
    const { ctx } = this;
    for (const s of this.scribbles) {
      const age = (this.now - s.born) / 1000;
      const size = clamp(this.H * 0.04, 20, 44);
      ctx.save();
      ctx.globalAlpha = 1 - smooth((age - 0.7) / 0.4);
      ctx.translate(s.x, s.y - age * 8);
      ctx.rotate(-0.08);
      ctx.font = `600 ${size}px ${this.options.fonts.hand}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(5, size * 0.2);
      ctx.strokeStyle = INK.paper;
      ctx.lineJoin = "round";
      ctx.strokeText(s.text, 0, 0);
      ctx.fillStyle = INK.pencil;
      ctx.fillText(s.text, 0, 0);
      ctx.restore();
    }
  }

  private drawGhostHand() {
    if (this.phase !== "play" || !this.round) return;
    const target = this.round.stones.find((s) => s.state === "up" && s.plan.kind === "active" && s.height > 0.6);
    if (!target) return;
    const idle = (this.now - this.lastInput) / 1000;
    const wait = this.interacted ? 5 : 0.6;
    if (idle < wait) return;
    const slot = this.slot(target.plan.slot);
    const center = stoneCenter(this.layout, slot, target.height);
    const cycle = 1.1;
    const k = ((idle - wait) % cycle) / cycle;
    const press = k > 0.35 && k < 0.6 ? 1 : 0;
    const alpha = k < 0.15 ? k / 0.15 : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
    const scale = clamp(this.H * 0.0014, 0.8, 1.6);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (press) {
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center.x, center.y, this.layout.stoneR * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.translate(center.x + 4 * scale, center.y + (8 - press * 6) * scale);
    ctx.rotate(-0.3);
    ctx.scale(scale, scale);
    const hand = new Path2D(HAND);
    ctx.fillStyle = INK.paper;
    ctx.fill(hand);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.stroke(hand);
    ctx.stroke(new Path2D(HAND_CUFF));
    ctx.restore();
  }
}
