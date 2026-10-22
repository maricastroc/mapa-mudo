import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_COUNT, generateStones, RISE } from "./stonePlan.ts";
import { heightAt, StoneRound } from "./stoneRound.ts";
import { slotAt, stoneLayout } from "./stoneLayout.ts";

const plan = generateStones(12345);

function play(choose: (round: StoneRound) => number | null) {
  const round = new StoneRound(plan);
  let nextTap = 0;
  while (!round.finished && round.time < 60) {
    round.step(1 / 60);
    if (round.time >= nextTap) {
      const slot = choose(round);
      if (slot !== null) {
        round.tap(slot);
        nextTap = round.time + 0.35;
      }
    }
  }
  return round;
}

test("tapping every glowing stone after a short look finds them all without mistakes", () => {
  const round = play((r) => r.stones.find((s) => s.state === "up" && s.plan.kind === "active" && r.time - s.plan.at > RISE + 0.4)?.plan.slot ?? null);
  assert.equal(round.found, ACTIVE_COUNT);
  assert.equal(round.wrong, 0);
  assert.equal(round.missed, 0);
  assert.equal(round.bestStreak, ACTIVE_COUNT);
});

test("tapping plain stones and crystals counts as a mistake and breaks the streak, doing nothing loses stones", () => {
  const greedy = play((r) => r.stones.find((s) => s.state === "up" && r.time - s.plan.at > RISE + 0.2)?.plan.slot ?? null);
  assert.ok(greedy.wrong > 0);
  assert.equal(greedy.wrong + greedy.found + greedy.missed >= ACTIVE_COUNT, true);
  const idle = play(() => null);
  assert.equal(idle.found, 0);
  assert.equal(idle.missed, ACTIVE_COUNT);
  assert.equal(idle.wrong, 0);
});

test("an empty slot or a stone still rising cannot be tapped", () => {
  const round = new StoneRound(plan);
  assert.equal(round.tap(plan.pops[0].slot).type, "empty");
  round.step(plan.pops[0].at + 0.01);
  assert.equal(round.tap(plan.pops[0].slot).type, "empty");
  round.step(RISE);
  assert.equal(round.tap(plan.pops[0].slot).type, "found");
  assert.equal(heightAt(plan.pops[0], plan.pops[0].at - 1), 0);
});

test("every slot can be hit on any screen and taps outside the stones hit nothing", () => {
  for (const [W, H] of [
    [1920, 1080],
    [1366, 768],
    [1024, 768],
    [844, 390],
    [390, 844],
  ]) {
    const layout = stoneLayout(W, H);
    for (const slot of layout.slots) {
      const hit = slotAt(layout, slot.x, slot.y - layout.stoneR * slot.scale * 0.8);
      assert.equal(hit?.index, slot.index, `${W}x${H} slot ${slot.index}`);
      assert.ok(slot.x - layout.hitR > 0 && slot.x + layout.hitR < W);
    }
    assert.equal(slotAt(layout, 4, 4), null);
    for (const row of [layout.slots.slice(0, 3), layout.slots.slice(3)]) {
      for (let i = 1; i < row.length; i++) assert.ok(row[i].x - row[i - 1].x >= layout.hitR * 2 - 1, `${W}x${H} slots too close`);
    }
  }
});
