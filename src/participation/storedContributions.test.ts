import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTIONS_KEY,
  contributionsSince,
  loadContributions,
  parseContributions,
  saveContributions,
  withContributions,
  type ContributionStore,
} from "./storedContributions.ts";

function memoryStore(): ContributionStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

test("only what visitors added is stored, in the order names were first said", () => {
  const initial = { a: 10, b: 3 };
  const current = { a: 12, b: 3, z: 1, c: 2 };
  assert.deepEqual(contributionsSince(initial, current), { a: 2, z: 1, c: 2 });
  assert.deepEqual(Object.keys(contributionsSince(initial, current)), ["a", "z", "c"]);
});

test("stored contributions add up on top of the initial counts and keep their order", () => {
  const merged = withContributions({ a: 10, b: 3 }, { a: 2, z: 1, c: 2 }, () => true);
  assert.deepEqual(merged, { a: 12, b: 3, z: 1, c: 2 });
  assert.deepEqual(Object.keys(merged), ["a", "b", "z", "c"]);
});

test("ids that are no longer in the catalog are ignored", () => {
  const merged = withContributions({ a: 1 }, { a: 1, gone: 4 }, (id) => id !== "gone");
  assert.deepEqual(merged, { a: 2 });
});

test("broken or tampered storage never breaks the experience", () => {
  assert.deepEqual(parseContributions(null), {});
  assert.deepEqual(parseContributions("not json"), {});
  assert.deepEqual(parseContributions("[1,2]"), {});
  assert.deepEqual(parseContributions('{"a":2,"b":-1,"c":1.5,"d":"3","e":0}'), { a: 2 });
  const throwing: ContributionStore = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadContributions(throwing), {});
  assert.doesNotThrow(() => saveContributions(throwing, { a: 1 }));
  assert.deepEqual(loadContributions(null), {});
});

test("saving round-trips and an empty set of contributions clears the storage", () => {
  const store = memoryStore();
  saveContributions(store, { a: 2, z: 1 });
  assert.deepEqual(loadContributions(store), { a: 2, z: 1 });
  saveContributions(store, {});
  assert.equal(store.data.has(CONTRIBUTIONS_KEY), false);
});
