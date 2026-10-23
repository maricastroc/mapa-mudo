import { distances, exits, index, MAZE, neighbor, OPPOSITE, type Dir, type Tile } from "./maze.ts";
import { LIVES, MazeRound, nearestTile, type EndReason } from "./mazeRound.ts";

export type Bot = { reaction: number; caution: number };

export const SHARP_BOT: Bot = { reaction: 0.08, caution: 3 };
export const CASUAL_BOT: Bot = { reaction: 0.2, caution: 2 };
export const SLOW_BOT: Bot = { reaction: 0.35, caution: 2 };

function riskMap(round: MazeRound, caution: number) {
  const { maze } = round;
  const risk = new Map<number, number>();
  for (const g of round.parasites) {
    if (g.state !== "active" || g.scared) continue;
    const from = nearestTile(maze, g);
    const ahead = new Set<number>();
    let tile = from;
    for (let i = 0; i < caution + 2 && g.dir; i++) {
      if (!exits(maze, tile).includes(g.dir)) break;
      tile = neighbor(maze, tile, g.dir);
      ahead.add(index(maze, tile));
    }
    for (const [key, d] of distances(maze, from)) {
      const near = Math.max(0, caution + 1 - d);
      const extra = (near > 0 ? 14 * near * near : 0) + (ahead.has(key) ? 18 : 0);
      if (extra) risk.set(key, (risk.get(key) ?? 0) + extra);
    }
  }
  return risk;
}

function cheapest(round: MazeRound, from: Tile, risk: Map<number, number>) {
  const { maze } = round;
  const cost = new Map<number, number>();
  const first = new Map<number, Dir>();
  const start = index(maze, from);
  cost.set(start, 0);
  const open: number[] = [start];
  const done = new Set<number>();
  while (open.length) {
    open.sort((a, b) => cost.get(a)! - cost.get(b)!);
    const key = open.shift()!;
    if (done.has(key)) continue;
    done.add(key);
    const tile = { x: key % maze.cols, y: Math.floor(key / maze.cols) };
    for (const dir of exits(maze, tile)) {
      const next = neighbor(maze, tile, dir);
      const nk = index(maze, next);
      const c = cost.get(key)! + 1 + (risk.get(nk) ?? 0);
      if (c < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, c);
        first.set(nk, key === start ? dir : first.get(key)!);
        open.push(nk);
      }
    }
  }
  return { cost, first };
}

function best(keys: Iterable<number>, cost: Map<number, number>, limit = Infinity) {
  let pick = -1;
  let pickCost = Infinity;
  for (const k of keys) {
    const c = cost.get(k);
    if (c !== undefined && c < pickCost && c <= limit) {
      pick = k;
      pickCost = c;
    }
  }
  return { pick, cost: pickCost };
}

function plan(round: MazeRound, from: Tile, risk: Map<number, number>) {
  const { maze } = round;
  const map = cheapest(round, from, risk);
  const threatNear = [...risk.values()].some((v) => v >= 14) && (risk.get(index(maze, from)) ?? 0) > 0;
  let target = { pick: -1, cost: Infinity };
  if (round.fright > 1.5) {
    const scared = round.parasites.filter((g) => g.state === "active" && g.scared).map((g) => index(maze, nearestTile(maze, g)));
    target = best(scared, map.cost, 8);
  }
  if (target.pick < 0 && threatNear) target = best(round.doses, map.cost, 10);
  if (target.pick < 0) target = best(round.leaves, map.cost);
  if (target.pick < 0) target = best(round.doses, map.cost);
  return { dir: target.pick >= 0 ? (map.first.get(target.pick) ?? null) : null, cost: target.cost + (risk.get(index(maze, from)) ?? 0) };
}

export function botWant(round: MazeRound, bot: Bot): Dir | null {
  const { maze } = round;
  const pl = round.player;
  const risk = riskMap(round, bot.caution);
  if (!pl.dir || pl.p === 0) return plan(round, pl.tile, risk).dir;
  const ahead = plan(round, neighbor(maze, pl.tile, pl.dir), risk);
  const behind = plan(round, pl.tile, risk);
  if (behind.cost + 0.5 < ahead.cost) return OPPOSITE[pl.dir];
  return ahead.dir ?? pl.dir;
}

export type BotResult = { reason: EndReason | null; duration: number; eaten: number; total: number; livesLost: number; neutralized: number; doses: number };

export function playBot(seed: number, bot: Bot | null, limit = 140): BotResult {
  const round = new MazeRound(seed, MAZE);
  let clock = 0;
  const dt = 1 / 60;
  while (!round.ended && round.time < limit) {
    clock -= dt;
    if (bot && clock <= 0) {
      clock = bot.reaction;
      const want = botWant(round, bot);
      if (want) round.steer(want);
    }
    round.step(dt);
  }
  return {
    reason: round.ended,
    duration: round.time,
    eaten: round.eaten,
    total: round.total,
    livesLost: LIVES - Math.max(0, round.lives),
    neutralized: round.neutralized,
    doses: round.doseCount,
  };
}
