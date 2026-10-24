import { HAND, HAND_CUFF } from "../johnson/sprites.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { Sfx } from "../sound.ts";
import { drawKid, type Look, type Pose } from "./kidArt.ts";
import { hitScore, kidLayout, kidSpot, type KidLayout, type KidSpot } from "./kidLayout.ts";
import { CHANCES, GNAT_COUNT, onScreen, SICK_COUNT, type KidPlan } from "./kidPlan.ts";
import { KidRound, type EndReason, type KidEvent, type RoundGnat, type RoundKid } from "./kidRound.ts";
import { gnatPos } from "./kidMosquito.ts";
import { drawMosquito, paintTown } from "./town.ts";

export type KidPhase = "idle" | "play" | "done";

export type KidSnapshot = {
  phase: KidPhase;
  cured: number;
  wrong: number;
  chances: number;
  missed: number;
  passed: number;
  bestStreak: number;
  ended: EndReason | null;
  swatted: number;
  gnatTotal: number;
  gnatOut: boolean;
  sickOut: boolean;
  healthyOut: boolean;
  seed: number | null;
};

export type KidOptions = {
  fonts: Fonts;
  reducedMotion: boolean;
  sfx: Sfx;
  onChange: (snapshot: KidSnapshot) => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; angle: number; spin: number; heart: boolean };
type Ring = { x: number; y: number; born: number; max: number; color: string; from: number; to: number; width: number };
type Chip = { x: number; y: number; born: number; text: string; tone: "cured" | "healthy" };
type Scribble = { x: number; y: number; born: number; text: string };
type Shot = { kid: RoundKid; born: number };
type Fallen = { x: number; y: number; dir: 1 | -1; born: number; phase: number };

const SHOT = 0.7;
const DONE_DELAY = 1.1;
const CHEER = 1.3;
const SCARE = 1;
const LATENCY = 0.14;
const RATE_SICK = 4.6;
const RATE_HEALTHY = 7.4;

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

export class KidScene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private options: KidOptions;
  private background: HTMLCanvasElement;
  private layout: KidLayout = kidLayout(1, 1);
  private fallen: Fallen[] = [];
  private W = 1;
  private H = 1;
  private dpr = 1;
  private frame = 0;
  private last = performance.now();
  private now = 0;
  private phase: KidPhase = "idle";
  private round: KidRound | null = null;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private chips: Chip[] = [];
  private scribbles: Scribble[] = [];
  private shots: Shot[] = [];
  private lastInput = -Infinity;
  private interacted = false;
  private endedAt = 0;
  private celebrated = false;
  private completeAt = 0;
  private signature = "";
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: KidOptions) {
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
    this.layout = kidLayout(this.W, this.H);
    this.background.width = this.canvas.width;
    this.background.height = this.canvas.height;
    const bg = this.background.getContext("2d");
    if (bg) {
      bg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      paintTown(bg, this.layout);
    }
  }

  start(plan: KidPlan) {
    if (this.phase !== "idle") return;
    this.round = new KidRound(plan);
    this.phase = "play";
    this.lastInput = this.now;
    this.emit();
  }

  private spot(kid: RoundKid, t = this.round!.time): KidSpot {
    return kidSpot(this.layout, kid.plan, this.round!.u(kid, t));
  }

  private kidAt(x: number, y: number) {
    const round = this.round;
    if (!round || this.phase !== "play") return -1;
    let best = -1;
    let bestScore = Infinity;
    round.kids.forEach((kid, i) => {
      if (!round.tappable(kid)) return;
      const spot = this.spot(kid);
      if (spot.x < -spot.size * 0.3 || spot.x > this.W + spot.size * 0.3) return;
      const seen = this.spot(kid, round.time - LATENCY);
      const score = Math.min(hitScore(spot, x, y), hitScore(seen, x, y)) - kid.plan.lane * 0.05;
      if (score <= 1 && score < bestScore) {
        best = i;
        bestScore = score;
      }
    });
    return best;
  }

  private gnatSpot(gnat: RoundGnat, t = this.round!.time) {
    return gnatPos(gnat.plan, t, this.W, this.H);
  }

  private gnatSize() {
    return clamp(this.H * 0.042, 22, 46);
  }

  private gnatAt(x: number, y: number) {
    const round = this.round;
    if (!round || this.phase !== "play") return -1;
    const reach = clamp(this.H * 0.06, 32, 56);
    let best = -1;
    let bestDist = Infinity;
    round.gnats.forEach((gnat, i) => {
      if (!round.gnatTappable(gnat)) return;
      const now = this.gnatSpot(gnat);
      const seen = this.gnatSpot(gnat, round.time - LATENCY);
      const d = Math.min(Math.hypot(now.x - x, now.y - y), Math.hypot(seen.x - x, seen.y - y));
      if (d <= reach && d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  }

  pointerOverTarget(x: number, y: number) {
    return this.gnatAt(x, y) >= 0 || this.kidAt(x, y) >= 0;
  }

  tapAt(x: number, y: number) {
    const round = this.round;
    if (!round || this.phase !== "play" || round.ended) return;
    this.lastInput = this.now;
    this.interacted = true;
    const bug = this.gnatAt(x, y);
    if (bug >= 0) {
      const spot = this.gnatSpot(round.gnats[bug]);
      const swatted = round.swat(bug);
      if (swatted) this.react(swatted, undefined, spot);
      return;
    }
    const index = this.kidAt(x, y);
    if (index < 0) return;
    const spot = this.spot(round.kids[index]);
    const event = round.tap(index);
    if (event) this.react(event, spot);
    if (round.ended) this.ended(round.ended);
  }

  private snapshot(): KidSnapshot {
    const round = this.round;
    const shown = round ? round.kids.filter((k) => k.status === "out" && onScreen(round.u(k))) : [];
    return {
      phase: this.phase,
      cured: round?.cured ?? 0,
      wrong: round?.wrong ?? 0,
      chances: round?.chances ?? CHANCES,
      missed: round?.missed ?? 0,
      passed: round?.passed ?? 0,
      bestStreak: round?.bestStreak ?? 0,
      ended: round?.ended ?? null,
      swatted: round?.swatted ?? 0,
      gnatTotal: GNAT_COUNT,
      gnatOut: !!round && !round.ended && round.gnats.some((g) => g.status === "out" && g.plan.at + 0.4 < round.time),
      sickOut: shown.some((k) => k.plan.sick),
      healthyOut: shown.some((k) => !k.plan.sick),
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

  private center(spot: KidSpot) {
    return { x: spot.x, y: spot.y - spot.size * 0.55 };
  }

  private react(event: KidEvent, at?: KidSpot, bug?: { x: number; y: number }) {
    const { sfx } = this.options;
    const round = this.round;
    if (!round) return;
    if (event.type === "cured" && at) {
      const c = this.center(at);
      sfx.jab();
      this.shots.push({ kid: event.kid, born: this.now });
      this.rings.push({ x: c.x, y: c.y, born: this.now + 380, max: 0.55, color: INK.orange, from: at.size * 0.3, to: at.size * 1.1, width: 5 });
      this.rings.push({ x: c.x, y: c.y, born: this.now + 460, max: 0.55, color: INK.blue, from: at.size * 0.2, to: at.size * 0.85, width: 2 });
      this.chips.push({ x: c.x, y: c.y - at.size * 0.7, born: this.now + 380, text: "Curado!", tone: "cured" });
      if (event.complete) this.completeAt = this.now + 900;
      window.setTimeout(() => {
        if (this.destroyed) return;
        sfx.rescue(round.streak);
        this.burst(at.x, c.y, at.size, 14);
      }, 380);
      this.emit();
      return;
    }
    if (event.type === "swatted" && bug) {
      const first = round.swatted === 1;
      sfx.swat();
      this.fallen.push({ x: bug.x, y: bug.y, dir: event.gnat.plan.dir, born: this.now, phase: event.gnat.plan.phase });
      this.chips.push({ x: bug.x, y: bug.y - this.H * 0.05, born: this.now, text: first ? "Barra extra!" : "+1 extra", tone: "cured" });
      this.rings.push({ x: bug.x, y: bug.y, born: this.now, max: 0.4, color: INK.blue, from: 8, to: this.H * 0.07, width: 3 });
      this.burst(bug.x, bug.y, this.H * 0.06, 6);
      this.emit();
      return;
    }
    if (event.type === "healthy" && at) {
      const c = this.center(at);
      sfx.thud();
      sfx.boing();
      this.chips.push({ x: c.x, y: c.y - at.size * 0.7, born: this.now, text: "Saudável!", tone: "healthy" });
      this.emit();
      return;
    }
    if (event.type === "missed") {
      const spot = this.spot(event.kid, round.time - 0.25);
      this.scribbles.push({ x: clamp(spot.x, this.W * 0.08, this.W * 0.92), y: spot.y - spot.size * 1.05, born: this.now, text: "sem vacina!" });
      sfx.fizz();
      this.emit();
      return;
    }
    if (event.type === "passed") {
      this.emit();
      return;
    }
    if (event.type === "end") this.ended(event.reason);
  }

  private ended(reason: EndReason) {
    if (this.endedAt) return;
    this.endedAt = this.now;
    void reason;
    this.emit();
  }

  private burst(x: number, y: number, size: number, count: number) {
    if (this.options.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const v = size * (1.6 + Math.random() * 1.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - size * 1.2,
        life: 0,
        max: 0.7 + Math.random() * 0.3,
        size: size * (0.06 + Math.random() * 0.04),
        color: i % 3 === 0 ? INK.blue : INK.orange,
        angle: (Math.random() - 0.5) * 0.8,
        spin: (Math.random() - 0.5) * 5,
        heart: i % 3 !== 0,
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
      const wait = round.ended === "complete" ? 2.4 : DONE_DELAY;
      if (round.settled && this.shots.length === 0 && (this.now - this.endedAt) / 1000 > wait) {
        this.phase = "done";
        if (!this.celebrated) this.options.sfx.finish(round.cured >= SICK_COUNT ? 10 : 6);
        this.celebrated = true;
        this.emit();
      } else {
        this.emitIfChanged();
      }
    }

    if (this.completeAt && this.now >= this.completeAt && this.completeAt > 0) {
      this.completeAt = -1;
      for (let k = 0; k < 4; k++) {
        this.rings.push({ x: this.W / 2, y: this.H * 0.4, born: this.now + k * 160, max: 1, color: k % 2 ? INK.blue : INK.orange, from: this.W * 0.05, to: this.W * 0.4, width: 4 });
      }
      this.burst(this.W / 2, this.H * 0.45, this.H * 0.28, 26);
      this.options.sfx.finish(10);
    }

    this.shots = this.shots.filter((s) => (this.now - s.born) / 1000 < SHOT);

    this.fallen = this.fallen.filter((f) => this.now - f.born < 650);
    for (const p of this.particles) {
      p.life += dt;
      p.vy += this.H * 1.2 * dt;
      p.vx *= 1 - dt * 1.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.rings = this.rings.filter((r) => (this.now - r.born) / 1000 < r.max);
    this.chips = this.chips.filter((c) => this.now - c.born < 1050);
    this.scribbles = this.scribbles.filter((s) => this.now - s.born < 1300);
  }

  private look(kid: RoundKid): Look {
    const round = this.round!;
    if (kid.status === "cured") {
      const age = round.time - kid.curedAt;
      return age < 0.38 ? kid.plan.look : { ...kid.plan.look, symptoms: [] };
    }
    return kid.plan.look;
  }

  private pose(kid: RoundKid): Pose {
    const round = this.round!;
    const sickNow = kid.plan.sick && kid.status !== "cured";
    const u = round.u(kid);
    const rate = sickNow ? RATE_SICK : RATE_HEALTHY;
    let energy = sickNow ? 0.15 : 1;
    let cheer = 0;
    let scare = 0;
    if (kid.status === "cured") {
      const age = round.time - kid.curedAt;
      energy = 0.15 + 0.85 * smooth((age - 0.38) / 0.7);
      cheer = age < 0.38 ? 0 : 1 - smooth((age - 0.38 - CHEER + 0.3) / 0.3);
      cheer = age > 0.38 + CHEER ? 0 : cheer;
    }
    if (kid.status === "scared") {
      const age = round.time - kid.scaredAt;
      scare = 1 - smooth((age - SCARE * 0.6) / (SCARE * 0.4));
    }
    return { phase: u * kid.plan.duration * rate, energy, cheer, scare, patch: kid.status === "cured", time: this.now / 1000 };
  }

  private draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(this.background, 0, 0, this.W, this.H);
    const line = clamp(this.H * 0.0019, 1.2, 2.4);
    this.drawKids();
    this.drawGnats(line);
    this.drawShots();
    this.drawRings();
    this.drawParticles();
    this.drawChips();
    this.drawScribbles();
    this.drawGhostHand();
    this.drawComplete();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawGnats(line: number) {
    const round = this.round;
    if (!round) return;
    const size = this.gnatSize();
    for (const gnat of round.gnats) {
      if (gnat.status !== "out") continue;
      const p = this.gnatSpot(gnat);
      drawMosquito(this.ctx, p.x, p.y, gnat.plan.dir, size, this.now / 1000, gnat.plan.phase, line);
    }
    for (const f of this.fallen) {
      const age = (this.now - f.born) / 1000;
      this.ctx.save();
      this.ctx.globalAlpha = 1 - smooth((age - 0.3) / 0.35);
      drawMosquito(this.ctx, f.x + f.dir * age * size * 1.2, f.y + age * age * this.H * 0.9, f.dir, size, 0, f.phase, line, age * 9 * f.dir);
      this.ctx.restore();
    }
  }

  private drawKids() {
    const round = this.round;
    if (!round) return;
    const { ctx } = this;
    const kids = round.kids.filter((k) => round.visible(k)).sort((a, b) => a.plan.lane - b.plan.lane || a.plan.id - b.plan.id);
    for (const kid of kids) {
      const spot = this.spot(kid);
      if (spot.x < -spot.size * 1.2 || spot.x > this.W + spot.size * 1.2) continue;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = INK.black;
      ctx.beginPath();
      ctx.ellipse(spot.x, spot.y + 1, spot.size * 0.24, spot.size * 0.045, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const pose = this.pose(kid);
      const shake = kid.status === "scared" ? Math.sin((round.time - kid.scaredAt) * 55) * Math.max(0, 1 - (round.time - kid.scaredAt) / 0.5) * spot.size * 0.03 : 0;
      drawKid(ctx, this.look(kid), pose, { x: spot.x + shake, y: spot.y, size: spot.size });
      if (kid.status === "scared" && round.time - kid.scaredAt < 1.2) this.drawScare(spot, round.time - kid.scaredAt);
    }
  }

  private drawScare(spot: KidSpot, age: number) {
    const { ctx } = this;
    const size = clamp(spot.size * 0.34, 14, 44);
    ctx.save();
    ctx.globalAlpha = 1 - smooth((age - 0.8) / 0.4);
    ctx.font = `700 ${size}px ${this.options.fonts.display}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.2;
    ctx.strokeStyle = INK.paper;
    ctx.strokeText("!", spot.x + spot.size * 0.26, spot.y - spot.size * 1.02);
    ctx.fillStyle = INK.blue;
    ctx.fillText("!", spot.x + spot.size * 0.26, spot.y - spot.size * 1.02);
    ctx.restore();
  }

  private drawShots() {
    const round = this.round;
    if (!round) return;
    const { ctx } = this;
    for (const shot of this.shots) {
      const age = (this.now - shot.born) / 1000;
      const spot = this.spot(shot.kid);
      const s = spot.size;
      const slide = smooth(age / 0.12);
      const push = smooth((age - 0.14) / 0.2);
      const out = smooth((age - 0.42) / 0.26);
      const dist = (1 - slide) * s * 0.5 + out * s * 0.5;
      const ax = spot.x - s * 0.19;
      const ay = spot.y - s * 0.44;
      ctx.save();
      ctx.globalAlpha = 1 - out;
      ctx.translate(ax - dist - s * 0.02, ay + dist * 0.35);
      ctx.rotate(-0.12);
      const u = s / 100;
      ctx.scale(u, u);
      const ink = clamp(1.4 / u, 1.4, 3);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.8;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = INK.paper;
      ctx.lineWidth = ink;
      ctx.beginPath();
      ctx.roundRect(0, -4.6, 26, 9.2, 1.5);
      ctx.fill();
      ctx.fillStyle = INK.orange;
      const liquid = 22 * (1 - push);
      ctx.fillRect(2, -3.2, liquid, 6.4);
      ctx.beginPath();
      ctx.roundRect(0, -4.6, 26, 9.2, 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24 + push * 0, -8);
      ctx.lineTo(24, 8);
      ctx.stroke();
      const rod = 24 + 14 - push * 18;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(rod, 0);
      ctx.stroke();
      ctx.fillStyle = INK.blue;
      ctx.beginPath();
      ctx.roundRect(rod, -6, 4, 12, 1);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
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
      const s = p.size;
      ctx.beginPath();
      if (p.heart) {
        ctx.moveTo(0, s * 0.9);
        ctx.bezierCurveTo(-s * 1.8, -s * 0.2, -s * 0.8, -s * 1.5, 0, -s * 0.5);
        ctx.bezierCurveTo(s * 0.8, -s * 1.5, s * 1.8, -s * 0.2, 0, s * 0.9);
      } else {
        ctx.rect(-s * 0.3, -s, s * 0.6, s * 2);
        ctx.rect(-s, -s * 0.3, s * 2, s * 0.6);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  private drawChips() {
    const { ctx } = this;
    const { fonts } = this.options;
    for (const c of this.chips) {
      const age = (this.now - c.born) / 1000;
      if (age < 0) continue;
      const k = age / 1.0;
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.42 : 1.12 - Math.min(0.12, (age - 0.12) * 0.8);
      const size = clamp(this.H * (c.tone === "cured" ? 0.042 : 0.036), 18, 46);
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.7) / 0.3);
      const x = clamp(c.x, size * 4, this.W - size * 4);
      ctx.translate(x, Math.max(size, c.y - smooth(k) * this.H * 0.03));
      ctx.rotate(c.tone === "healthy" ? -0.04 : 0.02);
      ctx.scale(pop, pop);
      ctx.font = `700 ${size}px ${fonts.display}`;
      const w = ctx.measureText(c.text).width + size * 0.8;
      const h = size * 1.3;
      ctx.fillStyle = c.tone === "cured" ? INK.black : INK.blue;
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
      ctx.fillStyle = INK.paper;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = c.tone === "cured" ? INK.orange : INK.blue;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-w / 2 + 1.25, -h / 2 + 1.25, w - 2.5, h - 2.5);
      ctx.fillStyle = c.tone === "cured" ? INK.orange : INK.blue;
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
    const target = round.kids.find((k) => round.tappable(k) && k.plan.sick && round.u(k) > 0.15 && round.u(k) < 0.85);
    if (!target) return;
    const spot = this.spot(target);
    const c = this.center(spot);
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
      ctx.arc(c.x, c.y, spot.size * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.translate(c.x + 4 * scale, c.y + (8 - press * 6) * scale);
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
    if (this.completeAt !== -1 || this.phase === "done") return;
    const round = this.round;
    if (!round || !round.complete) return;
    const { ctx } = this;
    const age = Math.max(0, (this.now - this.endedAt) / 1000 - 0.9);
    const k = this.options.reducedMotion ? 1 : clamp(age / 0.35, 0, 1);
    const scale = 1.5 - 0.5 * easeOutBack(k);
    const size = clamp(this.H * 0.06, 20, 54);
    ctx.save();
    ctx.font = `700 ${size}px ${this.options.fonts.display}`;
    const text = "TODAS VACINADAS!";
    const w = ctx.measureText(text).width + size * 1.2;
    ctx.globalAlpha = k;
    ctx.translate(this.W / 2, this.H * 0.3);
    ctx.rotate(-0.06);
    ctx.scale(scale, scale);
    ctx.fillStyle = INK.black;
    ctx.fillRect(-w / 2 + 5, -size * 0.8 + 5, w, size * 1.6);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(-w / 2, -size * 0.8, w, size * 1.6);
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 4;
    ctx.strokeRect(-w / 2 + 2, -size * 0.8 + 2, w - 4, size * 1.6 - 4);
    ctx.fillStyle = INK.orange;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, size * 0.04);
    ctx.restore();
  }
}
