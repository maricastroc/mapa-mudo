import { FEATURED } from "./featured.ts";
import { KNOWN_FIXTURES } from "./fixtures.ts";
import { KNOWN } from "./known.ts";
import type { Catalog, FeaturedScientist, KnownScientist, ScientistSource } from "./types.ts";

export const USE_ILLUSTRATIVE_FIXTURES = true;

export const CATALOG: Catalog = {
  featured: FEATURED,
  known: [...KNOWN, ...(USE_ILLUSTRATIVE_FIXTURES ? KNOWN_FIXTURES : [])],
};

export function findScientist(catalog: Catalog, id: string): KnownScientist | undefined {
  return catalog.featured.find((s) => s.id === id) ?? catalog.known.find((s) => s.id === id);
}

export function findFeatured(catalog: Catalog, id: string): FeaturedScientist | undefined {
  return catalog.featured.find((s) => s.id === id);
}

export function discoverableScientists(catalog: Catalog): FeaturedScientist[] {
  return catalog.featured.filter((s) => s.experience.hints.length === 3);
}

export function shownSources(scientist: FeaturedScientist): ScientistSource[] {
  const facts = new Map(scientist.facts.map((f) => [f.id, f]));
  const ids = [
    ...scientist.experience.hints.flatMap((h) => h.factIds.flatMap((id) => facts.get(id)?.sourceRefs ?? [])),
    ...scientist.experience.reveal.sourceRefs,
  ];
  return [...new Set(ids)].flatMap((id) => scientist.sources.filter((s) => s.id === id));
}
