import type { Catalog, FeaturedScientist, KnownScientist, ScientistMatch } from "./types.ts";

const NAME_PARTICLES = new Set(["de", "da", "do", "das", "dos", "e", "d"]);
const MAX_CANDIDATES = 3;
const MIN_PARTIAL_TOKEN_LENGTH = 3;

export function normalizeName(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function withoutParticles(normalized: string) {
  const tokens = normalized.split(" ").filter((t) => t && !NAME_PARTICLES.has(t));
  return tokens.length ? tokens.join(" ") : normalized;
}

export function editDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

export function typoTolerance(length: number) {
  if (length >= 12) return 2;
  if (length >= 6) return 1;
  return 0;
}

type IndexedScientist = {
  scientist: KnownScientist;
  featured: FeaturedScientist | null;
  forms: string[];
  order: number;
};

function buildIndex(catalog: Catalog): IndexedScientist[] {
  const seen = new Set<string>();
  const entries: IndexedScientist[] = [];
  const add = (scientist: KnownScientist, featured: FeaturedScientist | null) => {
    if (seen.has(scientist.id)) return;
    seen.add(scientist.id);
    const forms = [scientist.canonicalName, ...scientist.aliases].map((f) => withoutParticles(normalizeName(f))).filter(Boolean);
    entries.push({ scientist, featured, forms: [...new Set(forms)], order: entries.length });
  };
  for (const f of catalog.featured) add(f, f);
  for (const k of catalog.known) add(k, null);
  return entries;
}

function resolved(entry: IndexedScientist): ScientistMatch {
  return entry.featured ? { status: "featured", scientist: entry.featured } : { status: "known", scientist: entry.scientist };
}

export function createMatcher(catalog: Catalog) {
  const entries = buildIndex(catalog);

  return function matchScientist(text: string): ScientistMatch {
    const normalized = normalizeName(text);
    if (!normalized) return { status: "empty" };
    const query = withoutParticles(normalized);
    const submittedName = text.trim().replace(/\s+/g, " ");

    const exact = entries.filter((e) => e.forms.includes(query));
    if (exact.length === 1) return resolved(exact[0]);
    if (exact.length > 1) return { status: "ambiguous", submittedName, candidates: exact.map((e) => e.scientist) };

    const tokens = query.split(" ");
    const tolerance = typoTolerance(query.length);
    const candidates: { entry: IndexedScientist; weight: number }[] = [];
    for (const entry of entries) {
      let best = Infinity;
      for (const form of entry.forms) {
        if (Math.abs(form.length - query.length) <= tolerance) best = Math.min(best, editDistance(form, query));
      }
      if (best <= tolerance) {
        candidates.push({ entry, weight: best });
        continue;
      }
      const partial =
        tokens.every((t) => t.length >= MIN_PARTIAL_TOKEN_LENGTH) &&
        entry.forms.some((form) => {
          const parts = form.split(" ");
          return parts.length > tokens.length && tokens.every((t) => parts.includes(t));
        });
      if (partial) candidates.push({ entry, weight: 10 });
    }

    if (candidates.length === 0) return { status: "unknown", submittedName };
    if (candidates.length > MAX_CANDIDATES) {
      return { status: "incomplete", submittedName, candidateCount: candidates.length };
    }
    candidates.sort((a, b) => a.weight - b.weight || a.entry.order - b.entry.order);
    return { status: "ambiguous", submittedName, candidates: candidates.map((c) => c.entry.scientist) };
  };
}

export function isValidAnswer(match: ScientistMatch) {
  return match.status === "featured" || match.status === "known";
}
