import type { FeaturedScientist } from "../content/scientists/types.ts";
import { presenceOf, type Collective } from "./collective.ts";

const CURATORIAL_RANK: Record<string, number> = { discovery: 0, medium: 1, high: 2 };

function rankOf(scientist: FeaturedScientist) {
  return CURATORIAL_RANK[scientist.experience.recognitionLevel ?? "discovery"] ?? 0;
}

export function inCuratorialOrder(candidates: FeaturedScientist[]) {
  return candidates
    .map((scientist, index) => ({ scientist, index }))
    .sort((a, b) => rankOf(a.scientist) - rankOf(b.scientist) || a.index - b.index)
    .map(({ scientist }) => scientist);
}

export function chooseDiscovery(candidates: FeaturedScientist[], collective: Collective, cursor = 0): FeaturedScientist | null {
  if (candidates.length === 0) return null;
  const fewest = Math.min(...candidates.map((c) => presenceOf(collective, c.id)));
  const pool = inCuratorialOrder(candidates.filter((c) => presenceOf(collective, c.id) === fewest));
  return pool[((cursor % pool.length) + pool.length) % pool.length];
}
