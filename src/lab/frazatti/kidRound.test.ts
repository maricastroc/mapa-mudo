import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANCES, GNAT_COUNT, generatePlan, SICK_COUNT } from "./kidPlan.ts";
import { KidRound } from "./kidRound.ts";

function run(round: KidRound, until: number) {
  while (round.time < until) round.step(1 / 60);
}

function firstTappable(round: KidRound, sick: boolean) {
  return round.kids.findIndex((k) => round.tappable(k) && k.plan.sick === sick);
}

test("vaccinating a sick kid cures them, and a cured kid cannot be tapped again", () => {
  const round = new KidRound(generatePlan(5));
  run(round, round.plan.crossings[0].at + 2);
  const i = firstTappable(round, true);
  assert.ok(i >= 0);
  assert.equal(round.tap(i)?.type, "cured");
  assert.equal(round.cured, 1);
  assert.equal(round.kids[i].status, "cured");
  assert.equal(round.tap(i), null);
  assert.equal(round.chances, CHANCES);
});

test("vaccinating a healthy kid costs a chance, once", () => {
  const round = new KidRound(generatePlan(9));
  const healthy = round.plan.crossings.find((c) => !c.sick)!;
  run(round, healthy.at + 2);
  const i = round.kids.findIndex((k) => k.plan.id === healthy.id);
  assert.equal(round.tap(i)?.type, "healthy");
  assert.equal(round.chances, CHANCES - 1);
  assert.equal(round.tap(i), null);
  assert.equal(round.wrong, 1);
});

test("a sick kid who walks past counts as missed, and three mistakes end the game", () => {
  const round = new KidRound(generatePlan(3));
  run(round, 400);
  assert.equal(round.missed, SICK_COUNT);
  assert.equal(round.ended, "done");
  assert.ok(round.settled);

  const second = new KidRound(generatePlan(3));
  let mistakes = 0;
  while (second.time < 400 && !second.ended) {
    second.step(1 / 60);
    const i = firstTappable(second, false);
    if (i >= 0 && second.tap(i)) mistakes += 1;
  }
  assert.equal(mistakes, CHANCES);
  assert.equal(second.ended, "chances");
});

test("curing all ten sick kids completes the game", () => {
  const round = new KidRound(generatePlan(21));
  while (round.time < 400 && !round.ended) {
    round.step(1 / 60);
    const i = firstTappable(round, true);
    if (i >= 0) round.tap(i);
  }
  assert.equal(round.cured, SICK_COUNT);
  assert.equal(round.ended, "complete");
  assert.equal(round.wrong, 0);
});

test("swatting a passing mosquito counts once, and mosquitos never cost a chance", () => {
  const round = new KidRound(generatePlan(4));
  assert.equal(round.gnats.length, GNAT_COUNT);
  run(round, round.plan.gnats[0].at + 0.5);
  const i = round.gnats.findIndex((g) => round.gnatTappable(g));
  assert.ok(i >= 0);
  assert.equal(round.swat(i)?.type, "swatted");
  assert.equal(round.swatted, 1);
  assert.equal(round.swat(i), null);
  assert.equal(round.chances, CHANCES);
  run(round, 400);
  assert.equal(round.swatted, 1);
  assert.ok(round.gnats.every((g) => g.status === "swatted" || g.status === "gone"));
});

test("a plan has twelve fast mosquitos spread across the game", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { gnats, crossings } = generatePlan(seed);
    const end = Math.max(...crossings.map((c) => c.at + c.duration));
    assert.equal(gnats.length, GNAT_COUNT);
    assert.ok(gnats.every((g) => g.duration >= 2.4 && g.duration <= 3.2));
    assert.ok(gnats[0].at >= 5 && gnats[GNAT_COUNT - 1].at < end);
    assert.ok(gnats.every((g, k) => k === 0 || g.at > gnats[k - 1].at + 1.5));
  }
});
