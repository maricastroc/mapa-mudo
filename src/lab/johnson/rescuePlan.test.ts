import { test } from "node:test";
import assert from "node:assert/strict";
import { airborneAt, buildPlan, CAPSULE_COUNT, DEBRIS_COUNT } from "./rescuePlan.ts";

const plan = buildPlan();
const capsules = plan.filter((d) => d.kind === "capsule");
const debris = plan.filter((d) => d.kind === "debris");

test("the round lasts between twenty and forty seconds", () => {
  const end = Math.max(...plan.map((d) => d.landAt));
  assert.equal(capsules.length, CAPSULE_COUNT);
  assert.equal(debris.length, DEBRIS_COUNT);
  assert.ok(end > 20 && end < 40, `ends at ${end}`);
});

test("the first capsules fall alone and debris only shows up after two rescues", () => {
  for (let i = 0; i < 2; i++) {
    const c = capsules[i];
    for (let t = c.spawn; t < c.landAt; t += 0.05) assert.equal(airborneAt(plan, t), 1, `capsule ${i} at ${t}`);
  }
  assert.ok(Math.min(...debris.map((d) => d.spawn)) > capsules[1].landAt);
});

test("never more than two capsules share the sky and capsule landings stay apart", () => {
  for (let t = 0; t < 40; t += 0.05) {
    assert.ok(airborneAt(plan, t, "capsule") <= 2);
    assert.ok(airborneAt(plan, t) <= 3);
  }
  const landings = capsules.map((c) => c.landAt).sort((a, b) => a - b);
  for (let i = 1; i < landings.length; i++) assert.ok(landings[i] - landings[i - 1] > 1.1, `gap before ${i}`);
});

test("debris never lands where a capsule lands at nearly the same moment", () => {
  for (const d of debris) {
    for (const c of capsules) {
      if (Math.abs(d.landFraction - c.landFraction) < 0.2) assert.ok(Math.abs(d.landAt - c.landAt) >= 1.1, `debris ${d.id} and capsule ${c.id}`);
    }
  }
});

test("capsules get faster as the round goes on and debris always falls faster than them", () => {
  for (let i = 1; i < capsules.length; i++) assert.ok(capsules[i].path.duration <= capsules[i - 1].path.duration + 1e-9);
  assert.ok(capsules[0].path.duration > 4);
  for (const d of debris) assert.ok(d.path.duration < 2.6);
});

test("everything lands inside the sea with room for the ship", () => {
  for (const d of plan) assert.ok(d.landFraction >= 0.15 && d.landFraction <= 0.85);
});
