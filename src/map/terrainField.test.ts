import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_FIXTURES,
  HELENA_PARTICIPATION,
  KNOWN_FIXTURES,
  LAYOUT_FIXTURE,
  PARTICIPATIONS_FIXTURE,
} from "../content/scientists/fixtures.ts";
import { sheetPoints } from "../participation/sheetLayout.ts";
import { TerrainField } from "./terrainField.ts";

const SHEET_OCTAVES = 3.8;

const FIXTURE_CATALOG = { featured: FEATURED_FIXTURES, known: KNOWN_FIXTURES };
const FIXTURE_PARTICIPATIONS = { ...PARTICIPATIONS_FIXTURE, ...HELENA_PARTICIPATION };

function fixtureField() {
  const points = sheetPoints(FIXTURE_CATALOG, LAYOUT_FIXTURE, FIXTURE_PARTICIPATIONS)
    .filter((p) => p.scientistId !== null && p.mentions > 0)
    .map((p) => ({ id: p.scientistId as string, x: p.x, y: p.y, mentions: p.mentions }));
  return new TerrainField(points);
}

test("the fixture sheet produces the same terrain as the validated baseline", () => {
  const field = fixtureField();
  assert.equal(field.peaks.length, 22);
  let checksum = 0;
  for (let y = 0; y < 900; y += 7) {
    for (let x = 0; x < 1440; x += 7) checksum += field.terrain(x, y, SHEET_OCTAVES, field.peaks) * ((x * 31 + y * 17) % 13);
  }
  assert.ok(Math.abs(checksum - 7820505.663483) < 1e-3, `checksum ${checksum}`);
  const helena = field.peak("p017");
  assert.ok(helena);
  assert.ok(Math.abs(helena.summitX - 910.932498) < 1e-5);
  assert.ok(Math.abs(helena.summitY - 149.572523) < 1e-5);
});

test("each summit sits half a contour above its mention count", () => {
  const field = fixtureField();
  for (const p of field.peaks) {
    const top = field.terrain(p.summitX, p.summitY, SHEET_OCTAVES, field.peaks);
    assert.ok(Math.abs(top - (p.baseLevel + (FIXTURE_PARTICIPATIONS[p.id] ?? 0) + 0.5)) < 0.05, p.id);
  }
});

test("a first mention adds a peak that grows from nothing and crosses exactly one new contour", () => {
  const field = fixtureField();
  const point = { id: "new-known", x: 720, y: 560, mentions: 1 };
  const predicted = field.summit(point);
  const peak = field.addPeak(point);
  assert.equal(peak.presence, 0);
  assert.equal(peak.summitX, predicted.x);
  assert.equal(peak.summitY, predicted.y);
  const before = field.terrain(peak.summitX, peak.summitY, SHEET_OCTAVES, field.peaks);
  field.setAmplitude(peak.id, peak.baseAmp, 1);
  const after = field.terrain(peak.summitX, peak.summitY, SHEET_OCTAVES, field.peaks);
  const newLevel = peak.baseLevel + 1;
  assert.ok(before < newLevel, `before ${before}`);
  assert.ok(after > newLevel && after < newLevel + 1, `after ${after}`);
});

test("a first mention on a steep slope still closes a ring around the new summit", () => {
  const field = fixtureField();
  const raimunda = field.peak("p001");
  assert.ok(raimunda);
  const point = { id: "on-a-slope", x: raimunda.summitX + 85, y: raimunda.summitY + 20, mentions: 1 };
  const peak = field.addPeak(point);
  field.setAmplitude(peak.id, peak.baseAmp, 1);
  const newLevel = peak.baseLevel + 1;
  const top = field.terrain(peak.summitX, peak.summitY, SHEET_OCTAVES, field.peaks);
  assert.ok(top > newLevel, `top ${top}`);
  const sigma = 1 / Math.sqrt(2 * peak.k);
  for (let a = 0; a < 72; a++) {
    const t = (a / 72) * Math.PI * 2;
    let crossesBelow = false;
    for (let r = 0.5; r < 1.5 * sigma && !crossesBelow; r += 0.5) {
      crossesBelow = field.terrain(peak.summitX + Math.cos(t) * r, peak.summitY + Math.sin(t) * r, SHEET_OCTAVES, field.peaks) < newLevel;
    }
    assert.ok(crossesBelow, `ray ${a} never drops below the new contour`);
  }
});

function ringHolds(field: TerrainField, id: string, mentions: number, radius: number) {
  const peak = field.peak(id);
  assert.ok(peak);
  const level = peak.baseLevel + mentions;
  for (let a = 0; a < 36; a++) {
    const t = (a / 36) * Math.PI * 2;
    const at = (r: number) => field.terrain(peak.summitX + Math.cos(t) * r, peak.summitY + Math.sin(t) * r, SHEET_OCTAVES, field.peaks);
    let crossing = 0;
    while (crossing < 3 * radius && at(crossing) > level) crossing += radius / 200;
    assert.ok(crossing > 0.6 * radius && crossing < 1.6 * radius, `${id} ray ${a} crosses at ${crossing.toFixed(2)} for ${radius.toFixed(2)}`);
  }
}

test("the predicted growth radius frames the contour a new mention creates on an existing peak", () => {
  const field = fixtureField();
  const raimunda = field.peak("p001");
  assert.ok(raimunda);
  const mentions = (FIXTURE_PARTICIPATIONS.p001 ?? 0) + 1;
  const radius = field.growthRadius({ id: "p001", x: raimunda.cx, y: raimunda.cy, mentions });
  field.setAmplitude("p001", raimunda.baseAmp + 1, 1);
  ringHolds(field, "p001", mentions, radius);
});

test("the predicted growth radius also holds for the first and second mention of a new peak", () => {
  const field = fixtureField();
  const point = { id: "new-known", x: 720, y: 560, mentions: 1 };
  const first = field.growthRadius(point);
  const peak = field.addPeak(point);
  field.setAmplitude(peak.id, peak.baseAmp, 1);
  ringHolds(field, peak.id, 1, first);
  const second = field.growthRadius({ ...point, mentions: 2 });
  assert.ok(second < first);
  field.setAmplitude(peak.id, peak.baseAmp + 1, 1);
  ringHolds(field, peak.id, 2, second);
});

test("a peak born at the fair keeps its earlier contours closed as it grows, except the lowest one merging into the land", () => {
  const field = fixtureField();
  const point = { id: "growing", x: 720, y: 560, mentions: 1 };
  const peak = field.addPeak(point);
  const sigma = 1 / Math.sqrt(2 * peak.k);
  for (let mentions = 2; mentions <= 4; mentions++) {
    const amp = peak.baseAmp + (mentions - 1);
    field.setAmplitude(peak.id, amp, 1);
    for (let level = mentions === 2 ? 1 : 2; level <= mentions; level++) {
      const g = (peak.baseLevel + level - peak.plateau) / amp;
      ringHolds(field, peak.id, level, sigma * Math.sqrt(2 * Math.log(1 / g)));
    }
  }
});

test("with several levels per mention, each mention raises a peak born at the fair by exactly one step", () => {
  const step = 8;
  const base = fixtureField();
  const field = new TerrainField(
    base.peaks.map((p) => ({ id: p.id, x: p.cx, y: p.cy, mentions: (FIXTURE_PARTICIPATIONS[p.id] ?? 0) * step })),
    step,
  );
  const point = { id: "stepped", x: 720, y: 560, mentions: step };
  const peak = field.addPeak(point);
  assert.equal(peak.baseLevel % step, 0);
  for (let mentions = 1; mentions <= 4; mentions++) {
    field.setAmplitude(peak.id, peak.baseAmp + (mentions - 1) * step, 1);
    const top = field.terrain(peak.summitX, peak.summitY, SHEET_OCTAVES, field.peaks);
    const level = peak.baseLevel + mentions * step;
    assert.ok(top > level && top < level + step, `${mentions}: top ${top.toFixed(2)} for level ${level}`);
    ringHolds(field, peak.id, mentions * step, field.growthRadius({ ...point, mentions: mentions * step }));
  }
});
