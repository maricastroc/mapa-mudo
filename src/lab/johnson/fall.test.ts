import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleFall, simulateFall, timeAtDepth } from "./fall.ts";

const calm = { vx0: 0, wind: 0, openAt: 0.3, terminal: 0.125 };

test("a capsule falls the whole drop and lands where its path says", () => {
  const path = simulateFall(calm, 0.86);
  const last = path.samples[path.samples.length - 1];
  assert.ok(Math.abs(last.y - 0.86) < 1e-9);
  assert.equal(last.x, path.landingX);
  assert.ok(Math.abs(path.landingX) < 1e-9, "no wind, no drift");
});

test("the parachute slows the fall down to its terminal speed", () => {
  const path = simulateFall(calm, 0.86);
  const early = sampleFall(path, 0.28);
  const late = sampleFall(path, path.duration - 0.2);
  assert.ok(early.vy > 0.4, `free fall picks up speed: ${early.vy}`);
  assert.ok(Math.abs(late.vy - 0.125) < 0.01, `terminal ${late.vy}`);
});

test("a faster parachute lands sooner and the fall never goes back up", () => {
  const slow = simulateFall(calm, 0.86);
  const fast = simulateFall({ ...calm, terminal: 0.24 }, 0.86);
  assert.ok(fast.duration < slow.duration);
  for (let i = 1; i < slow.samples.length; i++) assert.ok(slow.samples[i].y >= slow.samples[i - 1].y);
});

test("wind and a sideways start carry the capsule in their direction", () => {
  const path = simulateFall({ vx0: 0.2, wind: 0.02, openAt: 0.34, terminal: 0.15 }, 0.86);
  assert.ok(path.landingX > 0.05);
  const t = timeAtDepth(path, 0.5);
  assert.ok(Math.abs(sampleFall(path, t).y - 0.5) < 0.01);
});
