import { test } from "node:test";
import assert from "node:assert/strict";
import { cellAt, distances, exits, index, MAP, MAZE, neighbor, walkable } from "./maze.ts";

test("the maze is compact and mirrored like an arcade board", () => {
  assert.equal(MAZE.cols, 15);
  assert.equal(MAZE.rows, 16);
  for (const line of MAP) {
    assert.equal(line.length, MAZE.cols);
    const mirrored = [...line].reverse().join("").replace(/P/g, ".");
    assert.equal(line.replace(/P/g, "."), mirrored, line);
  }
  assert.equal(MAZE.doses.length, 4);
  assert.ok(MAZE.leaves.length >= 90 && MAZE.leaves.length <= 110);
});

test("every leaf and dose can be reached from the start", () => {
  const reach = distances(MAZE, MAZE.start);
  for (const key of [...MAZE.leaves, ...MAZE.doses]) assert.ok(reach.has(key), `tile ${key}`);
});

test("there are no dead ends and no open 2x2 rooms", () => {
  for (let y = 0; y < MAZE.rows; y++) {
    for (let x = 0; x < MAZE.cols; x++) {
      const tile = { x, y };
      if (!walkable(cellAt(MAZE, tile))) continue;
      assert.ok(exits(MAZE, tile).length >= 2, `dead end at ${x},${y}`);
      const block = [tile, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
      if (x + 1 < MAZE.cols && y + 1 < MAZE.rows) assert.ok(!block.every((t) => walkable(cellAt(MAZE, t))), `open room at ${x},${y}`);
    }
  }
});

test("the side tunnel wraps around and the parasites leave home through a door", () => {
  const row = 7;
  assert.deepEqual(neighbor(MAZE, { x: 0, y: row }, "left"), { x: MAZE.cols - 1, y: row });
  assert.deepEqual(neighbor(MAZE, { x: MAZE.cols - 1, y: row }, "right"), { x: 0, y: row });
  assert.equal(cellAt(MAZE, MAZE.door), "door");
  assert.equal(cellAt(MAZE, MAZE.home), "house");
  assert.ok(walkable(cellAt(MAZE, MAZE.outside)));
  assert.ok(!exits(MAZE, MAZE.outside).includes("down"), "the player cannot walk into the house");
  const fromStart = distances(MAZE, MAZE.start);
  assert.ok((fromStart.get(index(MAZE, MAZE.outside)) ?? 0) >= 8, "the start is far from the door");
});
