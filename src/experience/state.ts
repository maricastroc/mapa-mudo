import { discoverableScientists, findScientist } from "../content/scientists/catalog.ts";
import { completesName, createMatcher } from "../content/scientists/matcher.ts";
import { REFERENCE_NAMES, findReference } from "../content/scientists/references.ts";
import type { Catalog, PendingScientistSubmission, ReferenceCategory, ReferenceName, ScientistMatch } from "../content/scientists/types.ts";
import { MAX_SUBMITTED_NAME, mergeSubmissions } from "../participation/storedEvents.ts";
import {
  mergeEvents,
  presenceOf,
  record,
  tally,
  type Collective,
  type CollectiveEvent,
  type NameKind,
} from "../participation/collective.ts";
import { chooseDiscovery, shuffled } from "../participation/participations.ts";

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

export const MAX_HINT = 1;

export type Candidate = { id: string; name: string };

export type Intro = "silence" | "again" | "another" | "reference";

export type Response =
  | { kind: "confirm"; text: string; candidates: Candidate[] }
  | { kind: "incomplete"; text: string; candidateCount: number }
  | { kind: "notFound"; text: string }
  | { kind: "submitted"; text: string }
  | { kind: "reference"; category: ReferenceCategory; name: string; note: string; others: number }
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
  intro: Intro;
  discoveryId: string | null;
  saidId: string | null;
  saidKind: NameKind | null;
  response: Response | null;
  reviewQueue: PendingScientistSubmission[];
  discoveryOrder: string[];
  offered: Record<string, number>;
  seen: string[];
  profileReturn: Step | null;
};

export type Action =
  | { type: "dontKnow" }
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
  | { type: "discoverAnother" }
  | { type: "seeMap" }
  | { type: "anotherName" }
  | { type: "restart" }
  | { type: "merge"; events: CollectiveEvent[]; reviewQueue?: PendingScientistSubmission[] }
  | { type: "clearPrevious"; stepCount: number }
  | { type: "clearResponse" };

export type Decision =
  | { kind: "count"; id: string }
  | { kind: "reference"; reference: ReferenceName }
  | { kind: "respond"; response: Response }
  | { kind: "none" };

export function asksForName(step: Step) {
  return step === "opening" || step === "askAgain";
}

export function decide(match: ScientistMatch, nameOf: (id: string) => string): Decision {
  switch (match.status) {
    case "empty":
      return { kind: "none" };
    case "featured":
    case "known":
      return { kind: "count", id: match.scientist.id };
    case "suggestion":
    case "ambiguous": {
      const found = match.status === "suggestion" ? [match.candidate] : match.candidates;
      const candidates = found.map((c) => ({ id: c.id, name: nameOf(c.id) }));
      return { kind: "respond", response: { kind: "confirm", text: match.submittedName, candidates } };
    }
    case "incomplete":
      return {
        kind: "respond",
        response: { kind: "incomplete", text: match.submittedName, candidateCount: match.candidateCount },
      };
    case "reference":
      return { kind: "reference", reference: match.reference };
    case "unknown":
      return { kind: "respond", response: { kind: "notFound", text: match.submittedName } };
  }
}

function referenceMentions(collective: Collective, category: ReferenceCategory) {
  return Object.entries(collective.references).reduce((sum, [id, n]) => (findReference(id)?.category === category ? sum + n : sum), 0);
}

export function createExperience(
  catalog: Catalog,
  initialCollective: Collective,
  now: () => number = Date.now,
  random: () => number = Math.random,
) {
  const matchScientist = createMatcher(catalog, REFERENCE_NAMES);
  const discoverable = discoverableScientists(catalog);
  const nameOf = (id: string) => findScientist(catalog, id)?.canonicalName ?? id;
  const namesOf = (id: string) => {
    const s = findScientist(catalog, id);
    return s ? [s.canonicalName, ...s.aliases] : [];
  };
  const accepts = (e: CollectiveEvent) => {
    if ("id" in e) return findScientist(catalog, e.id) !== undefined;
    if ("ref" in e) return findReference(e.ref) !== undefined;
    return true;
  };
  const uid = (at: number) => `${at.toString(36)}-${Math.floor(random() * 0xffffffff).toString(36).padStart(7, "0")}`;

  const initialState = (): State => ({
    step: "opening",
    previous: null,
    stepCount: 0,
    collective: initialCollective,
    events: [],
    fresh: true,
    silenceRecorded: false,
    hint: 0,
    intro: "silence",
    discoveryId: null,
    saidId: null,
    saidKind: null,
    response: null,
    reviewQueue: [],
    discoveryOrder: shuffled(discoverable.map((s) => s.id), random),
    offered: {},
    seen: [],
    profileReturn: null,
  });

  const withSeen = (state: State, ids: string[]): State => {
    const added = [...new Set(ids)].filter((id) => !state.seen.includes(id));
    return added.length > 0 ? { ...state, seen: [...state.seen, ...added] } : state;
  };

  const suggested = (state: State) => (state.response?.kind === "confirm" ? state.response.candidates.map((c) => c.id) : []);

  const settle = (state: State) => withSeen(state, suggested(state));

  const shownAt = (state: State): string[] => {
    switch (state.step) {
      case "clue1":
      case "clue2":
      case "clue3":
      case "humanScale":
      case "profile":
      case "askAgain":
        return state.discoveryId ? [state.discoveryId] : [];
      case "nameSaid":
        return state.saidId ? [state.saidId] : [];
      case "collective":
        return state.collective.order.filter((id) => presenceOf(state.collective, id) > 0);
      default:
        return [];
    }
  };

  const goTo = (state: State, step: Step, extra: Partial<State> = {}): State => {
    const next = { ...settle(state), ...extra, step, previous: state.step, stepCount: state.stepCount + 1, response: null };
    return withSeen(next, shownAt(next));
  };

  const remember = (state: State, event: CollectiveEvent) => ({
    collective: record(state.collective, event),
    events: [...state.events, event],
  });

  const say = (state: State, id: string, kind: NameKind): State => {
    const at = now();
    const later = kind === "recall" && !state.fresh ? { later: true as const } : {};
    return goTo(state, "nameSaid", { saidId: id, saidKind: kind, fresh: false, ...remember(state, { uid: uid(at), kind, id, at, ...later }) });
  };

  const answerKind = (state: State, id: string): NameKind => {
    if (state.step === "askAgain") return id === state.discoveryId ? "discovery" : "recognition";
    return state.seen.includes(id) ? "recognition" : "recall";
  };

  const cite = (state: State, reference: ReferenceName): State => {
    const at = now();
    const later = state.fresh ? {} : { later: true as const };
    const remembered = remember(state, { uid: uid(at), kind: reference.category, ref: reference.id, at, ...later });
    const others = Math.max(0, referenceMentions(remembered.collective, reference.category) - 1);
    return {
      ...settle(state),
      ...remembered,
      fresh: false,
      response: { kind: "reference", category: reference.category, name: reference.canonicalName, note: reference.note, others },
    };
  };

  const apply = (state: State, decision: Decision): State => {
    switch (decision.kind) {
      case "count":
        return say(state, decision.id, answerKind(state, decision.id));
      case "reference":
        return cite(state, decision.reference);
      case "respond":
        return { ...state, response: decision.response };
      case "none":
        return state;
    }
  };

  const startDiscovery = (state: State, intro: Intro): State => {
    const exclude = [...state.seen, ...(state.saidId ? [state.saidId] : [])];
    const chosen = chooseDiscovery(discoverable, state.collective, state.offered, state.discoveryOrder, exclude);
    if (!chosen) return { ...state, response: { kind: "noCuration" } };
    const silent = intro === "silence" && state.step === "opening" && state.fresh;
    const at = now();
    return goTo(state, "noName", {
      discoveryId: chosen.id,
      intro: silent ? "silence" : intro === "silence" ? "again" : intro,
      offered: { ...state.offered, [chosen.id]: (state.offered[chosen.id] ?? 0) + 1 },
      fresh: false,
      saidId: null,
      saidKind: null,
      hint: 0,
      silenceRecorded: silent || state.silenceRecorded,
      ...(silent ? remember(state, { uid: uid(at), kind: "silence", at }) : {}),
    });
  };

  const discoveryOf = (state: State) => (state.discoveryId ? namesOf(state.discoveryId) : []);

  const reduce = (state: State, action: Action): State => {
    switch (action.type) {
      case "dontKnow":
        return state.step === "opening" ? startDiscovery(state, "silence") : state;
      case "discoverAnother": {
        const answered = state.step === "nameSaid" || state.step === "collective";
        const cited = asksForName(state.step) && (state.response?.kind === "reference" || state.response?.kind === "submitted");
        if (!answered && !cited) return state;
        const intro: Intro = state.response?.kind === "reference" && state.response.category !== "elsewhere" ? "reference" : "another";
        return startDiscovery(state, intro);
      }
      case "approach":
        return state.step === "noName" ? goTo(state, "clue1") : state;
      case "nextClue":
        if (state.step === "clue1") return goTo(state, "clue2");
        if (state.step === "clue2") return goTo(state, "clue3");
        return state;
      case "reachHumanScale":
        return state.step === "clue3" ? goTo(state, "humanScale") : state;
      case "continue":
        if ((state.step !== "humanScale" && state.step !== "profile") || !state.discoveryId) return state;
        if (state.step === "profile" && state.profileReturn !== "humanScale") return state;
        return goTo(state, "askAgain", { hint: 0 });
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
        return goTo(state, back, { profileReturn: null, hint: back === "askAgain" ? MAX_HINT : state.hint });
      }
      case "hint":
        return state.step === "askAgain" && state.hint < MAX_HINT ? { ...state, hint: state.hint + 1 } : state;
      case "name": {
        if (!asksForName(state.step)) return state;
        if (state.step === "askAgain" && state.discoveryId && completesName(action.text, discoveryOf(state))) {
          return say(settle(state), state.discoveryId, "discovery");
        }
        return apply(settle(state), decide(matchScientist(action.text), nameOf));
      }
      case "confirm": {
        if (!asksForName(state.step) || state.response?.kind !== "confirm") return state;
        if (!state.response.candidates.some((c) => c.id === action.id)) return state;
        return say(state, action.id, answerKind(state, action.id));
      }
      case "reject": {
        if (!asksForName(state.step) || state.response?.kind !== "confirm") return state;
        return { ...settle(state), response: { kind: "notFound", text: state.response.text } };
      }
      case "submitForReview": {
        if (state.response?.kind !== "notFound") return state;
        const text = state.response.text.slice(0, MAX_SUBMITTED_NAME);
        const later = state.fresh ? {} : { later: true as const };
        return {
          ...state,
          ...remember(state, { uid: uid(action.at), kind: "unidentified", at: action.at, ...later }),
          fresh: false,
          reviewQueue: [...state.reviewQueue, { uid: uid(action.at), submittedName: text, createdAt: action.at }],
          response: { kind: "submitted", text },
        };
      }
      case "seeMap":
        if (state.step === "nameSaid" || state.step === "askAgain") return goTo(state, "collective");
        if (state.step === "opening" && !state.fresh) return goTo(state, "collective");
        return state;
      case "anotherName":
        return goTo(state, "opening", {
          saidId: null,
          saidKind: null,
          discoveryId: null,
          profileReturn: null,
          hint: 0,
        });
      case "restart":
        return {
          ...initialState(),
          collective: state.collective,
          events: state.events,
          reviewQueue: state.reviewQueue,
          offered: state.offered,
          previous: state.step,
          stepCount: state.stepCount + 1,
        };
      case "merge": {
        const events = mergeEvents(state.events, action.events);
        const reviewQueue = action.reviewQueue ? mergeSubmissions(state.reviewQueue, action.reviewQueue) : state.reviewQueue;
        if (events === state.events && reviewQueue === state.reviewQueue) return state;
        return { ...state, events, reviewQueue, collective: tally(events, accepts, initialCollective) };
      }
      case "clearPrevious":
        return action.stepCount === state.stepCount ? { ...state, previous: null } : state;
      case "clearResponse":
        return state.response ? { ...settle(state), response: null } : state;
    }
  };

  const restore = (events: CollectiveEvent[], reviewQueue: PendingScientistSubmission[] = []): State => ({
    ...initialState(),
    events,
    reviewQueue,
    collective: tally(events, accepts, initialCollective),
  });

  return { matchScientist, initialState, restore, reduce, nameOf, namesOf, discoverable, accepts };
}

