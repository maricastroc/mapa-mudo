import type { FeaturedScientist } from "../content/scientists/types.ts";
import { presenceOf, type Collective } from "./collective.ts";

const CURATORIAL_RANK: Record<string, number> = { discovery: 0, medium: 1, high: 2 };

function rankOf(scientist: FeaturedScientist) {
  return CURATORIAL_RANK[scientist.experience.recognitionLevel ?? "discovery"] ?? 0;
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function inCuratorialOrder(candidates: FeaturedScientist[], order: readonly string[] = []) {
  const place = new Map(order.map((id, i) => [id, i]));
  const placeOf = (scientist: FeaturedScientist) => place.get(scientist.id) ?? order.length;
  return candidates
    .map((scientist, index) => ({ scientist, index }))
    .sort((a, b) => rankOf(a.scientist) - rankOf(b.scientist) || placeOf(a.scientist) - placeOf(b.scientist) || a.index - b.index)
    .map(({ scientist }) => scientist);
}

function fewestBy(candidates: FeaturedScientist[], count: (scientist: FeaturedScientist) => number) {
  const fewest = Math.min(...candidates.map(count));
  return candidates.filter((c) => count(c) === fewest);
}

export function chooseDiscovery(
  candidates: FeaturedScientist[],
  collective: Collective,
  offered: Record<string, number> = {},
  order: readonly string[] = [],
): FeaturedScientist | null {
  if (candidates.length === 0) return null;
  const leastPresent = fewestBy(candidates, (c) => presenceOf(collective, c.id));
  const leastOffered = fewestBy(leastPresent, (c) => offered[c.id] ?? 0);
  return inCuratorialOrder(leastOffered, order)[0];
}
