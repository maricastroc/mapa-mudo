import { test } from "node:test";
import assert from "node:assert/strict";
import {
  actAt,
  BAR_W,
  barHeight,
  CHART,
  circleAt,
  gameGlow,
  liftAt,
  needleAt,
  onPlate,
  sample,
  SAMPLES,
  T,
  TILE,
  TILES,
  tileProgress,
} from "./measureDemo.ts";

test("the story moves from the game glow to the real measurement, then to the discovery, in about ten seconds", () => {
  assert.equal(actAt(0), "real");
  assert.equal(actAt(T.measure + 0.1), "measure");
  assert.equal(actAt(T.surprise + 0.1), "surprise");
  assert.equal(actAt(T.discover + 0.1), "discover");
  assert.equal(actAt(T.end), "closing");
  assert.ok(T.end <= 11);
  assert.equal(gameGlow(0), 1);
  assert.equal(gameGlow(T.measure), 0);
});

test("several minerals are measured one at a time on the plate", () => {
  const order: string[] = [];
  for (let t = 0; t < T.discover; t += 0.05) {
    const on = onPlate(t);
    if (on && order[order.length - 1] !== on.sample.key) order.push(on.sample.key);
  }
  assert.deepEqual(order, ["uranium", "chalcolite", "pitchblende"]);
  for (const s of SAMPLES) assert.ok(Math.abs(needleAt(s.read + 0.5) - s.reading) < 0.05, s.key);
});

test("some minerals read more than the uranium inside them explains", () => {
  const uranium = sample("uranium");
  for (const key of ["chalcolite", "pitchblende"] as const) {
    const s = sample(key);
    assert.ok(s.expected !== null && s.expected < uranium.reading);
    assert.ok(s.reading > uranium.reading);
    assert.equal(circleAt(key, T.discover), 1);
  }
  assert.equal(circleAt("uranium", T.end), 0);
});

test("after the two new elements are separated from pitchblende, what is left reads what uranium explains", () => {
  assert.ok(Math.abs(needleAt(T.end) - (sample("pitchblende").expected ?? 0)) < 1e-6);
  assert.equal(liftAt(T.end), 1);
  assert.equal(tileProgress(1, T.end).stamp, 1);
});

test("the drawing stays inside the frame", () => {
  for (const s of SAMPLES) {
    assert.ok(s.x > CHART.x && s.x + BAR_W < CHART.x + CHART.w);
    assert.ok(CHART.base - s.reading * CHART.scale > CHART.y + 20);
  }
  for (let i = 1; i < SAMPLES.length; i++) assert.ok(SAMPLES[i].x - SAMPLES[i - 1].x >= BAR_W + 16);
  for (const tile of TILES) assert.ok(tile.x > 0 && tile.x + TILE.w < 600 && tile.y + TILE.h < 300);
  assert.ok(barHeight("pitchblende", T.end) > 0);
});
