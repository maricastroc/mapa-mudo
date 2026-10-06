import { test } from "node:test";
import assert from "node:assert/strict";
import type { Catalog } from "../content/scientists/types.ts";
import { FEATURED_FIXTURES } from "../content/scientists/fixtures.ts";
import { chooseDiscovery, recordMention } from "./participations.ts";
import { autoPosition, sheetPoints, type SheetLayout } from "./sheetLayout.ts";

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

test("the discovery chosen for 'não sei' is the least mentioned discoverable scientist", () => {
  const discoverable = FEATURED_FIXTURES.flatMap((f) => (f.experience ? [{ ...f, experience: f.experience }] : []));
  assert.equal(chooseDiscovery(discoverable, {})?.id, FEATURED_FIXTURES[0].id);
  assert.equal(chooseDiscovery([], {}), null);
});
