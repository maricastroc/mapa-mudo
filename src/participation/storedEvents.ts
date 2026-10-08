import { isNameKind, type CollectiveEvent } from "./collective.ts";

export const EVENTS_KEY = "diga-um-nome:events:v2";

export type EventStore = Pick<Storage, "getItem" | "setItem">;

function parseEvent(value: unknown): CollectiveEvent | null {
  if (!value || typeof value !== "object") return null;
  const { kind, id, at, later } = value as Record<string, unknown>;
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  if (kind === "silence") return { kind, at };
  if (isNameKind(kind) && typeof id === "string" && id.length > 0) return later === true ? { kind, id, at, later } : { kind, id, at };
  return null;
}

export function parseEvents(text: string | null): CollectiveEvent[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.map(parseEvent).filter((e): e is CollectiveEvent => e !== null);
  } catch {
    return [];
  }
}

export function browserStore(): EventStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadEvents(store: EventStore | null): CollectiveEvent[] {
  try {
    return parseEvents(store?.getItem(EVENTS_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveEvents(store: EventStore | null, events: CollectiveEvent[]) {
  if (events.length === 0) return;
  try {
    store?.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    return;
  }
}
