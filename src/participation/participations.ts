import type { DiscoverableScientist, Participations } from "../content/scientists/types.ts";

export function mentionsOf(participations: Participations, id: string) {
  return participations[id] ?? 0;
}

export function recordMention(participations: Participations, id: string): Participations {
  return { ...participations, [id]: mentionsOf(participations, id) + 1 };
}

export function chooseDiscovery(
  candidates: DiscoverableScientist[],
  participations: Participations,
): DiscoverableScientist | null {
  let chosen: DiscoverableScientist | null = null;
  for (const c of candidates) {
    if (!chosen || mentionsOf(participations, c.id) < mentionsOf(participations, chosen.id)) chosen = c;
  }
  return chosen;
}
