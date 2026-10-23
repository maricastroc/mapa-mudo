import { HAND, HAND_CUFF } from "../johnson/sprites.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { Sfx } from "../sound.ts";
import { drawFrog, REST_POSE, type FramePose, type Look } from "./frogArt.ts";
import { frogLayout, frogSpot, hitCenter, hitScore, inside, mixRect, type FrogLayout, type FrogSpot, type Rect } from "./frogLayout.ts";
import { onScreen } from "./frogMotion.ts";
import { CHANCES, SPECIES_COUNT, type FrogPlan } from "./frogPlan.ts";
import { FrogRound, type EndReason, type FrogEvent, type RoundFrog } from "./frogRound.ts";
import { drawDrift, drifts, frontLeaves, paintForest, type Drift, type FrontLeaf } from "./forest.ts";

export type FrogPhase = "idle" | "play" | "done";

export type FrogSnapshot = {
  phase: FrogPhase;
  registered: number;
  wrong: number;
  chances: number;
  escaped: number;
  passed: number;
  bestStreak: number;
  ended: EndReason | null;
  newOut: boolean;
  seenOut: boolean;
  lookalikeOut: boolean;
  catalogOpen: boolean;
  seed: number | null;
};

export type FrogOptions = {
  fonts: Fonts;
  reducedMotion: boolean;
  sfx: Sfx;
  onChange: (snapshot: FrogSnapshot) => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; angle: number; spin: number };
type Ring = { x: number; y: number; born: number; max: number; color: string; from: number; to: number; width: number };
type Chip = { x: number; y: number; born: number; text: string; tone: "new" | "already" };
type Scribble = { x: number; y: number; born: number; text: string };
type Flight = { species: number; look: Look; from: { x: number; y: number }; size: number; facing: 1 | -1; born: number };
type Link = { frog: RoundFrog; species: number; born: number };
type CellFlash = { kind: "new" | "already" | "missed"; at: number };

const FLIGHT = 0.62;
const INK_IN = 0.4;
const DONE_DELAY = 1.1;
const LINK = 1.1;
const LATENCY = 0.14;
const UNFOLD = 0.15;
const NUDGE = 3.2;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(t: number) {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

function easeOutBack(t: number) {
  const k = clamp(t, 0, 1);
  return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
}

function easeOutCubic(t: number) {
  const k = clamp(t, 0, 1);
  return 1 - Math.pow(1 - k, 3);
}

function pitchOf(build: Look["build"]) {
  return build === "toad" ? 0.72 : build === "tree" ? 1.3 : 1;
}

function letterSpacing(ctx: CanvasRenderingContext2D, value: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${value.toFixed(1)}px`;
}

export class FrogScene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private options: FrogOptions;
  private background: HTMLCanvasElement;
  private leaves: FrontLeaf[] = [];
  private drift: Drift[] = [];
  private layout: FrogLayout = frogLayout(1, 1);
  private W = 1;
  private H = 1;
  private dpr = 1;
  private frame = 0;
  private last = performance.now();
  private now = 0;
  private phase: FrogPhase = "idle";
  private round: FrogRound | null = null;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private chips: Chip[] = [];
  private scribbles: Scribble[] = [];
  private flights: Flight[] = [];
  private links: Link[] = [];
  private inked = new Map<number, number>();
  private flashes = new Map<number, CellFlash>();
  private tallies = new Map<number, number>();
  private catalogOpen = false;
  private openK = 0;
  private openedOnce = false;
  private tabBump = -Infinity;
  private tabFlash = -Infinity;
  private nudgeAt = -Infinity;
  private completeAt = 0;
  private celebrated = false;
  private endedAt = 0;
  private lastInput = -Infinity;
  private interacted = false;
  private lastCroak = -Infinity;
  private croaked = new Set<string>();
  private signature = "";
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: FrogOptions) {
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
    this.layout = frogLayout(this.W, this.H);
    this.background.width = this.canvas.width;
    this.background.height = this.canvas.height;
    const bg = this.background.getContext("2d");
    if (bg) {
      bg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      paintForest(bg, this.layout);
    }
    this.leaves = frontLeaves(this.layout, this.dpr);
    this.drift = this.options.reducedMotion ? [] : drifts(this.layout, this.layout.portrait ? 4 : 7);
  }

  start(plan: FrogPlan) {
    if (this.phase !== "idle") return;
    this.round = new FrogRound(plan);
    this.phase = "play";
    this.lastInput = this.now;
    this.emit();
  }

  private spot(frog: RoundFrog): FrogSpot {
    return frogSpot(this.layout, frog.plan, this.round!.motion(frog));
  }

  private frogAt(x: number, y: number) {
    const round = this.round;
    if (!round || this.phase !== "play") return -1;
    let best = -1;
    let bestScore = Infinity;
    round.frogs.forEach((frog, i) => {
      if (!round.tappable(frog)) return;
      const spot = this.spot(frog);
      if (spot.x < -spot.size * 0.3 || spot.x > this.W + spot.size * 0.3) return;
      if (this.hidden(spot)) return;
      const seen = frogSpot(this.layout, frog.plan, round.motion(frog, round.time - LATENCY));
      const score = Math.min(hitScore(spot, x, y), hitScore(seen, x, y)) - frog.plan.lane * 0.04;
      if (score <= 1 && score < bestScore) {
        best = i;
        bestScore = score;
      }
    });
    return best;
  }

  pointerOverTarget(x: number, y: number) {
    return (this.phase !== "idle" && this.onCatalog(x, y)) || this.frogAt(x, y) >= 0;
  }

  toggleCatalog() {
    if (this.phase === "idle") return;
    this.catalogOpen = !this.catalogOpen;
    if (this.catalogOpen) this.openedOnce = true;
    if (this.options.reducedMotion) this.openK = this.catalogOpen ? 1 : 0;
    this.options.sfx.page();
    this.emit();
  }

  private catalogRect() {
    return mixRect(this.layout.tab, this.layout.panel, easeOutCubic(this.openK));
  }

  private onCatalog(x: number, y: number) {
    return this.catalogOpen ? inside(this.layout.panel, x, y) : inside(this.layout.tab, x, y, 10);
  }

  private hidden(spot: FrogSpot) {
    if (this.openK < 0.3) return false;
    const c = hitCenter(spot);
    return inside(this.catalogRect(), c.x, c.y);
  }

  tapAt(x: number, y: number) {
    const round = this.round;
    if (!round || this.phase === "idle") return;
    if (this.onCatalog(x, y)) {
      this.lastInput = this.now;
      this.toggleCatalog();
      return;
    }
    if (this.phase !== "play" || round.ended) return;
    this.lastInput = this.now;
    this.interacted = true;
    const index = this.frogAt(x, y);
    if (index < 0) return;
    const spot = this.spot(round.frogs[index]);
    const event = round.tap(index);
    if (event) this.react(event, spot);
    if (round.ended) this.ended(round.ended);
  }

  private snapshot(): FrogSnapshot {
    const round = this.round;
    const visible = round ? round.frogs.filter((f) => f.status === "out" && onScreen(round.motion(f).u)) : [];
    return {
      phase: this.phase,
      registered: round?.registered ?? 0,
      wrong: round?.wrong ?? 0,
      chances: round?.chances ?? CHANCES,
      escaped: round?.escaped ?? 0,
      passed: round?.passed ?? 0,
      bestStreak: round?.bestStreak ?? 0,
      ended: round?.ended ?? null,
      newOut: !!round && visible.some((f) => round.isNew(f.plan.species)),
      seenOut: !!round && visible.some((f) => !round.isNew(f.plan.species)),
      lookalikeOut: !!round && visible.some((f) => f.plan.first && round.plan.species[f.plan.species].twin !== null && !round.isNew(round.plan.species[f.plan.species].twin!)),
      catalogOpen: this.catalogOpen,
      seed: round?.plan.seed ?? null,
    };
  }

  private emit() {
    const snapshot = this.snapshot();
    this.signature = JSON.stringify(snapshot);
    this.options.onChange(snapshot);
  }

  private emitIfChanged() {
    const snapshot = this.snapshot();
    const signature = JSON.stringify(snapshot);
    if (signature === this.signature) return;
    this.signature = signature;
    this.options.onChange(snapshot);
  }

  private noteTarget(species: number) {
    const cell = this.layout.cells[species];
    const { tab } = this.layout;
    const k = easeOutCubic(this.openK);
    const icon = { x: tab.x + tab.h * 0.62, y: tab.y + tab.h * 0.8, size: tab.h * 0.6 };
    const lerp = (a: number, b: number) => a + (b - a) * k;
    return {
      x: lerp(icon.x, cell.x + cell.w * 0.5),
      y: lerp(icon.y, cell.y + cell.h * 0.9),
      size: lerp(icon.size, this.cellFrogSize(cell)),
      center: { x: lerp(icon.x, cell.x + cell.w / 2), y: lerp(tab.y + tab.h / 2, cell.y + cell.h * 0.58) },
    };
  }

  private cellFrogSize(cell: Rect) {
    return Math.min(cell.w * 0.66, cell.h * 0.98);
  }

  private react(event: FrogEvent, at?: FrogSpot) {
    const { sfx } = this.options;
    const round = this.round;
    if (!round) return;
    if (event.type === "registered" && at) {
      const center = hitCenter(at);
      const species = event.frog.plan.species;
      sfx.noted(round.streak, pitchOf(round.plan.species[species].build));
      this.lastCroak = this.now;
      this.flights.push({ species, look: round.plan.species[species], from: { x: at.x, y: at.y }, size: at.size, facing: at.facing, born: this.now });
      this.rings.push({ x: center.x, y: center.y, born: this.now, max: 0.5, color: INK.orange, from: at.size * 0.4, to: at.size * 1.3, width: 5 });
      this.rings.push({ x: center.x, y: center.y, born: this.now + 80, max: 0.5, color: INK.blue, from: at.size * 0.3, to: at.size, width: 2 });
      this.chips.push({ x: center.x, y: center.y - at.size * 0.7, born: this.now, text: "Novo!", tone: "new" });
      this.flashes.set(species, { kind: "new", at: this.now });
      this.burst(center.x, center.y, at.size, 12);
      if (event.complete) this.completeAt = this.now + FLIGHT * 1000 + 250;
      this.emit();
      return;
    }
    if (event.type === "already" && at) {
      const center = hitCenter(at);
      sfx.thud();
      sfx.boing();
      this.chips.push({ x: center.x, y: center.y - at.size * 0.7, born: this.now, text: "Já catalogado!", tone: "already" });
      this.links.push({ frog: event.frog, species: event.frog.plan.species, born: this.now });
      this.flashes.set(event.frog.plan.species, { kind: "already", at: this.now });
      this.tabFlash = this.now;
      this.emit();
      return;
    }
    if (event.type === "escaped") {
      const spot = frogSpot(this.layout, event.frog.plan, round.motion(event.frog, round.time - 0.25));
      const x = clamp(spot.x, this.W * 0.07, this.W * 0.93);
      this.scribbles.push({ x, y: spot.ground - spot.size * 0.9, born: this.now, text: "escapou!" });
      this.flashes.set(event.frog.plan.species, { kind: "missed", at: this.now });
      sfx.fizz();
      this.emit();
      return;
    }
    if (event.type === "passed") {
      this.tallies.set(event.frog.plan.species, this.now);
      sfx.tally();
      this.emit();
      return;
    }
    if (event.type === "end") this.ended(event.reason);
  }

  private ended(reason: EndReason) {
    if (this.endedAt) return;
    this.endedAt = this.now;
    if (reason === "complete" && !this.catalogOpen) this.nudgeAt = -Infinity;
    this.emit();
  }

  private burst(x: number, y: number, size: number, count: number) {
    if (this.options.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const v = size * (2.4 + Math.random() * 2);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - size,
        life: 0,
        max: 0.55 + Math.random() * 0.25,
        size: size * (0.07 + Math.random() * 0.05),
        color: i % 3 === 0 ? INK.blue : INK.orange,
        angle: a,
        spin: (Math.random() - 0.5) * 10,
      });
    }
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
      if (round.ended && !this.endedAt) this.ended(round.ended);
      this.croaks(round);
      const wait = round.ended === "complete" ? Math.max(DONE_DELAY, (this.completeAt - this.endedAt) / 1000 + 1.3) : DONE_DELAY;
      if (round.settled && this.flights.length === 0 && (this.now - this.endedAt) / 1000 > wait) {
        this.phase = "done";
        if (!this.celebrated) this.options.sfx.finish(round.registered >= SPECIES_COUNT ? 10 : 6);
        this.emit();
      } else {
        this.emitIfChanged();
      }
    }

    const goal = this.catalogOpen ? 1 : 0;
    this.openK = goal > this.openK ? Math.min(goal, this.openK + dt / UNFOLD) : Math.max(goal, this.openK - dt / UNFOLD);

    const landed = this.flights.filter((f) => (this.now - f.born) / 1000 >= FLIGHT);
    for (const flight of landed) {
      this.inked.set(flight.species, this.now);
      this.options.sfx.scratch();
      if (this.openK > 0.5) {
        const cell = this.layout.cells[flight.species];
        this.rings.push({ x: cell.x + cell.w / 2, y: cell.y + cell.h / 2, born: this.now, max: 0.5, color: INK.orange, from: cell.w * 0.3, to: cell.w * 0.75, width: 3 });
      } else {
        const { tab } = this.layout;
        this.tabBump = this.now;
        this.rings.push({ x: tab.x + tab.w / 2, y: tab.y + tab.h / 2, born: this.now, max: 0.5, color: INK.orange, from: tab.h * 0.6, to: tab.w * 0.8, width: 3 });
        if (!this.openedOnce && this.nudgeAt < 0) this.nudgeAt = this.now;
      }
    }
    this.flights = this.flights.filter((f) => (this.now - f.born) / 1000 < FLIGHT);

    if (this.completeAt && !this.celebrated && this.now >= this.completeAt) {
      this.celebrated = true;
      const box = this.catalogRect();
      for (let k = 0; k < 4; k++) {
        this.rings.push({ x: box.x + box.w / 2, y: box.y + box.h / 2, born: this.now + k * 160, max: 1, color: k % 2 ? INK.blue : INK.orange, from: box.w * 0.3, to: Math.max(box.w, box.h) * 0.8, width: 4 });
      }
      this.burst(box.x + box.w / 2, box.y + box.h * 0.6, Math.max(box.w * 0.25, 60), 22);
      this.options.sfx.finish(10);
    }

    for (const d of this.drift) {
      d.x += (d.vx + Math.sin(this.now / 900 + d.angle) * this.H * 0.01) * dt;
      d.y += d.vy * dt;
      d.angle += d.spin * dt;
      if (d.y > this.layout.lanes[0].y) {
        d.y = -this.H * 0.03;
        d.x = Math.random() * this.W;
      }
    }

    for (const p of this.particles) {
      p.life += dt;
      p.vy += this.H * 1.4 * dt;
      p.vx *= 1 - dt * 1.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.rings = this.rings.filter((r) => (this.now - r.born) / 1000 < r.max);
    this.chips = this.chips.filter((c) => this.now - c.born < 950);
    this.scribbles = this.scribbles.filter((s) => this.now - s.born < 1300);
    this.links = this.links.filter((l) => (this.now - l.born) / 1000 < LINK);
  }

  private croaks(round: FrogRound) {
    for (const frog of round.frogs) {
      if (frog.status !== "out") continue;
      const m = round.motion(frog);
      if (m.air || m.hop < 1 || (frog.plan.id + m.hop) % 3 !== 1 || m.settle < 0.1 || !onScreen(m.u)) continue;
      const key = `${frog.plan.id}:${m.hop}`;
      if (this.croaked.has(key)) continue;
      this.croaked.add(key);
      if (this.now - this.lastCroak < 2600) continue;
      this.lastCroak = this.now;
      this.options.sfx.croak(pitchOf(round.plan.species[frog.plan.species].build));
    }
  }

  private pose(frog: RoundFrog): FramePose {
    const m = this.round!.motion(frog);
    const seed = frog.plan.id * 7 + m.hop;
    const blink = !m.air && seed % 3 === 0 ? Math.max(0, 1 - Math.abs(m.settle - 0.45) / 0.08) : 0;
    const throat = !m.air && m.hop >= 1 && (frog.plan.id + m.hop) % 3 === 1 ? Math.pow(Math.sin(Math.PI * clamp((m.settle - 0.1) / 0.6, 0, 1)), 0.7) : 0;
    return { stretch: m.stretch, squash: m.squash, tilt: m.tilt, blink, throat };
  }

  private draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.background, 0, 0, this.W, this.H);
    const line = clamp(this.H * 0.0019, 1.2, 2.4);
    for (const d of this.drift) drawDrift(ctx, d, line);
    this.drawFrogs();
    this.drawLeaves();
    this.drawLinks();
    this.drawCatalog();
    this.drawNudge();
    this.drawFlights();
    this.drawRings();
    this.drawParticles();
    this.drawChips();
    this.drawScribbles();
    this.drawGhostHand();
    this.drawComplete();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawFrogs() {
    const round = this.round;
    if (!round) return;
    const { ctx } = this;
    const frogs = round.frogs.filter((f) => f.status === "out" || f.status === "fled").sort((a, b) => a.plan.lane - b.plan.lane || a.plan.id - b.plan.id);
    for (const frog of frogs) {
      const spot = this.spot(frog);
      if (spot.x < -spot.size * 1.5 || spot.x > this.W + spot.size * 1.5) continue;
      const m = round.motion(frog);
      ctx.save();
      ctx.globalAlpha = 0.2 * (1 - m.lift * 0.6);
      ctx.fillStyle = INK.black;
      ctx.beginPath();
      ctx.ellipse(spot.x + spot.facing * spot.size * 0.02, spot.ground + 1, spot.size * 0.5 * (1 - m.lift * 0.4), spot.size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const look = round.plan.species[frog.plan.species];
      drawFrog(ctx, look, this.pose(frog), { x: spot.x, y: spot.y, size: spot.size, facing: spot.facing, halo: clamp(spot.size * 0.035, 2, 4.5) });
      const startled = frog.startledAt !== null && this.links.some((l) => l.frog === frog);
      if (startled) this.drawStartle(spot);
    }
  }

  private drawStartle(spot: FrogSpot) {
    const { ctx } = this;
    const c = hitCenter(spot);
    ctx.save();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = clamp(spot.size * 0.03, 1.5, 3);
    ctx.lineCap = "round";
    for (const k of [-1, 0, 1]) {
      const x = c.x + k * spot.size * 0.22;
      const y = c.y - spot.size * 0.55 - (k === 0 ? spot.size * 0.08 : 0);
      ctx.beginPath();
      ctx.moveTo(x + k * spot.size * 0.03, y);
      ctx.lineTo(x + k * spot.size * 0.07, y - spot.size * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLeaves() {
    const { ctx } = this;
    for (const leaf of this.leaves) {
      const sway = this.options.reducedMotion ? 0 : Math.sin(this.now / 1300 + leaf.phase) * leaf.sway;
      const px = leaf.x + leaf.w * leaf.pivotX;
      const py = leaf.y + leaf.h * leaf.pivotY;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(sway);
      ctx.drawImage(leaf.image, -leaf.w * leaf.pivotX, -leaf.h * leaf.pivotY, leaf.w, leaf.h);
      ctx.restore();
    }
  }

  private drawLinks() {
    const round = this.round;
    if (!round) return;
    const { ctx } = this;
    for (const link of this.links) {
      const age = (this.now - link.born) / 1000;
      const spot = this.spot(link.frog);
      const from = hitCenter(spot);
      const to = this.noteTarget(link.species).center;
      const grow = smooth(age / 0.3);
      const fade = 1 - smooth((age - LINK + 0.3) / 0.3);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = INK.blue;
      ctx.lineWidth = clamp(this.H * 0.003, 2, 3.5);
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -this.now / 30;
      ctx.beginPath();
      const mx = (from.x + to.x) / 2;
      const my = Math.min(from.y, to.y) - this.H * 0.05;
      ctx.moveTo(from.x, from.y);
      const steps = 24;
      for (let i = 1; i <= steps * grow; i++) {
        const k = i / steps;
        const x = (1 - k) * (1 - k) * from.x + 2 * (1 - k) * k * mx + k * k * to.x;
        const y = (1 - k) * (1 - k) * from.y + 2 * (1 - k) * k * my + k * k * to.y;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFlights() {
    const { ctx } = this;
    for (const flight of this.flights) {
      const k = clamp((this.now - flight.born) / 1000 / FLIGHT, 0, 1);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const target = this.noteTarget(flight.species);
      const control = { x: (flight.from.x + target.x) / 2, y: Math.max(this.H * 0.06, Math.min(flight.from.y, target.y) - this.H * 0.12) };
      const x = (1 - e) * (1 - e) * flight.from.x + 2 * (1 - e) * e * control.x + e * e * target.x;
      const y = (1 - e) * (1 - e) * flight.from.y + 2 * (1 - e) * e * control.y + e * e * target.y;
      const size = flight.size + (target.size - flight.size) * e;
      const flip = flight.facing === 1 ? 1 : -Math.cos(Math.PI * e);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.abs(flip) < 0.04 ? 0.04 : flip, 1);
      drawFrog(ctx, flight.look, { stretch: Math.sin(Math.PI * e) * 0.8, squash: -0.2 * Math.sin(Math.PI * e), tilt: -0.3 * Math.sin(Math.PI * e), blink: 0, throat: e < 0.35 ? Math.sin((Math.PI * e) / 0.35) : 0 }, { x: 0, y: 0, size, facing: 1, halo: 3 });
      ctx.restore();
    }
  }

  private drawCatalog() {
    const k = easeOutCubic(this.openK);
    if (k < 0.999) this.drawTab(1 - k);
    if (k > 0.001) this.drawPanel(this.catalogRect());
  }

  private drawTab(alpha: number) {
    const { ctx } = this;
    const { tab } = this.layout;
    const { fonts } = this.options;
    const bumpAge = (this.now - this.tabBump) / 1000;
    const flashAge = (this.now - this.tabFlash) / 1000;
    const bump = bumpAge < 0.4 ? 1 + 0.16 * Math.sin((Math.PI * bumpAge) / 0.4) : 1;
    const shake = flashAge < 0.5 ? Math.sin(flashAge * 50) * (1 - flashAge / 0.5) * tab.h * 0.08 : 0;
    const alerted = flashAge < 0.9;
    const flashing = alerted && Math.floor(flashAge * 7) % 2 === 0;
    const h = tab.h;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(tab.x + tab.w / 2 + shake, tab.y + tab.h / 2);
    ctx.scale(bump, bump);
    ctx.translate(-tab.w / 2, -tab.h / 2);
    ctx.fillStyle = INK.blue;
    ctx.fillRect(5, 5, tab.w, h);
    ctx.fillStyle = flashing ? "#d9d6fb" : bumpAge < 0.4 ? "#fbe2d8" : "#f6f0e2";
    ctx.fillRect(0, 0, tab.w, h);
    ctx.strokeStyle = alerted ? INK.blue : INK.black;
    ctx.lineWidth = alerted ? 3 : 1.5;
    ctx.strokeRect(0, 0, tab.w, h);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = INK.black;
    for (let x = h * 0.25; x < tab.w - h * 0.15; x += h * 0.3) {
      ctx.beginPath();
      ctx.ellipse(x, 0, h * 0.06, h * 0.11, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.paper;
      ctx.fill();
      ctx.stroke();
    }
    const book = { x: h * 0.3, y: h * 0.24, w: h * 0.5, h: h * 0.6 };
    ctx.fillStyle = INK.blue;
    ctx.fillRect(book.x, book.y, book.w, book.h);
    ctx.fillStyle = INK.orange;
    ctx.fillRect(book.x + book.w * 0.22, book.y + book.h * 0.22, book.w * 0.62, book.h * 0.22);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(book.x, book.y, book.w, book.h);
    ctx.fillStyle = INK.paper;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(book.x, book.y + book.h * (0.16 + i * 0.23), h * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const count = String(this.inked.size);
    const size = h * 0.48;
    ctx.font = `700 ${size}px ${fonts.display}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const countW = ctx.measureText(count).width;
    ctx.fillStyle = INK.orange;
    ctx.fillText(count, h * 1.0, h * 0.56);
    ctx.fillStyle = INK.black;
    ctx.fillText(`/${SPECIES_COUNT}`, h * 1.0 + countW, h * 0.56);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = Math.max(1.6, h * 0.05);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const cx = tab.w - h * 0.36;
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.12, h * 0.48);
    ctx.lineTo(cx, h * 0.62);
    ctx.lineTo(cx + h * 0.12, h * 0.48);
    ctx.stroke();
    ctx.restore();
  }

  private drawPanel(rect: Rect) {
    const { ctx, layout } = this;
    const { panel: nb, header } = layout;
    const { fonts } = this.options;
    const line = clamp(this.H * 0.0016, 1, 2);
    ctx.save();
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.fillRect(rect.x - 6, rect.y + 10, rect.w + 2, rect.h + 6);
    ctx.fillStyle = INK.blue;
    ctx.fillRect(rect.x + 8, rect.y + 8, rect.w, rect.h);
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.fillStyle = "#f6f0e2";
    ctx.fillRect(nb.x, nb.y, nb.w, nb.h);
    ctx.strokeStyle = "rgba(16, 1, 227, 0.1)";
    ctx.lineWidth = 1;
    const grid = nb.w / 24;
    ctx.beginPath();
    for (let x = nb.x + grid; x < nb.x + nb.w; x += grid) {
      ctx.moveTo(x, nb.y + header * 0.8);
      ctx.lineTo(x, nb.y + nb.h);
    }
    for (let y = nb.y + header * 0.8; y < nb.y + nb.h; y += grid) {
      ctx.moveTo(nb.x, y);
      ctx.lineTo(nb.x + nb.w, y);
    }
    ctx.stroke();

    const ring = clamp(header * 0.11, 3, 7);
    ctx.strokeStyle = INK.black;
    for (let x = nb.x + ring * 3; x < nb.x + nb.w - ring * 2; x += ring * 3.4) {
      ctx.beginPath();
      ctx.ellipse(x, nb.y, ring * 0.7, ring * 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK.paper;
      ctx.fill();
      ctx.lineWidth = line;
      ctx.stroke();
    }

    const title = header * 0.5;
    ctx.fillStyle = INK.black;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `600 ${title}px ${fonts.hand}`;
    ctx.fillText("Caderno de campo", nb.x + header * 0.3, nb.y + header * 0.58);
    const close = { x: nb.x + nb.w - header * 0.5, y: nb.y + header * 0.55, r: header * 0.22 };
    ctx.beginPath();
    ctx.arc(close.x, close.y, close.r, 0, Math.PI * 2);
    ctx.fillStyle = INK.paper;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.lineWidth = Math.max(1.6, header * 0.045);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(close.x - close.r * 0.42, close.y - close.r * 0.42);
    ctx.lineTo(close.x + close.r * 0.42, close.y + close.r * 0.42);
    ctx.moveTo(close.x + close.r * 0.42, close.y - close.r * 0.42);
    ctx.lineTo(close.x - close.r * 0.42, close.y + close.r * 0.42);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.font = `700 ${title * 0.9}px ${fonts.display}`;
    const totalText = `/${SPECIES_COUNT}`;
    const totalW = ctx.measureText(totalText).width;
    const countRight = close.x - close.r - header * 0.25;
    ctx.fillStyle = INK.black;
    ctx.fillText(totalText, countRight, nb.y + header * 0.58);
    ctx.fillStyle = INK.orange;
    ctx.fillText(String(this.inked.size), countRight - totalW, nb.y + header * 0.58);
    ctx.strokeStyle = INK.pencil;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.moveTo(nb.x + header * 0.25, nb.y + header * 0.95);
    ctx.lineTo(nb.x + nb.w - header * 0.25, nb.y + header * 0.95);
    ctx.stroke();

    layout.cells.forEach((cell, i) => this.drawCell(cell, i, line));
    ctx.restore();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 1.3;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  private drawNudge() {
    const age = (this.now - this.nudgeAt) / 1000;
    if (age < 0 || age > NUDGE || this.openedOnce || this.catalogOpen) return;
    const { ctx } = this;
    const { tab } = this.layout;
    const size = clamp(tab.h * 0.5, 16, 30);
    const fade = smooth(age / 0.2) * (1 - smooth((age - NUDGE + 0.5) / 0.5));
    const bob = Math.sin(age * 6) * 3;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = `600 ${size}px ${this.options.fonts.hand}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const x = tab.x + tab.w;
    const y = tab.y + tab.h + size * 1.6 + bob;
    ctx.lineWidth = Math.max(5, size * 0.22);
    ctx.strokeStyle = INK.paper;
    ctx.lineJoin = "round";
    ctx.strokeText("toque para abrir", x, y);
    ctx.fillStyle = INK.pencil;
    ctx.fillText("toque para abrir", x, y);
    ctx.strokeStyle = INK.pencil;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    const ax = tab.x + tab.w * 0.62;
    ctx.beginPath();
    ctx.moveTo(ax, y - size * 0.6);
    ctx.quadraticCurveTo(ax + size * 0.4, y - size * 1.1, ax + size * 0.2, tab.y + tab.h + 6);
    ctx.moveTo(ax + size * 0.2 - 6, tab.y + tab.h + 13);
    ctx.lineTo(ax + size * 0.2, tab.y + tab.h + 6);
    ctx.lineTo(ax + size * 0.2 + 7, tab.y + tab.h + 11);
    ctx.stroke();
    ctx.restore();
  }

  private drawCell(cell: Rect, species: number, line: number) {
    const { ctx } = this;
    const { fonts } = this.options;
    const round = this.round;
    const look = round?.plan.species[species];
    const inkedAt = this.inked.get(species);
    const flash = this.flashes.get(species);
    const flashAge = flash ? (this.now - flash.at) / 1000 : Infinity;
    const inset = Math.max(3, cell.w * 0.04);
    const box = { x: cell.x + inset, y: cell.y + inset, w: cell.w - inset * 2, h: cell.h - inset * 2 };
    let shake = 0;
    if (flash?.kind === "already" && flashAge < 0.6) shake = Math.sin(flashAge * 50) * (1 - flashAge / 0.6) * cell.w * 0.03;
    ctx.save();
    ctx.translate(shake, 0);

    if (flash?.kind === "already" && flashAge < 1.1) {
      const on = Math.floor(flashAge * 7) % 2 === 0;
      ctx.fillStyle = on ? "rgba(16, 1, 227, 0.16)" : "rgba(16, 1, 227, 0.06)";
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = INK.blue;
      ctx.lineWidth = line * 2.4;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    }

    if (look && inkedAt !== undefined) {
      const k = clamp((this.now - inkedAt) / 1000 / INK_IN, 0, 1);
      if (k < 1) {
        ctx.fillStyle = `rgba(238, 112, 76, ${(0.25 * (1 - k)).toFixed(3)})`;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x - 2, box.y - 2, (box.w + 4) * smooth(k * 1.2), box.h + 4);
      ctx.clip();
      const size = this.cellFrogSize(cell);
      drawFrog(ctx, look, REST_POSE, { x: cell.x + cell.w * 0.5 - size * 0.04, y: cell.y + cell.h * 0.9, size, facing: 1 });
      ctx.restore();
      ctx.fillStyle = INK.pencil;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `600 ${clamp(cell.h * 0.2, 10, 20)}px ${fonts.hand}`;
      ctx.fillText(`nº ${species + 1}`, box.x + 3, box.y + 1);
      const tallyAt = this.tallies.get(species);
      const count = round?.sightings[species] ?? 0;
      if (count > 0) {
        const unit = clamp(cell.h * 0.13, 5, 11);
        ctx.strokeStyle = INK.pencil;
        ctx.lineWidth = line;
        for (let t = 0; t < Math.min(count, 5); t++) {
          const grow = t === count - 1 && tallyAt !== undefined ? smooth((this.now - tallyAt) / 250) : 1;
          const x = box.x + box.w - unit * 0.5 - (Math.min(count, 5) - 1 - t) * unit * 0.55;
          ctx.beginPath();
          ctx.moveTo(x, box.y + 3);
          ctx.lineTo(x - unit * 0.1, box.y + 3 + unit * 1.3 * grow);
          ctx.stroke();
        }
      }
      if (k >= 1) {
        const age = (this.now - inkedAt) / 1000 - INK_IN;
        const pop = age < 0.25 ? easeOutBack(age / 0.25) : 1;
        const r = clamp(cell.h * 0.12, 5, 11);
        ctx.save();
        ctx.translate(box.x + box.w - r * 1.1, box.y + box.h - r * 1.1);
        ctx.scale(pop, pop);
        ctx.fillStyle = INK.orange;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK.paper;
        ctx.lineWidth = Math.max(1.6, r * 0.28);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, 0);
        ctx.lineTo(-r * 0.1, r * 0.38);
        ctx.lineTo(r * 0.5, -r * 0.4);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      const missed = flash?.kind === "missed" && flashAge < 0.9;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = missed ? INK.orange : "rgba(85, 96, 107, 0.45)";
      ctx.lineWidth = missed ? line * 1.6 : line;
      ctx.strokeRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
      ctx.setLineDash([]);
      const wiggle = missed ? Math.sin(flashAge * 30) * 0.2 * (1 - flashAge / 0.9) : 0;
      ctx.save();
      ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
      ctx.rotate(wiggle);
      ctx.fillStyle = missed ? INK.orange : "rgba(85, 96, 107, 0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${clamp(cell.h * 0.42, 14, 40)}px ${fonts.hand}`;
      ctx.fillText("?", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawRings() {
    const { ctx } = this;
    for (const r of this.rings) {
      const age = (this.now - r.born) / 1000;
      if (age < 0) continue;
      const k = age / r.max;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.from + (r.to - r.from) * smooth(k), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = 1 - smooth((p.life / p.max - 0.6) / 0.4);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.quadraticCurveTo(0, -p.size * 0.6, p.size, 0);
      ctx.quadraticCurveTo(0, p.size * 0.6, -p.size, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawChips() {
    const { ctx } = this;
    const { fonts } = this.options;
    for (const c of this.chips) {
      const age = (this.now - c.born) / 1000;
      const k = age / 0.95;
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.42 : 1.12 - Math.min(0.12, (age - 0.12) * 0.8);
      const size = clamp(this.H * (c.tone === "new" ? 0.042 : 0.036), 18, 46);
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.7) / 0.3);
      const x = clamp(c.x, size * 4, this.W - size * 4);
      ctx.translate(x, Math.max(size, c.y - smooth(k) * this.H * 0.03));
      ctx.rotate(c.tone === "already" ? -0.04 : 0.02);
      ctx.scale(pop, pop);
      ctx.font = `700 ${size}px ${fonts.display}`;
      const w = ctx.measureText(c.text).width + size * 0.8;
      const h = size * 1.3;
      ctx.fillStyle = c.tone === "new" ? INK.black : INK.blue;
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
      ctx.fillStyle = INK.paper;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = c.tone === "new" ? INK.orange : INK.blue;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-w / 2 + 1.25, -h / 2 + 1.25, w - 2.5, h - 2.5);
      ctx.fillStyle = c.tone === "new" ? INK.orange : INK.blue;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.text, 0, size * 0.05);
      ctx.restore();
    }
  }

  private drawScribbles() {
    const { ctx } = this;
    for (const s of this.scribbles) {
      const age = (this.now - s.born) / 1000;
      if (age < 0) continue;
      const size = clamp(this.H * 0.038, 18, 42);
      ctx.save();
      ctx.globalAlpha = 1 - smooth((age - 0.9) / 0.4);
      ctx.translate(s.x, s.y - age * 10);
      ctx.rotate(-0.06);
      ctx.font = `600 ${size}px ${this.options.fonts.hand}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(5, size * 0.22);
      ctx.strokeStyle = INK.paper;
      ctx.lineJoin = "round";
      ctx.strokeText(s.text, 0, 0);
      ctx.fillStyle = INK.pencil;
      ctx.fillText(s.text, 0, 0);
      ctx.restore();
    }
  }

  private drawGhostHand() {
    const round = this.round;
    if (this.phase !== "play" || !round || round.ended) return;
    const idle = (this.now - this.lastInput) / 1000;
    const wait = this.interacted ? 6 : 0.4;
    if (idle < wait) return;
    const target = round.frogs.find((f) => {
      if (!round.tappable(f) || !round.isNew(f.plan.species) || this.hidden(this.spot(f))) return false;
      const m = round.motion(f);
      return !m.air && m.u > 0.15 && m.u < 0.85;
    });
    if (!target) return;
    const spot = this.spot(target);
    const center = hitCenter(spot);
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
      ctx.arc(center.x, center.y, spot.size * 0.5, 0, Math.PI * 2);
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

  private drawComplete() {
    if (!this.completeAt || this.now < this.completeAt) return;
    const { ctx } = this;
    const { panel, tab } = this.layout;
    const open = this.openK > 0.5;
    const age = (this.now - this.completeAt) / 1000;
    const k = this.options.reducedMotion ? 1 : clamp(age / 0.35, 0, 1);
    const scale = 1.5 - 0.5 * easeOutBack(k);
    const size = open ? clamp(panel.w * 0.075, 16, 40) : clamp(this.H * 0.032, 15, 32);
    ctx.save();
    ctx.font = `700 ${size}px ${this.options.fonts.display}`;
    letterSpacing(ctx, size * 0.06);
    const text = "CATÁLOGO COMPLETO!";
    const w = ctx.measureText(text).width + size * 1.2;
    const anchor = open ? { x: panel.x + panel.w / 2, y: panel.y + panel.h * 0.5 } : { x: Math.min(tab.x + tab.w / 2, this.W - this.layout.margin - w / 2), y: tab.y + tab.h + size * 1.8 };
    ctx.globalAlpha = k;
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(-0.07);
    ctx.scale(scale, scale);
    const h = size * 1.7;
    ctx.fillStyle = "rgba(41, 41, 41, 0.85)";
    ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 4;
    ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    ctx.fillStyle = INK.orange;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, size * 0.06);
    ctx.restore();
  }
}
