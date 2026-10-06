import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../content/scientists/catalog.ts";
import { createMatcher, isValidAnswer } from "../content/scientists/matcher.ts";
import { INITIAL_PARTICIPATIONS, SHEET_LAYOUT } from "../participation/source.ts";
import { sheetPoints } from "../participation/sheetLayout.ts";
import { simulatedSpeech } from "./speechSimulation.ts";
import { createExperience, type Action, type State } from "./state.ts";

const experience = createExperience(CATALOG, INITIAL_PARTICIPATIONS);
const helena = experience.discoverable[0];

function run(actions: Action[], from: State = experience.initialState()) {
  return actions.reduce(experience.reduce, from);
}

test("contract: featured is not the universe of valid answers", () => {
  const knownOnly = CATALOG.known.find((k) => k.canonicalName === "Celina Brandão");
  assert.ok(knownOnly);
  assert.equal(
    CATALOG.featured.some((f) => f.id === knownOnly.id),
    false,
  );
  const result = createMatcher(CATALOG)("celina brandao");
  assert.equal(result.status, "known");
  assert.equal(isValidAnswer(result), true);

  const state = run([{ type: "name", text: "Celina Brandão" }]);
  assert.equal(state.step, "nameSaid");
  assert.equal(state.saidId, knownOnly.id);
  assert.equal(state.participations[knownOnly.id], 1);

  const onMap = sheetPoints(CATALOG, SHEET_LAYOUT, state.participations).find((p) => p.scientistId === knownOnly.id);
  assert.ok(onMap);
  assert.equal(onMap.mentions, 1);
  assert.equal(onMap.featured, false);
});

test("scenario 1: a featured name said spontaneously counts without forcing the clues", () => {
  const state = run([{ type: "name", text: "helena alencar" }]);
  assert.equal(state.step, "nameSaid");
  assert.equal(state.saidId, helena.id);
  assert.equal(state.participations[helena.id], INITIAL_PARTICIPATIONS[helena.id] + 1);
  assert.equal(state.discoveryId, null);
});

test("scenario 2: a known-only name counts and reaches the collective map", () => {
  const state = run([{ type: "name", text: "Raimunda Nogueira" }, { type: "seeMap" }]);
  assert.equal(state.step, "collective");
  assert.equal(state.participations.p001, INITIAL_PARTICIPATIONS.p001 + 1);
});

test("scenario 3: an ambiguous answer waits for confirmation and can be resolved or rejected", () => {
  const asked = run([{ type: "name", text: "Ana" }]);
  assert.equal(asked.step, "opening");
  assert.equal(asked.response?.kind, "confirm");
  assert.deepEqual(asked.participations, INITIAL_PARTICIPATIONS);

  const confirmed = run([{ type: "confirm", id: "f-ana-clara-bastos" }], asked);
  assert.equal(confirmed.step, "nameSaid");
  assert.equal(confirmed.participations["f-ana-clara-bastos"], 1);

  const rejected = run([{ type: "reject" }], asked);
  assert.equal(rejected.step, "opening");
  assert.deepEqual(rejected.response, { kind: "notFound", text: "Ana" });
});

test("scenario 4: an unknown name is not an error and can be submitted for review", () => {
  const unknown = run([{ type: "name", text: "Marie Curie" }]);
  assert.equal(unknown.step, "opening");
  assert.deepEqual(unknown.response, { kind: "notFound", text: "Marie Curie" });

  const submitted = run([{ type: "submitForReview", at: 1000 }], unknown);
  assert.deepEqual(submitted.reviewQueue, [{ submittedName: "Marie Curie", createdAt: 1000 }]);
  assert.deepEqual(submitted.response, { kind: "submitted", text: "Marie Curie" });
  assert.deepEqual(submitted.participations, INITIAL_PARTICIPATIONS);
});

test("scenario 5: don't know → discover → know → say it → +1", () => {
  const asking = run([
    { type: "dontKnow" },
    { type: "approach" },
    { type: "nextClue" },
    { type: "nextClue" },
    { type: "reachHumanScale" },
    { type: "continue" },
  ]);
  assert.equal(asking.step, "askAgain");
  assert.equal(asking.discoveryId, helena.id);

  const spoken = simulatedSpeech(asking.step, helena);
  assert.equal(spoken, helena.canonicalName);
  const said = run([{ type: "name", text: spoken ?? "" }, { type: "seeMap" }], asking);
  assert.equal(said.step, "collective");
  assert.equal(said.saidId, helena.id);
  assert.equal(said.participations[helena.id], INITIAL_PARTICIPATIONS[helena.id] + 1);
});

test("recognizing the discovery during the clues reveals her and counts once", () => {
  const revealed = run([{ type: "dontKnow" }, { type: "approach" }, { type: "name", text: "Helena Alencar" }]);
  assert.equal(revealed.step, "humanScale");
  assert.equal(revealed.alreadySaid, true);
  const counted = run([{ type: "continue" }], revealed);
  assert.equal(counted.step, "nameSaid");
  assert.equal(counted.participations[helena.id], INITIAL_PARTICIPATIONS[helena.id] + 1);
});

test("during the clues another valid name does not count and keeps the discovery going", () => {
  const state = run([{ type: "dontKnow" }, { type: "approach" }, { type: "name", text: "Raimunda Nogueira" }]);
  assert.equal(state.step, "clue1");
  assert.equal(state.response?.kind, "otherPoint");
  assert.deepEqual(state.participations, INITIAL_PARTICIPATIONS);
});

test("speech simulation is scripted outside the interface and stays silent at the opening", () => {
  assert.equal(simulatedSpeech("opening", helena), null);
  assert.equal(simulatedSpeech("clue2", helena), helena.canonicalName);
  assert.equal(simulatedSpeech("askAgain", null), null);
});

test("silence at the opening starts a discovery", () => {
  const state = run([{ type: "silence" }]);
  assert.equal(state.step, "noName");
  assert.equal(state.discoveryId, helena.id);
});
