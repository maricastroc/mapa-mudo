import { test } from "node:test";
import assert from "node:assert/strict";
import { actAt, actOpacity, BODY, clearAt, defendAt, doseAt, fillAt, invaderEnd, invaderStart, shieldAt, SYRINGE, T, VIAL, VIRUS, VIRUS_COUNT, virusIn } from "./vaccineDemo.ts";

test("the story goes from four viruses to one dose to protection in about eleven seconds", () => {
  assert.equal(actAt(0), "virus");
  assert.equal(actAt(T.vial + 0.1), "vaccine");
  assert.equal(actAt(T.body + 0.1), "protect");
  assert.equal(actAt(T.end), "closing");
  assert.ok(T.end <= 12);
  for (let i = 0; i < VIRUS_COUNT; i++) assert.equal(virusIn(i, T.labels), 1);
});

test("only one act is on stage at a time", () => {
  for (let t = 0; t < T.closing; t += 0.05) {
    const sum = actOpacity("virus", t) + actOpacity("vaccine", t) + actOpacity("protect", t);
    assert.ok(sum <= 1.05, `t=${t.toFixed(2)} sum=${sum}`);
  }
});

test("the single dose is filled before it is given, and every virus is cleared before the shield", () => {
  assert.equal(fillAt(T.dose), 1);
  assert.ok(doseAt(T.body - 0.1) > 0.99);
  for (let i = 0; i < VIRUS_COUNT; i++) {
    assert.equal(defendAt(i, T.shield), 1);
    assert.equal(clearAt(i, T.shield), 1);
  }
  assert.equal(shieldAt(T.shield - 0.1), 0);
});

test("the drawing stays inside the frame", () => {
  assert.ok(VIRUS.xs.every((x) => x - VIRUS.r > 0 && x + VIRUS.r < 600));
  assert.ok(VIAL.x - VIAL.w / 2 > 0 && VIAL.y < 300);
  assert.ok(SYRINGE.x + SYRINGE.w < 600);
  assert.ok(BODY.y - BODY.r > 20 && BODY.y + BODY.r < 300);
  for (let i = 0; i < VIRUS_COUNT; i++) {
    const end = invaderEnd(i);
    assert.ok(Math.hypot(end.x - BODY.x, end.y - BODY.y) < BODY.r);
    const start = invaderStart(i);
    assert.ok(start.y > 0 && start.y < 300);
  }
});
