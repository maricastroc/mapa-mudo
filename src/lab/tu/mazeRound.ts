import { createRandom, type Random } from "../random.ts";
import { exits, index, inTunnel, MAZE, neighbor, open, OPPOSITE, ORDER, STEP, type Dir, type Maze, type Tile } from "./maze.ts";

export type Kind = "chaser" | "interceptor" | "patroller";
export type Mode = "scatter" | "chase";
export type Phase = "ready" | "play" | "caught" | "over";
export type EndReason = "complete" | "lives" | "time";
export type Point = { x: number; y: number };

export type Mover = { tile: Tile; dir: Dir | null; p: number };

export type Player = Mover & { want: Dir | null; facing: Dir; grace: number };

export type ParasiteState = "home" | "leaving" | "active" | "gone";

export type Parasite = Mover & {
  id: number;
  kind: Kind;
  state: ParasiteState;
  pos: Point;
  releaseAt: number;
  backAt: number;
  scared: boolean;
  waypoint: number;
};

export type MazeEvent =
  | { type: "leaf"; tile: Tile; left: number }
  | { type: "dose"; tile: Tile }
  | { type: "warn" }
  | { type: "calm" }
  | { type: "neutralize"; id: number; at: Point; chain: number }
  | { type: "caught"; at: Point; by: number }
  | { type: "respawn" }
  | { type: "go" }
  | { type: "mode"; mode: Mode }
  | { type: "release"; id: number }
  | { type: "end"; reason: EndReason };

export const PLAYER_SPEED = 5.8;
export const LIVES = 3;
export const READY = 1.4;
export const RESPAWN_READY = 1.1;
export const CAUGHT = 1.5;
export const GRACE = 1.6;
export const FRIGHT = 6;
export const WARN = 1.6;
export const GONE = 2.6;
export const HIT = 0.62;
export const CORNER = 0.32;
export const TIME_LIMIT = 100;
export const SPEED = { from: 0.55, to: 0.76, scared: 0.5, tunnel: 0.5, home: 2.4 };
export const MODES: readonly { mode: Mode; until: number }[] = [
  { mode: "scatter", until: 7 },
  { mode: "chase", until: 22 },
  { mode: "scatter", until: 29 },
  { mode: "chase", until: Infinity },
];
export const CORNERS: Record<Kind, Tile> = { chaser: { x: 13, y: -2 }, interceptor: { x: 1, y: -2 }, patroller: { x: 7, y: 16 } };
export const PATROL: readonly Tile[] = [
  { x: 2, y: 14 },
  { x: 12, y: 14 },
  { x: 13, y: 10 },
  { x: 7, y: 12 },
  { x: 1, y: 10 },
];
export const KINDS: readonly Kind[] = ["chaser", "interceptor", "patroller"];
export const PATROL_SIGHT = 5;
export const AHEAD = 4;

const SUBSTEP = 1 / 120;

export function moverPos(m: Mover): Point {
  if (!m.dir || m.p === 0) return { x: m.tile.x, y: m.tile.y };
  const s = STEP[m.dir];
  return { x: m.tile.x + s.x * m.p, y: m.tile.y + s.y * m.p };
}

export function nearestTile(maze: Maze, m: Mover): Tile {
  if (!m.dir || m.p < 0.5) return m.tile;
  return neighbor(maze, m.tile, m.dir);
}

export function gap(maze: Maze, a: Point, b: Point) {
  const raw = Math.abs(a.x - b.x);
  const dx = Math.min(raw, maze.cols - raw);
  return Math.hypot(dx, a.y - b.y);
}

function homeSlot(maze: Maze, id: number): Point {
  return { x: maze.home.x + (id === 1 ? 0 : id === 2 ? 1 : -1), y: maze.home.y };
}

export class MazeRound {
  readonly maze: Maze;
  readonly seed: number;
  private rng: Random;
  time = 0;
  playTime = 0;
  phase: Phase = "ready";
  phaseLeft = READY;
  modeClock = 0;
  mode: Mode = "scatter";
  player: Player;
  parasites: Parasite[];
  leaves: Set<number>;
  doses: Set<number>;
  total: number;
  lives = LIVES;
  fright = 0;
  warned = false;
  chain = 0;
  neutralized = 0;
  doseCount = 0;
  ended: EndReason | null = null;
  endedAt = 0;

  constructor(seed: number, maze: Maze = MAZE) {
    this.maze = maze;
    this.seed = seed;
    this.rng = createRandom(seed);
    this.leaves = new Set(maze.leaves);
    this.doses = new Set(maze.doses);
    this.total = maze.leaves.length;
    this.player = { tile: { ...maze.start }, dir: null, p: 0, want: null, facing: "left", grace: 0 };
    this.parasites = KINDS.map((kind, id) => ({
      id,
      kind,
      tile: { ...maze.outside },
      dir: null,
      p: 0,
      state: "home",
      pos: homeSlot(maze, id),
      releaseAt: 0,
      backAt: 0,
      scared: false,
      waypoint: 0,
    }));
    this.place([0, 1.5, 5]);
  }

  get eaten() {
    return this.total - this.leaves.size;
  }

  get progress() {
    return this.eaten / this.total;
  }

  get frightened() {
    return this.fright > 0;
  }

  private place(release: number[]) {
    const { maze } = this;
    this.player.tile = { ...maze.start };
    this.player.dir = null;
    this.player.p = 0;
    this.player.facing = "left";
    for (const g of this.parasites) {
      g.scared = false;
      g.dir = null;
      g.p = 0;
      g.waypoint = 0;
      if (release[g.id] <= 0) {
        g.state = "active";
        g.tile = { ...maze.outside };
        g.dir = g.id === 0 ? "left" : "right";
        g.pos = moverPos(g);
      } else {
        g.state = "home";
        g.pos = homeSlot(maze, g.id);
        g.releaseAt = this.time + release[g.id];
      }
    }
  }

  steer(dir: Dir) {
    this.player.want = dir;
  }

  step(dt: number): MazeEvent[] {
    const events: MazeEvent[] = [];
    let left = Math.max(0, dt);
    while (left > 1e-9 && !this.ended) {
      const h = Math.min(SUBSTEP, left);
      left -= h;
      this.tick(h, events);
    }
    return events;
  }

  private tick(h: number, events: MazeEvent[]) {
    this.time += h;
    if (this.phase === "ready") {
      this.phaseLeft -= h;
      if (this.phaseLeft <= 0) {
        this.phase = "play";
        events.push({ type: "go" });
      }
      return;
    }
    if (this.phase === "caught") {
      this.phaseLeft -= h;
      if (this.phaseLeft <= 0) this.afterCaught(events);
      return;
    }
    if (this.phase !== "play") return;
    this.playTime += h;
    this.player.grace = Math.max(0, this.player.grace - h);
    this.updateMode(h, events);
    this.movePlayer(PLAYER_SPEED * h, events);
    if (this.ended) return;
    for (const g of this.parasites) this.moveParasite(g, h, events);
    this.collide(events);
    if (!this.ended && this.phase === "play" && this.playTime >= TIME_LIMIT) this.finish("time", events);
  }

  private updateMode(h: number, events: MazeEvent[]) {
    if (this.fright > 0) {
      this.fright = Math.max(0, this.fright - h);
      if (!this.warned && this.fright <= WARN && this.fright > 0) {
        this.warned = true;
        events.push({ type: "warn" });
      }
      if (this.fright === 0) {
        for (const g of this.parasites) g.scared = false;
        this.chain = 0;
        events.push({ type: "calm" });
      }
      return;
    }
    this.modeClock += h;
    const mode = MODES.find((m) => this.modeClock < m.until)?.mode ?? "chase";
    if (mode !== this.mode) {
      this.mode = mode;
      for (const g of this.parasites) if (g.state === "active") this.reverse(g);
      events.push({ type: "mode", mode });
    }
  }

  private reverse(m: Mover) {
    if (!m.dir) return;
    if (m.p > 0) {
      m.tile = neighbor(this.maze, m.tile, m.dir);
      m.p = 1 - m.p;
    }
    m.dir = OPPOSITE[m.dir];
  }

  private movePlayer(distance: number, events: MazeEvent[]) {
    const { maze } = this;
    const pl = this.player;
    let dist = distance;
    let guard = 0;
    while (dist > 1e-9 && guard++ < 8) {
      const want = pl.want;
      if (pl.dir === null) {
        if (want && open(maze, pl.tile, want)) pl.dir = want;
        else break;
      }
      if (want && want !== pl.dir) {
        if (want === OPPOSITE[pl.dir]) {
          this.reverse(pl);
        } else if (pl.p < CORNER && open(maze, pl.tile, want)) {
          pl.p = 0;
          pl.dir = want;
        }
      }
      const remaining = 1 - pl.p;
      if (dist < remaining) {
        pl.p += dist;
        dist = 0;
      } else {
        dist -= remaining;
        pl.tile = neighbor(maze, pl.tile, pl.dir);
        pl.p = 0;
        this.eat(pl.tile, events);
        if (want && open(maze, pl.tile, want)) pl.dir = want;
        else if (!open(maze, pl.tile, pl.dir)) {
          pl.dir = null;
          dist = 0;
        }
      }
      if (pl.dir === "left" || pl.dir === "right") pl.facing = pl.dir;
    }
    this.eat(nearestTile(maze, pl), events);
  }

  private eat(tile: Tile, events: MazeEvent[]) {
    const key = index(this.maze, tile);
    if (this.leaves.delete(key)) {
      events.push({ type: "leaf", tile, left: this.leaves.size });
      if (this.leaves.size === 0) this.finish("complete", events);
      return;
    }
    if (this.doses.delete(key)) {
      this.doseCount += 1;
      this.fright = FRIGHT;
      this.warned = false;
      this.chain = 0;
      for (const g of this.parasites) {
        if (g.state !== "active") continue;
        if (!g.scared) this.reverse(g);
        g.scared = true;
      }
      events.push({ type: "dose", tile });
    }
  }

  private speedOf(g: Parasite) {
    if (g.scared) return PLAYER_SPEED * SPEED.scared;
    const base = PLAYER_SPEED * (SPEED.from + (SPEED.to - SPEED.from) * this.progress);
    return inTunnel(this.maze, g.tile) ? PLAYER_SPEED * SPEED.tunnel : base;
  }

  private moveParasite(g: Parasite, h: number, events: MazeEvent[]) {
    const { maze } = this;
    if (g.state === "gone") {
      if (this.time >= g.backAt) {
        g.state = "home";
        g.pos = homeSlot(maze, g.id);
        g.releaseAt = this.time + 1;
      }
      return;
    }
    if (g.state === "home") {
      if (this.time >= g.releaseAt) {
        g.state = "leaving";
        events.push({ type: "release", id: g.id });
      }
      return;
    }
    if (g.state === "leaving") {
      let dist = SPEED.home * h;
      const target = Math.abs(g.pos.x - maze.home.x) > 1e-6 ? { x: maze.home.x, y: g.pos.y } : { x: maze.outside.x, y: maze.outside.y };
      const dx = target.x - g.pos.x;
      const dy = target.y - g.pos.y;
      const len = Math.hypot(dx, dy);
      if (len <= dist) {
        g.pos = { ...target };
        dist -= len;
        if (target.y === maze.outside.y) {
          g.state = "active";
          g.tile = { ...maze.outside };
          g.p = 0;
          g.dir = "up";
          g.dir = this.choose(g);
        }
      } else {
        g.pos = { x: g.pos.x + (dx / len) * dist, y: g.pos.y + (dy / len) * dist };
      }
      return;
    }
    let dist = this.speedOf(g) * h;
    let guard = 0;
    while (dist > 1e-9 && guard++ < 8) {
      if (!g.dir) g.dir = this.choose(g);
      const remaining = 1 - g.p;
      if (dist < remaining) {
        g.p += dist;
        dist = 0;
      } else {
        dist -= remaining;
        g.tile = neighbor(maze, g.tile, g.dir);
        g.p = 0;
        this.advanceWaypoint(g);
        g.dir = this.choose(g);
      }
    }
    g.pos = moverPos(g);
  }

  private advanceWaypoint(g: Parasite) {
    if (g.kind !== "patroller") return;
    const w = PATROL[g.waypoint];
    if (Math.abs(g.tile.x - w.x) + Math.abs(g.tile.y - w.y) <= 1) g.waypoint = (g.waypoint + 1) % PATROL.length;
  }

  targetOf(g: Parasite): Tile {
    const pl = this.player;
    const here = nearestTile(this.maze, pl);
    if (g.kind === "patroller") {
      const near = Math.abs(here.x - g.tile.x) + Math.abs(here.y - g.tile.y) <= PATROL_SIGHT;
      return this.mode === "chase" && near ? here : PATROL[g.waypoint];
    }
    if (this.mode === "scatter") return CORNERS[g.kind];
    if (g.kind === "chaser") return here;
    const s = STEP[pl.dir ?? pl.facing];
    return { x: here.x + s.x * AHEAD, y: here.y + s.y * AHEAD };
  }

  choose(g: Parasite): Dir {
    const { maze } = this;
    const back = g.dir ? OPPOSITE[g.dir] : null;
    const options = exits(maze, g.tile).filter((d) => d !== back);
    if (options.length === 0) return back ?? "left";
    if (g.scared) return options[Math.floor(this.rng.next() * options.length)];
    const target = this.targetOf(g);
    let best = options[0];
    let bestD = Infinity;
    for (const d of ORDER) {
      if (!options.includes(d)) continue;
      const n = neighbor(maze, g.tile, d);
      const dd = (n.x - target.x) ** 2 + (n.y - target.y) ** 2;
      if (dd < bestD) {
        best = d;
        bestD = dd;
      }
    }
    return best;
  }

  private collide(events: MazeEvent[]) {
    const p = moverPos(this.player);
    for (const g of this.parasites) {
      if (g.state !== "active") continue;
      if (gap(this.maze, p, g.pos) > HIT) continue;
      if (g.scared) {
        g.state = "gone";
        g.scared = false;
        g.backAt = this.time + GONE;
        this.chain += 1;
        this.neutralized += 1;
        events.push({ type: "neutralize", id: g.id, at: { ...g.pos }, chain: this.chain });
        continue;
      }
      if (this.player.grace > 0) continue;
      this.phase = "caught";
      this.phaseLeft = CAUGHT;
      this.lives -= 1;
      events.push({ type: "caught", at: p, by: g.id });
      return;
    }
  }

  private afterCaught(events: MazeEvent[]) {
    if (this.lives <= 0) {
      this.finish("lives", events);
      return;
    }
    this.fright = 0;
    this.chain = 0;
    this.modeClock = 0;
    this.mode = "scatter";
    this.place([0, 1.2, 3]);
    this.player.want = null;
    this.player.grace = GRACE;
    this.phase = "ready";
    this.phaseLeft = RESPAWN_READY;
    events.push({ type: "respawn" });
  }

  private finish(reason: EndReason, events: MazeEvent[]) {
    if (this.ended) return;
    this.ended = reason;
    this.endedAt = this.time;
    this.phase = "over";
    this.fright = 0;
    events.push({ type: "end", reason });
  }
}
