import { test } from "node:test";
import assert from "node:assert/strict";
import type { Catalog } from "../content/scientists/types.ts";
import { CATALOG } from "../content/scientists/catalog.ts";
import { FEATURED } from "../content/scientists/featured.ts";
import { FEATURED_FIXTURES } from "../content/scientists/fixtures.ts";
import { INITIAL_PARTICIPATIONS, SHEET_LAYOUT } from "./source.ts";
import { chooseDiscovery, recordMention } from "./participations.ts";
import { autoPosition, sheetPoints, wasOnMapBeforeMention, type SheetLayout } from "./sheetLayout.ts";

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
  const points = sheetPoints(catalog, layout, {});
  const featured = points.find((p) => p.scientistId === FEATURED_FIXTURES[0].id);
  assert.ok(featured);
  assert.equal(featured.mentions, 0);
  assert.equal(featured.code, "017");
});

test("known scientists only appear once they have mentions", () => {
  assert.equal(
    sheetPoints(catalog, layout, {}).some((p) => p.scientistId === "k2"),
    false,
  );
  const mentioned = sheetPoints(catalog, layout, recordMention({}, "k2")).find((p) => p.scientistId === "k2");
  assert.ok(mentioned);
  assert.equal(mentioned.mentions, 1);
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
  const vacancy = sheetPoints(catalog, layout, {}).find((p) => p.key === "vacancy-900");
  assert.ok(vacancy);
  assert.equal(vacancy.scientistId, null);
  assert.equal(vacancy.name, null);
});

test("participations are independent from the editorial catalog", () => {
  const participations = recordMention(recordMention({}, "k1"), "k1");
  assert.deepEqual(participations, { k1: 2 });
  assert.equal("hints" in catalog.known[0], false);
});

test("the discovery chosen for 'não sei' is the least mentioned, rotating among ties", () => {
  assert.equal(chooseDiscovery(FEATURED_FIXTURES, {})?.id, FEATURED_FIXTURES[0].id);
  assert.equal(chooseDiscovery([], {}), null);
  const [a, b, c] = FEATURED.slice(0, 3);
  assert.equal(chooseDiscovery([a, b, c], {}, 1)?.id, b.id);
  assert.equal(chooseDiscovery([a, b, c], { [b.id]: 2 }, 1)?.id, c.id);
});

test("curated featured scientists get stable, non-overlapping sheet positions", () => {
  const first = sheetPoints(CATALOG, SHEET_LAYOUT, INITIAL_PARTICIPATIONS);
  const second = sheetPoints(CATALOG, SHEET_LAYOUT, INITIAL_PARTICIPATIONS);
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

test("a point counts as already on the map unless this mention is what created it", () => {
  const featuredId = FEATURED_FIXTURES[0].id;
  const once = recordMention({}, featuredId);
  const featured = sheetPoints(catalog, layout, once).find((p) => p.scientistId === featuredId);
  assert.ok(featured);
  assert.equal(wasOnMapBeforeMention(featured), true);

  const created = sheetPoints(catalog, layout, recordMention({}, "k2")).find((p) => p.scientistId === "k2");
  assert.ok(created);
  assert.equal(wasOnMapBeforeMention(created), false);

  const again = sheetPoints(catalog, layout, recordMention(recordMention({}, "k2"), "k2")).find((p) => p.scientistId === "k2");
  assert.ok(again);
  assert.equal(wasOnMapBeforeMention(again), true);
});
