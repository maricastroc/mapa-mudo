import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../content/scientists/catalog.ts";
import { FEATURED } from "../content/scientists/featured.ts";
import { createMatcher, isValidAnswer } from "../content/scientists/matcher.ts";
import { INITIAL_PARTICIPATIONS, SHEET_LAYOUT } from "../participation/source.ts";
import { sheetPoints } from "../participation/sheetLayout.ts";
import { simulatedSpeech } from "./speechSimulation.ts";
import { createExperience, type Action, type State } from "./state.ts";

const experience = createExperience(CATALOG, INITIAL_PARTICIPATIONS);

function run(actions: Action[], from: State = experience.initialState()) {
  return actions.reduce(experience.reduce, from);
}

const DISCOVERY_PATH: Action[] = [
  { type: "dontKnow" },
  { type: "approach" },
  { type: "nextClue" },
  { type: "nextClue" },
  { type: "reachHumanScale" },
  { type: "continue" },
];

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

test("the discoverable set is the whole curated featured set", () => {
  assert.equal(experience.discoverable.length, FEATURED.length);
});

test("'não sei' rotates across all featured scientists", () => {
  let state = experience.initialState();
  const seen = new Set<string>();
  for (let i = 0; i < FEATURED.length; i++) {
    state = run([{ type: "dontKnow" }], state);
    assert.equal(state.step, "noName");
    assert.ok(state.discoveryId);
    seen.add(state.discoveryId);
    state = run([{ type: "restart" }], state);
  }
  assert.equal(seen.size, FEATURED.length);
});

test("scenario 1: a featured name said spontaneously counts without forcing the clues", () => {
  for (const s of FEATURED) {
    const state = run([{ type: "name", text: s.canonicalName.toLowerCase() }]);
    assert.equal(state.step, "nameSaid", s.id);
    assert.equal(state.saidId, s.id);
    assert.equal(state.participations[s.id], (INITIAL_PARTICIPATIONS[s.id] ?? 0) + 1);
    assert.equal(state.discoveryId, null);
  }
});

test("scenario 2: a known-only name counts and reaches the collective map", () => {
  const state = run([{ type: "name", text: "Raimunda Nogueira" }, { type: "seeMap" }]);
  assert.equal(state.step, "collective");
  assert.equal(state.participations.p001, INITIAL_PARTICIPATIONS.p001 + 1);
});

test("scenario 3: an ambiguous answer waits for confirmation and can be resolved or rejected", () => {
  const asked = run([{ type: "name", text: "Ana Luísa" }]);
  assert.equal(asked.step, "opening");
  assert.ok(asked.response?.kind === "confirm");
  assert.ok(asked.response.candidates.length >= 2);
  assert.deepEqual(asked.participations, INITIAL_PARTICIPATIONS);

  const target = asked.response.candidates[1].id;
  const confirmed = run([{ type: "confirm", id: target }], asked);
  assert.equal(confirmed.step, "nameSaid");
  assert.equal(confirmed.participations[target], (INITIAL_PARTICIPATIONS[target] ?? 0) + 1);

  const rejected = run([{ type: "reject" }], asked);
  assert.equal(rejected.step, "opening");
  assert.deepEqual(rejected.response, { kind: "notFound", text: "Ana Luísa" });
});

test("an excessively incomplete answer asks for the full name without counting", () => {
  const state = run([{ type: "name", text: "Ana" }]);
  assert.equal(state.step, "opening");
  assert.equal(state.response?.kind, "incomplete");
  assert.deepEqual(state.participations, INITIAL_PARTICIPATIONS);
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

test("scenario 5: for every featured scientist, don't know → discover → know → say it → +1", () => {
  let state = experience.initialState();
  for (let i = 0; i < FEATURED.length; i++) {
    const asking = run(DISCOVERY_PATH, state);
    assert.equal(asking.step, "askAgain");
    const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
    assert.ok(discovery);
    const spoken = simulatedSpeech(asking.step, discovery);
    assert.equal(spoken, discovery.canonicalName);
    const said = run([{ type: "name", text: spoken ?? "" }, { type: "seeMap" }], asking);
    assert.equal(said.step, "collective");
    assert.equal(said.saidId, discovery.id);
    assert.equal(said.participations[discovery.id], (state.participations[discovery.id] ?? 0) + 1);
    state = run([{ type: "anotherName" }], said);
  }
});

test("recognizing the discovery during the clues reveals her and counts once", () => {
  const started = run([{ type: "dontKnow" }, { type: "approach" }]);
  const discovery = FEATURED.find((s) => s.id === started.discoveryId);
  assert.ok(discovery);
  const revealed = run([{ type: "name", text: discovery.canonicalName }], started);
  assert.equal(revealed.step, "humanScale");
  assert.equal(revealed.alreadySaid, true);
  const counted = run([{ type: "continue" }], revealed);
  assert.equal(counted.step, "nameSaid");
  assert.equal(counted.participations[discovery.id], (INITIAL_PARTICIPATIONS[discovery.id] ?? 0) + 1);
});

test("during the clues another valid name does not count and keeps the discovery going", () => {
  const state = run([{ type: "dontKnow" }, { type: "approach" }, { type: "name", text: "Raimunda Nogueira" }]);
  assert.equal(state.step, "clue1");
  assert.equal(state.response?.kind, "otherPoint");
  assert.deepEqual(state.participations, INITIAL_PARTICIPATIONS);
});

test("speech simulation is scripted outside the interface and stays silent at the opening", () => {
  const discovery = FEATURED[0];
  assert.equal(simulatedSpeech("opening", discovery), null);
  assert.equal(simulatedSpeech("clue2", discovery), discovery.canonicalName);
  assert.equal(simulatedSpeech("askAgain", null), null);
});

test("silence at the opening starts a discovery", () => {
  const state = run([{ type: "silence" }]);
  assert.equal(state.step, "noName");
  assert.ok(FEATURED.some((s) => s.id === state.discoveryId));
});

test("the collective map accepts every featured scientist once mentioned", () => {
  const participations = Object.fromEntries(FEATURED.map((s, i) => [s.id, i + 1]));
  const points = sheetPoints(CATALOG, SHEET_LAYOUT, { ...INITIAL_PARTICIPATIONS, ...participations });
  for (const s of FEATURED) {
    const point = points.find((p) => p.scientistId === s.id);
    assert.ok(point, s.id);
    assert.equal(point.mentions, participations[s.id]);
    assert.equal(point.name, s.canonicalName);
  }
});

test("the profile opens only from the human scale and closes back to it without counting", () => {
  const atHumanScale = run(DISCOVERY_PATH.slice(0, 5));
  assert.equal(atHumanScale.step, "humanScale");
  assert.equal(run([{ type: "openProfile" }], experience.initialState()).step, "opening");

  const profile = run([{ type: "openProfile" }], atHumanScale);
  assert.equal(profile.step, "profile");
  assert.equal(profile.discoveryId, atHumanScale.discoveryId);
  assert.deepEqual(profile.participations, INITIAL_PARTICIPATIONS);
  assert.equal(run([{ type: "name", text: "Raimunda Nogueira" }], profile).step, "profile");

  const back = run([{ type: "closeProfile" }], profile);
  assert.equal(back.step, "humanScale");
  assert.deepEqual(back.participations, INITIAL_PARTICIPATIONS);
});

test("continuing from the profile behaves like continuing from the human scale", () => {
  const profile = run([...DISCOVERY_PATH.slice(0, 5), { type: "openProfile" }]);
  assert.equal(run([{ type: "continue" }], profile).step, "askAgain");

  const recognized = run([{ type: "dontKnow" }, { type: "approach" }]);
  const discovery = FEATURED.find((s) => s.id === recognized.discoveryId);
  assert.ok(discovery);
  const revealed = run([{ type: "name", text: discovery.canonicalName }, { type: "openProfile" }], recognized);
  assert.equal(revealed.step, "profile");
  const counted = run([{ type: "continue" }], revealed);
  assert.equal(counted.step, "nameSaid");
  assert.equal(counted.participations[discovery.id], (INITIAL_PARTICIPATIONS[discovery.id] ?? 0) + 1);
});

test("the profile can also be opened from the waiting point on the map and returns there", () => {
  const asking = run(DISCOVERY_PATH);
  assert.equal(asking.step, "askAgain");
  const profile = run([{ type: "openProfile" }], asking);
  assert.equal(profile.step, "profile");
  assert.equal(profile.profileReturn, "askAgain");
  const back = run([{ type: "closeProfile" }], profile);
  assert.equal(back.step, "askAgain");
  assert.equal(back.profileReturn, null);
  assert.deepEqual(back.participations, INITIAL_PARTICIPATIONS);
});
