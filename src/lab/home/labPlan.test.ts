import { test } from "node:test";
import assert from "node:assert/strict";
import { buildingSpan, cellRect, columnAt, groundY, labScale, objectsIn, planLab, WORLD } from "./labPlan.ts";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `game${i + 1}`);

test("any number of games fills the building with no empty room", () => {
  for (let n = 0; n <= 14; n++) {
    const plan = planLab(ids(n));
    const rooms = plan.columns.filter((c) => c.kind === "rooms");
    for (const column of rooms) for (const cell of column.cells) assert.ok(cell, `n=${n}`);
    const games = rooms.flatMap((c) => c.cells).filter((c) => c.kind === "game");
    assert.equal(games.length, n);
    assert.deepEqual(
      plan.games.map((g) => g.id),
      ids(n),
      `n=${n} keeps the order`,
    );
    const sites = rooms.flatMap((c) => c.cells).filter((c) => c.kind === "site");
    assert.ok(sites.length <= 1, `n=${n}`);
  }
});

test("the building opens with the entrance, ends under construction and only holds games between them", () => {
  for (const n of [1, 4, 5, 6, 8, 12]) {
    const plan = planLab(ids(n));
    assert.equal(plan.columns[0].kind, "entrance");
    assert.equal(plan.columns[plan.columns.length - 1].kind, "construction");
    const cells = plan.columns.flatMap((c) => (c.kind === "rooms" ? c.cells : []));
    assert.equal(cells.length, n + (n % 2));
    assert.ok(cells.every((c) => c.kind === "game" || c.kind === "site"));
  }
});

test("columns sit side by side without gaps and the width grows with the catalog", () => {
  let last = 0;
  for (const n of [4, 6, 8, 12]) {
    const plan = planLab(ids(n));
    let x = WORLD.lead;
    for (const column of plan.columns) {
      assert.equal(column.x, x);
      x += column.w;
    }
    assert.equal(plan.width, x + WORLD.tail);
    assert.ok(plan.width > last);
    last = plan.width;
  }
});

test("rooms stack two floors between the roof and the ground", () => {
  const plan = planLab(ids(4));
  const column = plan.columns[1];
  const top = cellRect(column, 0);
  const bottom = cellRect(column, 1);
  assert.equal(top.y, WORLD.roof);
  assert.equal(bottom.y, top.y + top.h);
  assert.equal(bottom.y + bottom.h, groundY());
  assert.ok(groundY() + WORLD.ground === WORLD.height);
  assert.equal(columnAt(plan, column.x + 10).index, 1);
  assert.equal(columnAt(plan, WORLD.lead + 5).kind, "entrance");
});

test("the camera always shows a whole room plus a hint of the next one", () => {
  for (const [w, h, stacked] of [
    [1075, 960, false],
    [765, 650, false],
    [573, 650, false],
    [768, 900, true],
    [390, 600, true],
    [360, 600, true],
  ] as const) {
    const s = labScale(w, h, stacked);
    const visible = w / s;
    if (!stacked) assert.ok(WORLD.height * s <= h + 0.5, `${w}x${h} fits the height`);
    if (visible > WORLD.column * 1.3) assert.ok(visible >= WORLD.lead * 0.5 + WORLD.entrance + WORLD.column * 1.1, `${w}x${h}`);
    else assert.ok(visible > WORLD.column * 1.1, `${w}x${h} shows a room and a hint of the next`);
  }
});

test("the building sits between an outdoor lead and a tail, and every room lists its objects", () => {
  const plan = planLab(ids(5));
  const span = buildingSpan(plan);
  assert.equal(span.start, WORLD.lead);
  assert.equal(span.finish + WORLD.tail, plan.width);
  assert.ok(span.end < span.finish);
  const keys = plan.columns.flatMap(objectsIn);
  for (const id of ids(5)) assert.ok(keys.includes(`obj:${id}`));
  for (const key of ["obj:archive", "obj:lever", "obj:crane", "obj:sign"]) assert.ok(keys.includes(key), key);
  assert.equal(new Set(keys).size, keys.length);
});
