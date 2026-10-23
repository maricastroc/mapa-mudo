import { test } from "node:test";
import assert from "node:assert/strict";
import { distances, index, MAZE, neighbor } from "./maze.ts";
import { CAUGHT, CORNER, FRIGHT, GRACE, LIVES, MazeRound, moverPos, nearestTile, PATROL, PLAYER_SPEED, READY, RESPAWN_READY, WARN, type MazeEvent } from "./mazeRound.ts";

function run(round: MazeRound, seconds: number) {
  const events: MazeEvent[] = [];
  const end = round.time + seconds;
  while (round.time < end - 1e-9 && !round.ended) events.push(...round.step(Math.min(1 / 60, end - round.time)));
  return events;
}

function calm(round: MazeRound) {
  for (const g of round.parasites) {
    g.state = "home";
    g.releaseAt = Infinity;
  }
}

test("nothing moves during the short ready pause, then the player follows the chosen direction", () => {
  const round = new MazeRound(1);
  round.steer("left");
  run(round, READY - 0.1);
  assert.deepEqual(moverPos(round.player), MAZE.start);
  run(round, 0.5);
  assert.equal(round.phase, "play");
  assert.ok(moverPos(round.player).x < MAZE.start.x);
});

test("a direction pressed early turns at the next opening and a wall stops the player", () => {
  const round = new MazeRound(2);
  calm(round);
  round.steer("left");
  run(round, READY + 0.05);
  round.steer("down");
  run(round, 2 / PLAYER_SPEED + 0.05);
  const pos = moverPos(round.player);
  assert.ok(pos.y > MAZE.start.y, "turned down at the first opening on the left");
  assert.equal(nearestTile(MAZE, round.player).x, 6);
  run(round, 3);
  assert.equal(round.player.dir, null, "stopped against the wall");
});

test("reversing is instant and a late turn just past a crossing still works", () => {
  const round = new MazeRound(3);
  calm(round);
  round.steer("left");
  run(round, READY + 0.6 / PLAYER_SPEED);
  const before = moverPos(round.player).x;
  round.steer("right");
  run(round, 0.1);
  assert.ok(moverPos(round.player).x > before);

  const late = new MazeRound(3);
  calm(late);
  late.player.tile = { x: 6, y: 9 };
  late.player.dir = "left";
  late.player.p = CORNER * 0.6;
  late.phase = "play";
  late.steer("down");
  run(late, 0.2);
  assert.equal(late.player.dir, "down");
  assert.equal(late.player.tile.x, 6);
});

test("walking over leaves collects them, and the round ends when the corridors are clean", () => {
  const round = new MazeRound(4);
  calm(round);
  round.steer("left");
  const events = run(round, READY + 1.2);
  const leaves = events.filter((e) => e.type === "leaf");
  assert.ok(leaves.length >= 2);
  assert.equal(round.eaten, leaves.length);
  for (const key of [...round.leaves]) round.leaves.delete(key);
  const here = nearestTile(MAZE, round.player);
  assert.deepEqual(here, { x: 4, y: 9 });
  round.leaves.add(index(MAZE, neighbor(MAZE, here, "right")));
  round.steer("right");
  const end = run(round, 2);
  assert.ok(end.some((e) => e.type === "end" && e.reason === "complete"));
  assert.equal(round.ended, "complete");
});

test("a dose scares the parasites for a few seconds, they flee and can be neutralized", () => {
  const round = new MazeRound(5);
  run(round, READY + 2.5);
  const dose = MAZE.doses[0];
  round.player.tile = { x: dose % MAZE.cols, y: Math.floor(dose / MAZE.cols) };
  round.player.p = 0;
  round.player.dir = null;
  round.steer("down");
  const events = run(round, 0.3);
  assert.ok(events.some((e) => e.type === "dose"));
  assert.ok(round.frightened);
  const active = round.parasites.filter((g) => g.state === "active");
  assert.ok(active.length >= 1 && active.every((g) => g.scared));
  const target = active[0];
  target.tile = nearestTile(MAZE, round.player);
  target.p = 0;
  target.pos = moverPos(round.player);
  const hit = run(round, 0.05);
  assert.ok(hit.some((e) => e.type === "neutralize"));
  assert.equal(target.state, "gone");
  assert.equal(round.lives, LIVES);
  const later = run(round, FRIGHT);
  assert.ok(later.some((e) => e.type === "warn"));
  assert.ok(later.some((e) => e.type === "calm"));
  assert.ok(round.parasites.every((g) => !g.scared));
  assert.ok(FRIGHT - WARN > 3);
});

test("touching a parasite costs a life, and the player comes back far from danger and briefly protected", () => {
  const round = new MazeRound(6);
  run(round, READY + 0.2);
  const chaser = round.parasites[0];
  chaser.tile = nearestTile(MAZE, round.player);
  chaser.p = 0;
  chaser.pos = moverPos(round.player);
  const events = run(round, 0.05);
  assert.ok(events.some((e) => e.type === "caught"));
  assert.equal(round.lives, LIVES - 1);
  const after = run(round, CAUGHT + 0.05);
  assert.ok(after.some((e) => e.type === "respawn"));
  assert.deepEqual(round.player.tile, MAZE.start);
  const reach = distances(MAZE, MAZE.start);
  for (const g of round.parasites) {
    if (g.state === "active") assert.ok((reach.get(index(MAZE, g.tile)) ?? 0) >= 8);
  }
  run(round, RESPAWN_READY + 0.05);
  assert.ok(round.player.grace > GRACE - 0.2);
});

test("losing every life ends the round so the reveal is always reached", () => {
  const round = new MazeRound(7);
  const events = run(round, 120);
  assert.ok(events.some((e) => e.type === "end" && e.reason === "lives"));
  assert.equal(round.lives, 0);
  assert.ok(round.time < 60);
});

test("each parasite has its own readable habit", () => {
  const round = new MazeRound(8);
  run(round, READY + 0.1);
  round.mode = "chase";
  const [chaser, interceptor, patroller] = round.parasites;
  round.player.tile = { x: 7, y: 3 };
  round.player.dir = "right";
  round.player.p = 0;
  assert.deepEqual(round.targetOf(chaser), { x: 7, y: 3 });
  assert.deepEqual(round.targetOf(interceptor), { x: 11, y: 3 });
  patroller.tile = { x: 2, y: 14 };
  assert.deepEqual(round.targetOf(patroller), PATROL[patroller.waypoint]);
  patroller.tile = { x: 7, y: 5 };
  assert.deepEqual(round.targetOf(patroller), { x: 7, y: 3 });
  round.mode = "scatter";
  assert.notDeepEqual(round.targetOf(chaser), { x: 7, y: 3 });
});

test("parasites leave home one at a time and speed up as the corridors empty", () => {
  const round = new MazeRound(9);
  const events = run(round, READY + 6);
  const releases = events.filter((e) => e.type === "release").map((e) => (e.type === "release" ? e.id : -1));
  assert.deepEqual(releases, [1, 2]);
  const chaser = round.parasites[0];
  chaser.scared = false;
  const slow = (round as unknown as { speedOf: (g: typeof chaser) => number }).speedOf(chaser);
  for (const key of [...round.leaves].slice(0, 80)) round.leaves.delete(key);
  const fast = (round as unknown as { speedOf: (g: typeof chaser) => number }).speedOf(chaser);
  assert.ok(fast > slow);
  assert.ok(fast < PLAYER_SPEED);
});
