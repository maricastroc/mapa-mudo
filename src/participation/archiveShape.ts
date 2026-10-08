import type { PendingScientistSubmission } from "../content/scientists/types.ts";
import type { CollectiveEvent } from "./collective.ts";
import { parseEvent, parseSubmission } from "./storedEvents.ts";

export type Archive = { events: CollectiveEvent[]; review: PendingScientistSubmission[] };

export const MAX_BATCH = 5000;

export function parseIncoming(body: unknown): Archive | null {
  if (!body || typeof body !== "object") return null;
  const { events, review } = body as Record<string, unknown>;
  const list = (value: unknown) => (Array.isArray(value) ? value.slice(0, MAX_BATCH) : []);
  return {
    events: list(events)
      .map((v) => parseEvent(v))
      .filter((e): e is CollectiveEvent => e !== null && !e.uid.startsWith("legacy-")),
    review: list(review)
      .map(parseSubmission)
      .filter((s): s is PendingScientistSubmission => s !== null),
  };
}
