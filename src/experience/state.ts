import { discoverableScientists, findScientist } from "../content/scientists/catalog.ts";
import { createMatcher } from "../content/scientists/matcher.ts";
import type { Catalog, PendingScientistSubmission, ScientistMatch } from "../content/scientists/types.ts";
import { record, type Collective, type CollectiveEvent, type NameKind } from "../participation/collective.ts";
import { chooseDiscovery } from "../participation/participations.ts";

export type Step =
  | "opening"
  | "noName"
  | "clue1"
  | "clue2"
  | "clue3"
  | "humanScale"
  | "profile"
  | "askAgain"
  | "nameSaid"
  | "collective";

export const CLUE_STEPS: Step[] = ["clue1", "clue2", "clue3"];

export const MAX_HINT = 2;

export type Candidate = { id: string; name: string };

export type Response =
  | { kind: "confirm"; text: string; candidates: Candidate[] }
  | { kind: "incomplete"; text: string; candidateCount: number }
  | { kind: "notFound"; text: string }
  | { kind: "submitted"; text: string }
  | { kind: "otherPoint"; text: string }
  | { kind: "silence" }
  | { kind: "noCuration" };

export type State = {
  step: Step;
  previous: Step | null;
  stepCount: number;
  collective: Collective;
  events: CollectiveEvent[];
  fresh: boolean;
  silenceRecorded: boolean;
  hint: number;
  discoveryId: string | null;
  saidId: string | null;
  saidKind: NameKind | null;
  alreadySaid: boolean;
  response: Response | null;
  reviewQueue: PendingScientistSubmission[];
  discoveryCursor: number;
  profileReturn: Step | null;
};

export type Action =
  | { type: "dontKnow" }
  | { type: "silence" }
  | { type: "approach" }
  | { type: "nextClue" }
  | { type: "reachHumanScale" }
  | { type: "continue" }
  | { type: "openProfile"; id?: string }
  | { type: "closeProfile" }
  | { type: "hint" }
  | { type: "name"; text: string }
  | { type: "confirm"; id: string }
  | { type: "reject" }
  | { type: "submitForReview"; at: number }
  | { type: "seeMap" }
  | { type: "anotherName" }
  | { type: "restart" }
  | { type: "clearPrevious"; stepCount: number }
  | { type: "clearResponse" };

export type Mode = "question" | "discovery";

export type Decision =
  | { kind: "count"; id: string }
  | { kind: "reveal" }
  | { kind: "respond"; response: Response }
  | { kind: "none" };

export function modeOf(step: Step): Mode | null {
  if (step === "opening" || step === "askAgain") return "question";
  if (CLUE_STEPS.includes(step)) return "discovery";
  return null;
}

export function decide(
  match: ScientistMatch,
  mode: Mode,
  discoveryId: string | null,
  nameOf: (id: string) => string,
): Decision {
  switch (match.status) {
    case "empty":
      return { kind: "none" };
    case "featured":
    case "known":
      if (mode === "question") return { kind: "count", id: match.scientist.id };
      if (match.scientist.id === discoveryId) return { kind: "reveal" };
      return { kind: "respond", response: { kind: "otherPoint", text: match.scientist.canonicalName } };
    case "suggestion":
    case "ambiguous": {
      const found = match.status === "suggestion" ? [match.candidate] : match.candidates;
      const candidates = found.map((c) => ({ id: c.id, name: nameOf(c.id) }));
      if (mode === "discovery" && !candidates.some((c) => c.id === discoveryId)) {
        return { kind: "respond", response: { kind: "otherPoint", text: match.submittedName } };
      }
      return { kind: "respond", response: { kind: "confirm", text: match.submittedName, candidates } };
    }
    case "incomplete":
      return {
        kind: "respond",
        response: { kind: "incomplete", text: match.submittedName, candidateCount: match.candidateCount },
      };
    case "unknown":
      if (mode === "discovery") return { kind: "respond", response: { kind: "otherPoint", text: match.submittedName } };
      return { kind: "respond", response: { kind: "notFound", text: match.submittedName } };
  }
}

export function createExperience(catalog: Catalog, initialCollective: Collective, now: () => number = Date.now) {
  const matchScientist = createMatcher(catalog);
  const discoverable = discoverableScientists(catalog);
  const nameOf = (id: string) => findScientist(catalog, id)?.canonicalName ?? id;

  const initialState = (): State => ({
    step: "opening",
    previous: null,
    stepCount: 0,
    collective: initialCollective,
    events: [],
    fresh: true,
    silenceRecorded: false,
    hint: 0,
    discoveryId: null,
    saidId: null,
    saidKind: null,
    alreadySaid: false,
    response: null,
    reviewQueue: [],
    discoveryCursor: 0,
    profileReturn: null,
  });

  const goTo = (state: State, step: Step, extra: Partial<State> = {}): State => ({
    ...state,
    ...extra,
    step,
    previous: state.step,
    stepCount: state.stepCount + 1,
    response: null,
  });

  const remember = (state: State, event: CollectiveEvent) => ({
    collective: record(state.collective, event),
    events: [...state.events, event],
  });

  const say = (state: State, id: string, kind: NameKind): State =>
    goTo(state, "nameSaid", { saidId: id, saidKind: kind, fresh: false, ...remember(state, { kind, id, at: now() }) });

  const answerKind = (state: State, id: string): NameKind => {
    if (state.step === "askAgain") return id === state.discoveryId ? "discovery" : "recognition";
    return state.fresh ? "recall" : "recognition";
  };

  const apply = (state: State, decision: Decision): State => {
    switch (decision.kind) {
      case "count":
        return say(state, decision.id, answerKind(state, decision.id));
      case "reveal":
        return goTo(state, "humanScale", { alreadySaid: true });
      case "respond":
        return { ...state, response: decision.response };
      case "none":
        return state;
    }
  };

  const startDiscovery = (state: State): State => {
    const chosen = chooseDiscovery(discoverable, state.collective, state.discoveryCursor);
    if (!chosen) return { ...state, response: { kind: "noCuration" } };
    const silent = state.step === "opening" && state.fresh;
    return goTo(state, "noName", {
      discoveryId: chosen.id,
      discoveryCursor: state.discoveryCursor + 1,
      fresh: false,
      silenceRecorded: silent,
      ...(silent ? remember(state, { kind: "silence", at: now() }) : {}),
    });
  };

  const reduce = (state: State, action: Action): State => {
    switch (action.type) {
      case "dontKnow":
        return state.step === "opening" ? startDiscovery(state) : state;
      case "silence":
        return state.step === "opening" ? startDiscovery(state) : { ...state, response: { kind: "silence" } };
      case "approach":
        return state.step === "noName" ? goTo(state, "clue1") : state;
      case "nextClue":
        if (state.step === "clue1") return goTo(state, "clue2");
        if (state.step === "clue2") return goTo(state, "clue3");
        return state;
      case "reachHumanScale":
        return CLUE_STEPS.includes(state.step) ? goTo(state, "humanScale") : state;
      case "continue":
        if ((state.step !== "humanScale" && state.step !== "profile") || !state.discoveryId) return state;
        if (state.step === "profile" && state.profileReturn !== "humanScale") return state;
        return state.alreadySaid ? say(state, state.discoveryId, "cued") : goTo(state, "askAgain", { hint: 0 });
      case "openProfile": {
        if (action.id !== undefined) {
          if (state.step !== "nameSaid" && state.step !== "collective") return state;
          if (!discoverable.some((s) => s.id === action.id)) return state;
          return goTo(state, "profile", { discoveryId: action.id, profileReturn: state.step });
        }
        if ((state.step !== "humanScale" && state.step !== "askAgain") || !state.discoveryId) return state;
        if (state.step === "askAgain" && state.hint < MAX_HINT) return state;
        return goTo(state, "profile", { profileReturn: state.step });
      }
      case "closeProfile": {
        if (state.step !== "profile") return state;
        const back = state.profileReturn === "nameSaid" ? "collective" : (state.profileReturn ?? "humanScale");
        return goTo(state, back, { profileReturn: null });
      }
      case "hint":
        return state.step === "askAgain" && state.hint < MAX_HINT ? { ...state, hint: state.hint + 1 } : state;
      case "name": {
        const mode = modeOf(state.step);
        if (!mode) return state;
        return apply(state, decide(matchScientist(action.text), mode, state.discoveryId, nameOf));
      }
      case "confirm": {
        const mode = modeOf(state.step);
        if (!mode || state.response?.kind !== "confirm") return state;
        if (!state.response.candidates.some((c) => c.id === action.id)) return state;
        if (mode === "question") return say(state, action.id, answerKind(state, action.id));
        if (action.id === state.discoveryId) return goTo(state, "humanScale", { alreadySaid: true });
        return { ...state, response: { kind: "otherPoint", text: nameOf(action.id) } };
      }
      case "reject": {
        const mode = modeOf(state.step);
        if (!mode || state.response?.kind !== "confirm") return state;
        const text = state.response.text;
        return { ...state, response: mode === "question" ? { kind: "notFound", text } : { kind: "otherPoint", text } };
      }
      case "submitForReview": {
        if (state.response?.kind !== "notFound") return state;
        const text = state.response.text;
        return {
          ...state,
          reviewQueue: [...state.reviewQueue, { submittedName: text, createdAt: action.at }],
          response: { kind: "submitted", text },
        };
      }
      case "seeMap":
        return state.step === "nameSaid" || state.step === "askAgain" ? goTo(state, "collective") : state;
      case "anotherName":
        return goTo(state, "opening", {
          saidId: null,
          saidKind: null,
          alreadySaid: false,
          discoveryId: null,
          profileReturn: null,
          silenceRecorded: false,
          hint: 0,
        });
      case "restart":
        return {
          ...initialState(),
          collective: state.collective,
          events: state.events,
          reviewQueue: state.reviewQueue,
          discoveryCursor: state.discoveryCursor,
          previous: state.step,
          stepCount: state.stepCount + 1,
        };
      case "clearPrevious":
        return action.stepCount === state.stepCount ? { ...state, previous: null } : state;
      case "clearResponse":
        return state.response ? { ...state, response: null } : state;
    }
  };

  return { matchScientist, initialState, reduce, nameOf, discoverable };
}
