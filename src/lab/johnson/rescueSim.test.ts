import { test } from "node:test";
import assert from "node:assert/strict";
import { rescueGeometry } from "./rescueGeometry.ts";
import { CAPSULE_COUNT } from "./rescuePlan.ts";
import { ATTENTIVE, playRound, REFERENCE, REFERENCE_BAND, serveRound } from "./rescueSim.ts";

const SCREENS: [number, number][] = [
  [1920, 1080],
  [1366, 768],
  [1024, 768],
  [844, 390],
  [390, 844],
];
const seeds = Array.from({ length: 24 }, (_, i) => (i + 7) * 97531);

test("every round handed to a player has been checked and can be won without a scratch", () => {
  for (const [W, H] of SCREENS) {
    const g = rescueGeometry(W, H);
    for (const seed of seeds) {
      const plan = serveRound(seed, g);
      assert.ok(plan.verified, `${W}x${H} seed ${seed} was not verified`);
      const result = playRound(plan, g, ATTENTIVE);
      assert.equal(result.rescued, CAPSULE_COUNT, `${W}x${H} seed ${seed}`);
      assert.equal(result.hits, 0, `${W}x${H} seed ${seed}`);
    }
  }
});

test("a slower reference player scores about the same in every round", () => {
  for (const [W, H] of SCREENS) {
    const g = rescueGeometry(W, H);
    const scores = seeds.map((seed) => playRound(serveRound(seed, g), g, REFERENCE).score);
    for (const s of scores) assert.ok(s >= REFERENCE_BAND[0] && s <= REFERENCE_BAND[1], `${W}x${H} score ${s}`);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    assert.ok(avg >= 6.6 && avg <= 8, `${W}x${H} average ${avg}`);
  }
});

test("a fixed seed reproduces the round on the same screen and capsules always land where the ship can be", () => {
  for (const [W, H] of SCREENS) {
    const g = rescueGeometry(W, H);
    assert.deepEqual(serveRound(777, g), serveRound(777, g));
    for (const d of serveRound(777, g).drops) assert.ok(d.lane >= 0 && d.lane <= 1);
  }
});
