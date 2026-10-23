import { test } from "node:test";
import assert from "node:assert/strict";
import { crossingLength, exitTime, motionAt, onScreen, visibleWindow } from "./frogMotion.ts";

const hopper = { at: 2, duration: 5, hops: 6, rest: 0.45 };

test("a frog hops from one side to the other, landing between hops", () => {
  assert.equal(motionAt(hopper, 1).u, 0);
  let last = 0;
  let landings = 0;
  let wasAir = false;
  for (let t = hopper.at; t < hopper.at + crossingLength(hopper); t += 0.01) {
    const m = motionAt(hopper, t);
    assert.ok(m.u >= last - 1e-9, "never hops backwards");
    last = m.u;
    if (wasAir && !m.air) landings += 1;
    wasAir = m.air;
    if (!m.air) assert.equal(m.lift, 0);
  }
  assert.equal(landings, hopper.hops - 1);
  assert.equal(motionAt(hopper, hopper.at + crossingLength(hopper) + 0.01).u, 1);
});

test("the frog crouches before jumping and squashes when it lands", () => {
  const air = (hopper.duration / hopper.hops) * (1 - hopper.rest);
  const P = hopper.duration / hopper.hops;
  const landing = motionAt(hopper, hopper.at + air + 0.01);
  const middle = motionAt(hopper, hopper.at + air + (P - air) * 0.5);
  const crouch = motionAt(hopper, hopper.at + P - 0.01);
  assert.ok(landing.squash > 0.4);
  assert.equal(middle.squash, 0);
  assert.ok(crouch.squash > 0.3);
  const takeoff = motionAt(hopper, hopper.at + P + air * 0.3);
  assert.ok(takeoff.stretch > 0.9 && takeoff.tilt < 0);
});

test("a startled frog leaves sooner", () => {
  const calm = exitTime(hopper);
  const startled = exitTime(hopper, hopper.at + 1);
  assert.ok(startled < calm - 2);
  assert.ok(motionAt(hopper, hopper.at + 1.5, hopper.at + 1).u > motionAt(hopper, hopper.at + 1.5).u);
});

test("the frog is on screen for most of its crossing", () => {
  const [from, to] = visibleWindow(hopper);
  assert.ok(onScreen(motionAt(hopper, (from + to) / 2).u));
  assert.ok(to - from > crossingLength(hopper) * 0.75);
});
