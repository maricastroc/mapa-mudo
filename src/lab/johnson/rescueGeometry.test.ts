import { test } from "node:test";
import assert from "node:assert/strict";
import { laneToX, rescueGeometry, stepShip, xToLane } from "./rescueGeometry.ts";

export const SCREENS: [number, number][] = [
  [1920, 1080],
  [1366, 768],
  [1024, 768],
  [844, 390],
  [390, 844],
];

test("on every screen the ship fits, has room to travel and catches less than it gets hit by", () => {
  for (const [W, H] of SCREENS) {
    const g = rescueGeometry(W, H);
    assert.ok(g.shipLength < W * 0.5, `${W}x${H}`);
    assert.ok(g.minX >= g.shipLength / 2 && g.maxX <= W - g.shipLength / 2 + 1e-9);
    assert.ok(g.span > W * 0.5, `${W}x${H} span ${g.span}`);
    assert.ok(g.catchHalf < g.hitHalf);
    assert.ok(g.deckY < g.waterY && g.waterY < H);
    for (const lane of [0, 0.25, 0.5, 1]) assert.ok(Math.abs(xToLane(laneToX(lane, g), g) - lane) < 1e-9);
  }
});

test("the ship follows the finger smoothly, never faster than its top speed, and stops inside the sea", () => {
  for (const [W, H] of SCREENS) {
    const g = rescueGeometry(W, H);
    let ship = { x: g.minX, v: 0 };
    let fastest = 0;
    for (let i = 0; i < 120; i++) {
      ship = stepShip(ship, W * 2, 1 / 60, g);
      fastest = Math.max(fastest, Math.abs(ship.v));
    }
    assert.ok(fastest <= g.maxSpeed + 1e-6);
    assert.ok(Math.abs(ship.x - g.maxX) < 2, `${W}x${H} settles at ${ship.x}`);
  }
});
