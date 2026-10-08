import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURED } from "../content/scientists/featured.ts";
import {
  EMPTY_COLLECTIVE,
  REEF_SURFACES_AT,
  SILENCE_SAMPLE_MIN,
  fromCounts,
  isAboveWater,
  presenceOf,
  recallOf,
  sharedSilence,
  tally,
  type CollectiveEvent,
} from "./collective.ts";
import { chooseDiscovery, inCuratorialOrder, shuffled } from "./participations.ts";

const everyone = () => true;

test("recall builds rock, every other kind of name builds reef, and silence counts apart", () => {
  const events: CollectiveEvent[] = [
    { kind: "recall", id: "a", at: 1 },
    { kind: "silence", at: 2 },
    { kind: "discovery", id: "b", at: 3 },
    { kind: "cued", id: "b", at: 4 },
    { kind: "recognition", id: "a", at: 5 },
  ];
  const collective = tally(events, everyone);
  assert.deepEqual(collective.recall, { a: 1 });
  assert.deepEqual(collective.reef, { b: 2, a: 1 });
  assert.equal(collective.silences, 1);
  assert.equal(collective.answers, 2);
  assert.deepEqual(collective.order, ["a", "b"]);
  assert.equal(presenceOf(collective, "a"), 2);
});

test("names no longer in the catalog are left out of the tally but silence still counts", () => {
  const collective = tally(
    [
      { kind: "recall", id: "gone", at: 1 },
      { kind: "silence", at: 2 },
    ],
    (id) => id !== "gone",
  );
  assert.deepEqual(collective.recall, {});
  assert.equal(collective.silences, 1);
});

test("a scientist is above water once remembered or once known here", () => {
  assert.equal(isAboveWater(0, 0), false);
  assert.equal(isAboveWater(1, 0), true);
  assert.equal(isAboveWater(0, REEF_SURFACES_AT), true);
});

test("the shared silence is only told with a minimal sample and never counts the visitor twice", () => {
  const below = { ...EMPTY_COLLECTIVE, silences: SILENCE_SAMPLE_MIN - 2, answers: SILENCE_SAMPLE_MIN - 1 };
  assert.equal(sharedSilence(below, true), null);
  const enough = { ...EMPTY_COLLECTIVE, silences: 15, answers: SILENCE_SAMPLE_MIN };
  assert.equal(sharedSilence(enough, true), 14);
  assert.equal(sharedSilence(enough, false), 15);
  const almostNobody = { ...EMPTY_COLLECTIVE, silences: 2, answers: 40 };
  assert.equal(sharedSilence(almostNobody, true), null);
});

test("discovery goes to the least present scientist, and among equals to the one curation expects to be least known", () => {
  const ordered = inCuratorialOrder(FEATURED);
  const ranks = ordered.map((s) => s.experience.recognitionLevel ?? "discovery");
  assert.equal(ranks.indexOf("medium") > ranks.lastIndexOf("discovery"), true);
  assert.equal(ranks.indexOf("high") > ranks.lastIndexOf("medium"), true);

  assert.equal(chooseDiscovery(FEATURED, EMPTY_COLLECTIVE)?.id, ordered[0].id);
  assert.equal(chooseDiscovery(FEATURED, EMPTY_COLLECTIVE, { [ordered[0].id]: 1 })?.id, ordered[1].id);
  assert.equal(chooseDiscovery([], EMPTY_COLLECTIVE), null);

  const allButOne = fromCounts({}, Object.fromEntries(FEATURED.slice(1).map((s) => [s.id, 1])));
  assert.equal(chooseDiscovery(FEATURED, allButOne, { [FEATURED[0].id]: 7 })?.id, FEATURED[0].id);
});

test("a memory that comes later in a visit raises the rock but does not count the person twice", () => {
  const collective = tally(
    [
      { kind: "silence", at: 1 },
      { kind: "recall", id: "a", at: 2, later: true },
      { kind: "recall", id: "b", at: 3 },
    ],
    everyone,
  );
  assert.equal(recallOf(collective, "a"), 1);
  assert.equal(recallOf(collective, "b"), 1);
  assert.equal(collective.answers, 2);
});

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test("a shuffle keeps every scientist once and changes with the draw", () => {
  const ids = FEATURED.map((s) => s.id);
  const first = shuffled(ids, seeded(1));
  const second = shuffled(ids, seeded(2));
  assert.deepEqual([...first].sort(), [...ids].sort());
  assert.deepEqual([...second].sort(), [...ids].sort());
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, ids);
});

test("among equals, the visit's draw decides who comes first, without mixing curatorial tiers", () => {
  const order = shuffled(FEATURED.map((s) => s.id), seeded(3));
  const tierOf = (id: string) => FEATURED.find((s) => s.id === id)?.experience.recognitionLevel ?? "discovery";
  const lesserKnown = order.filter((id) => tierOf(id) === "discovery");
  const ordered = inCuratorialOrder(FEATURED, order).map((s) => s.id);
  assert.deepEqual(ordered.slice(0, lesserKnown.length), lesserKnown);
  assert.equal(chooseDiscovery(FEATURED, EMPTY_COLLECTIVE, {}, order)?.id, lesserKnown[0]);
  assert.equal(chooseDiscovery(FEATURED, EMPTY_COLLECTIVE, { [lesserKnown[0]]: 1 }, order)?.id, lesserKnown[1]);
  const firsts = new Set([1, 2, 3, 4, 5, 6].map((seed) => chooseDiscovery(FEATURED, EMPTY_COLLECTIVE, {}, shuffled(order, seeded(seed)))?.id));
  assert.ok(firsts.size > 1);
});

test("a scientist remembered without clues waits until every other one has been presented as often", () => {
  const nise = FEATURED.find((s) => s.id === "nise-da-silveira");
  assert.ok(nise);
  const collective = fromCounts({ [nise.id]: 1 });
  let offered: Record<string, number> = {};
  for (let visit = 0; visit < FEATURED.length * 2; visit++) {
    const chosen = chooseDiscovery(FEATURED, collective, offered, shuffled(FEATURED.map((s) => s.id), seeded(visit)));
    assert.ok(chosen);
    assert.notEqual(chosen.id, nise.id);
    offered = { ...offered, [chosen.id]: (offered[chosen.id] ?? 0) + 1 };
  }
});
