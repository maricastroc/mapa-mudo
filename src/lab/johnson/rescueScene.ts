import { createNoise, fbm } from "../../map/noise.ts";
import { dotPattern, halftone } from "../riso/halftone.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { Sfx } from "../sound.ts";
import { chuteOpening, sampleFall } from "./fall.ts";
import { HORIZON_Y, rescueGeometry, SPAWN_Y, type RescueGeometry } from "./rescueGeometry.ts";
import { CAPSULE_COUNT } from "./rescuePlan.ts";
import { RescueRound, type RoundDrop, type RoundEvent } from "./rescueRound.ts";
import { serveRound } from "./rescueSim.ts";
import {
  CAPSULE_BODY,
  CAPSULE_RIBS,
  CAPSULE_SHIELD,
  CAPSULE_WINDOW,
  CHUTE_CANOPY_RADIUS,
  HAND,
  HAND_CUFF,
  SHIP_CARGO_FROM,
  SHIP_CARGO_TO,
  SHIP_DECK,
  SHIP_DECK_Y,
  SHIP_FLAG,
  SHIP_HULL,
  SHIP_LINES,
  SHIP_STRIPE,
} from "./sprites.ts";

export type Outcome = "pending" | "rescued" | "missed";
export type RescuePhase = "idle" | "play" | "done";

export type RescueSnapshot = {
  phase: RescuePhase;
  outcomes: Outcome[];
  rescued: number;
  missed: number;
  damage: number;
  debrisSeen: number;
  streak: number;
  bestStreak: number;
  seed: number | null;
};

export type RescueOptions = {
  fonts: Fonts;
  reducedMotion: boolean;
  sfx: Sfx;
  onChange: (snapshot: RescueSnapshot) => void;
};

type Point = { x: number; y: number };
type Scorch = { ux: number; at: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; color: string; gravity: number; ring?: boolean };
type Ripple = { x: number; born: number; max: number; color: string; size: number; width: number };
type Foam = { x: number; born: number; dir: 1 | -1 };
type Chip = { x: number; y: number; born: number; streak: number };
type Burst = { x: number; y: number; born: number };
type Cloud = { x: number; y: number; scale: number; speed: number; puffs: [number, number, number][] };

const PATH_BODY = typeof Path2D === "undefined" ? null : new Path2D(CAPSULE_BODY);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(t: number) {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

function inflate(c: number) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return 1 - Math.pow(1 - c, 3) + Math.sin(c * Math.PI) * 0.16;
}

export class RescueScene {
  private ctx: CanvasRenderingContext2D;
  private background: HTMLCanvasElement;
  private canvas: HTMLCanvasElement;
  private options: RescueOptions;
  private geometry: RescueGeometry = rescueGeometry(1, 1);
  private W = 1;
  private H = 1;
  private dpr = 1;
  private frame = 0;
  private last = performance.now();
  private now = 0;
  private phase: RescuePhase = "idle";
  private round: RescueRound | null = null;
  private idleShip = { x: 0, v: 0 };
  private scorches: Scorch[] = [];
  private hitAt = -Infinity;
  private rescueAt = -Infinity;
  private dip = 0;
  private dipV = 0;
  private lastInput = -Infinity;
  private interacted = false;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private foams: Foam[] = [];
  private chips: Chip[] = [];
  private bursts: Burst[] = [];
  private clouds: Cloud[] = [];
  private shake = 0;
  private hullPattern: CanvasPattern | string = INK.blue;
  private destroyed = false;
  private sized = false;

  constructor(canvas: HTMLCanvasElement, options: RescueOptions) {
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

  private get waterY() {
    return this.geometry.waterY;
  }

  private get horizonY() {
    return this.H * HORIZON_Y;
  }

  private get shipScale() {
    return this.geometry.shipScale;
  }

  private get capsuleScale() {
    return clamp(this.H * 0.0017, 0.85, 2.1);
  }

  private get debrisScale() {
    return clamp(this.H * 0.0022, 1.05, 2.6);
  }

  private get drops(): RoundDrop[] {
    return this.round?.drops ?? [];
  }

  private get ship() {
    return this.round?.ship ?? this.idleShip;
  }

  private get time() {
    return this.round?.time ?? 0;
  }

  resize(W: number, H: number, dpr: number) {
    const lane = this.sized ? (this.ship.x - this.geometry.minX) / this.geometry.span : 0.5;
    this.W = Math.max(1, W);
    this.H = Math.max(1, H);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.geometry = rescueGeometry(this.W, this.H);
    if (this.round) this.round.resize(this.geometry);
    else this.idleShip = { x: this.geometry.minX + clamp(lane, 0, 1) * this.geometry.span, v: 0 };
    this.sized = true;
    this.hullPattern = dotPattern(this.ctx, INK.blue, 4.2, 1.5);
    this.buildClouds();
    this.renderBackground();
  }

  start(seed: number) {
    if (this.phase !== "idle") return;
    const plan = serveRound(seed, this.geometry);
    this.round = new RescueRound(plan, this.geometry);
    this.round.ship = { ...this.idleShip };
    this.round.setTarget(this.idleShip.x);
    this.phase = "play";
    this.lastInput = this.now;
    this.emit();
  }

  pointer(x: number) {
    this.lastInput = this.now;
    if (this.round) {
      this.round.setTarget(x);
      if (this.phase === "play") this.interacted = true;
    }
  }

  nudge(direction: number) {
    if (this.round) this.pointer(this.round.target + direction * this.W * 0.07);
  }

  private snapshot(): RescueSnapshot {
    const round = this.round;
    const capsules = this.drops.filter((d) => d.plan.kind === "capsule");
    return {
      phase: this.phase,
      outcomes: capsules.length
        ? capsules.map((c) => (c.state === "rescued" ? "rescued" : c.state === "missed" ? "missed" : "pending"))
        : Array.from({ length: CAPSULE_COUNT }, () => "pending" as const),
      rescued: round?.rescued ?? 0,
      missed: round?.missed ?? 0,
      damage: round?.hits ?? 0,
      debrisSeen: this.drops.filter((d) => d.plan.kind === "debris" && d.state !== "waiting").length,
      streak: round?.streak ?? 0,
      bestStreak: round?.bestStreak ?? 0,
      seed: round?.plan.seed ?? null,
    };
  }

  private emit() {
    this.options.onChange(this.snapshot());
  }

  private buildClouds() {
    const seeds = [
      [0.12, 0.16, 1.1, 9],
      [0.42, 0.09, 0.8, 6],
      [0.68, 0.22, 1.25, 11],
      [0.9, 0.12, 0.9, 7],
      [0.3, 0.34, 0.7, 13],
    ];
    this.clouds = seeds.map(([fx, fy, scale, speed], i) => {
      const puffs: [number, number, number][] = [];
      const n = 4 + (i % 3);
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        puffs.push([(t - 0.5) * 150, -Math.sin(t * Math.PI) * 26 - ((k * 7) % 11), 24 + Math.sin(t * Math.PI) * 22 + ((k * 13) % 9)]);
      }
      return { x: fx * this.W, y: fy * this.H, scale: scale * clamp(this.H / 1080, 0.55, 1.3), speed, puffs };
    });
  }

  private renderBackground() {
    const layer = this.background;
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    const { W, H, dpr } = this;
    const horizon = this.horizonY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cell = clamp(H * 0.0062, 3.6, 7);
    ctx.globalCompositeOperation = "multiply";

    halftone(ctx, { x: 0, y: 0, w: W, h: horizon }, cell, 15, (_x, y) => 0.015 + 0.17 * Math.pow(y / horizon, 2.2), INK.blue);

    const sunX = W * 0.8;
    const sunR = H * 0.13;
    ctx.fillStyle = "rgba(238, 112, 76, 0.18)";
    ctx.beginPath();
    ctx.arc(sunX, horizon, sunR, Math.PI, 0);
    ctx.fill();
    halftone(
      ctx,
      { x: sunX - sunR, y: horizon - sunR, w: sunR * 2, h: sunR },
      cell * 0.95,
      75,
      (x, y) => {
        const d = Math.hypot(x - sunX, y - horizon) / sunR;
        return d > 1 ? 0 : 0.85 - d * 0.35;
      },
      INK.orange,
    );

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = INK.paper;
    ctx.fillRect(0, horizon, W, H - horizon);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(16, 1, 227, 0.1)";
    ctx.fillRect(0, horizon, W, H - horizon);
    const noise = createNoise(1962);
    halftone(
      ctx,
      { x: 0, y: horizon, w: W, h: H - horizon },
      cell,
      15,
      (x, y) => {
        const depth = (y - horizon) / (H - horizon);
        return 0.34 + depth * 0.36 + fbm(noise, x / (H * 0.3), y / (H * 0.05), 3, 0.5) * 0.2;
      },
      INK.blue,
    );
    halftone(
      ctx,
      { x: sunX - sunR, y: horizon, w: sunR * 2, h: (H - horizon) * 0.7 },
      cell * 1.1,
      75,
      (x, y) => {
        const dx = Math.abs(x - sunX) / sunR;
        const depth = (y - horizon) / ((H - horizon) * 0.7);
        const band = Math.sin(y / (H * 0.012)) > 0.1 ? 1 : 0;
        return dx > 1 ? 0 : (1 - dx) * (1 - depth) * 0.55 * band;
      },
      INK.orange,
    );

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(W, horizon);
    ctx.stroke();
    ctx.strokeStyle = "rgba(16, 1, 227, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 2.5);
    ctx.lineTo(W, horizon + 2.5);
    ctx.stroke();
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
    if (round) {
      const events = round.step(dt);
      for (const event of events) this.react(event);
      if (this.phase === "play" && round.finished && round.time - round.lastResolvedAt > 1.4) {
        this.phase = "done";
        round.setTarget(this.W / 2);
        this.options.sfx.finish(round.rescued);
        this.salute();
        this.emit();
      }
    }

    this.dipV += (-170 * this.dip - 13 * this.dipV) * dt;
    this.dip += this.dipV * dt;
    this.shake = Math.max(0, this.shake - dt * 2.5);

    const ship = this.ship;
    if (Math.abs(ship.v) > this.W * 0.08 && !this.options.reducedMotion) {
      const dir = Math.sign(ship.v);
      const stern = ship.x - dir * this.geometry.shipLength * 0.48;
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: stern + (Math.random() - 0.5) * 10,
          y: this.waterY + 2 + Math.random() * 4,
          vx: -dir * (30 + Math.random() * 60),
          vy: -20 - Math.random() * 40,
          life: 0,
          max: 0.5 + Math.random() * 0.3,
          r: 1.5 + Math.random() * 2.2,
          color: INK.paper,
          gravity: 160,
        });
      }
    }

    if (this.phase === "play" && !this.options.reducedMotion) {
      for (const d of this.drops) {
        if (d.state === "falling" && d.plan.kind === "debris" && Math.random() < 0.7) this.trail({ x: d.x, y: d.y });
      }
      if (this.now - this.hitAt < 2600 && Math.random() < 0.5) this.smoke();
    }

    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.ripples = this.ripples.filter((r) => (this.now - r.born) / 1000 < r.max);
    this.foams = this.foams.filter((f) => this.now - f.born < 900);
    this.chips = this.chips.filter((c) => this.now - c.born < 800);
    this.bursts = this.bursts.filter((b) => this.now - b.born < 420);
  }

  private react(event: RoundEvent) {
    const { sfx } = this.options;
    if (event.type === "spawn") {
      if (event.drop.plan.kind === "debris") {
        sfx.incoming(event.drop.plan.path.duration);
        this.emit();
      }
      return;
    }
    if (event.type === "chute") {
      sfx.chute();
      return;
    }
    const at = { x: event.x, y: event.y };
    if (event.type === "rescue") this.rescueFx(at);
    else if (event.type === "miss") this.missFx(at);
    else if (event.type === "hit") this.hitFx(at);
    else if (event.type === "dodge") this.dodgeFx(at);
    this.emit();
  }

  private deckY() {
    return this.geometry.deckY + this.bob() + this.dip;
  }

  private bob() {
    return this.options.reducedMotion ? 0 : Math.sin(this.now / 620) * this.H * 0.0028;
  }

  private pointAt(drop: RoundDrop, local: number): Point {
    const s = sampleFall(drop.plan.path, local);
    const landX = this.round ? this.round.landingX(drop) : 0;
    return { x: landX + (s.x - drop.plan.path.landingX) * this.geometry.driftUnit, y: (SPAWN_Y + s.y) * this.H };
  }

  private landingPoint(drop: RoundDrop): Point {
    return { x: this.round ? this.round.landingX(drop) : 0, y: this.waterY };
  }

  private slotPoint(slot: number) {
    const span = SHIP_CARGO_TO - SHIP_CARGO_FROM;
    const ux = SHIP_CARGO_FROM + ((slot + 0.5) / CAPSULE_COUNT) * span;
    return { x: this.ship.x + ux * this.shipScale, y: this.deckY() };
  }

  private rescueFx(p: Point) {
    const round = this.round;
    this.rescueAt = this.now;
    this.dipV += this.H * (this.options.reducedMotion ? 0.12 : 0.32);
    this.options.sfx.rescue(round?.streak ?? 1);
    const size = this.geometry.shipLength * 0.3;
    this.ripples.push({ x: this.ship.x, born: this.now, max: 0.85, color: INK.paper, size, width: 6 });
    this.ripples.push({ x: this.ship.x, born: this.now + 120, max: 0.85, color: INK.orange, size: size * 0.9, width: 3 });
    this.foams.push({ x: this.ship.x, born: this.now, dir: -1 }, { x: this.ship.x, born: this.now, dir: 1 });
    if (!this.options.reducedMotion) {
      const scale = clamp(this.H / 1080, 0.6, 1.4);
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1;
        const a = -Math.PI / 2 + side * (0.35 + Math.random() * 0.5);
        const v = (200 + Math.random() * 180) * scale;
        this.particles.push({
          x: this.ship.x + side * this.geometry.shipLength * (0.44 + Math.random() * 0.1),
          y: this.waterY + 2,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0,
          max: 0.5 + Math.random() * 0.25,
          r: (3.5 + Math.random() * 3) * scale,
          color: INK.paper,
          gravity: 900 * scale,
          ring: true,
        });
      }
    }
    this.chips.push({ x: p.x, y: this.deckY() - this.H * 0.05, born: this.now, streak: round?.streak ?? 1 });
  }

  private missFx(p: Point) {
    this.options.sfx.splash();
    const size = this.H * 0.035;
    this.ripples.push({ x: p.x, born: this.now, max: 1.6, color: INK.paper, size, width: 3 });
    this.ripples.push({ x: p.x, born: this.now + 220, max: 1.6, color: INK.blue, size, width: 2 });
    const drops = this.options.reducedMotion ? 6 : 16;
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const v = 140 + Math.random() * 220;
      this.particles.push({ x: p.x, y: this.waterY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.7 + Math.random() * 0.4, r: 1.8 + Math.random() * 2.5, color: i % 2 ? INK.paper : INK.blue, gravity: 700 });
    }
  }

  private hitFx(p: Point) {
    this.hitAt = this.now;
    const ux = clamp((p.x - this.ship.x) / this.shipScale, -50, 50);
    this.scorches.push({ ux, at: this.now });
    this.shake = this.options.reducedMotion ? 0 : 1.4;
    this.dipV += this.H * 0.4;
    this.options.sfx.hit();
    this.bursts.push({ x: p.x, y: this.deckY() - 6, born: this.now });
    const burst = this.options.reducedMotion ? 8 : 24;
    for (let i = 0; i < burst; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
      const v = 140 + Math.random() * 300;
      const k = i % 3;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: 0.5 + Math.random() * 0.5,
        r: (k === 0 ? 5 : 2.5) + Math.random() * 3,
        color: k === 0 ? "rgba(41, 41, 41, 0.75)" : INK.orange,
        gravity: 600,
      });
    }
  }

  private dodgeFx(p: Point) {
    this.options.sfx.fizz();
    const size = this.H * 0.03;
    this.ripples.push({ x: p.x, born: this.now, max: 1.3, color: INK.black, size, width: 2 });
    const drops = this.options.reducedMotion ? 4 : 12;
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const v = 120 + Math.random() * 200;
      this.particles.push({ x: p.x, y: this.waterY, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.6 + Math.random() * 0.4, r: 2 + Math.random() * 3, color: i % 3 ? INK.paper : "rgba(41, 41, 41, 0.5)", gravity: 700 });
    }
  }

  private salute() {
    if (this.options.reducedMotion) return;
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1;
      const a = -Math.PI / 2 + side * (0.35 + Math.random() * 0.25);
      const v = this.H * (0.55 + Math.random() * 0.2);
      this.particles.push({
        x: this.ship.x + side * this.geometry.shipLength * 0.38,
        y: this.waterY - this.geometry.shipLength * 0.08,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: -Math.floor(i / 2) * 0.03,
        max: 1.2,
        r: 2.5 + Math.random() * 2,
        color: INK.paper,
        gravity: this.H * 1.1,
        ring: true,
      });
    }
  }

  private trail(p: Point) {
    const scale = this.debrisScale;
    const fire = Math.random() < 0.55;
    this.particles.push({
      x: p.x + (Math.random() - 0.5) * 14 * scale,
      y: p.y - 18 * scale + (Math.random() - 0.5) * 10 * scale,
      vx: (Math.random() - 0.5) * 30,
      vy: -40 - Math.random() * 50,
      life: 0,
      max: fire ? 0.35 + Math.random() * 0.2 : 0.7 + Math.random() * 0.4,
      r: (fire ? 3 + Math.random() * 3 : 4 + Math.random() * 5) * scale,
      color: fire ? INK.orange : "rgba(41, 41, 41, 0.55)",
      gravity: -30,
    });
  }

  private smoke() {
    const ux = this.scorches.length ? this.scorches[this.scorches.length - 1].ux : 0;
    this.particles.push({
      x: this.ship.x + ux * this.shipScale + (Math.random() - 0.5) * 12,
      y: this.deckY() - 4,
      vx: -20 + (Math.random() - 0.5) * 20,
      vy: -50 - Math.random() * 40,
      life: 0,
      max: 1.1 + Math.random() * 0.5,
      r: 5 + Math.random() * 7,
      color: "rgba(41, 41, 41, 0.4)",
      gravity: -20,
    });
  }

  private nextFalling() {
    let best: RoundDrop | null = null;
    for (const c of this.drops) {
      if (c.state !== "falling" || c.plan.kind !== "capsule") continue;
      if (!best || c.plan.landAt < best.plan.landAt) best = c;
    }
    return best;
  }

  private draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const shakeX = this.shake > 0 ? Math.sin(this.now / 18) * this.shake * 5 : 0;
    const shakeY = this.shake > 0 ? Math.cos(this.now / 23) * this.shake * 3 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
    ctx.drawImage(this.background, 0, 0, this.W, this.H);
    this.drawClouds();
    this.drawWaves();
    this.drawWarnings();
    this.drawForecasts();
    this.drawRipples();
    this.drawFoam();
    this.drawShip();
    this.drawCapsules();
    this.drawDebris();
    this.drawParticles();
    this.drawBursts();
    this.drawChips();
    this.drawGhostHand();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawClouds() {
    const { ctx } = this;
    const pattern = this.hullPattern;
    for (const cloud of this.clouds) {
      const span = this.W + 360;
      const x = ((((cloud.x - (this.now / 1000) * cloud.speed) % span) + span) % span) - 180;
      ctx.save();
      ctx.translate(x, cloud.y);
      ctx.scale(cloud.scale, cloud.scale);
      const shape = new Path2D();
      for (const [px, py, r] of cloud.puffs) {
        shape.moveTo(px + r, py);
        shape.arc(px, py, r, 0, Math.PI * 2);
      }
      shape.rect(-86, -6, 172, 14);
      ctx.fillStyle = INK.paper;
      ctx.fill(shape);
      ctx.save();
      ctx.clip(shape);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = pattern;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-100, 0, 200, 20);
      ctx.restore();
      ctx.strokeStyle = "rgba(41, 41, 41, 0.75)";
      ctx.lineWidth = 1.4 / cloud.scale;
      for (const [px, py, r] of cloud.puffs) {
        ctx.beginPath();
        ctx.arc(px, py, r, Math.PI * 0.95, Math.PI * 2.05);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-86, 8);
      ctx.lineTo(86, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawWaves() {
    const { ctx, W, H } = this;
    const horizon = this.horizonY;
    const t = this.options.reducedMotion ? 0 : this.now / 1000;
    ctx.save();
    ctx.lineCap = "round";
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const f = Math.pow((r + 0.6) / rows, 1.35);
      const y = horizon + (H - horizon) * f;
      const gap = 50 + f * 140;
      const width = gap * 0.42;
      const speed = 6 + f * 26;
      const offset = ((t * speed + r * 37) % gap) - gap;
      ctx.strokeStyle = `rgba(247, 248, 246, ${(0.45 + f * 0.4).toFixed(3)})`;
      ctx.lineWidth = 1 + f * 2.4;
      ctx.beginPath();
      for (let x = offset; x < W + gap; x += gap) {
        const lift = Math.sin(x * 0.013 + r) * f * 3;
        ctx.moveTo(x, y + lift);
        ctx.quadraticCurveTo(x + width / 2, y + lift - 2 - f * 5, x + width, y + lift);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawForecasts() {
    if (this.phase !== "play") return;
    const { ctx } = this;
    const next = this.nextFalling();
    const gap = clamp(this.H * 0.03, 16, 34);
    const dotR = clamp(this.H * 0.0048, 3, 6.5);
    const flow = this.options.reducedMotion ? 0 : ((this.now / 1000) * gap * 1.6) % gap;
    for (const c of this.drops) {
      if (c.state !== "falling" || c.plan.kind !== "capsule") continue;
      const local = c.local;
      const primary = c === next;
      const alpha = (primary ? 1 : 0.4) * smooth(local / 0.35);
      const end = c.plan.path.duration;
      const points: Point[] = [];
      for (let s = local; s <= end; s += 0.01) points.push(this.pointAt(c, s));
      points.push(this.pointAt(c, end));
      let travelled = 0;
      let mark = gap * 1.2 + flow;
      const dots: Point[] = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        while (travelled + seg >= mark) {
          const k = (mark - travelled) / (seg || 1);
          dots.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
          mark += gap;
        }
        travelled += seg;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      for (const d of dots) {
        if (d.y > this.waterY - dotR * 2) continue;
        ctx.fillStyle = INK.paper;
        ctx.beginPath();
        ctx.arc(d.x, d.y, dotR + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK.orange;
        ctx.beginPath();
        ctx.arc(d.x, d.y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const land = this.landingPoint(c);
      const aligned = Math.abs(this.ship.x - land.x) <= this.geometry.catchHalf;
      const rx = clamp(this.H * 0.055, 28, 66);
      const pulse = this.options.reducedMotion ? 0 : (this.now / 900) % 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(land.x, land.y + 4);
      ctx.save();
      ctx.scale(1, 0.34);
      ctx.strokeStyle = INK.paper;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = aligned ? INK.orange : "rgba(247,248,246,0.55)";
      ctx.fill();
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.globalAlpha = alpha * (1 - pulse);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rx * (1 + pulse * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (!aligned) {
        const x = rx * 0.32;
        const y = x * 0.5;
        ctx.lineCap = "round";
        ctx.strokeStyle = INK.paper;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-x, -y);
        ctx.lineTo(x, y);
        ctx.moveTo(x, -y);
        ctx.lineTo(-x, y);
        ctx.stroke();
        ctx.strokeStyle = INK.orange;
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
      ctx.restore();

      if (c.plan.id < 2 && primary && !aligned) {
        const size = clamp(this.H * 0.036, 20, 40);
        const leftSide = land.x > this.W * 0.7;
        const tx = leftSide ? land.x - rx - 18 : land.x + rx + 18;
        const ty = land.y - this.H * 0.085;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `600 ${size}px ${this.options.fonts.hand}`;
        const w = ctx.measureText("cai aqui").width;
        ctx.translate(leftSide ? tx - w : tx, ty);
        ctx.rotate(-0.06);
        ctx.fillStyle = "rgba(247, 248, 246, 0.92)";
        ctx.fillRect(-8, -size * 0.62, w + 16, size * 1.2);
        ctx.fillStyle = INK.black;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("cai aqui", 0, 0);
        ctx.restore();
      }
    }
  }

  private drawRipples() {
    const { ctx } = this;
    for (const r of this.ripples) {
      const age = (this.now - r.born) / 1000 / r.max;
      if (age < 0) continue;
      ctx.save();
      ctx.translate(r.x, this.waterY + 3);
      ctx.scale(1, 0.3);
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = r.width;
      ctx.beginPath();
      ctx.arc(0, 0, r.size * (0.4 + age * 3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const c of this.drops) {
      if (c.state !== "missed") continue;
      const age = this.time - c.resolvedAt;
      if (age > 2.4) continue;
      const fade = 1 - smooth((age - 1.6) / 0.8);
      const sink = smooth((age - 1.2) / 1.2) * this.H * 0.03;
      const bob = Math.sin(this.now / 300 + c.plan.id) * 2;
      ctx.save();
      ctx.globalAlpha = fade;
      this.drawCapsule({ x: c.x, y: this.waterY + 6 + bob + sink }, Math.PI / 2 + 0.5, this.capsuleScale * 0.85, true);
      ctx.restore();
    }
  }

  private drawFoam() {
    const { ctx } = this;
    const half = this.geometry.shipLength * 0.5;
    for (const f of this.foams) {
      const k = (this.now - f.born) / 900;
      const e = 1 - Math.pow(1 - k, 2);
      const x = f.x + f.dir * (half * 0.95 + e * half * 0.75);
      const y = this.waterY + 4;
      const len = half * (0.45 + 0.2 * (1 - k));
      const lift = this.H * 0.012 * (1 - k);
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.lineCap = "round";
      for (const [dy, scaleLen] of [
        [0, 1],
        [this.H * 0.009, 0.7],
      ]) {
        ctx.strokeStyle = INK.blue;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(x - f.dir * len * scaleLen, y + dy);
        ctx.quadraticCurveTo(x - f.dir * len * scaleLen * 0.35, y + dy - lift, x, y + dy);
        ctx.stroke();
        ctx.strokeStyle = INK.paper;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawShip() {
    const { ctx } = this;
    const s = this.shipScale;
    const ship = this.ship;
    const tilt = clamp(-ship.v / (this.W * 2.2), -0.09, 0.09) + (this.options.reducedMotion ? 0 : Math.sin(this.now / 900) * 0.012);
    const x = ship.x;
    const y = this.waterY + this.bob() + this.dip + 2 * s;
    const next = this.nextFalling();
    const aligned = this.phase === "play" && next !== null && Math.abs(ship.x - this.landingPoint(next).x) <= this.geometry.catchHalf;
    const sinceRescue = (this.now - this.rescueAt) / 1000;
    const misregister = sinceRescue < 0.22 && !this.options.reducedMotion ? 1 - sinceRescue / 0.22 : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(s, s);

    ctx.fillStyle = "rgba(16, 1, 227, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 64, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const hull = new Path2D(SHIP_HULL);
    const deck = new Path2D(SHIP_DECK);
    if (misregister > 0) {
      ctx.save();
      ctx.translate(3.2 * misregister, -2.4 * misregister);
      ctx.globalAlpha = 0.85 * misregister;
      ctx.fillStyle = INK.orange;
      ctx.fill(hull);
      ctx.fill(deck);
      ctx.restore();
    }

    ctx.fillStyle = INK.paper;
    ctx.fill(hull);
    ctx.save();
    ctx.clip(hull);
    ctx.globalCompositeOperation = "multiply";
    ctx.scale(1 / s, 1 / s);
    ctx.fillStyle = this.hullPattern;
    ctx.fillRect(-70 * s, -20 * s, 140 * s, 22 * s);
    ctx.restore();
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 2.6;
    ctx.stroke(new Path2D(SHIP_STRIPE));

    ctx.fillStyle = INK.paper;
    ctx.fill(deck);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgba(41, 41, 41, 0.12)";
    ctx.fill(deck);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = INK.blue;
    for (let i = 0; i < 5; i++) ctx.fillRect(18.5 + i * 4.3, -16.5, 2.4, 2.4);
    ctx.fillRect(24.5, -25.2, 11, 2.6);
    ctx.save();
    const wave = this.options.reducedMotion ? 0 : Math.sin(this.now / 70) * Math.max(0, 1 - sinceRescue / 0.6) * 0.5;
    ctx.translate(30, -45);
    ctx.rotate(wave);
    ctx.translate(-30, 45);
    ctx.fillStyle = INK.orange;
    ctx.fill(new Path2D(SHIP_FLAG));
    ctx.restore();

    for (const scorch of this.scorches) {
      const age = (this.now - scorch.at) / 1000;
      const grow = 0.5 + 0.5 * smooth(age / 0.25);
      ctx.save();
      ctx.clip(hull);
      ctx.translate(scorch.ux, -3.4);
      ctx.scale(0.36 * grow, 0.3 * grow);
      ctx.rotate(scorch.ux);
      ctx.fillStyle = INK.black;
      ctx.fill(this.debrisShape());
      ctx.restore();
      const glow = this.options.reducedMotion ? 0.8 : 0.55 + 0.45 * Math.sin(this.now / 160 + scorch.ux);
      ctx.fillStyle = `rgba(238, 112, 76, ${glow.toFixed(3)})`;
      for (const [dx, dy] of [
        [-1.6, -4.4],
        [1.8, -2.6],
      ]) {
        ctx.beginPath();
        ctx.arc(scorch.ux + dx, dy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const flash = this.now - this.hitAt < 600 ? 1 - (this.now - this.hitAt) / 600 : 0;
    if (flash > 0 && Math.floor((this.now - this.hitAt) / 90) % 2 === 0) {
      ctx.fillStyle = `rgba(238, 112, 76, ${(0.75 * flash).toFixed(3)})`;
      ctx.fill(hull);
      ctx.fill(deck);
    }

    ctx.strokeStyle = INK.black;
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.5 / s;
    ctx.stroke(hull);
    ctx.stroke(deck);
    ctx.stroke(new Path2D(SHIP_LINES));

    if (aligned) {
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 3 / s;
      ctx.beginPath();
      ctx.moveTo(SHIP_CARGO_FROM - 4, SHIP_DECK_Y - 1);
      ctx.lineTo(SHIP_CARGO_TO + 8, SHIP_DECK_Y - 1);
      ctx.stroke();
    }
    ctx.restore();

    for (const c of this.drops) {
      if (c.state !== "rescued") continue;
      const age = this.time - c.resolvedAt;
      const slot = this.slotPoint(c.slot);
      const k = smooth(age / 0.38);
      const hop = Math.sin(k * Math.PI) * this.H * 0.05;
      const px = c.x + (slot.x - c.x) * k;
      const py = c.y + (slot.y - c.y) * k - hop;
      const scale = this.capsuleScale + (s * 0.17 - this.capsuleScale) * k;
      this.drawCapsule({ x: px, y: py }, Math.PI / 2 + tilt, scale, false);
      if (age < 0.9) this.drawLooseChute(c, age);
    }
  }

  private drawLooseChute(c: RoundDrop, age: number) {
    const { ctx } = this;
    const k = age / 0.9;
    const scale = this.capsuleScale * (1 - k * 0.5);
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.translate(c.x + k * this.H * 0.08, c.y - this.H * 0.09 - k * this.H * 0.05);
    ctx.rotate(0.4 * k);
    ctx.scale(scale, scale * (1 - k * 0.6));
    this.chuteShape(1);
    ctx.restore();
  }

  private chuteShape(open: number) {
    const { ctx } = this;
    const radius = CHUTE_CANOPY_RADIUS * (0.12 + 0.88 * open);
    const top = -78;
    ctx.strokeStyle = "rgba(41, 41, 41, 0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const f of [-1, -0.5, 0, 0.5, 1]) {
      ctx.moveTo(0, -46);
      ctx.lineTo(f * radius * 0.96, top + 2);
    }
    ctx.stroke();
    const gores = 8;
    for (let g = 0; g < gores; g++) {
      const a0 = Math.PI + (g / gores) * Math.PI;
      const a1 = Math.PI + ((g + 1) / gores) * Math.PI;
      ctx.fillStyle = g % 2 === 0 ? INK.orange : INK.paper;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.ellipse(0, top, radius, radius * 0.72, 0, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, top, radius, radius * 0.72, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = "rgba(41, 41, 41, 0.5)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let g = 1; g < gores; g++) {
      const a = Math.PI + (g / gores) * Math.PI;
      ctx.moveTo(0, top);
      ctx.lineTo(Math.cos(a) * radius, top + Math.sin(a) * radius * 0.72);
    }
    ctx.stroke();
  }

  private drawCapsules() {
    if (this.phase !== "play") return;
    const { ctx } = this;
    for (const c of this.drops) {
      if (c.state !== "falling" || c.plan.kind !== "capsule") continue;
      const local = c.local;
      const p = { x: c.x, y: c.y };
      const open = chuteOpening(local, c.plan.spec.openAt);
      const tumble = (1 - open) * Math.sin(local * 11 + c.plan.id) * 0.32;
      const swing = this.options.reducedMotion ? 0 : open * Math.sin(this.now / 520 + c.plan.id * 1.7) * 0.07;
      const scale = this.capsuleScale;
      if (open > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(swing);
        ctx.scale(scale, scale);
        this.chuteShape(inflate(open));
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(tumble);
        ctx.scale(scale, scale);
        ctx.fillStyle = INK.orange;
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-4, -56, 8, 9);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      this.drawCapsule(p, Math.PI / 2 + tumble + swing, scale, false);
    }
  }

  private drawWarnings() {
    if (this.phase !== "play") return;
    const { ctx } = this;
    for (const c of this.drops) {
      if (c.state !== "falling" || c.plan.kind !== "debris") continue;
      const k = clamp(c.local / c.plan.path.duration, 0, 1);
      const land = this.landingPoint(c);
      const rx = clamp(this.H * 0.055, 28, 66) * (0.55 + 0.6 * k);
      const blink = this.options.reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(this.now / (110 - k * 60));
      const danger = Math.abs(this.ship.x - land.x) <= this.geometry.hitHalf;
      ctx.save();
      ctx.translate(land.x, land.y + 4);
      ctx.scale(1, 0.32);
      ctx.fillStyle = `rgba(41, 41, 41, ${(0.18 + 0.32 * k).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([7, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = danger ? `rgba(238, 112, 76, ${blink.toFixed(3)})` : `rgba(41, 41, 41, ${(0.6 * blink).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, rx * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (danger) {
        const size = clamp(this.H * 0.045, 24, 52);
        ctx.save();
        ctx.globalAlpha = blink;
        ctx.font = `700 ${size}px ${this.options.fonts.display}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 6;
        ctx.strokeStyle = INK.paper;
        ctx.lineJoin = "round";
        ctx.strokeText("!", land.x, land.y - this.H * 0.055);
        ctx.fillStyle = INK.orange;
        ctx.fillText("!", land.x, land.y - this.H * 0.055);
        ctx.restore();
      }
    }
  }

  private debrisShape() {
    const shape = new Path2D();
    const pts = [
      [-15, -9],
      [-4, -15],
      [3, -10],
      [13, -13],
      [16, -1],
      [10, 4],
      [14, 12],
      [1, 15],
      [-6, 9],
      [-15, 11],
      [-12, 1],
    ];
    pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    return shape;
  }

  private drawDebris() {
    if (this.phase !== "play") return;
    const { ctx } = this;
    const scale = this.debrisScale;
    const shape = this.debrisShape();
    for (const c of this.drops) {
      if (c.state !== "falling" || c.plan.kind !== "debris") continue;
      const local = c.local;
      const spin = local * (4 + (c.plan.id % 3)) * (c.plan.id % 2 ? 1 : -1);
      const flicker = this.options.reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(this.now / 40 + c.plan.id);
      ctx.save();
      ctx.translate(c.x, c.y - 16 * scale);
      ctx.scale(scale, scale);
      ctx.fillStyle = INK.orange;
      ctx.beginPath();
      ctx.moveTo(-13, -4);
      ctx.quadraticCurveTo(-10, -34 * flicker, 0, -52 * flicker);
      ctx.quadraticCurveTo(10, -34 * flicker, 13, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 226, 190, 0.95)";
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.quadraticCurveTo(-4, -22 * flicker, 0, -30 * flicker);
      ctx.quadraticCurveTo(4, -22 * flicker, 6, -6);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(spin);
      ctx.fillStyle = INK.black;
      ctx.fill(shape);
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = 2;
      ctx.stroke(shape);
      ctx.fillStyle = "rgba(247, 248, 246, 0.6)";
      for (const [x, y] of [
        [-7, -4],
        [5, -6],
        [2, 6],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawCapsule(pos: Point, dir: number, scale: number, wet: boolean) {
    const { ctx } = this;
    if (!PATH_BODY) return;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(dir);
    ctx.scale(scale, scale);
    ctx.translate(-3, 0);
    ctx.fillStyle = INK.black;
    ctx.fill(PATH_BODY);
    ctx.strokeStyle = "rgba(247, 248, 246, 0.32)";
    ctx.lineWidth = 0.9;
    ctx.stroke(new Path2D(CAPSULE_RIBS));
    ctx.fillStyle = INK.blue;
    ctx.fill(new Path2D(CAPSULE_WINDOW));
    ctx.fillStyle = "#5a5a5a";
    ctx.fill(new Path2D(CAPSULE_SHIELD));
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.2;
    ctx.stroke(PATH_BODY);
    ctx.fillStyle = "rgba(16, 1, 227, 0.55)";
    ctx.beginPath();
    ctx.ellipse(-20, -9.5, 7, 1.3, -0.28, 0, Math.PI * 2);
    ctx.fill();
    if (wet) {
      ctx.fillStyle = "rgba(16, 1, 227, 0.35)";
      ctx.fillRect(-6, -18, 12, 36);
    }
    ctx.restore();
  }

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      if (p.life < 0) continue;
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, Math.PI * 2);
      ctx.fill();
      if (p.ring || p.color === INK.paper) {
        ctx.strokeStyle = "rgba(16, 1, 227, 0.6)";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawBursts() {
    const { ctx } = this;
    for (const b of this.bursts) {
      const k = (this.now - b.born) / 420;
      const grow = 0.6 + 0.6 * Math.min(1, k * 3);
      const r = this.geometry.shipLength * 0.13 * grow;
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.5) / 0.5);
      ctx.translate(b.x, b.y);
      ctx.rotate(k * 0.4);
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rr = i % 2 ? r * 0.5 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8);
      }
      ctx.closePath();
      ctx.fillStyle = INK.orange;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK.black;
      ctx.stroke();
      ctx.fillStyle = INK.paper;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawChips() {
    const { ctx } = this;
    for (const c of this.chips) {
      const age = (this.now - c.born) / 1000;
      const k = age / 0.8;
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.42 : 1.12 - Math.min(0.12, (age - 0.12) * 0.8);
      const size = clamp(this.H * 0.042, 22, 50);
      const text = "+1";
      const extra = c.streak >= 3 ? `×${c.streak}` : "";
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.65) / 0.35);
      ctx.translate(c.x, c.y - smooth(k) * this.H * 0.035);
      ctx.scale(pop, pop);
      ctx.font = `700 ${size}px ${this.options.fonts.display}`;
      const w1 = ctx.measureText(text).width;
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
      ctx.fillText(text, -w / 2 + size * 0.35, size * 0.04);
      if (extra) {
        ctx.font = `600 ${size * 0.62}px ${this.options.fonts.mono}`;
        ctx.fillStyle = INK.blue;
        ctx.fillText(extra, -w / 2 + size * 0.35 + w1 + size * 0.3, size * 0.06);
      }
      ctx.restore();
    }
  }

  private drawGhostHand() {
    if (this.phase !== "play") return;
    const next = this.nextFalling();
    if (!next) return;
    const land = this.landingPoint(next);
    if (Math.abs(this.ship.x - land.x) <= this.geometry.catchHalf * 0.6) return;
    const idle = (this.now - this.lastInput) / 1000;
    const wait = this.interacted ? 3.2 : 0.9;
    if (idle < wait) return;
    const cycle = 2.2;
    const k = ((idle - wait) % cycle) / cycle;
    const move = smooth((k - 0.15) / 0.55);
    const alpha = k < 0.1 ? k / 0.1 : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
    const press = k > 0.1 && k < 0.75 ? 1 : 0;
    const x = this.ship.x + (land.x - this.ship.x) * move;
    const y = this.waterY + this.H * 0.08;
    const scale = clamp(this.H * 0.0014, 0.8, 1.6);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (press) {
      ctx.fillStyle = "rgba(238, 112, 76, 0.3)";
      ctx.beginPath();
      ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(x + 2 * scale, y + (4 - press * 3) * scale);
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
