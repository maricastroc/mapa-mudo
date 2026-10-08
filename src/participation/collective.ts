import type { Participations, ReferenceCategory } from "../content/scientists/types.ts";

export type NameKind = "recall" | "cued" | "discovery" | "recognition";

export type ReferenceKind = ReferenceCategory;

export type FirstAnswer = "silence" | "recall" | "foreign" | "man" | "elsewhere" | "unidentified";

type Stamp = { uid: string; at: number };

export type CollectiveEvent =
  | (Stamp & { kind: NameKind; id: string; later?: true })
  | (Stamp & { kind: "silence" })
  | (Stamp & { kind: ReferenceKind; ref: string; later?: true })
  | (Stamp & { kind: "unidentified"; later?: true });

export type Collective = {
  recall: Participations;
  reef: Participations;
  returned: Participations;
  references: Participations;
  order: string[];
  firsts: Record<FirstAnswer, number>;
  silences: number;
  answers: number;
};

const NO_FIRSTS: Record<FirstAnswer, number> = { silence: 0, recall: 0, foreign: 0, man: 0, elsewhere: 0, unidentified: 0 };

export const EMPTY_COLLECTIVE: Collective = {
  recall: {},
  reef: {},
  returned: {},
  references: {},
  order: [],
  firsts: NO_FIRSTS,
  silences: 0,
  answers: 0,
};

export const REEF_SURFACES_AT = 1;

export const SILENCE_SAMPLE_MIN = 20;

const NAME_KINDS: NameKind[] = ["recall", "cued", "discovery", "recognition"];

const REFERENCE_KINDS: ReferenceKind[] = ["foreign", "man", "elsewhere"];

export function isNameKind(kind: unknown): kind is NameKind {
  return NAME_KINDS.includes(kind as NameKind);
}

export function isReferenceKind(kind: unknown): kind is ReferenceKind {
  return REFERENCE_KINDS.includes(kind as ReferenceKind);
}

function add(counts: Participations, id: string): Participations {
  return { ...counts, [id]: (counts[id] ?? 0) + 1 };
}

function answered(collective: Collective, first: FirstAnswer): Collective {
  const firsts = { ...collective.firsts, [first]: collective.firsts[first] + 1 };
  return { ...collective, firsts, answers: collective.answers + 1, silences: firsts.silence };
}

export function record(collective: Collective, event: CollectiveEvent): Collective {
  if (event.kind === "silence") return answered(collective, "silence");
  if (event.kind === "unidentified") return event.later ? collective : answered(collective, "unidentified");
  if (isReferenceKind(event.kind) && "ref" in event) {
    const counted = { ...collective, references: add(collective.references, event.ref) };
    return event.later ? counted : answered(counted, event.kind);
  }
  if (!("id" in event)) return collective;
  const order = collective.order.includes(event.id) ? collective.order : [...collective.order, event.id];
  if (event.kind === "recall") {
    const returned = (collective.reef[event.id] ?? 0) > 0 ? add(collective.returned, event.id) : collective.returned;
    const raised = { ...collective, order, recall: add(collective.recall, event.id), returned };
    return event.later ? raised : answered(raised, "recall");
  }
  return { ...collective, order, reef: add(collective.reef, event.id) };
}

export function tally(events: CollectiveEvent[], accepts: (event: CollectiveEvent) => boolean, from: Collective = EMPTY_COLLECTIVE): Collective {
  return events.reduce((c, e) => (accepts(e) ? record(c, e) : c), from);
}

export function fromCounts(recall: Participations, reef: Participations = {}): Collective {
  const order = [...new Set([...Object.keys(recall), ...Object.keys(reef)])];
  return { ...EMPTY_COLLECTIVE, recall: { ...recall }, reef: { ...reef }, order };
}

export function recallOf(collective: Collective, id: string) {
  return collective.recall[id] ?? 0;
}

export function reefOf(collective: Collective, id: string) {
  return collective.reef[id] ?? 0;
}

export function returnedOf(collective: Collective, id: string) {
  return collective.returned[id] ?? 0;
}

export function presenceOf(collective: Collective, id: string) {
  return recallOf(collective, id) + reefOf(collective, id);
}

export function isAboveWater(recall: number, reef: number) {
  return recall > 0 || reef >= REEF_SURFACES_AT;
}

export function unnamedCount(collective: Collective) {
  return collective.firsts.silence + collective.firsts.foreign + collective.firsts.man;
}

export function sharedSilence(collective: Collective, ownSilenceRecorded: boolean) {
  const others = unnamedCount(collective) - (ownSilenceRecorded ? 1 : 0);
  return collective.answers >= SILENCE_SAMPLE_MIN && others >= 2 ? others : null;
}

export function mergeEvents(a: CollectiveEvent[], b: CollectiveEvent[]) {
  const known = new Set(a.map((e) => e.uid));
  const extra = b.filter((e) => !known.has(e.uid));
  if (extra.length === 0) return a;
  return [...a, ...extra].sort((x, y) => x.at - y.at || x.uid.localeCompare(y.uid));
}
