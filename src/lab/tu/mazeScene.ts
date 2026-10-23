import { createNoise, fbm } from "../riso/noise.ts";
import { dotPattern, halftone } from "../riso/halftone.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { Sfx } from "../sound.ts";
import { walkable, type Cell, type Dir, type Maze } from "./maze.ts";
import { drawDose, drawLeaf, drawMolecule, drawParasite, drawResearcher, PARASITE_INK } from "./mazeArt.ts";
import { CAUGHT, FRIGHT, LIVES, moverPos, WARN, type EndReason, type MazeEvent, type MazeRound, type Phase, type Point } from "./mazeRound.ts";

export type MazeSnapshot = {
  phase: Phase;
  eaten: number;
  total: number;
  lives: number;
  fright: number;
  warning: boolean;
  ended: EndReason | null;
  neutralized: number;
  steered: boolean;
  seed: number | null;
};

export type MazeOptions = {
  fonts: Fonts;
  reducedMotion: boolean;
  sfx: Sfx;
  onChange: (snapshot: MazeSnapshot) => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; angle: number; spin: number; kind: "leaf" | "dot" | "molecule" };
type Ring = { x: number; y: number; born: number; max: number; color: string; from: number; to: number; width: number };
type Chip = { x: number; y: number; born: number; text: string; tone: "orange" | "blue" | "ink"; life: number };

const DONE_DELAY = 1.6;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function smooth(t: number) {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export class MazeScene {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private options: MazeOptions;
  private board: HTMLCanvasElement;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private ts = 10;
  private ox = 0;
  private oy = 0;
  private frame = 0;
  private last = performance.now();
  private now = 0;
  private round: MazeRound | null = null;
  private done = false;
  private endedAt = 0;
  private steered = false;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private chips: Chip[] = [];
  private corridors: Path2D | null = null;
  private tint: CanvasPattern | string = INK.orange;
  private wave: { x: number; y: number; born: number } | null = null;
  private walk = 0;
  private plucks = 0;
  private caughtAt = 0;
  private goAt = -Infinity;
  private signature = "";
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: MazeOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    this.canvas = canvas;
    this.options = options;
    this.ctx = ctx;
    this.board = document.createElement("canvas");
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
  }

  setFonts(fonts: Fonts) {
    this.options.fonts = fonts;
  }

  start(round: MazeRound) {
    if (this.round) return;
    this.round = round;
    this.renderBoard();
    this.emit();
  }

  steer(dir: Dir) {
    if (!this.round || this.round.ended) return;
    this.round.steer(dir);
    if (!this.steered) {
      this.steered = true;
      this.emit();
    }
  }

  resize(W: number, H: number, dpr: number) {
    this.W = Math.max(1, W);
    this.H = Math.max(1, H);
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.renderBoard();
  }

  private maze(): Maze | null {
    return this.round?.maze ?? null;
  }

  private center(tile: Point): Point {
    return { x: this.ox + (tile.x + 0.5) * this.ts, y: this.oy + (tile.y + 0.5) * this.ts };
  }

  private renderBoard() {
    const maze = this.maze();
    if (!maze) return;
    const ts = Math.max(8, Math.floor(Math.min((this.W - 6) / maze.cols, (this.H - 6) / maze.rows)));
    this.ts = ts;
    this.ox = Math.round((this.W - maze.cols * ts) / 2);
    this.oy = Math.round((this.H - maze.rows * ts) / 2);
    const layer = this.board;
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    const { ox, oy } = this;
    const bw = maze.cols * ts;
    const bh = maze.rows * ts;
    const cell = clamp(ts * 0.13, 3, 6.5);
    const lw = clamp(ts * 0.05, 1.2, 2.6);
    const noise = createNoise(1972);

    ctx.fillStyle = INK.paper;
    ctx.fillRect(ox, oy, bw, bh);
    ctx.globalCompositeOperation = "multiply";
    halftone(ctx, { x: ox, y: oy, w: bw, h: bh }, cell, 15, (x, y) => 0.04 + fbm(noise, x / (ts * 6), y / (ts * 6), 2, 0.5) * 0.05, INK.blue);
    ctx.globalCompositeOperation = "source-over";

    const g = ts * 0.2;
    const shape = (kinds: Cell[]) => {
      const path = new Path2D();
      const is = (x: number, y: number) => x >= 0 && x < maze.cols && y >= 0 && y < maze.rows && kinds.includes(maze.cells[y * maze.cols + x]);
      for (let y = 0; y < maze.rows; y++) {
        for (let x = 0; x < maze.cols; x++) {
          if (!is(x, y)) continue;
          const px = ox + x * ts;
          const py = oy + y * ts;
          path.roundRect(px + g, py + g, ts - g * 2, ts - g * 2, ts * 0.16);
          if (is(x + 1, y)) path.rect(px + ts - g - 1, py + g, g * 2 + 2, ts - g * 2);
          if (is(x, y + 1)) path.rect(px + g, py + ts - g - 1, ts - g * 2, g * 2 + 2);
          if (is(x + 1, y) && is(x, y + 1) && is(x + 1, y + 1)) path.rect(px + ts - g - 1, py + ts - g - 1, g * 2 + 2, g * 2 + 2);
        }
      }
      return path;
    };
    const walls = shape(["wall"]);
    const house = shape(["houseWall"]);

    ctx.save();
    ctx.translate(lw * 1.6, lw * 1.6);
    ctx.fillStyle = "rgba(16, 1, 227, 0.55)";
    ctx.fill(walls);
    ctx.restore();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = lw * 2;
    ctx.stroke(walls);
    ctx.fillStyle = INK.paper;
    ctx.fill(walls);
    ctx.save();
    ctx.clip(walls);
    ctx.globalCompositeOperation = "multiply";
    halftone(ctx, { x: ox, y: oy, w: bw, h: bh }, cell, 15, (x, y) => 0.55 + fbm(noise, x / (ts * 3), y / (ts * 3), 2, 0.5) * 0.25, INK.blue);
    ctx.restore();

    ctx.strokeStyle = INK.black;
    ctx.lineWidth = lw * 2;
    ctx.stroke(house);
    ctx.fillStyle = INK.paper;
    ctx.fill(house);
    ctx.save();
    ctx.clip(house);
    ctx.globalCompositeOperation = "multiply";
    halftone(ctx, { x: ox, y: oy, w: bw, h: bh }, cell * 0.9, 75, () => 0.7, INK.orange);
    ctx.restore();

    const door = this.center(maze.door);
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = Math.max(2, ts * 0.1);
    ctx.setLineDash([ts * 0.12, ts * 0.08]);
    ctx.beginPath();
    ctx.moveTo(door.x - ts * 0.5, door.y);
    ctx.lineTo(door.x + ts * 0.5, door.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = INK.orange;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = lw * 0.7;
    for (let y = 1; y < maze.rows - 1; y++) {
      for (let x = 1; x < maze.cols - 1; x++) {
        if (maze.cells[y * maze.cols + x] !== "wall") continue;
        const around = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ].filter(([ax, ay]) => maze.cells[ay * maze.cols + ax] === "wall").length;
        if (around > 1) continue;
        const c = this.center({ x, y });
        ctx.beginPath();
        ctx.arc(c.x, c.y, ts * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    const row = maze.door.y + 1;
    for (const side of [0, maze.cols - 1]) {
      const c = this.center({ x: side, y: row });
      const dir = side === 0 ? -1 : 1;
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = Math.max(2, ts * 0.07);
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const k of [0, 0.28]) {
        ctx.moveTo(c.x + dir * ts * (0.05 + k), c.y - ts * 0.16);
        ctx.lineTo(c.x + dir * ts * (0.2 + k), c.y);
        ctx.lineTo(c.x + dir * ts * (0.05 + k), c.y + ts * 0.16);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = INK.black;
    ctx.lineWidth = lw * 1.4;
    ctx.strokeRect(ox - lw, oy - lw, bw + lw * 2, bh + lw * 2);

    const corridors = new Path2D();
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (walkable(maze.cells[y * maze.cols + x])) corridors.rect(ox + x * ts - 1, oy + y * ts - 1, ts + 2, ts + 2);
      }
    }
    this.corridors = corridors;
    this.tint = dotPattern(this.ctx, INK.orange, clamp(ts * 0.12, 3, 6), clamp(ts * 0.05, 1.1, 2.6));
  }

  private snapshot(): MazeSnapshot {
    const r = this.round;
    return {
      phase: r?.phase ?? "ready",
      eaten: r?.eaten ?? 0,
      total: r?.total ?? 0,
      lives: r?.lives ?? LIVES,
      fright: r ? Math.round((r.fright / FRIGHT) * 40) / 40 : 0,
      warning: !!r && r.fright > 0 && r.fright <= WARN,
      ended: r?.ended ?? null,
      neutralized: r?.neutralized ?? 0,
      steered: this.steered,
      seed: r?.seed ?? null,
    };
  }

  private emit() {
    const snap = this.snapshot();
    const signature = JSON.stringify(snap) + (this.done ? "done" : "");
    if (signature === this.signature) return;
    this.signature = signature;
    this.options.onChange({ ...snap, phase: this.done ? "over" : snap.phase });
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
      for (const e of round.step(dt)) this.react(e);
      const pl = round.player;
      if (round.phase === "play" && pl.dir) this.walk += dt * 2.6;
      if (round.ended && !this.done && this.now - this.endedAt > DONE_DELAY * 1000) this.done = true;
      this.emit();
    }
    for (const p of this.particles) {
      p.life += dt;
      p.vy += (p.kind === "leaf" ? 0.9 : 1.6) * this.ts * dt * 6;
      p.vx *= 1 - dt * 2;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.rings = this.rings.filter((r) => (this.now - r.born) / 1000 < r.max);
    this.chips = this.chips.filter((c) => this.now - c.born < c.life);
    if (this.wave && this.now - this.wave.born > 900) this.wave = null;
  }

  private react(e: MazeEvent) {
    const round = this.round!;
    const { sfx } = this.options;
    const ts = this.ts;
    if (e.type === "leaf") {
      this.plucks += 1;
      sfx.pluck(this.plucks);
      const c = this.center(e.tile);
      if (!this.options.reducedMotion) {
        for (let i = 0; i < 4; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          this.particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * ts * 2.4, vy: Math.sin(a) * ts * 3, life: 0, max: 0.35, size: ts * 0.07, color: INK.blue, angle: a, spin: (Math.random() - 0.5) * 12, kind: "leaf" });
        }
      }
      if (e.left > 0 && e.left % 25 === 0) this.chips.push({ x: c.x, y: c.y - ts * 0.8, born: this.now, text: `faltam ${e.left}`, tone: "ink", life: 1100 });
      return;
    }
    if (e.type === "dose") {
      sfx.power();
      const c = this.center(e.tile);
      this.wave = { x: c.x, y: c.y, born: this.now };
      this.rings.push({ x: c.x, y: c.y, born: this.now, max: 0.6, color: INK.orange, from: ts * 0.3, to: ts * 2.2, width: 5 });
      this.chips.push({ x: c.x, y: c.y - ts * 0.9, born: this.now, text: "Artemisinina!", tone: "orange", life: 1200 });
      return;
    }
    if (e.type === "neutralize") {
      sfx.rescue(2 + e.chain);
      const c = this.center(e.at);
      const color = PARASITE_INK[round.parasites[e.id].kind].body;
      this.rings.push({ x: c.x, y: c.y, born: this.now, max: 0.5, color: INK.orange, from: ts * 0.2, to: ts * 1.4, width: 4 });
      if (!this.options.reducedMotion) {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * ts * 3.2, vy: Math.sin(a) * ts * 3.2 - ts, life: 0, max: 0.6, size: ts * (i % 3 === 0 ? 0.11 : 0.06), color: i % 3 === 0 ? INK.orange : color, angle: a, spin: 6, kind: i % 3 === 0 ? "molecule" : "dot" });
        }
      }
      this.chips.push({ x: c.x, y: c.y - ts * 0.8, born: this.now, text: e.chain > 1 ? `neutralizado ×${e.chain}` : "neutralizado!", tone: "orange", life: 1000 });
      return;
    }
    if (e.type === "warn") return;
    if (e.type === "calm") return;
    if (e.type === "caught") {
      sfx.hit();
      this.caughtAt = this.now;
      const c = this.center(e.at);
      this.rings.push({ x: c.x, y: c.y, born: this.now, max: 0.7, color: INK.black, from: ts * 0.3, to: ts * 1.6, width: 3 });
      this.chips.push({ x: c.x, y: c.y - ts * 0.9, born: this.now, text: round.lives > 0 ? "ai!" : "ai...", tone: "ink", life: 1300 });
      return;
    }
    if (e.type === "respawn") return;
    if (e.type === "go") {
      this.goAt = this.now;
      return;
    }
    if (e.type === "end") {
      this.endedAt = this.now;
      if (e.reason === "complete") {
        sfx.finish(10);
        if (!this.options.reducedMotion) {
          const maze = round.maze;
          for (let i = 0; i < 36; i++) {
            const c = this.center({ x: 1 + hash(i) * (maze.cols - 3), y: 1 + hash(i + 50) * (maze.rows - 3) });
            this.particles.push({ x: c.x, y: c.y, vx: (hash(i + 7) - 0.5) * ts * 4, vy: -ts * (2 + hash(i + 9) * 4), life: 0, max: 1.4, size: ts * 0.1, color: i % 3 ? INK.blue : INK.orange, angle: hash(i) * 6, spin: 5, kind: i % 4 === 0 ? "molecule" : "leaf" });
          }
        }
      } else {
        sfx.lose();
      }
    }
  }

  private drawAt(x: number, y: number, paint: (px: number, py: number) => void) {
    const maze = this.maze();
    if (!maze) return;
    paint(x, y);
    const span = maze.cols * this.ts;
    if (x < this.ox + this.ts) paint(x + span, y);
    if (x > this.ox + span - this.ts) paint(x - span, y);
  }

  private draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const round = this.round;
    if (!round) return;
    ctx.drawImage(this.board, 0, 0, this.W, this.H);
    const maze = round.maze;
    const ts = this.ts;
    const t = this.now / 1000;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.ox, this.oy, maze.cols * ts, maze.rows * ts);
    ctx.clip();

    if (round.fright > 0 && this.corridors) {
      const blink = round.fright <= WARN ? (Math.floor(t * 6) % 2 === 0 ? 0.25 : 0.55) : 0.6;
      ctx.save();
      ctx.clip(this.corridors);
      ctx.globalAlpha = blink;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = this.tint;
      ctx.fillRect(this.ox, this.oy, maze.cols * ts, maze.rows * ts);
      ctx.restore();
    }
    if (this.wave && this.corridors) {
      const k = (this.now - this.wave.born) / 900;
      ctx.save();
      ctx.clip(this.corridors);
      ctx.strokeStyle = INK.orange;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = ts * 0.6;
      ctx.beginPath();
      ctx.arc(this.wave.x, this.wave.y, k * Math.max(maze.cols, maze.rows) * ts * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const few = round.leaves.size <= 10;
    for (const key of round.leaves) {
      const tile = { x: key % maze.cols, y: Math.floor(key / maze.cols) };
      const c = this.center(tile);
      const sway = this.options.reducedMotion ? 0 : Math.sin(t * 2 + key) * 0.12;
      const glow = few ? 0.5 + 0.5 * Math.sin(t * 6 + key) : 0;
      drawLeaf(ctx, c.x, c.y, ts, (hash(key) - 0.5) * 1.2 + sway, glow);
    }
    for (const key of round.doses) {
      const c = this.center({ x: key % maze.cols, y: Math.floor(key / maze.cols) });
      drawDose(ctx, c.x, c.y, ts, t + key, this.options.reducedMotion);
    }

    this.drawParasites(t);
    this.drawPlayer(t);
    ctx.restore();

    this.drawRings();
    this.drawParticles();
    this.drawChips();
    this.drawBanner();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawParasites(t: number) {
    const round = this.round!;
    const ts = this.ts;
    const caught = round.phase === "caught";
    for (const g of round.parasites) {
      if (g.state === "gone") continue;
      let pos = g.pos;
      if (g.state === "home") pos = { x: g.pos.x, y: g.pos.y + Math.sin(t * 4 + g.id) * 0.18 };
      const c = this.center(pos);
      const look = g.scared ? (round.fright <= WARN ? "blink" : "scared") : "normal";
      const alpha = round.ended === "complete" ? 1 - smooth((this.now - this.endedAt) / 600) : 1;
      if (alpha <= 0.01) continue;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.drawAt(c.x, c.y, (x, y) => drawParasite(this.ctx, g.kind, x, y, ts * 0.92, caught ? 0 : t + g.id, look, g.dir));
      this.ctx.restore();
    }
  }

  private drawPlayer(t: number) {
    const round = this.round!;
    const { ctx } = this;
    const ts = this.ts;
    const pl = round.player;
    const pos = moverPos(pl);
    const c = this.center(pos);
    const caught = round.phase === "caught" || round.ended === "lives";
    const k = caught ? clamp((this.now - this.caughtAt) / (CAUGHT * 1000), 0, 1) : 0;
    if (round.fright > 0 && !caught) {
      const pulse = (Math.sin(t * 8) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = round.fright <= WARN && Math.floor(t * 6) % 2 === 0 ? 0.3 : 0.8;
      ctx.strokeStyle = INK.orange;
      ctx.lineWidth = Math.max(2, ts * 0.07);
      ctx.beginPath();
      ctx.arc(c.x, c.y, ts * (0.55 + pulse * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i / 3) * Math.PI * 2;
        drawMolecule(ctx, c.x + Math.cos(a) * ts * 0.62, c.y + Math.sin(a) * ts * 0.62, ts * 0.1, a);
      }
      ctx.restore();
    }
    const blink = pl.grace > 0 && round.phase === "play" && Math.floor(t * 10) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    const moving = round.phase === "play" && !!pl.dir;
    this.drawAt(c.x, c.y + ts * 0.04, (x, y) =>
      drawResearcher(ctx, x, y, ts * 0.95, { facing: pl.facing, walk: this.walk, moving, spin: caught ? k * Math.PI * 3 : 0, shrink: caught ? k * 0.5 : 0 }),
    );
    ctx.restore();
    if (caught && k > 0.2) {
      ctx.save();
      ctx.globalAlpha = 1 - smooth((k - 0.8) / 0.2);
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i / 3) * Math.PI * 2;
        const sx = c.x + Math.cos(a) * ts * 0.4;
        const sy = c.y - ts * 0.55 + Math.sin(a) * ts * 0.12;
        ctx.fillStyle = INK.orange;
        ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const r = j % 2 ? ts * 0.05 : ts * 0.11;
          const aa = (j / 10) * Math.PI * 2;
          if (j === 0) ctx.moveTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r);
          else ctx.lineTo(sx + Math.cos(aa) * r, sy + Math.sin(aa) * r);
        }
        ctx.closePath();
        ctx.fill();
      }
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
      if (p.kind === "molecule") {
        drawMolecule(ctx, p.x, p.y, p.size, p.angle, p.color);
      } else if (p.kind === "leaf") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private chipBox(text: string, x: number, y: number, size: number, tone: Chip["tone"], scale = 1) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = `700 ${size}px ${this.options.fonts.display}`;
    const w = ctx.measureText(text).width + size * 0.8;
    const h = size * 1.35;
    const color = tone === "orange" ? INK.orange : tone === "blue" ? INK.blue : INK.black;
    ctx.fillStyle = tone === "ink" ? INK.black : color;
    ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
    ctx.fillStyle = INK.paper;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-w / 2 + 1.1, -h / 2 + 1.1, w - 2.2, h - 2.2);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, size * 0.05);
    ctx.restore();
  }

  private drawChips() {
    for (const c of this.chips) {
      const age = (this.now - c.born) / 1000;
      const k = age / (c.life / 1000);
      const pop = age < 0.12 ? 0.7 + (age / 0.12) * 0.42 : 1.12 - Math.min(0.12, (age - 0.12) * 0.8);
      const size = clamp(this.ts * 0.42, 13, 28);
      this.ctx.save();
      this.ctx.globalAlpha = 1 - smooth((k - 0.7) / 0.3);
      const x = clamp(c.x, this.ox + size * 4, this.ox + this.maze()!.cols * this.ts - size * 4);
      this.chipBox(c.text, x, Math.max(this.oy + size, c.y - smooth(k) * this.ts * 0.6), size, c.tone, pop);
      this.ctx.restore();
    }
  }

  private drawBanner() {
    const round = this.round;
    const maze = this.maze();
    if (!round || !maze) return;
    const spot = this.center({ x: (maze.cols - 1) / 2, y: maze.home.y + 2.5 });
    const size = clamp(this.ts * 0.6, 16, 40);
    if (round.phase === "ready") {
      this.chipBox(round.lives < LIVES ? "De novo!" : "Prepare-se!", spot.x, spot.y, size, "blue");
      return;
    }
    const goAge = (this.now - this.goAt) / 1000;
    if (goAge >= 0 && goAge < 0.7 && round.phase === "play") {
      this.ctx.save();
      this.ctx.globalAlpha = 1 - smooth((goAge - 0.4) / 0.3);
      this.chipBox("Vai!", spot.x, spot.y, size * 1.2, "orange", 1 + goAge * 0.4);
      this.ctx.restore();
    }
  }
}
