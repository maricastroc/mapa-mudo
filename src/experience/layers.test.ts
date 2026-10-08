import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../content/scientists/catalog.ts";
import { INITIAL_COLLECTIVE } from "../participation/source.ts";
import { activeLayers, discoveryNameShown, isLayerActive, LAYER_STEPS, lensVariantFor, medallionShown, sheetMarkTone, type Layer } from "./layers.ts";
import { createExperience, type Action, type State, type Step } from "./state.ts";

const experience = createExperience(CATALOG, INITIAL_COLLECTIVE, () => 1000);

const PORTRAIT_LAYERS: Layer[] = ["portraitPhoto", "portraitButton", "medallion", "summitPortrait"];

function walk(actions: Action[]) {
  const visited: State[] = [];
  actions.reduce((state, action) => {
    const next = experience.reduce(state, action);
    visited.push(next);
    return next;
  }, experience.initialState());
  return visited;
}

function portraitsAt(step: Step) {
  return PORTRAIT_LAYERS.filter((layer) => isLayerActive(layer, step));
}

const FULL_PATH: Action[] = [
  { type: "dontKnow" },
  { type: "approach" },
  { type: "nextClue" },
  { type: "nextClue" },
  { type: "reachHumanScale" },
  { type: "continue" },
];

test("the full discovery path mounts each portrait layer only in its own step", () => {
  const states = walk(FULL_PATH);
  assert.deepEqual(
    states.map((s) => s.step),
    ["noName", "clue1", "clue2", "clue3", "humanScale", "askAgain"],
  );
  const expected: Record<string, Layer[]> = {
    noName: [],
    clue1: [],
    clue2: [],
    clue3: [],
    humanScale: ["portraitPhoto", "portraitButton"],
    askAgain: ["medallion"],
  };
  for (const s of states) assert.deepEqual(portraitsAt(s.step), expected[s.step], s.step);
});

test("going from the reveal to 'Agora você sabe' unmounts the photo and its button and mounts only the medallion", () => {
  const [humanScale, askAgain] = walk(FULL_PATH).slice(-2);
  assert.equal(humanScale.step, "humanScale");
  assert.equal(askAgain.step, "askAgain");
  assert.equal(askAgain.previous, "humanScale");
  assert.equal(isLayerActive("portraitPhoto", askAgain.step), false);
  assert.equal(isLayerActive("portraitButton", askAgain.step), false);
  assert.equal(isLayerActive("medallion", askAgain.step), true);
  assert.equal(lensVariantFor(askAgain.step), "none");
  assert.deepEqual(activeLayers(askAgain.step).sort(), ["medallion", "sheetMarkers"]);
});

test("at the second question her portrait marks the point at once, and the name only shows when asked", () => {
  const asking = walk(FULL_PATH).at(-1);
  assert.ok(asking);
  assert.equal(asking.hint, 0);
  assert.equal(medallionShown(asking.step), true);
  assert.equal(discoveryNameShown(asking.step, asking.hint), false);
  const named = experience.reduce(asking, { type: "hint" });
  assert.equal(named.step, "askAgain");
  assert.equal(discoveryNameShown(named.step, named.hint), true);
  assert.equal(experience.reduce(named, { type: "hint" }).hint, named.hint);
  const profile = experience.reduce(asking, { type: "openProfile" });
  assert.equal(profile.step, "profile");
  assert.deepEqual(portraitsAt(profile.step), ["portraitPhoto"]);
  const back = experience.reduce(profile, { type: "closeProfile" });
  assert.equal(back.step, "askAgain");
  assert.equal(discoveryNameShown(back.step, back.hint), true);
});

test("the sea of unsaid names is named on the landing, after 'Não sei' and on the collective map, never during the discovery", () => {
  for (const step of ["opening", "noName", "collective"] as Step[]) assert.equal(isLayerActive("seaOfUnsaid", step), true, step);
  for (const step of ["clue1", "clue2", "clue3", "humanScale", "profile", "askAgain", "nameSaid"] as Step[]) {
    assert.equal(isLayerActive("seaOfUnsaid", step), false, step);
  }
});

test("the medallion and the name never show outside the second question, whatever the help level", () => {
  for (const step of ["opening", "noName", "clue1", "clue2", "clue3", "humanScale", "profile", "nameSaid", "collective"] as Step[]) {
    for (const hint of [0, 1, 2]) {
      assert.equal(medallionShown(step), false, `${step} ${hint}`);
      assert.equal(discoveryNameShown(step, hint), false, `${step} ${hint}`);
    }
  }
});

test("saying the name after the discovery swaps the medallion for the summit portrait", () => {
  const asking = walk(FULL_PATH).at(-1);
  assert.ok(asking);
  const discovery = CATALOG.featured.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  const said = experience.reduce(asking, { type: "name", text: discovery.canonicalName });
  assert.equal(said.step, "nameSaid");
  assert.deepEqual(portraitsAt(said.step), ["summitPortrait"]);
  const map = experience.reduce(said, { type: "seeMap" });
  assert.deepEqual(portraitsAt(map.step), []);
});

test("every step mounts at most one kind of portrait, and the medallion belongs only to 'Agora você sabe'", () => {
  const steps = new Set(Object.values(LAYER_STEPS).flat());
  for (const step of ["opening", "noName", "clue1", "clue2", "clue3", "humanScale", "profile", "askAgain", "nameSaid", "collective"] as Step[]) {
    steps.add(step);
    const portraits = portraitsAt(step).filter((l) => l !== "portraitButton");
    assert.ok(portraits.length <= 1, `${step}: ${portraits.join(", ")}`);
    assert.equal(isLayerActive("medallion", step), step === "askAgain", step);
  }
});

test("on the sheet, a point is unknown until someone names her, by memory or by discovery, and then turns orange", () => {
  const asking = walk(FULL_PATH).at(-1);
  assert.ok(asking);
  const discovery = CATALOG.featured.find((s) => s.id === asking.discoveryId);
  assert.ok(discovery);
  assert.equal(sheetMarkTone(0, false, "opening"), "unknown");
  assert.equal(sheetMarkTone(0, true, "askAgain"), "waiting");
  const said = experience.reduce(asking, { type: "name", text: discovery.canonicalName });
  const back = experience.reduce(experience.reduce(said, { type: "seeMap" }), { type: "restart" });
  const presence = (back.collective.recall[discovery.id] ?? 0) + (back.collective.reef[discovery.id] ?? 0);
  assert.equal(sheetMarkTone(presence, false, back.step), "revealed");
  const remembered = experience.reduce(experience.initialState(), { type: "name", text: discovery.canonicalName });
  assert.equal(sheetMarkTone(remembered.collective.recall[discovery.id] ?? 0, false, "opening"), "revealed");
});
