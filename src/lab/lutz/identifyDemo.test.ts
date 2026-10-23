import { test } from "node:test";
import assert from "node:assert/strict";
import { difference } from "./frogPlan.ts";
import { actAt, cardAt, CARD, CARDS, checkAt, counterAt, DRAWER, fileAt, FROG, magnifierAt, pointerTarget, realness, SPECIMEN, stampAt, T, TAG, TRAY } from "./identifyDemo.ts";

test("the story goes from observing to comparing to registering in about eleven seconds", () => {
  assert.equal(actAt(0), "observe");
  assert.equal(actAt(T.compare + 0.1), "compare");
  assert.equal(actAt(T.register + 0.1), "register");
  assert.equal(actAt(T.end), "closing");
  assert.ok(T.end <= 11);
  assert.equal(realness(0), 0);
  assert.equal(realness(T.callouts[0]), 1);
  assert.ok(magnifierAt(T.callouts[1]).visible > 0.9);
  assert.equal(magnifierAt(T.register).visible, 0);
});

test("the specimen is compared with the collection, one card at a time, and only the last one matches", () => {
  assert.deepEqual(CARDS.map((c) => c.match), [false, false, true]);
  assert.equal(difference(CARDS[2].look, SPECIMEN), 0);
  assert.ok(difference(CARDS[1].look, SPECIMEN) === 1, "a close lookalike is ruled out first");
  assert.ok(difference(CARDS[0].look, SPECIMEN) >= 2);
  const order: number[] = [];
  for (let t = T.compare; t < T.register; t += 0.05) {
    const target = pointerTarget(t);
    if (target >= 0 && order[order.length - 1] !== target) order.push(target);
  }
  assert.deepEqual(order, [0, 1, 2]);
  for (let i = 0; i < CARDS.length; i++) assert.equal(checkAt(i, T.register).mark, 1);
});

test("the record is written, stamped and filed in the collection", () => {
  assert.equal(stampAt(T.file), 1);
  assert.equal(fileAt(T.closing), 1);
  assert.equal(counterAt(T.file), 0);
  assert.equal(counterAt(T.closing), 1);
  for (let i = 0; i < CARDS.length; i++) assert.equal(cardAt(i, T.closing).away, 1);
});

test("the drawing stays inside the frame and nothing overlaps", () => {
  const inside = (x: number, y: number, w: number, h: number) => x >= 0 && y >= 0 && x + w <= 600 && y + h <= 300;
  assert.ok(inside(TRAY.x, TRAY.y, TRAY.w, TRAY.h));
  assert.ok(inside(DRAWER.x, DRAWER.y, DRAWER.w, DRAWER.h));
  assert.ok(inside(TAG.x - 14, TAG.y, TAG.w + 14, TAG.h));
  for (const card of CARDS) assert.ok(inside(card.x, CARD.y, CARD.w + 4, CARD.h + 4));
  for (let i = 1; i < CARDS.length; i++) assert.ok(CARDS[i].x - CARDS[i - 1].x >= CARD.w + 6);
  assert.ok(CARD.y + CARD.h < DRAWER.y);
  assert.ok(TRAY.x + TRAY.w < CARDS[0].x);
  assert.ok(FROG.y > TRAY.y && FROG.y < TRAY.y + TRAY.h);
});
