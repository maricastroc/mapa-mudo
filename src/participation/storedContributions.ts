import type { Participations } from "../content/scientists/types.ts";

export const CONTRIBUTIONS_KEY = "diga-um-nome:contributions:v1";

export type ContributionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function parseContributions(text: string | null): Participations {
  if (!text) return {};
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const contributions: Participations = {};
    for (const [id, count] of Object.entries(value)) {
      if (typeof count === "number" && Number.isInteger(count) && count > 0) contributions[id] = count;
    }
    return contributions;
  } catch {
    return {};
  }
}

export function contributionsSince(initial: Participations, current: Participations): Participations {
  const contributions: Participations = {};
  for (const [id, count] of Object.entries(current)) {
    const added = count - (initial[id] ?? 0);
    if (added > 0) contributions[id] = added;
  }
  return contributions;
}

export function withContributions(initial: Participations, contributions: Participations, accepts: (id: string) => boolean): Participations {
  const merged: Participations = { ...initial };
  for (const [id, count] of Object.entries(contributions)) {
    if (accepts(id)) merged[id] = (merged[id] ?? 0) + count;
  }
  return merged;
}

export function browserStore(): ContributionStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadContributions(store: ContributionStore | null): Participations {
  try {
    return parseContributions(store?.getItem(CONTRIBUTIONS_KEY) ?? null);
  } catch {
    return {};
  }
}

export function saveContributions(store: ContributionStore | null, contributions: Participations) {
  try {
    if (Object.keys(contributions).length === 0) store?.removeItem(CONTRIBUTIONS_KEY);
    else store?.setItem(CONTRIBUTIONS_KEY, JSON.stringify(contributions));
  } catch {
    return;
  }
}
