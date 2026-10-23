import { test } from "node:test";
import assert from "node:assert/strict";
import { onScreen } from "./frogMotion.ts";
import { CHANCES, generatePlan, SPECIES_COUNT } from "./frogPlan.ts";
import { FrogRound, type FrogEvent } from "./frogRound.ts";

function run(round: FrogRound, until: number, onFrame?: (events: FrogEvent[]) => void) {
  const events: FrogEvent[] = [];
  while (round.time < until) {
    const frame = round.step(1 / 60);
    events.push(...frame);
    onFrame?.(frame);
  }
  return events;
}

function visibleIndex(round: FrogRound, predicate: (species: number) => boolean) {
  return round.frogs.findIndex((f) => round.tappable(f) && onScreen(round.motion(f).u) && predicate(f.plan.species));
}

test("tapping a new frog writes it in the notebook, tapping it again costs a chance", () => {
  const round = new FrogRound(generatePlan(11));
  run(round, round.plan.crossings[0].at + 1.2);
  const first = visibleIndex(round, () => true);
  const registered = round.tap(first);
  assert.equal(registered?.type, "registered");
  assert.ok(round.catalog.has(round.plan.crossings[0].species));
  assert.equal(round.tap(first), null);
  const repeat = round.plan.crossings.findIndex((c) => !c.first);
  run(round, round.plan.crossings[repeat].at + 1.4);
  const already = round.tap(repeat);
  assert.equal(already?.type, "already");
  assert.equal(round.chances, CHANCES - 1);
  assert.equal(round.wrong, 1);
  assert.equal(round.frogs[repeat].status, "fled");
  assert.equal(round.ended, null);
});

test("a new frog that gets away can be caught when it comes back", () => {
  const round = new FrogRound(generatePlan(23));
  const species = round.plan.crossings[0].species;
  const events = run(round, round.plan.crossings[2].at + 0.1);
  assert.ok(events.some((e) => e.type === "escaped" && e.frog.plan.species === species));
  assert.ok(round.isNew(species));
  const again = round.plan.crossings.findIndex((c, i) => i > 0 && c.species === species);
  run(round, round.plan.crossings[again].at + 1.4);
  assert.equal(round.tap(again)?.type, "registered");
});

test("a frog already in the notebook that is left alone counts as a sighting", () => {
  const round = new FrogRound(generatePlan(5));
  run(round, round.plan.crossings[0].at + 1.2);
  round.tap(0);
  const repeat = round.plan.crossings.findIndex((c) => !c.first);
  const events = run(round, round.plan.crossings[repeat].at + 8);
  assert.ok(events.some((e) => e.type === "passed" && e.frog.plan.id === repeat));
  assert.equal(round.sightings[round.plan.crossings[0].species], 1);
});

test("an attentive player completes the notebook and the round ends right away", () => {
  const round = new FrogRound(generatePlan(99));
  let complete = false;
  run(round, 60, () => {
    if (round.ended) return;
    const index = visibleIndex(round, (s) => round.isNew(s));
    if (index >= 0 && round.motion(round.frogs[index]).u > 0.25) {
      const event = round.tap(index);
      if (event?.type === "registered" && event.complete) complete = true;
    }
  });
  assert.ok(complete);
  assert.equal(round.ended, "complete");
  assert.equal(round.registered, SPECIES_COUNT);
  assert.equal(round.wrong, 0);
  assert.ok(round.settled);
});

test("running out of chances ends the round, but it still finishes", () => {
  const round = new FrogRound(generatePlan(3));
  run(round, 60, () => {
    if (round.ended) return;
    const index = visibleIndex(round, () => true);
    if (index >= 0 && round.motion(round.frogs[index]).u > 0.3) round.tap(index);
  });
  assert.equal(round.ended, "chances");
  assert.equal(round.chances, 0);
  assert.ok(round.settled);
});

test("a player who never taps lets every frog go and the round still ends", () => {
  const round = new FrogRound(generatePlan(8));
  const events = run(round, 60);
  assert.ok(events.some((e) => e.type === "end" && e.reason === "done"));
  assert.equal(round.registered, 0);
  assert.equal(round.escaped, round.plan.crossings.length);
});
