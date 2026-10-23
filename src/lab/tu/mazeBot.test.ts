import { test } from "node:test";
import assert from "node:assert/strict";
import { CASUAL_BOT, playBot, SHARP_BOT, SLOW_BOT } from "./mazeBot.ts";
import { TIME_LIMIT } from "./mazeRound.ts";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

test("an attentive player can clean every corridor", () => {
  for (const seed of SEEDS) {
    const r = playBot(seed, SHARP_BOT);
    assert.equal(r.reason, "complete", `seed ${seed}`);
    assert.ok(r.livesLost <= 2, `seed ${seed}`);
  }
});

test("a casual player usually finishes in about 45 to 60 seconds", () => {
  const runs = SEEDS.map((seed) => playBot(seed, CASUAL_BOT));
  const done = runs.filter((r) => r.reason === "complete");
  assert.ok(done.length >= SEEDS.length * 0.6, `${done.length} of ${SEEDS.length}`);
  const average = runs.reduce((s, r) => s + r.duration, 0) / runs.length;
  assert.ok(average >= 38 && average <= 62, `${average}`);
});

test("even a slow player gets far and every round ends", () => {
  for (const seed of SEEDS) {
    const r = playBot(seed, SLOW_BOT);
    assert.ok(r.reason !== null && r.duration <= TIME_LIMIT + 10, `seed ${seed}`);
    assert.ok(r.eaten >= r.total * 0.5, `seed ${seed}: ${r.eaten}`);
  }
  const idle = playBot(1, null);
  assert.equal(idle.reason, "lives");
});
