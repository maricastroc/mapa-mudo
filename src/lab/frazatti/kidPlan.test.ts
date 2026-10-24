import { test } from "node:test";
import assert from "node:assert/strict";
import { assessPlan, CROSSING_COUNT, generatePlan, SICK_COUNT } from "./kidPlan.ts";
import { SYMPTOMS } from "./kidArt.ts";

test("every plan has 10 sick kids among 27 and all four symptoms show up", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const plan = generatePlan(seed);
    assert.equal(plan.crossings.length, CROSSING_COUNT);
    const sick = plan.crossings.filter((c) => c.sick);
    assert.equal(sick.length, SICK_COUNT);
    assert.equal(SICK_COUNT, 10);
    assert.ok(plan.crossings.filter((c) => !c.sick).length >= 15);
    assert.ok(sick.every((c) => c.look.symptoms.length >= 1 && c.look.symptoms.length <= 2));
    assert.ok(plan.crossings.filter((c) => !c.sick).every((c) => c.look.symptoms.length === 0));
    for (const s of SYMPTOMS) assert.ok(sick.some((c) => c.look.symptoms.includes(s)), `seed ${seed} lacks ${s}`);
  }
});

test("plans open with a sick kid, stay readable and last under a minute", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const plan = generatePlan(seed);
    const report = assessPlan(plan);
    assert.ok(plan.crossings[0].sick);
    assert.ok(report.maxOut <= 4, `seed ${seed} maxOut ${report.maxOut}`);
    assert.ok(report.duration >= 40 && report.duration <= 62, `seed ${seed} duration ${report.duration}`);
  }
});

test("the same seed gives the same plan", () => {
  assert.deepEqual(generatePlan(7), generatePlan(7));
});
