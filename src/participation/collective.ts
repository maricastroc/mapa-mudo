import type { Participations } from "../content/scientists/types.ts";

export type NameKind = "recall" | "cued" | "discovery" | "recognition";

export type CollectiveEvent = { kind: NameKind; id: string; at: number; later?: true } | { kind: "silence"; at: number };

export type Collective = {
  recall: Participations;
  reef: Participations;
  order: string[];
  silences: number;
  answers: number;
};

export const EMPTY_COLLECTIVE: Collective = { recall: {}, reef: {}, order: [], silences: 0, answers: 0 };

export const REEF_SURFACES_AT = 1;

export const SILENCE_SAMPLE_MIN = 20;

const NAME_KINDS: NameKind[] = ["recall", "cued", "discovery", "recognition"];

export function isNameKind(kind: unknown): kind is NameKind {
  return NAME_KINDS.includes(kind as NameKind);
}

function add(counts: Participations, id: string): Participations {
  return { ...counts, [id]: (counts[id] ?? 0) + 1 };
}

export function record(collective: Collective, event: CollectiveEvent): Collective {
  if (event.kind === "silence") return { ...collective, silences: collective.silences + 1, answers: collective.answers + 1 };
  const order = collective.order.includes(event.id) ? collective.order : [...collective.order, event.id];
  if (event.kind === "recall") return { ...collective, order, recall: add(collective.recall, event.id), answers: collective.answers + (event.later ? 0 : 1) };
  return { ...collective, order, reef: add(collective.reef, event.id) };
}

export function tally(events: CollectiveEvent[], accepts: (id: string) => boolean, from: Collective = EMPTY_COLLECTIVE): Collective {
  return events.reduce((c, e) => (e.kind === "silence" || accepts(e.id) ? record(c, e) : c), from);
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

export function presenceOf(collective: Collective, id: string) {
  return recallOf(collective, id) + reefOf(collective, id);
}

export function isAboveWater(recall: number, reef: number) {
  return recall > 0 || reef >= REEF_SURFACES_AT;
}

export function sharedSilence(collective: Collective, ownSilenceRecorded: boolean) {
  const others = collective.silences - (ownSilenceRecorded ? 1 : 0);
  return collective.answers >= SILENCE_SAMPLE_MIN && others >= 2 ? others : null;
}
