import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKPOINTS, DESCENT, EARTH, LAUNCH, phaseAt, ROUTE, routeAt, SPLASH, TOTAL_SECONDS, VIEW } from "./trajectoryCheck.ts";

test("the whole route stays inside the drawing", () => {
  for (const p of ROUTE) {
    assert.ok(p.x >= 0 && p.x <= VIEW.w && p.y >= VIEW.top + 20 && p.y <= VIEW.h, `${p.x},${p.y}`);
  }
});

test("the route starts at the launch site and ends at the rescue point on the sea", () => {
  assert.deepEqual(ROUTE[0], LAUNCH);
  assert.deepEqual(ROUTE[ROUTE.length - 1], SPLASH);
  for (const p of [LAUNCH, SPLASH]) assert.ok(Math.abs(Math.hypot(p.x - EARTH.cx, p.y - EARTH.cy) - EARTH.r) < 1e-6);
  assert.ok(SPLASH.x > LAUNCH.x, "the capsule comes down further along than where it left");
});

test("the descent only gets closer to the ground", () => {
  let previous = Infinity;
  for (const p of DESCENT) {
    const r = Math.hypot(p.x - EARTH.cx, p.y - EARTH.cy);
    assert.ok(r <= previous + 1e-6);
    previous = r;
  }
});

test("checkpoints come in flight order along the route", () => {
  for (let i = 1; i < CHECKPOINTS.length; i++) assert.ok(CHECKPOINTS[i].fraction > CHECKPOINTS[i - 1].fraction, CHECKPOINTS[i].id);
  for (const c of CHECKPOINTS) {
    const { point } = routeAt(c.fraction);
    assert.ok(Math.hypot(point.x - c.at.x, point.y - c.at.y) < 6, c.id);
  }
});

test("the demonstration checks first, then flies, and lasts only a few seconds", () => {
  assert.equal(phaseAt(-1).phase, "idle");
  assert.equal(phaseAt(1).phase, "checking");
  assert.equal(phaseAt(4).phase, "flying");
  assert.equal(phaseAt(TOTAL_SECONDS + 0.1).phase, "done");
  assert.ok(TOTAL_SECONDS >= 4 && TOTAL_SECONDS <= 7);
  assert.equal(phaseAt(3).check, 1);
  assert.equal(phaseAt(3).fly, 0);
});
