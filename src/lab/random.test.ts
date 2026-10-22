import { test } from "node:test";
import assert from "node:assert/strict";
import { createRandom } from "./random.ts";

test("the same seed repeats the same sequence and another seed does not", () => {
  const a = createRandom(42);
  const b = createRandom(42);
  const c = createRandom(43);
  const first = Array.from({ length: 8 }, () => a.next());
  assert.deepEqual(first, Array.from({ length: 8 }, () => b.next()));
  assert.notDeepEqual(first, Array.from({ length: 8 }, () => c.next()));
});

test("draws stay inside their bounds and weights are respected", () => {
  const rng = createRandom(7);
  for (let i = 0; i < 2000; i++) {
    const v = rng.range([0.2, 0.4]);
    assert.ok(v >= 0.2 && v < 0.4);
  }
  let heavy = 0;
  for (let i = 0; i < 4000; i++) if (rng.weighted([{ value: "a", weight: 3 }, { value: "b", weight: 1 }]) === "a") heavy++;
  assert.ok(heavy > 2800 && heavy < 3200, `${heavy}`);
});
