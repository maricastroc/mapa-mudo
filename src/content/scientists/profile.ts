import type { FeaturedScientist } from "./types.ts";

export type ProfileFact = { code: string; statement: string; sourceNumbers: number[] };

export type ProfileSource = { number: number; label: string; url: string };

export type ScientistProfile = {
  id: string;
  name: string;
  field: string | null;
  summary: string;
  whyItMatters: string | null;
  lifespan: { label: string; value: string } | null;
  origin: string | null;
  areas: string[];
  facts: ProfileFact[];
  sources: ProfileSource[];
  portrait: { src: string | null; alt: string; credit: string | null; sourceUrl: string | null } | null;
};

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

function lifespanOf(identity: FeaturedScientist["identity"]): ScientistProfile["lifespan"] {
  const born = identity?.birthYear ?? null;
  const died = identity?.deathYear ?? null;
  if (born !== null && died !== null) return { label: "Vida", value: `${born} – ${died}` };
  if (born !== null) return { label: "Nascimento", value: String(born) };
  return null;
}

export function scientistProfile(scientist: FeaturedScientist): ScientistProfile {
  const numbers = new Map(scientist.sources.map((s, i) => [s.id, i + 1]));
  const numbered = scientist.sources.length > 1;
  const origin = scientist.identity?.nationalityContext?.trim();
  return {
    id: scientist.id,
    name: scientist.canonicalName,
    field: scientist.field ?? null,
    summary: scientist.experience.reveal.summary,
    whyItMatters: scientist.experience.reveal.whyItMatters ?? null,
    lifespan: lifespanOf(scientist.identity),
    origin: origin ? capitalize(origin) : null,
    areas: scientist.science.researchAreas,
    facts: scientist.facts.map((f, i) => ({
      code: String(i + 1).padStart(2, "0"),
      statement: f.statement,
      sourceNumbers: numbered ? f.sourceRefs.flatMap((ref) => numbers.get(ref) ?? []) : [],
    })),
    sources: scientist.sources.map((s, i) => ({ number: i + 1, label: s.label, url: s.url })),
    portrait: scientist.photo
      ? { src: scientist.photo.src, alt: scientist.photo.alt, credit: scientist.photo.credit, sourceUrl: scientist.photo.sourceUrl }
      : null,
  };
}
