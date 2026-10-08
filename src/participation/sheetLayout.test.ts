import { test } from "node:test";
import assert from "node:assert/strict";
import type { Catalog, Participations } from "../content/scientists/types.ts";
import { CATALOG } from "../content/scientists/catalog.ts";
import { FEATURED } from "../content/scientists/featured.ts";
import { FEATURED_FIXTURES } from "../content/scientists/fixtures.ts";
import { EMPTY_COLLECTIVE, fromCounts, record } from "./collective.ts";
import { INITIAL_COLLECTIVE, SHEET_LAYOUT } from "./source.ts";
import { autoPosition, MIN_SPACING, sheetPoints, type SheetLayout } from "./sheetLayout.ts";

const catalog: Catalog = {
  featured: FEATURED_FIXTURES,
  known: [
    { id: "k1", canonicalName: "Pessoa Fictícia Um", aliases: [], fictional: true },
    { id: "k2", canonicalName: "Pessoa Fictícia Dois", aliases: [], fictional: true },
  ],
};

const layout: SheetLayout = {
  points: { k1: { x: 300, y: 300, code: "101" } },
  order: ["k1"],
  vacancies: [{ code: "900", x: 700, y: 700 }],
};

test("featured scientists stay on the sheet as silent points even with zero mentions", () => {
  const points = sheetPoints(catalog, layout, EMPTY_COLLECTIVE);
  const featured = points.find((p) => p.scientistId === FEATURED_FIXTURES[0].id);
  assert.ok(featured);
  assert.equal(featured.recall + featured.reef, 0);
  assert.equal(featured.code, "017");
});

test("known scientists only appear once they have been named, as rock or as reef", () => {
  assert.equal(
    sheetPoints(catalog, layout, EMPTY_COLLECTIVE).some((p) => p.scientistId === "k2"),
    false,
  );
  const remembered = sheetPoints(catalog, layout, record(EMPTY_COLLECTIVE, { kind: "recall", id: "k2", at: 1 })).find((p) => p.scientistId === "k2");
  assert.ok(remembered);
  assert.deepEqual([remembered.recall, remembered.reef], [1, 0]);
  const discovered = sheetPoints(catalog, layout, record(EMPTY_COLLECTIVE, { kind: "discovery", id: "k2", at: 1 })).find((p) => p.scientistId === "k2");
  assert.ok(discovered);
  assert.deepEqual([discovered.recall, discovered.reef], [0, 1]);
});

test("automatic placement is deterministic and keeps away from fixed points", () => {
  const fixed = [
    { x: 300, y: 300 },
    { x: 700, y: 700 },
  ];
  const a = autoPosition("k2", fixed);
  const b = autoPosition("k2", fixed);
  assert.deepEqual(a, b);
  for (const f of fixed) assert.ok(Math.hypot(f.x - a.x, f.y - a.y) >= 80);
});

test("vacancies are kept as unnamed points", () => {
  const vacancy = sheetPoints(catalog, layout, EMPTY_COLLECTIVE).find((p) => p.key === "vacancy-900");
  assert.ok(vacancy);
  assert.equal(vacancy.scientistId, null);
  assert.equal(vacancy.name, null);
});

test("participations are independent from the editorial catalog", () => {
  const twice = record(record(EMPTY_COLLECTIVE, { kind: "recall", id: "k1", at: 1 }), { kind: "recall", id: "k1", at: 2 });
  assert.deepEqual(twice.recall, { k1: 2 });
  assert.equal("hints" in catalog.known[0], false);
});

test("curated featured scientists get stable, non-overlapping sheet positions", () => {
  const first = sheetPoints(CATALOG, SHEET_LAYOUT, INITIAL_COLLECTIVE);
  const second = sheetPoints(CATALOG, SHEET_LAYOUT, INITIAL_COLLECTIVE);
  assert.deepEqual(first, second);
  const featured = first.filter((p) => p.featured);
  assert.equal(featured.length, FEATURED.length);
  for (let i = 0; i < featured.length; i++) {
    for (let j = i + 1; j < featured.length; j++) {
      const d = Math.hypot(featured[i].x - featured[j].x, featured[i].y - featured[j].y);
      assert.ok(d >= 40, `${featured[i].key} and ${featured[j].key} are ${d.toFixed(0)}px apart`);
    }
  }
});

const EMPTY_SHEET: SheetLayout = { points: {}, order: [], vacancies: [] };

function crowd(count: number) {
  const known = Array.from({ length: count }, (_, i) => ({ id: `extra-${i}`, canonicalName: `Cientista Extra ${i}`, aliases: [] }));
  const participations: Participations = Object.fromEntries([
    ...FEATURED.map((f, i): [string, number] => [f.id, 1 + ((i * 37) % 90)]),
    ...known.map((k, i): [string, number] => [k.id, 1 + ((i * 53) % 60)]),
  ]);
  return { catalog: { featured: FEATURED, known }, participations };
}

test("the sheet holds 50 scientists with every summit at least the minimum spacing apart", () => {
  const { catalog: big, participations } = crowd(50 - FEATURED.length);
  const points = sheetPoints(big, EMPTY_SHEET, fromCounts(participations));
  assert.equal(points.length, 50);
  for (const p of points) {
    const underTitle = p.x <= 500 && p.y <= 310;
    const underAction = p.x <= 420 && p.y >= 770;
    assert.equal(underTitle || underAction, false, `${p.key} sits under the map's title block or action at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
  }
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      assert.ok(d >= MIN_SPACING, `${points[i].key} and ${points[j].key} are ${d.toFixed(0)}px apart`);
    }
  }
});

test("a new name never moves the points already on the map", () => {
  const { catalog: big, participations } = crowd(30);
  const withoutOne = fromCounts(Object.fromEntries(Object.entries(participations).filter(([id]) => id !== "extra-3")));
  const before = new Map(sheetPoints(big, EMPTY_SHEET, withoutOne).map((p) => [p.key, `${p.x},${p.y}`]));
  const after = sheetPoints(big, EMPTY_SHEET, record(withoutOne, { kind: "discovery", id: "extra-3", at: 1 }));
  for (const p of after) if (before.has(p.key)) assert.equal(`${p.x},${p.y}`, before.get(p.key), p.key);
  assert.ok(after.some((p) => p.key === "extra-3"));
});
