import { test } from "node:test";
import assert from "node:assert/strict";
import { centerWorld, clampLeft, easeInOutCubic, easeOutCubic, keyStep, leftForLensCenter, lens, momentumTarget, panDuration } from "./camera.ts";

const view = { viewW: 1000, trackW: 4000 };

test("the camera never leaves the building", () => {
  assert.equal(clampLeft(-50, view), 0);
  assert.equal(clampLeft(9999, view), 3000);
  assert.equal(clampLeft(10, { viewW: 1000, trackW: 800 }), 0);
});

test("pans feel quick for short hops and never drag on for long ones", () => {
  assert.ok(panDuration(50) >= 0.28 && panDuration(50) < 0.35);
  assert.ok(panDuration(3000) <= 0.7);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test("a flick glides a short, bounded distance", () => {
  assert.equal(momentumTarget(1000, 0, view), 1000);
  assert.equal(momentumTarget(1000, 0.5, view), 880);
  assert.equal(momentumTarget(1000, -5, view), 1240);
  assert.equal(momentumTarget(10, 1, view), 0);
});

test("arrow keys move about a room at a time, never more than most of the screen", () => {
  assert.equal(keyStep(1000, 440), 440);
  assert.equal(keyStep(500, 440), 300);
  assert.equal(keyStep(100, 440), 120);
});

test("the minimap window mirrors the camera and can drive it", () => {
  assert.deepEqual(lens({ left: 0, ...view }), { x: 0, w: 0.25 });
  assert.deepEqual(lens({ left: 3000, ...view }), { x: 0.75, w: 0.25 });
  assert.equal(leftForLensCenter(0.5, view), 1500);
  assert.equal(leftForLensCenter(0, view), 0);
  assert.equal(leftForLensCenter(1, view), 3000);
  assert.equal(centerWorld({ left: 500, ...view }, 2), 500);
});
