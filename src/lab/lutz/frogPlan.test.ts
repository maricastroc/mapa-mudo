import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptable,
  assessPlan,
  CROSSING_COUNT,
  describe,
  difference,
  generatePlan,
  playPlan,
  SLOW_PLAYER,
  SPECIES_COUNT,
} from "./frogPlan.ts";

const SEEDS = Array.from({ length: 40 }, (_, i) => 1 + i * 7919);

test("every round passes the fairness checks", () => {
  for (const seed of SEEDS) {
    const plan = generatePlan(seed);
    assert.ok(plan.accepted, `seed ${seed}`);
    assert.ok(acceptable(assessPlan(plan)), `seed ${seed}`);
    assert.equal(plan.crossings.length, CROSSING_COUNT);
    assert.equal(plan.species.length, SPECIES_COUNT);
  }
});

test("the same seed gives the same round, and seeds vary", () => {
  assert.deepEqual(generatePlan(42), generatePlan(42));
  const looks = new Set(SEEDS.map((seed) => generatePlan(seed).species.map(describe).join("|")));
  assert.ok(looks.size > SEEDS.length * 0.9);
});

test("a round lasts between 33 and 42 seconds and frogs get faster", () => {
  for (const seed of SEEDS.slice(0, 12)) {
    const plan = generatePlan(seed);
    const report = assessPlan(plan);
    assert.ok(report.duration >= 33 && report.duration <= 42, `${report.duration}`);
    const speed = (stage: string) => {
      const list = plan.crossings.filter((c) => c.stage === stage);
      return list.reduce((sum, c) => sum + c.duration, 0) / list.length;
    };
    assert.ok(speed("warmup") > speed("build") && speed("build") > speed("finale"));
  }
});

test("the first frogs are easy to tell apart and the last ones are lookalikes", () => {
  for (const seed of SEEDS) {
    const { species } = generatePlan(seed);
    const warmup = species.slice(0, 3);
    for (let i = 0; i < warmup.length; i++) for (let j = i + 1; j < warmup.length; j++) assert.equal(difference(warmup[i], warmup[j]), 3);
    const lookalikes = species.filter((s) => s.twin !== null);
    assert.equal(lookalikes.length, 2);
    for (const l of lookalikes) {
      assert.equal(difference(l, species[l.twin!]), 1);
      for (const other of species) if (other.id !== l.id && other.id !== l.twin) assert.ok(difference(l, other) >= 2);
    }
  }
});

test("every species comes back at least once, never twice on screen at the same time", () => {
  for (const seed of SEEDS) {
    const plan = generatePlan(seed);
    const report = assessPlan(plan);
    assert.ok(report.appearances.every((n) => n >= 2), `seed ${seed}`);
    assert.equal(report.overlapsSameSpecies, 0);
    assert.ok(report.maxOut <= 3);
    const first = plan.crossings[0];
    assert.ok(first.first && plan.crossings[1].at - first.at >= 2.3);
    const firstRepeat = plan.crossings.find((c) => !c.first)!;
    assert.equal(firstRepeat.species, first.species);
  }
});

test("speed is not the challenge: even a slow player can reach every new frog", () => {
  for (const seed of SEEDS) {
    const plan = generatePlan(seed);
    assert.equal(playPlan(plan, SLOW_PLAYER).registered, SPECIES_COUNT, `seed ${seed}`);
  }
});

test("frogs are described in plain Portuguese", () => {
  assert.equal(describe({ build: "tree", skin: "black", mark: "plain" }), "perereca preta lisa");
  assert.equal(describe({ build: "toad", skin: "orange", mark: "spots" }), "sapo laranja com pintas");
});
