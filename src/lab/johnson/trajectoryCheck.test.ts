import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actAt,
  CARD,
  cardOpacity,
  capsuleAt,
  DESCENT,
  FOCUS,
  GLOBE,
  GUESSES,
  LANDING,
  orbitPoint,
  RETRO_THETA,
  T,
  VIEW,
  viewBoxAt,
  zoomAt,
} from "./trajectoryCheck.ts";

const inGlobe = (p: { x: number; y: number }) => Math.hypot(p.x - GLOBE.cx, p.y - GLOBE.cy) < GLOBE.r;

test("the three moments follow each other in a few seconds", () => {
  assert.equal(actAt(0), "challenge");
  assert.equal(actAt(T.computing + 0.1), "computing");
  assert.equal(actAt(T.landing + 0.1), "landing");
  assert.equal(actAt(T.end), "closing");
  assert.ok(T.computing < T.verify && T.verify < T.confirmed && T.confirmed <= T.landing && T.depart < T.splash && T.splash < T.closing);
  assert.ok(T.end <= 9);
});

test("the capsule circles the Earth and leaves the orbit exactly where the checked path begins", () => {
  const before = capsuleAt(T.depart - 1e-6).point;
  const after = capsuleAt(T.depart).point;
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 0.5);
  assert.deepEqual(DESCENT[0], orbitPoint(RETRO_THETA));
  assert.equal(capsuleAt(0.1).lap, 1);
  assert.equal(capsuleAt(T.depart - 0.1).lap, 3);
  const sides = new Set<boolean>();
  for (let t = 0; t < T.depart; t += 0.05) sides.add(capsuleAt(t).front);
  assert.equal(sides.size, 2, "the capsule goes behind the Earth and comes back in front");
});

test("the checked path ends at sea inside the planned area, and the guesses land elsewhere", () => {
  assert.deepEqual(capsuleAt(T.splash + 0.2).point, LANDING);
  assert.equal(capsuleAt(T.splash + 0.2).stage, "landed");
  assert.ok(inGlobe(LANDING));
  for (const guess of GUESSES) {
    assert.ok(inGlobe(guess[3]));
    assert.ok(Math.hypot(guess[3].x - LANDING.x, guess[3].y - LANDING.y) > 14);
  }
});

test("the closing shot frames the descent and leaves the calculation card out of view", () => {
  assert.equal(zoomAt(T.landing - 0.1), 0);
  assert.equal(zoomAt(T.end), 1);
  const box = viewBoxAt(1);
  for (const p of [DESCENT[0], LANDING]) assert.ok(p.x > box.x && p.x < box.x + box.w && p.y > box.y && p.y < box.y + box.h);
  assert.equal(cardOpacity(T.landing + 0.7), 0, "the card is gone before the close-up");
  assert.ok(cardOpacity(T.verify) > 0.99);
  assert.ok(FOCUS.x + FOCUS.w < CARD.x + CARD.w);
  const full = viewBoxAt(0);
  assert.deepEqual(full, { x: 0, y: 0, w: VIEW.w, h: VIEW.h });
});
