import { discoverableScientists, findScientist } from "../content/scientists/catalog.ts";
import { createMatcher } from "../content/scientists/matcher.ts";
import type { Catalog, Participations, PendingScientistSubmission, ScientistMatch } from "../content/scientists/types.ts";
import { chooseDiscovery, recordMention } from "../participation/participations.ts";

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
  participations: Participations;
  discoveryId: string | null;
  saidId: string | null;
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
  | { type: "seeAgain" }
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

export function createExperience(catalog: Catalog, initialParticipations: Participations) {
  const matchScientist = createMatcher(catalog);
  const discoverable = discoverableScientists(catalog);
  const nameOf = (id: string) => findScientist(catalog, id)?.canonicalName ?? id;

  const initialState = (): State => ({
    step: "opening",
    previous: null,
    stepCount: 0,
    participations: { ...initialParticipations },
    discoveryId: null,
    saidId: null,
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

  const say = (state: State, id: string): State =>
    goTo(state, "nameSaid", { saidId: id, participations: recordMention(state.participations, id) });

  const apply = (state: State, decision: Decision): State => {
    switch (decision.kind) {
      case "count":
        return say(state, decision.id);
      case "reveal":
        return goTo(state, "humanScale", { alreadySaid: true });
      case "respond":
        return { ...state, response: decision.response };
      case "none":
        return state;
    }
  };

  const startDiscovery = (state: State): State => {
    const chosen = chooseDiscovery(discoverable, state.participations, state.discoveryCursor);
    if (!chosen) return { ...state, response: { kind: "noCuration" } };
    return goTo(state, "noName", { discoveryId: chosen.id, discoveryCursor: state.discoveryCursor + 1 });
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
        return state.alreadySaid ? say(state, state.discoveryId) : goTo(state, "askAgain");
      case "openProfile": {
        if (action.id !== undefined) {
          if (state.step !== "nameSaid" && state.step !== "collective") return state;
          if (!discoverable.some((s) => s.id === action.id)) return state;
          return goTo(state, "profile", { discoveryId: action.id, profileReturn: state.step });
        }
        if ((state.step !== "humanScale" && state.step !== "askAgain") || !state.discoveryId) return state;
        return goTo(state, "profile", { profileReturn: state.step });
      }
      case "closeProfile": {
        if (state.step !== "profile") return state;
        const back = state.profileReturn === "nameSaid" ? "collective" : (state.profileReturn ?? "humanScale");
        return goTo(state, back, { profileReturn: null });
      }
      case "seeAgain":
        return state.step === "askAgain" && state.discoveryId ? goTo(state, "humanScale") : state;
      case "name": {
        const mode = modeOf(state.step);
        if (!mode) return state;
        return apply(state, decide(matchScientist(action.text), mode, state.discoveryId, nameOf));
      }
      case "confirm": {
        const mode = modeOf(state.step);
        if (!mode || state.response?.kind !== "confirm") return state;
        if (!state.response.candidates.some((c) => c.id === action.id)) return state;
        if (mode === "question") return say(state, action.id);
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
        return state.step === "nameSaid" || state.step === "opening" ? goTo(state, "collective") : state;
      case "anotherName":
        return goTo(state, "opening", { saidId: null, alreadySaid: false, discoveryId: null, profileReturn: null });
      case "restart":
        return {
          ...initialState(),
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
