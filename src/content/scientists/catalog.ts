import { FEATURED } from "./featured.ts";
import { FEATURED_FIXTURES, KNOWN_FIXTURES } from "./fixtures.ts";
import { KNOWN } from "./known.ts";
import type { Catalog, DiscoverableScientist, FeaturedScientist, KnownScientist } from "./types.ts";

export const USE_FIXTURES = true;

export const CATALOG: Catalog = {
  featured: [...FEATURED, ...(USE_FIXTURES ? FEATURED_FIXTURES : [])],
  known: [...KNOWN, ...(USE_FIXTURES ? KNOWN_FIXTURES : [])],
};

export function findScientist(catalog: Catalog, id: string): KnownScientist | undefined {
  return catalog.featured.find((s) => s.id === id) ?? catalog.known.find((s) => s.id === id);
}

export function findFeatured(catalog: Catalog, id: string): FeaturedScientist | undefined {
  return catalog.featured.find((s) => s.id === id);
}

export function discoverableScientists(catalog: Catalog): DiscoverableScientist[] {
  return catalog.featured.filter((s): s is DiscoverableScientist => s.experience !== undefined);
}
