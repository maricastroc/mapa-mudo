import type { PendingScientistSubmission } from "../content/scientists/types.ts";
import { isNameKind, isReferenceKind, type CollectiveEvent } from "./collective.ts";

export const EVENTS_KEY = "diga-um-nome:events:v2";

export const REVIEW_KEY = "diga-um-nome:review:v1";

export const MAX_SUBMITTED_NAME = 80;

export type EventStore = Pick<Storage, "getItem" | "setItem">;

function legacyUid(at: number, index: number) {
  return `legacy-${at.toString(36)}-${index}`;
}

export function parseEvent(value: unknown, index = 0): CollectiveEvent | null {
  if (!value || typeof value !== "object") return null;
  const { uid: rawUid, kind, id, ref, at, later } = value as Record<string, unknown>;
  if (typeof at !== "number" || !Number.isFinite(at)) return null;
  const uid = typeof rawUid === "string" && rawUid.length > 0 && rawUid.length <= 64 ? rawUid : legacyUid(at, index);
  const late = later === true ? { later: true as const } : {};
  if (kind === "silence") return { uid, kind, at };
  if (kind === "unidentified") return { uid, kind, at, ...late };
  if (isReferenceKind(kind) && typeof ref === "string" && ref.length > 0) return { uid, kind, ref, at, ...late };
  if (isNameKind(kind) && typeof id === "string" && id.length > 0) return { uid, kind, id, at, ...late };
  return null;
}

export function parseEvents(text: string | null): CollectiveEvent[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.map((v, i) => parseEvent(v, i)).filter((e): e is CollectiveEvent => e !== null);
  } catch {
    return [];
  }
}

export function parseSubmission(value: unknown): PendingScientistSubmission | null {
  if (!value || typeof value !== "object") return null;
  const { uid, submittedName, createdAt } = value as Record<string, unknown>;
  if (typeof uid !== "string" || uid.length === 0 || uid.length > 64) return null;
  if (typeof submittedName !== "string" || !submittedName.trim()) return null;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt)) return null;
  return { uid, submittedName: submittedName.trim().slice(0, MAX_SUBMITTED_NAME), createdAt };
}

export function parseSubmissions(text: string | null): PendingScientistSubmission[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.map(parseSubmission).filter((s): s is PendingScientistSubmission => s !== null);
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

export function loadSubmissions(store: EventStore | null): PendingScientistSubmission[] {
  try {
    return parseSubmissions(store?.getItem(REVIEW_KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveSubmissions(store: EventStore | null, submissions: PendingScientistSubmission[]) {
  if (submissions.length === 0) return;
  try {
    store?.setItem(REVIEW_KEY, JSON.stringify(submissions));
  } catch {
    return;
  }
}

export function mergeSubmissions(a: PendingScientistSubmission[], b: PendingScientistSubmission[]) {
  const known = new Set(a.map((s) => s.uid));
  const extra = b.filter((s) => !known.has(s.uid));
  if (extra.length === 0) return a;
  return [...a, ...extra].sort((x, y) => x.createdAt - y.createdAt || x.uid.localeCompare(y.uid));
}

export function adoptLegacy(events: CollectiveEvent[], fresh: (at: number) => string) {
  return events.some((e) => e.uid.startsWith("legacy-")) ? events.map((e) => (e.uid.startsWith("legacy-") ? { ...e, uid: fresh(e.at) } : e)) : events;
}
