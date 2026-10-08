import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../content/scientists/catalog.ts";
import { FEATURED } from "../content/scientists/featured.ts";
import { KNOWN_FIXTURES, LAYOUT_FIXTURE, PARTICIPATIONS_FIXTURE } from "../content/scientists/fixtures.ts";
import type { Catalog } from "../content/scientists/types.ts";
import { createMatcher, isValidAnswer } from "../content/scientists/matcher.ts";
import { fromCounts, presenceOf } from "../participation/collective.ts";
import { INITIAL_COLLECTIVE, SHEET_LAYOUT } from "../participation/source.ts";
import { sheetPoints } from "../participation/sheetLayout.ts";
import { createExperience, MAX_HINT, type Action, type State } from "./state.ts";

function clock() {
  let t = 1000;
  return () => t++;
}

const experience = createExperience(CATALOG, INITIAL_COLLECTIVE, clock());

function run(actions: Action[], from: State = experience.initialState()) {
  return actions.reduce(experience.reduce, from);
}

const WITH_KNOWN: Catalog = { featured: FEATURED, known: KNOWN_FIXTURES };
const FIXTURE_COLLECTIVE = fromCounts(PARTICIPATIONS_FIXTURE);
const withKnown = createExperience(WITH_KNOWN, FIXTURE_COLLECTIVE, clock());

function runWithKnown(actions: Action[], from: State = withKnown.initialState()) {
  return actions.reduce(withKnown.reduce, from);
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
  const knownOnly = WITH_KNOWN.known.find((k) => k.canonicalName === "Celina Brandão");
  assert.ok(knownOnly);
  assert.equal(
    WITH_KNOWN.featured.some((f) => f.id === knownOnly.id),
    false,
  );
  const result = createMatcher(WITH_KNOWN)("celina brandao");
  assert.equal(result.status, "known");
  assert.equal(isValidAnswer(result), true);

  const state = runWithKnown([{ type: "name", text: "Celina Brandão" }]);
  assert.equal(state.step, "nameSaid");
  assert.equal(state.saidId, knownOnly.id);
  assert.equal(state.collective.recall[knownOnly.id], 1);

  const onMap = sheetPoints(WITH_KNOWN, LAYOUT_FIXTURE, state.collective).find((p) => p.scientistId === knownOnly.id);
  assert.ok(onMap);
  assert.equal(onMap.recall, 1);
  assert.equal(onMap.featured, false);
});

test("the discoverable set is the whole curated featured set", () => {
  assert.equal(experience.discoverable.length, FEATURED.length);
});

test("'não sei' rotates across all featured scientists while nobody completes a discovery", () => {
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
  assert.equal(state.collective.silences, FEATURED.length);
});

test("scenario 1: a featured name said at the first question counts as remembered without clues", () => {
  for (const s of FEATURED) {
    const state = run([{ type: "name", text: s.canonicalName.toLowerCase() }]);
    assert.equal(state.step, "nameSaid", s.id);
    assert.equal(state.saidId, s.id);
    assert.equal(state.saidKind, "recall");
    assert.equal(state.collective.recall[s.id], 1);
    assert.equal(state.collective.reef[s.id] ?? 0, 0);
    assert.equal(state.collective.answers, 1);
    assert.equal(state.events.length, 1);
    const [event] = state.events;
    assert.ok(event.kind === "recall" && event.id === s.id && event.uid.length > 0 && !("later" in event));
    assert.equal(state.discoveryId, null);
  }
});

test("scenario 2: a known-only name counts and reaches the collective map", () => {
  const state = runWithKnown([{ type: "name", text: "Raimunda Nogueira" }, { type: "seeMap" }]);
  assert.equal(state.step, "collective");
  assert.equal(state.collective.recall.p001, PARTICIPATIONS_FIXTURE.p001 + 1);
});

test("scenario 3: an ambiguous answer waits for confirmation and can be resolved or rejected", () => {
  const asked = runWithKnown([{ type: "name", text: "Ana Luísa" }]);
  assert.equal(asked.step, "opening");
  assert.ok(asked.response?.kind === "confirm");
  assert.ok(asked.response.candidates.length >= 2);
  assert.deepEqual(asked.collective, FIXTURE_COLLECTIVE);

  const target = asked.response.candidates[1].id;
  const confirmed = runWithKnown([{ type: "confirm", id: target }], asked);
  assert.equal(confirmed.step, "nameSaid");
  assert.equal(confirmed.saidKind, "recall");
  assert.equal(confirmed.collective.recall[target], (PARTICIPATIONS_FIXTURE[target] ?? 0) + 1);

  const rejected = runWithKnown([{ type: "reject" }], asked);
  assert.equal(rejected.step, "opening");
  assert.deepEqual(rejected.response, { kind: "notFound", text: "Ana Luísa" });
});

test("an excessively incomplete answer asks for the full name without counting", () => {
  const state = run([{ type: "name", text: "Ana" }]);
  assert.equal(state.step, "opening");
  assert.equal(state.response?.kind, "incomplete");
  assert.deepEqual(state.collective, INITIAL_COLLECTIVE);
  assert.equal(state.fresh, true);
});

test("scenario 4: an unknown name is not an error and can be kept for review, counted only as unidentified", () => {
  const unknown = run([{ type: "name", text: "Josefa Tavares Brito" }]);
  assert.equal(unknown.step, "opening");
  assert.deepEqual(unknown.response, { kind: "notFound", text: "Josefa Tavares Brito" });
  assert.equal(unknown.fresh, true);

  const submitted = run([{ type: "submitForReview", at: 1000 }], unknown);
  assert.equal(submitted.reviewQueue.length, 1);
  assert.equal(submitted.reviewQueue[0].submittedName, "Josefa Tavares Brito");
  assert.equal(submitted.reviewQueue[0].createdAt, 1000);
  assert.deepEqual(submitted.response, { kind: "submitted", text: "Josefa Tavares Brito" });
  assert.equal(submitted.collective.firsts.unidentified, 1);
  assert.equal(submitted.collective.silences, 0);
  assert.equal(submitted.fresh, false);
  const discovering = run([{ type: "discoverAnother" }], submitted);
  assert.equal(discovering.step, "noName");
  assert.equal(discovering.collective.silences, 0);
});

test("a famous foreign scientist or a man is acknowledged, counted apart, and leads to a Brazilian discovery", () => {
  const curie = run([{ type: "name", text: "Marie Curie" }]);
  assert.equal(curie.step, "opening");
  assert.ok(curie.response?.kind === "reference");
  assert.equal(curie.response.category, "foreign");
  assert.equal(curie.response.name, "Marie Curie");
  assert.equal(curie.collective.firsts.foreign, 1);
  assert.equal(curie.collective.answers, 1);
  assert.equal(curie.fresh, false);
  const discovering = run([{ type: "discoverAnother" }], curie);
  assert.equal(discovering.step, "noName");
  assert.equal(discovering.intro, "reference");
  assert.equal(discovering.collective.silences, 0);
  assert.equal(run([{ type: "dontKnow" }], curie).collective.silences, 0);

  const cruz = run([{ type: "name", text: "oswaldo cruz" }]);
  assert.ok(cruz.response?.kind === "reference" && cruz.response.category === "man");
  assert.equal(cruz.collective.firsts.man, 1);

  const typo = run([{ type: "name", text: "Albert Einstain" }]);
  assert.ok(typo.response?.kind === "reference" && typo.response.name === "Albert Einstein");
});

test("a Brazilian scientist outside the curated sheet counts as remembered, off the sheet", () => {
  const zilda = run([{ type: "name", text: "Zilda Arns" }]);
  assert.ok(zilda.response?.kind === "reference" && zilda.response.category === "elsewhere");
  assert.equal(zilda.collective.firsts.elsewhere, 1);
  assert.equal(zilda.collective.references["zilda-arns"], 1);
  assert.equal(run([{ type: "seeMap" }], zilda).step, "collective");
  const next = run([{ type: "discoverAnother" }], zilda);
  assert.equal(next.intro, "another");
});

test("others who answered the same way are told, without counting the visitor twice", () => {
  let state = experience.initialState();
  for (let i = 0; i < 3; i++) state = run([{ type: "name", text: "Marie Curie" }, { type: "restart" }], state);
  const fourth = run([{ type: "name", text: "Ada Lovelace" }], state);
  assert.ok(fourth.response?.kind === "reference");
  assert.equal(fourth.response.others, 3);
});

test("a single distinctive surname is offered for confirmation instead of asking for the full name", () => {
  const surname = run([{ type: "name", text: "Primavesi" }]);
  assert.ok(surname.response?.kind === "confirm");
  assert.deepEqual(
    surname.response.candidates.map((c) => c.id),
    ["ana-maria-primavesi"],
  );
  const firstName = run([{ type: "name", text: "Bertha" }]);
  assert.equal(firstName.response?.kind, "incomplete");
});

test("scenario 5: for every featured scientist, don't know → discover → know → say it → reef, never rock", () => {
  let state = experience.initialState();
  for (let i = 0; i < FEATURED.length; i++) {
    const asking = run(DISCOVERY_PATH, state);
    assert.equal(asking.step, "askAgain");
    const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
    assert.ok(discovery);
    const said = run([{ type: "name", text: discovery.canonicalName }, { type: "seeMap" }], asking);
    assert.equal(said.step, "collective");
    assert.equal(said.saidId, discovery.id);
    assert.equal(said.saidKind, "discovery");
    assert.equal(said.collective.reef[discovery.id], (state.collective.reef[discovery.id] ?? 0) + 1);
    assert.equal(said.collective.recall[discovery.id] ?? 0, 0);
    state = run([{ type: "restart" }], said);
  }
  assert.equal(state.collective.silences, FEATURED.length);
  assert.ok(FEATURED.every((s) => state.collective.reef[s.id] === 1));
});

test("the clues ask nothing: names typed during the approach are ignored and the discovery goes on", () => {
  const started = run([{ type: "dontKnow" }, { type: "approach" }]);
  const discovery = FEATURED.find((s) => s.id === started.discoveryId);
  assert.ok(discovery);
  for (const text of [discovery.canonicalName, "Nise da Silveira", "Marie Curie"]) {
    const typed = run([{ type: "name", text }], started);
    assert.equal(typed, started);
  }
  assert.equal(presenceOf(started.collective, "nise-da-silveira"), 0);
  assert.equal(run([{ type: "reachHumanScale" }], started).step, "clue1");
  const path = run([{ type: "nextClue" }, { type: "nextClue" }, { type: "reachHumanScale" }], started);
  assert.equal(path.step, "humanScale");
});

test("'Não sei' at the opening starts a discovery and is recorded once, as a first answer", () => {
  const state = run([{ type: "dontKnow" }]);
  assert.equal(state.step, "noName");
  assert.ok(FEATURED.some((s) => s.id === state.discoveryId));
  assert.equal(state.collective.silences, 1);
  assert.equal(state.collective.answers, 1);
  assert.equal(state.silenceRecorded, true);
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].kind, "silence");
  assert.equal(state.intro, "silence");
});

test("someone who remembers a name is offered a discovery among the least remembered, without a new silence", () => {
  const remembered = run([{ type: "name", text: "Nise da Silveira" }]);
  assert.equal(remembered.step, "nameSaid");
  const discovering = run([{ type: "discoverAnother" }], remembered);
  assert.equal(discovering.step, "noName");
  assert.equal(discovering.intro, "another");
  assert.notEqual(discovering.discoveryId, "nise-da-silveira");
  assert.equal(discovering.collective.silences, 0);
  assert.equal(discovering.collective.answers, 1);
  const discovery = FEATURED.find((s) => s.id === discovering.discoveryId);
  assert.ok(discovery);
  assert.equal(discovery.experience.recognitionLevel ?? "discovery", "discovery");
  const asking = run(DISCOVERY_PATH.slice(1), discovering);
  assert.equal(asking.step, "askAgain");
  const named = run([{ type: "name", text: discovery.canonicalName }], asking);
  assert.equal(named.saidKind, "discovery");
  assert.equal(named.collective.reef[discovery.id], 1);
  assert.equal(named.collective.recall["nise-da-silveira"], 1);
  assert.equal(run([{ type: "discoverAnother" }], experience.initialState()).step, "opening");
});

test("at the second question, an unambiguous part of her name is enough to name her point", () => {
  const asking = run(DISCOVERY_PATH);
  const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  const words = discovery.canonicalName.split(" ");
  for (const text of [words.at(-1) ?? "", words[0].slice(0, 3), discovery.canonicalName.toUpperCase()]) {
    const said = run([{ type: "name", text }], asking);
    assert.equal(said.step, "nameSaid", text);
    assert.equal(said.saidId, discovery.id, text);
    assert.equal(said.saidKind, "discovery", text);
  }
  const tooShort = run([{ type: "name", text: words[0].slice(0, 2) }], asking);
  assert.notEqual(tooShort.saidId, discovery.id);
});

test("after the first answer, a name not yet shown in this visit is still a memory, and one already shown is a recognition", () => {
  const [first, second] = FEATURED;
  const again = run([{ type: "name", text: first.canonicalName }, { type: "seeMap" }, { type: "anotherName" }]);
  assert.equal(again.step, "opening");
  assert.equal(again.fresh, false);
  assert.deepEqual(again.seen, [first.id]);
  const said = run([{ type: "name", text: second.canonicalName }], again);
  assert.equal(said.saidKind, "recall");
  assert.equal(said.collective.recall[second.id], 1);
  assert.equal(said.collective.reef[second.id] ?? 0, 0);
  assert.equal(said.collective.answers, 1);
  const last = said.events.at(-1);
  assert.ok(last && last.kind === "recall" && last.later === true);

  const repeated = run([{ type: "name", text: first.canonicalName }], again);
  assert.equal(repeated.saidKind, "recognition");
  assert.equal(repeated.collective.recall[first.id], 1);
  assert.equal(repeated.collective.reef[first.id], 1);
});

test("every name on the collective map counts as shown to the visitor who opened it", () => {
  const [first, second, third] = FEATURED;
  const elsewhere = run([{ type: "name", text: second.canonicalName }, { type: "seeMap" }, { type: "restart" }]);
  assert.deepEqual(elsewhere.seen, []);
  const map = run([{ type: "name", text: first.canonicalName }, { type: "seeMap" }], elsewhere);
  assert.deepEqual([...map.seen].sort(), [first.id, second.id].sort());
  const back = run([{ type: "anotherName" }], map);
  assert.equal(run([{ type: "name", text: second.canonicalName }], back).saidKind, "recognition");
  assert.equal(run([{ type: "name", text: third.canonicalName }], back).saidKind, "recall");
});

test("names suggested in 'É ela?' count as shown once the visitor moves on, without spoiling the one she picks", () => {
  const asked = runWithKnown([{ type: "name", text: "Ana Luísa" }]);
  assert.ok(asked.response?.kind === "confirm");
  const ids = asked.response.candidates.map((c) => c.id);
  assert.deepEqual(asked.seen, []);
  const confirmed = runWithKnown([{ type: "confirm", id: ids[1] }], asked);
  assert.equal(confirmed.saidKind, "recall");
  assert.ok(ids.every((id) => confirmed.seen.includes(id)));
  const rejected = runWithKnown([{ type: "reject" }], asked);
  assert.ok(ids.every((id) => rejected.seen.includes(id)));
});

test("a discovered scientist said again in the same visit never becomes a memory", () => {
  const asking = run(DISCOVERY_PATH);
  const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  const said = run([{ type: "name", text: discovery.canonicalName }, { type: "seeMap" }, { type: "anotherName" }], asking);
  const echoed = run([{ type: "name", text: discovery.canonicalName }], said);
  assert.equal(echoed.saidKind, "recognition");
  assert.equal(echoed.collective.recall[discovery.id] ?? 0, 0);
  assert.equal(echoed.collective.reef[discovery.id], 2);
});

test("'não sei' after the first answer starts another discovery without counting a new silence", () => {
  const again = run([{ type: "name", text: FEATURED[0].canonicalName }, { type: "seeMap" }, { type: "anotherName" }]);
  const discovering = run([{ type: "dontKnow" }], again);
  assert.equal(discovering.step, "noName");
  assert.equal(discovering.collective.silences, 0);
  assert.equal(discovering.silenceRecorded, false);
});

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test("every new visit draws a new order, and nobody is offered twice before everyone has been offered once", () => {
  const drawn = createExperience(CATALOG, INITIAL_COLLECTIVE, clock(), seeded(11));
  const tierOf = (id: string) => FEATURED.find((s) => s.id === id)?.experience.recognitionLevel ?? "discovery";
  let state = drawn.initialState();
  const orders = new Set<string>();
  const offered: string[] = [];
  for (let visit = 0; visit < FEATURED.length / 2; visit++) {
    orders.add(state.discoveryOrder.join());
    const first = drawn.reduce(state, { type: "dontKnow" });
    const second = drawn.reduce(drawn.reduce(first, { type: "anotherName" }), { type: "dontKnow" });
    assert.ok(first.discoveryId && second.discoveryId);
    offered.push(first.discoveryId, second.discoveryId);
    state = drawn.reduce(second, { type: "restart" });
    assert.deepEqual(state.collective, second.collective);
  }
  assert.equal(orders.size, FEATURED.length / 2);
  assert.equal(new Set(offered).size, FEATURED.length);
  const lesserKnown = offered.filter((id) => tierOf(id) === "discovery").length;
  assert.ok(offered.slice(0, lesserKnown).every((id) => tierOf(id) === "discovery"));
  const firstOfFreshVisits = new Set(
    [1, 2, 3, 4, 5, 6].map((seed) => {
      const fresh = createExperience(CATALOG, INITIAL_COLLECTIVE, clock(), seeded(seed));
      return fresh.reduce(fresh.initialState(), { type: "dontKnow" }).discoveryId;
    }),
  );
  assert.ok(firstOfFreshVisits.size > 1);
});

test("going back to the start mid-visit keeps the visit: no new silence, no memory, and her own silence stays out of the count", () => {
  const silent = run([{ type: "dontKnow" }]);
  for (const path of [[], [{ type: "approach" }, { type: "nextClue" }], DISCOVERY_PATH.slice(1)] as Action[][]) {
    const away = run(path, silent);
    const home = run([{ type: "anotherName" }], away);
    assert.equal(home.step, "opening");
    assert.equal(home.fresh, false);
    assert.equal(home.discoveryId, null);
    assert.deepEqual(home.events, silent.events);
    const again = run([{ type: "dontKnow" }], home);
    assert.equal(again.collective.silences, 1);
    assert.equal(again.silenceRecorded, true);
    const discovery = FEATURED.find((s) => s.id === away.discoveryId);
    const other = FEATURED.find((s) => s.id !== away.discoveryId);
    assert.ok(discovery && other);
    const remembered = run([{ type: "name", text: other.canonicalName }], home);
    assert.equal(remembered.saidKind, "recall");
    assert.equal(remembered.collective.answers, 1);
    const hinted = run([{ type: "name", text: discovery.canonicalName }], home);
    assert.equal(hinted.saidKind, path.length === 0 ? "recall" : "recognition");
  }
});

test("at the second question, another scientist's name is a recognition, not the discovery", () => {
  const asking = run(DISCOVERY_PATH);
  const other = FEATURED.find((s) => s.id !== asking.discoveryId);
  assert.ok(other);
  const said = run([{ type: "name", text: other.canonicalName }], asking);
  assert.equal(said.saidKind, "recognition");
  assert.equal(said.collective.reef[other.id], 1);
  assert.equal(said.collective.reef[asking.discoveryId ?? ""] ?? 0, 0);
});

test("the collective map accepts every featured scientist once mentioned", () => {
  const recall = Object.fromEntries(FEATURED.map((s, i) => [s.id, i + 1]));
  const points = sheetPoints(CATALOG, SHEET_LAYOUT, fromCounts(recall));
  for (const s of FEATURED) {
    const point = points.find((p) => p.scientistId === s.id);
    assert.ok(point, s.id);
    assert.equal(point.recall, recall[s.id]);
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
  assert.deepEqual(profile.collective, atHumanScale.collective);
  assert.equal(run([{ type: "name", text: "Nise da Silveira" }], profile).step, "profile");

  const back = run([{ type: "closeProfile" }], profile);
  assert.equal(back.step, "humanScale");
  assert.deepEqual(back.collective, atHumanScale.collective);
});

test("continuing from the profile behaves like continuing from the human scale", () => {
  const profile = run([...DISCOVERY_PATH.slice(0, 5), { type: "openProfile" }]);
  assert.equal(run([{ type: "continue" }], profile).step, "askAgain");
});

test("the profile can also be opened from her portrait on the map, and returns there with the name shown", () => {
  const asking = run(DISCOVERY_PATH);
  assert.equal(asking.step, "askAgain");
  const profile = run([{ type: "openProfile" }], asking);
  assert.equal(profile.step, "profile");
  assert.equal(profile.profileReturn, "askAgain");
  const back = run([{ type: "closeProfile" }], profile);
  assert.equal(back.step, "askAgain");
  assert.equal(back.profileReturn, null);
  assert.equal(back.hint, MAX_HINT);
  assert.deepEqual(back.collective, asking.collective);
});

test("restarting a visit never erases the collective map and makes the next answer a first answer again", () => {
  const said = run([{ type: "name", text: FEATURED[1].canonicalName }, { type: "seeMap" }, { type: "anotherName" }]);
  assert.equal(said.fresh, false);
  const restarted = run([{ type: "restart" }], said);
  assert.equal(restarted.step, "opening");
  assert.equal(restarted.fresh, true);
  assert.deepEqual(restarted.collective, said.collective);
  assert.deepEqual(restarted.events, said.events);
  const next = run([{ type: "name", text: FEATURED[2].canonicalName }], restarted);
  assert.equal(next.saidKind, "recall");
  assert.equal(next.events.length, 2);
});

test("the collective map can no longer be opened before the first answer", () => {
  const state = run([{ type: "seeMap" }]);
  assert.equal(state.step, "opening");
  assert.equal(run([{ type: "dontKnow" }, { type: "seeMap" }]).step, "noName");
});

test("help at the second question never turns the answer into a memory", () => {
  const asking = run(DISCOVERY_PATH);
  const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  for (const hints of [0, 1]) {
    const helped = run(Array.from({ length: hints }, () => ({ type: "hint" }) as Action), asking);
    assert.equal(helped.hint, hints);
    const said = run([{ type: "name", text: discovery.canonicalName }], helped);
    assert.equal(said.saidKind, "discovery");
    assert.equal(said.collective.recall[discovery.id] ?? 0, 0);
    assert.equal(said.collective.reef[discovery.id], 1);
  }
  const again = run([{ type: "hint" }, { type: "hint" }, { type: "seeMap" }, { type: "anotherName" }], asking);
  assert.equal(again.hint, 0);
});

test("after a discovery, the second question also leads to the collective map without counting a name", () => {
  const asking = run(DISCOVERY_PATH);
  assert.equal(asking.step, "askAgain");
  const map = run([{ type: "seeMap" }], asking);
  assert.equal(map.step, "collective");
  assert.equal(map.saidId, null);
  assert.deepEqual(map.collective, asking.collective);
  assert.deepEqual(map.events, asking.events);
  const discovery = FEATURED.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  const next = run([{ type: "anotherName" }, { type: "name", text: discovery.canonicalName }], map);
  assert.equal(next.saidKind, "recognition");
});

test("the installation map only names scientists from the curated package", () => {
  const curated = new Set(FEATURED.map((s) => s.id));
  assert.ok(CATALOG.known.every((k) => !k.fictional));
  const points = sheetPoints(CATALOG, SHEET_LAYOUT, INITIAL_COLLECTIVE);
  assert.ok(points.every((p) => p.scientistId === null || curated.has(p.scientistId)));
  assert.ok(points.filter((p) => p.recall + p.reef > 0).every((p) => p.name !== null && curated.has(p.scientistId ?? "")));
});

test("a scientist said for the first time leads to her profile, and from it to the full map", () => {
  const target = FEATURED[3];
  const said = run([{ type: "name", text: target.canonicalName }]);
  assert.equal(said.step, "nameSaid");
  assert.equal(said.collective.recall[target.id], 1);

  const profile = run([{ type: "openProfile", id: target.id }], said);
  assert.equal(profile.step, "profile");
  assert.equal(profile.discoveryId, target.id);
  assert.equal(profile.profileReturn, "nameSaid");
  assert.deepEqual(profile.collective, said.collective);
  assert.equal(run([{ type: "continue" }], profile).step, "profile");

  const map = run([{ type: "closeProfile" }], profile);
  assert.equal(map.step, "collective");
  assert.equal(map.saidId, target.id);
  assert.equal(map.collective.recall[target.id], 1);
});

test("any named scientist on the collective map opens her profile and returns to the map", () => {
  const [a, b] = FEATURED;
  const map = run([{ type: "name", text: a.canonicalName }, { type: "seeMap" }]);
  const profile = run([{ type: "openProfile", id: b.id }], map);
  assert.equal(profile.step, "profile");
  assert.equal(profile.discoveryId, b.id);
  const back = run([{ type: "closeProfile" }], profile);
  assert.equal(back.step, "collective");
  assert.deepEqual(back.collective, map.collective);
  assert.equal(run([{ type: "openProfile", id: "not-a-scientist" }], map).step, "collective");
  assert.equal(run([{ type: "openProfile", id: b.id }]).step, "opening");
});

test("the archive of another totem merges into the map without duplicating what is already here", () => {
  const local = run([{ type: "name", text: "Nise da Silveira" }, { type: "restart" }]);
  const remote = createExperience(CATALOG, INITIAL_COLLECTIVE, clock(), seeded(99));
  const elsewhere = remote.reduce(remote.reduce(remote.initialState(), { type: "dontKnow" }), { type: "restart" });
  const merged = run([{ type: "merge", events: [...elsewhere.events, ...local.events] }], local);
  assert.equal(merged.events.length, 2);
  assert.equal(merged.collective.silences, 1);
  assert.equal(merged.collective.recall["nise-da-silveira"], 1);
  assert.equal(run([{ type: "merge", events: merged.events }], merged), merged);
});

test("a reload restores the map from stored events and keeps the review list", () => {
  const visited = run([{ type: "dontKnow" }, { type: "restart" }, { type: "name", text: "Josefa Tavares Brito" }, { type: "submitForReview", at: 5 }]);
  const restored = experience.restore(visited.events, visited.reviewQueue);
  assert.equal(restored.step, "opening");
  assert.equal(restored.fresh, true);
  assert.deepEqual(restored.collective, visited.collective);
  assert.deepEqual(restored.reviewQueue, visited.reviewQueue);
});
