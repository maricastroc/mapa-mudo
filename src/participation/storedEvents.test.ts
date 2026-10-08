import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENTS_KEY, loadEvents, parseEvents, saveEvents, type EventStore } from "./storedEvents.ts";

const LEGACY_KEY = "diga-um-nome:contributions:v1";

function memoryStore(initial: Record<string, string> = {}): EventStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

test("events round-trip through storage in order", () => {
  const store = memoryStore();
  const events = [
    { kind: "silence" as const, at: 1 },
    { kind: "discovery" as const, id: "a", at: 2 },
    { kind: "recall" as const, id: "b", at: 3 },
  ];
  saveEvents(store, events);
  assert.deepEqual(loadEvents(store), events);
});

test("saving never clears what was stored, even with no events", () => {
  const store = memoryStore({ [EVENTS_KEY]: JSON.stringify([{ kind: "silence", at: 1 }]) });
  saveEvents(store, []);
  assert.deepEqual(loadEvents(store), [{ kind: "silence", at: 1 }]);
});

test("the old prototype counts are left untouched and ignored", () => {
  const legacy = JSON.stringify({ "nise-da-silveira": 3 });
  const store = memoryStore({ [LEGACY_KEY]: legacy });
  assert.deepEqual(loadEvents(store), []);
  saveEvents(store, [{ kind: "recall", id: "nise-da-silveira", at: 1 }]);
  assert.equal(store.data.get(LEGACY_KEY), legacy);
});

test("broken or tampered storage never breaks the experience", () => {
  assert.deepEqual(parseEvents(null), []);
  assert.deepEqual(parseEvents("not json"), []);
  assert.deepEqual(parseEvents('{"a":1}'), []);
  assert.deepEqual(
    parseEvents(JSON.stringify([{ kind: "recall", id: "a", at: 1 }, { kind: "recall", at: 2 }, { kind: "shout", id: "b", at: 3 }, { kind: "silence" }, null])),
    [{ kind: "recall", id: "a", at: 1 }],
  );
  assert.deepEqual(
    parseEvents(JSON.stringify([{ kind: "recall", id: "a", at: 1, later: true }, { kind: "recall", id: "b", at: 2, later: "yes" }])),
    [
      { kind: "recall", id: "a", at: 1, later: true },
      { kind: "recall", id: "b", at: 2 },
    ],
  );
  const throwing: EventStore = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadEvents(throwing), []);
  assert.doesNotThrow(() => saveEvents(throwing, [{ kind: "silence", at: 1 }]));
  assert.deepEqual(loadEvents(null), []);
});
