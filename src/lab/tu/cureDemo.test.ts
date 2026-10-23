import { test } from "node:test";
import assert from "node:assert/strict";
import { actAt, actOpacity, attackAt, BOOK, CELL, chillAt, DROPS, dropAt, FLASK, MOLECULE, moleculeAt, morphAt, parasiteAt, T, vialLevel } from "./cureDemo.ts";

test("the story goes from the plant to the extraction to the parasite in about twelve seconds", () => {
  assert.equal(actAt(0), "plant");
  assert.equal(actAt(T.extract + 0.1), "extract");
  assert.equal(actAt(T.act + 0.1), "act");
  assert.equal(actAt(T.end), "closing");
  assert.ok(T.end <= 12);
  assert.equal(morphAt(0), 0);
  assert.equal(morphAt(T.book), 1);
});

test("only one act is on stage at a time", () => {
  for (let t = 0; t < T.closing; t += 0.05) {
    const sum = actOpacity("plant", t) + actOpacity("extract", t) + actOpacity("act", t);
    assert.ok(sum <= 1.05, `t=${t.toFixed(2)} sum=${sum}`);
  }
  assert.equal(actOpacity("plant", 1), 1);
  assert.equal(actOpacity("extract", T.molecule), 1);
  assert.equal(actOpacity("act", T.clear), 1);
});

test("the plant is extracted cold, drop by drop, before the molecule shows up", () => {
  assert.equal(chillAt(T.drops), 1);
  for (let i = 0; i < DROPS; i++) assert.ok(dropAt(i, T.molecule) === 1, `drop ${i}`);
  assert.ok(Math.abs(vialLevel(T.molecule) - 1) < 1e-9);
  assert.equal(moleculeAt(T.molecule - 0.1).grow, 0);
  assert.equal(moleculeAt(T.act - 0.2).bond, 1);
});

test("the molecules reach the parasite, which breaks apart and disappears", () => {
  assert.ok(attackAt(0, T.crack) > 0.9);
  assert.equal(parasiteAt(T.crack).crack, 0);
  assert.equal(parasiteAt(T.clear + 0.2).fade, 1);
});

test("the drawing stays inside the frame", () => {
  assert.ok(BOOK.x + BOOK.w < 600 && BOOK.y + BOOK.h < 300);
  assert.ok(FLASK.x - FLASK.w / 2 > 0 && FLASK.y < 300);
  assert.ok(MOLECULE.x + 100 < 600);
  assert.ok(CELL.x - CELL.r > 0 && CELL.y + CELL.r < 300 && CELL.y - CELL.r > 20);
});
