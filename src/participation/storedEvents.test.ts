import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIncoming } from "./archiveShape.ts";
import {
  EVENTS_KEY,
  MAX_SUBMITTED_NAME,
  REVIEW_KEY,
  adoptLegacy,
  loadEvents,
  loadSubmissions,
  mergeSubmissions,
  parseEvents,
  saveEvents,
  saveSubmissions,
  type EventStore,
} from "./storedEvents.ts";

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
    { uid: "a", kind: "silence" as const, at: 1 },
    { uid: "b", kind: "discovery" as const, id: "a", at: 2 },
    { uid: "c", kind: "recall" as const, id: "b", at: 3 },
    { uid: "d", kind: "foreign" as const, ref: "marie-curie", at: 4 },
    { uid: "e", kind: "unidentified" as const, at: 5, later: true as const },
  ];
  saveEvents(store, events);
  assert.deepEqual(loadEvents(store), events);
});

test("saving never clears what was stored, even with no events", () => {
  const store = memoryStore({ [EVENTS_KEY]: JSON.stringify([{ uid: "a", kind: "silence", at: 1 }]) });
  saveEvents(store, []);
  assert.deepEqual(loadEvents(store), [{ uid: "a", kind: "silence", at: 1 }]);
});

test("events stored before they had an id get a stable placeholder, and are re-keyed once adopted", () => {
  const store = memoryStore({ [EVENTS_KEY]: JSON.stringify([{ kind: "silence", at: 1 }, { kind: "recall", id: "a", at: 2 }]) });
  const loaded = loadEvents(store);
  assert.deepEqual(
    loaded.map((e) => e.uid),
    ["legacy-1-0", "legacy-2-1"],
  );
  const adopted = adoptLegacy(loaded, (at) => `new-${at}`);
  assert.deepEqual(
    adopted.map((e) => e.uid),
    ["new-1", "new-2"],
  );
  assert.equal(adoptLegacy(adopted, () => "never"), adopted);
});

test("the old prototype counts are left untouched and ignored", () => {
  const legacy = JSON.stringify({ "nise-da-silveira": 3 });
  const store = memoryStore({ [LEGACY_KEY]: legacy });
  assert.deepEqual(loadEvents(store), []);
  saveEvents(store, [{ uid: "a", kind: "recall", id: "nise-da-silveira", at: 1 }]);
  assert.equal(store.data.get(LEGACY_KEY), legacy);
});

test("broken or tampered storage never breaks the experience", () => {
  assert.deepEqual(parseEvents(null), []);
  assert.deepEqual(parseEvents("not json"), []);
  assert.deepEqual(parseEvents('{"a":1}'), []);
  assert.deepEqual(
    parseEvents(
      JSON.stringify([
        { uid: "a", kind: "recall", id: "a", at: 1 },
        { uid: "b", kind: "recall", at: 2 },
        { uid: "c", kind: "shout", id: "b", at: 3 },
        { uid: "d", kind: "silence" },
        { uid: "e", kind: "foreign", at: 5 },
        null,
      ]),
    ),
    [{ uid: "a", kind: "recall", id: "a", at: 1 }],
  );
  assert.deepEqual(
    parseEvents(
      JSON.stringify([
        { uid: "a", kind: "recall", id: "a", at: 1, later: true },
        { uid: "b", kind: "recall", id: "b", at: 2, later: "yes" },
      ]),
    ),
    [
      { uid: "a", kind: "recall", id: "a", at: 1, later: true },
      { uid: "b", kind: "recall", id: "b", at: 2 },
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
  assert.doesNotThrow(() => saveEvents(throwing, [{ uid: "a", kind: "silence", at: 1 }]));
  assert.deepEqual(loadEvents(null), []);
  assert.deepEqual(loadSubmissions(throwing), []);
});

test("names kept for review survive a reload, trimmed, and merge without duplicates", () => {
  const store = memoryStore();
  const long = "x".repeat(MAX_SUBMITTED_NAME + 20);
  saveSubmissions(store, [
    { uid: "r1", submittedName: "  Joana Silva  ", createdAt: 2 },
    { uid: "r2", submittedName: long, createdAt: 3 },
  ]);
  assert.ok(store.data.has(REVIEW_KEY));
  const loaded = loadSubmissions(store);
  assert.deepEqual(
    loaded.map((s) => s.submittedName),
    ["Joana Silva", "x".repeat(MAX_SUBMITTED_NAME)],
  );
  const merged = mergeSubmissions(loaded, [{ uid: "r0", submittedName: "Antes", createdAt: 1 }, loaded[0]]);
  assert.deepEqual(
    merged.map((s) => s.uid),
    ["r0", "r1", "r2"],
  );
});

test("the archive only accepts well-formed events with their own ids", () => {
  assert.equal(parseIncoming(null), null);
  const archive = parseIncoming({
    events: [{ uid: "ok", kind: "silence", at: 1 }, { kind: "silence", at: 2 }, { uid: "bad", kind: "recall", at: 3 }],
    review: [{ uid: "r", submittedName: "Nome", createdAt: 4 }, { submittedName: "sem id", createdAt: 5 }],
  });
  assert.ok(archive);
  assert.deepEqual(
    archive.events.map((e) => e.uid),
    ["ok"],
  );
  assert.deepEqual(
    archive.review.map((r) => r.uid),
    ["r"],
  );
});
