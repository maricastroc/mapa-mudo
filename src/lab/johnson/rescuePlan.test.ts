import { test } from "node:test";
import assert from "node:assert/strict";
import { rescueGeometry } from "./rescueGeometry.ts";
import {
  ACCEPT,
  assessPlan,
  CAPSULE_COUNT,
  DEBRIS_COUNT,
  generatePlan,
  MAX_AIRBORNE,
  planScale,
  reachableLane,
  regionOf,
  REGION_COUNT,
  type DropPlan,
} from "./rescuePlan.ts";

const desk = rescueGeometry(1920, 1080);
const seeds = Array.from({ length: 40 }, (_, i) => (i + 1) * 2654435761);
const plans = seeds.map((seed) => generatePlan(seed, desk));
const capsulesOf = (drops: DropPlan[]) => drops.filter((d) => d.kind === "capsule").sort((a, b) => a.landAt - b.landAt);
const debrisOf = (drops: DropPlan[]) => drops.filter((d) => d.kind === "debris");
const airborne = (drops: DropPlan[], t: number) => drops.filter((d) => d.spawn <= t && d.landAt > t).length;

test("a seed always rebuilds the same round, and different seeds build different rounds", () => {
  assert.deepEqual(generatePlan(1234, desk), generatePlan(1234, desk));
  const sequences = new Set(plans.map((p) => capsulesOf(p.drops).map((c) => regionOf(c.lane)).join("")));
  assert.ok(sequences.size >= 36, `only ${sequences.size} different region sequences in 40 rounds`);
});

test("every capsule position changes from round to round", () => {
  for (let i = 0; i < CAPSULE_COUNT; i++) {
    const regions = new Set(plans.map((p) => regionOf(capsulesOf(p.drops)[i].lane)));
    assert.ok(regions.size >= 3, `capsule ${i} only fell in ${regions.size} regions`);
  }
  const first = new Set(plans.map((p) => Math.round(capsulesOf(p.drops)[0].lane * 20)));
  assert.ok(first.size >= 8);
});

test("each round spreads its capsules across the sea without camping in one region", () => {
  for (const plan of plans) {
    const a = assessPlan(plan.drops);
    assert.ok(a.regionsUsed >= ACCEPT.regionsUsed, `regions ${a.regionsUsed}`);
    assert.ok(a.maxPerRegion <= ACCEPT.maxPerRegion);
    assert.ok(a.maxRun <= ACCEPT.maxRun);
  }
  const overall = new Array(REGION_COUNT).fill(0);
  for (const plan of plans) for (const c of capsulesOf(plan.drops)) overall[regionOf(c.lane)] += 1;
  for (const count of overall) assert.ok(count >= plans.length * 0.8, `regions overall ${overall}`);
});

test("rounds keep the same shape: calm start, gradual climb, busier finish", () => {
  for (const plan of plans) {
    const caps = capsulesOf(plan.drops);
    const debris = debrisOf(plan.drops);
    assert.equal(caps.length, CAPSULE_COUNT);
    assert.equal(debris.length, DEBRIS_COUNT);
    for (let i = 1; i < caps.length; i++) {
      assert.ok(caps[i].path.duration <= caps[i - 1].path.duration + 1e-9, "capsules never get slower");
      assert.ok(caps[i].landAt - caps[i - 1].landAt > 1.1, "landings stay apart");
    }
    const gaps = caps.slice(1).map((c, i) => c.landAt - caps[i].landAt);
    assert.ok(gaps[0] > gaps[4] && gaps[4] > gaps[8], `gaps tighten ${gaps.map((g) => g.toFixed(2))}`);
    for (let i = 1; i < 3; i++) assert.ok(caps[i].spawn > caps[i - 1].landAt, "the first capsules fall one at a time");
    assert.ok(Math.min(...debris.map((d) => d.spawn)) > caps[1].landAt, "debris only after two rescues");
    for (let t = 0; t < 40; t += 0.05) {
      assert.ok(airborne(caps, t) <= 2);
      assert.ok(airborne(plan.drops, t) <= MAX_AIRBORNE);
    }
    const a = assessPlan(plan.drops);
    assert.ok(a.stagePressure.warmup < a.stagePressure.build && a.stagePressure.build < a.stagePressure.finale);
    assert.ok(a.duration >= ACCEPT.duration[0] && a.duration <= ACCEPT.duration[1]);
  }
});

test("difficulty stays inside a narrow band whatever the draw", () => {
  const means = plans.map((p) => assessPlan(p.drops).meanPressure);
  for (const plan of plans) {
    const a = assessPlan(plan.drops);
    assert.ok(a.meanPressure >= ACCEPT.meanPressure[0] && a.meanPressure <= ACCEPT.meanPressure[1], `${a.meanPressure}`);
    assert.ok(a.peakPressure <= ACCEPT.peakPressure);
  }
  const avg = means.reduce((x, y) => x + y, 0) / means.length;
  const spread = Math.sqrt(means.reduce((x, y) => x + (y - avg) ** 2, 0) / means.length);
  assert.ok(spread < 0.03, `spread ${spread}`);
});

test("debris never lands where a capsule lands at almost the same moment", () => {
  const scale = planScale(desk);
  for (const plan of plans) {
    for (const d of debrisOf(plan.drops)) {
      for (const c of capsulesOf(plan.drops)) {
        if (Math.abs(d.landAt - c.landAt) < 1.1) assert.ok(Math.abs(d.lane - c.lane) >= scale.catchLane + scale.hitLane);
      }
    }
  }
});

test("a capsule out of reach of where the ship really is gets pulled within reach", () => {
  const scale = planScale(desk);
  const pulled = reachableLane(0.95, 0.05, 10, 11.2, scale, []);
  assert.ok(pulled < 0.95 && pulled > 0.05);
  const budget = (11.2 - 10 - 0.45 - 0.25 - 0.2) * scale.laneSpeed;
  assert.ok(Math.abs(pulled - 0.05) <= budget + 1e-9);
  assert.equal(reachableLane(0.3, 0.25, 10, 13, scale, []), 0.3);
});
