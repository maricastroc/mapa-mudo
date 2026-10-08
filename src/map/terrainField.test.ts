import { test } from "node:test";
import assert from "node:assert/strict";
import { REEF_LAND, SEA_FLOOR, TerrainField, type FieldPoint } from "./terrainField.ts";
import { TRENCH } from "./trench.ts";

const SHEET_OCTAVES = 3.8;
const STEP = 8;

function fieldWith(points: FieldPoint[]) {
  const field = new TerrainField(points, STEP, 1);
  return { field, at: (x: number, y: number) => field.terrain(x, y, SHEET_OCTAVES, field.peaks) };
}

function grow(field: TerrainField, point: FieldPoint) {
  field.addPeak(point);
  field.setShape(point.id, field.target(point));
}

function crossesBelow(at: (x: number, y: number) => number, x: number, y: number, level: number, radius: number) {
  for (let a = 0; a < 72; a++) {
    const t = (a / 72) * Math.PI * 2;
    let below = false;
    for (let r = 0.5; r < radius && !below; r += 0.5) below = at(x + Math.cos(t) * r, y + Math.sin(t) * r) < level;
    if (!below) return false;
  }
  return true;
}

test("with no names, the whole sheet is open sea, deep enough to carry no shallow tint", () => {
  const { at } = fieldWith([]);
  let highest = -Infinity;
  for (let y = 0; y <= 900; y += 9) for (let x = 0; x <= 1440; x += 9) highest = Math.max(highest, at(x, y));
  assert.ok(highest < -28, `highest seabed ${highest.toFixed(1)}`);
});

test("the sea of unsaid names stays calm, without relief of its own", () => {
  const { at } = fieldWith([]);
  assert.equal(at(TRENCH.x, TRENCH.y), SEA_FLOOR);
  assert.equal(at(TRENCH.x - 120, TRENCH.y + 10), SEA_FLOOR);
});

test("a remembered scientist rises from the sea with her summit half a contour above her count", () => {
  for (const recall of [1, 3, 12]) {
    const { field, at } = fieldWith([{ id: "rock", x: 720, y: 560, recall, reef: 0 }]);
    const peak = field.peak("rock");
    assert.ok(peak);
    assert.equal(peak.baseLevel, 0);
    const top = at(peak.summitX, peak.summitY);
    assert.ok(Math.abs(top - (recall * STEP + STEP / 2)) < 0.4, `${recall}: top ${top.toFixed(2)}`);
    assert.ok(crossesBelow(at, peak.summitX, peak.summitY, 0, 120), `${recall}: coastline does not close`);
  }
});

test("each new memory adds exactly one contour, framed by the predicted growth radius", () => {
  const point = { id: "rock", x: 720, y: 560, recall: 2, reef: 0 };
  const { field, at } = fieldWith([point]);
  const next = { ...point, recall: 3 };
  const radius = field.growthRadius(next);
  field.setShape("rock", field.target(next));
  const peak = field.peak("rock");
  assert.ok(peak);
  const level = peak.baseLevel + next.recall * STEP;
  assert.ok(at(peak.summitX, peak.summitY) > level);
  for (let a = 0; a < 36; a++) {
    const t = (a / 36) * Math.PI * 2;
    let r = 0;
    while (r < 3 * radius && at(peak.summitX + Math.cos(t) * r, peak.summitY + Math.sin(t) * r) > level) r += radius / 200;
    assert.ok(r > 0.6 * radius && r < 1.6 * radius, `ray ${a} crosses at ${r.toFixed(2)} for ${radius.toFixed(2)}`);
  }
});

test("a scientist known here comes to the surface as a flat reef, below the first contour", () => {
  const { field, at } = fieldWith([{ id: "reef", x: 720, y: 560, recall: 0, reef: 1 }]);
  const center = at(720, 560);
  assert.ok(center > 0 && center < STEP, `reef top ${center.toFixed(2)}`);
  assert.ok(Math.abs(center - REEF_LAND) < 0.5);
  const radius = field.reefRadiusOf({ id: "reef", x: 720, y: 560, recall: 0, reef: 1 });
  assert.ok(at(720 + radius * 2.2, 560) < 0);
  assert.ok(crossesBelow(at, 720, 560, 0, radius * 2.5));
});

test("each person who gets to know her widens the reef without raising it", () => {
  const point = { id: "reef", x: 720, y: 560, recall: 0, reef: 1 };
  const { field, at } = fieldWith([point]);
  const narrow = field.reefRadiusOf(point);
  const wider = { ...point, reef: 9 };
  grow(field, wider);
  assert.ok(field.reefRadiusOf(wider) > narrow * 1.5);
  assert.ok(Math.abs(at(720, 560) - REEF_LAND) < 0.5);
});

test("a reef around a remembered scientist never changes her summit", () => {
  const rockOnly = fieldWith([{ id: "both", x: 720, y: 560, recall: 4, reef: 0 }]);
  const peak = rockOnly.field.peak("both");
  assert.ok(peak);
  const before = rockOnly.at(peak.summitX, peak.summitY);
  grow(rockOnly.field, { id: "both", x: 720, y: 560, recall: 4, reef: 6 });
  assert.ok(Math.abs(rockOnly.at(peak.summitX, peak.summitY) - before) < 1e-9);
});

test("when a scientist known here is remembered, rock rises inside her reef at the height of her count", () => {
  const { field, at } = fieldWith([{ id: "both", x: 720, y: 560, recall: 0, reef: 5 }]);
  grow(field, { id: "both", x: 720, y: 560, recall: 1, reef: 5 });
  const peak = field.peak("both");
  assert.ok(peak);
  const top = at(peak.summitX, peak.summitY);
  assert.ok(Math.abs(top - (STEP + STEP / 2)) < 0.4, `top ${top.toFixed(2)}`);
});

test("coral marks the rim of an emerged reef, not its middle", () => {
  const point = { id: "reef", x: 720, y: 560, recall: 0, reef: 4 };
  const { field, at } = fieldWith([point]);
  const peak = field.peak("reef");
  assert.ok(peak);
  const radius = peak.reef;
  assert.equal(field.coral(720, 560, field.peaks, at(720, 560)), 0);
  let rim = 0;
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    for (let r = radius - 14; r <= radius + 3; r += 0.5) {
      const x = 720 + Math.cos(t) * r;
      const y = 560 + Math.sin(t) * r;
      rim = Math.max(rim, field.coral(x, y, field.peaks, at(x, y)));
    }
  }
  assert.ok(rim > 0.9);
});
