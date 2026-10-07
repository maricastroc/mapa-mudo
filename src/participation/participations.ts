import type { FeaturedScientist, Participations } from "../content/scientists/types.ts";

export function mentionsOf(participations: Participations, id: string) {
  return participations[id] ?? 0;
}

export function recordMention(participations: Participations, id: string): Participations {
  return { ...participations, [id]: mentionsOf(participations, id) + 1 };
}

export function chooseDiscovery(
  candidates: FeaturedScientist[],
  participations: Participations,
  cursor = 0,
): FeaturedScientist | null {
  if (candidates.length === 0) return null;
  const fewest = Math.min(...candidates.map((c) => mentionsOf(participations, c.id)));
  const pool = candidates.filter((c) => mentionsOf(participations, c.id) === fewest);
  return pool[((cursor % pool.length) + pool.length) % pool.length];
}
