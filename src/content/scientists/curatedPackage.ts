import type {
  CurationInfo,
  DiscoveryHint,
  FeaturedScientist,
  ImageManifestEntry,
  PhotoUsageStatus,
  ScientistFact,
  ScientistPhoto,
  ScientistSource,
} from "./types.ts";

export class CurationError extends Error {}

type Raw = Record<string, unknown>;

const USAGE_STATUSES: PhotoUsageStatus[] = ["approved", "approved-with-credit", "rights-review"];

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function object(value: unknown, path: string): Raw {
  if (!isObject(value)) throw new CurationError(`${path}: expected an object`);
  return value;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new CurationError(`${path}: expected a non-empty string`);
  return value;
}

function optionalText(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null;
  return text(value, path);
}

function optionalNumber(value: unknown, path: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new CurationError(`${path}: expected a number`);
  return value;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new CurationError(`${path}: expected an array`);
  return value;
}

function texts(value: unknown, path: string): string[] {
  return list(value, path).map((v, i) => text(v, `${path}[${i}]`));
}

function usageStatus(value: unknown, path: string): PhotoUsageStatus {
  if (!USAGE_STATUSES.includes(value as PhotoUsageStatus)) {
    throw new CurationError(`${path}: expected one of ${USAGE_STATUSES.join(", ")}`);
  }
  return value as PhotoUsageStatus;
}

export function isCleared(status: PhotoUsageStatus) {
  return status === "approved" || status === "approved-with-credit";
}

function parseFact(value: unknown, path: string): ScientistFact {
  const f = object(value, path);
  return { id: text(f.id, `${path}.id`), statement: text(f.statement, `${path}.statement`), sourceRefs: texts(f.sourceRefs, `${path}.sourceRefs`) };
}

function parseSource(value: unknown, path: string): ScientistSource {
  const s = object(value, path);
  return {
    id: text(s.id, `${path}.id`),
    label: text(s.label, `${path}.label`),
    url: text(s.url, `${path}.url`),
    type: optionalText(s.type, `${path}.type`) ?? undefined,
  };
}

function parseHint(value: unknown, path: string): DiscoveryHint {
  const h = object(value, path);
  if (h.level !== 1 && h.level !== 2 && h.level !== 3) throw new CurationError(`${path}.level: expected 1, 2 or 3`);
  return { level: h.level, text: text(h.text, `${path}.text`), factIds: texts(h.factIds, `${path}.factIds`) };
}

function parsePhoto(value: unknown, path: string, id: string, bundledPortraits: ReadonlySet<string>): ScientistPhoto | null {
  if (value === undefined || value === null) return null;
  const p = object(value, path);
  const status = usageStatus(p.usageStatus, `${path}.usageStatus`);
  const declaredSrc = optionalText(p.src, `${path}.src`);
  return {
    src: declaredSrc && isCleared(status) && bundledPortraits.has(id) ? declaredSrc : null,
    alt: text(p.alt, `${path}.alt`),
    credit: optionalText(p.credit, `${path}.credit`),
    sourceUrl: optionalText(p.sourceUrl, `${path}.sourceUrl`),
    usageStatus: status,
  };
}

function parseFeatured(value: unknown, path: string, bundledPortraits: ReadonlySet<string>): FeaturedScientist {
  const s = object(value, path);
  const id = text(s.id, `${path}.id`);
  const experience = object(s.experience, `${path}.experience`);
  const hints = list(experience.hints, `${path}.experience.hints`).map((h, i) => parseHint(h, `${path}.experience.hints[${i}]`));
  if (hints.length !== 3) throw new CurationError(`${path}.experience.hints: expected exactly 3 hints, found ${hints.length}`);
  const reveal = object(experience.reveal, `${path}.experience.reveal`);
  const science = object(s.science, `${path}.science`);
  const identity = s.identity === undefined ? undefined : object(s.identity, `${path}.identity`);
  return {
    id,
    canonicalName: text(s.canonicalName, `${path}.canonicalName`),
    aliases: texts(s.aliases, `${path}.aliases`),
    field: text(s.field, `${path}.field`),
    identity: identity && {
      birthYear: optionalNumber(identity.birthYear, `${path}.identity.birthYear`),
      deathYear: optionalNumber(identity.deathYear, `${path}.identity.deathYear`),
      nationalityContext: optionalText(identity.nationalityContext, `${path}.identity.nationalityContext`) ?? undefined,
    },
    science: {
      researchAreas: texts(science.researchAreas, `${path}.science.researchAreas`),
      facts: list(science.facts, `${path}.science.facts`).map((f, i) => parseFact(f, `${path}.science.facts[${i}]`)),
    },
    experience: {
      hints: [hints[0], hints[1], hints[2]],
      reveal: {
        headline: text(reveal.headline, `${path}.experience.reveal.headline`),
        summary: text(reveal.summary, `${path}.experience.reveal.summary`),
        whyItMatters: optionalText(reveal.whyItMatters, `${path}.experience.reveal.whyItMatters`) ?? undefined,
        sourceRefs: texts(reveal.sourceRefs, `${path}.experience.reveal.sourceRefs`),
      },
      visualMotifs: texts(experience.visualMotifs, `${path}.experience.visualMotifs`),
      recognitionLevel: optionalText(experience.recognitionLevel, `${path}.experience.recognitionLevel`) ?? undefined,
      difficulty: optionalNumber(experience.difficulty, `${path}.experience.difficulty`) ?? undefined,
      experiencePotential: optionalNumber(experience.experiencePotential, `${path}.experience.experiencePotential`) ?? undefined,
    },
    facts: list(s.facts, `${path}.facts`).map((f, i) => parseFact(f, `${path}.facts[${i}]`)),
    sources: list(s.sources, `${path}.sources`).map((x, i) => parseSource(x, `${path}.sources[${i}]`)),
    photo: parsePhoto(s.photo, `${path}.photo`, id, bundledPortraits),
    reviewStatus: optionalText(s.reviewStatus, `${path}.reviewStatus`) ?? undefined,
    editorialNotes: optionalText(s.editorialNotes, `${path}.editorialNotes`) ?? undefined,
  };
}

export function parseCuratedPackage(raw: unknown, bundledPortraits: ReadonlySet<string>) {
  const root = object(raw, "featured.json");
  const policy = object(root.reviewPolicy, "featured.json.reviewPolicy");
  const info: CurationInfo = {
    version: optionalNumber(root.version, "featured.json.version") ?? 0,
    theme: text(root.theme, "featured.json.theme"),
    status: text(root.status, "featured.json.status"),
    reviewPolicy: {
      meaning: text(policy.meaning, "featured.json.reviewPolicy.meaning"),
      institutionalApprovalRequired: policy.institutionalApprovalRequired === true,
    },
  };
  const featured = list(root.featuredScientists, "featured.json.featuredScientists").map((s, i) =>
    parseFeatured(s, `featured.json.featuredScientists[${i}]`, bundledPortraits),
  );
  return { info, featured };
}

export function parseImageManifest(raw: unknown): ImageManifestEntry[] {
  const root = object(raw, "image-manifest.json");
  return list(root.scientists, "image-manifest.json.scientists").map((value, i) => {
    const path = `image-manifest.json.scientists[${i}]`;
    const e = object(value, path);
    return {
      id: text(e.id, `${path}.id`),
      fileName: text(e.fileName, `${path}.fileName`),
      source: text(e.source, `${path}.source`),
      sourcePage: optionalText(e.sourcePage, `${path}.sourcePage`),
      creator: optionalText(e.creator, `${path}.creator`),
      license: optionalText(e.license, `${path}.license`),
      licenseUrl: optionalText(e.licenseUrl, `${path}.licenseUrl`),
      usageStatus: usageStatus(e.usageStatus, `${path}.usageStatus`),
      creditLine: optionalText(e.creditLine, `${path}.creditLine`),
      resolution: optionalText(e.resolution, `${path}.resolution`),
      notes: optionalText(e.notes, `${path}.notes`),
    };
  });
}

export function curationProblems(featured: FeaturedScientist[], manifest: ImageManifestEntry[], rawPhotoSources: Map<string, string | null>) {
  const problems: string[] = [];
  const ids = new Set<string>();
  const byManifest = new Map(manifest.map((m) => [m.id, m]));
  for (const s of featured) {
    if (ids.has(s.id)) problems.push(`${s.id}: duplicate scientist id`);
    ids.add(s.id);
    const facts = new Map(s.facts.map((f) => [f.id, f]));
    const sources = new Set(s.sources.map((x) => x.id));
    if (facts.size !== s.facts.length) problems.push(`${s.id}: duplicate fact ids`);
    if (sources.size !== s.sources.length) problems.push(`${s.id}: duplicate source ids`);
    for (const f of [...s.facts, ...s.science.facts]) {
      for (const ref of f.sourceRefs) if (!sources.has(ref)) problems.push(`${s.id}: fact ${f.id} references missing source ${ref}`);
    }
    for (const f of s.science.facts) if (!facts.has(f.id)) problems.push(`${s.id}: science fact ${f.id} missing from facts`);
    s.experience.hints.forEach((h, i) => {
      if (h.level !== i + 1) problems.push(`${s.id}: hint ${i + 1} has level ${h.level}`);
      if (h.factIds.length === 0) problems.push(`${s.id}: hint ${h.level} references no fact`);
      for (const ref of h.factIds) if (!facts.has(ref)) problems.push(`${s.id}: hint ${h.level} references missing fact ${ref}`);
    });
    if (s.experience.reveal.sourceRefs.length === 0) problems.push(`${s.id}: reveal references no source`);
    for (const ref of s.experience.reveal.sourceRefs) if (!sources.has(ref)) problems.push(`${s.id}: reveal references missing source ${ref}`);
    const entry = byManifest.get(s.id);
    if (!entry) problems.push(`${s.id}: missing from image manifest`);
    if (s.photo && entry && s.photo.usageStatus !== entry.usageStatus) {
      problems.push(`${s.id}: photo status ${s.photo.usageStatus} differs from manifest ${entry.usageStatus}`);
    }
    if (s.photo?.usageStatus === "rights-review" && rawPhotoSources.get(s.id)) {
      problems.push(`${s.id}: rights-review photo declares a src`);
    }
  }
  for (const m of manifest) if (!ids.has(m.id)) problems.push(`${m.id}: manifest entry without featured scientist`);
  return problems;
}

export function declaredPhotoSources(raw: unknown) {
  const sources = new Map<string, string | null>();
  if (!isObject(raw) || !Array.isArray(raw.featuredScientists)) return sources;
  for (const s of raw.featuredScientists) {
    if (isObject(s) && typeof s.id === "string") {
      const photo = isObject(s.photo) ? s.photo : null;
      sources.set(s.id, photo && typeof photo.src === "string" ? photo.src : null);
    }
  }
  return sources;
}
