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
  sharedSilence,
  tally,
  type CollectiveEvent,
} from "./collective.ts";
import { chooseDiscovery, inCuratorialOrder } from "./participations.ts";

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
  assert.equal(chooseDiscovery(FEATURED, EMPTY_COLLECTIVE, 1)?.id, ordered[1].id);
  assert.equal(chooseDiscovery([], EMPTY_COLLECTIVE), null);

  const allButOne = fromCounts({}, Object.fromEntries(FEATURED.slice(1).map((s) => [s.id, 1])));
  assert.equal(chooseDiscovery(FEATURED, allButOne, 7)?.id, FEATURED[0].id);
});

test("a scientist remembered without clues waits until every other one has been presented as often", () => {
  const nise = FEATURED.find((s) => s.id === "nise-da-silveira");
  assert.ok(nise);
  const collective = fromCounts({ [nise.id]: 1 });
  for (let cursor = 0; cursor < FEATURED.length * 2; cursor++) {
    assert.notEqual(chooseDiscovery(FEATURED, collective, cursor)?.id, nise.id);
  }
});
