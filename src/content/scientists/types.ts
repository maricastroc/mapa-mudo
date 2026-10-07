export type ScientistSource = {
  id: string;
  label: string;
  url: string;
  type?: string;
};

export type ScientistFact = {
  id: string;
  statement: string;
  sourceRefs: string[];
};

export type PhotoUsageStatus = "approved" | "approved-with-credit" | "rights-review";

export type ScientistPhoto = {
  src: string | null;
  alt: string;
  credit: string | null;
  sourceUrl: string | null;
  usageStatus: PhotoUsageStatus;
};

export type KnownScientist = {
  id: string;
  canonicalName: string;
  aliases: string[];
  field?: string;
  fictional?: true;
};

export type DiscoveryHint = {
  level: 1 | 2 | 3;
  text: string;
  factIds: string[];
  note?: string;
};

export type ScientistReveal = {
  headline: string;
  summary: string;
  whyItMatters?: string;
  sourceRefs: string[];
};

export type EditorialExperience = {
  hints: [DiscoveryHint, DiscoveryHint, DiscoveryHint];
  reveal: ScientistReveal;
  visualMotifs: string[];
  recognitionLevel?: string;
  difficulty?: number;
  experiencePotential?: number;
};

export type MapPlace = {
  text: string;
  dx: number;
  dy: number;
  rotation: number;
};

export type DiscoveryScenery = {
  map?: { x: number; y: number; code?: string };
  places: MapPlace[];
  transect?: {
    direction: { x: number; y: number };
    step: number;
    points: number;
    prefix: string;
    sample: number;
  };
  core?: {
    depths: string[];
    layers: { text: string; at: number }[];
    caption: string;
  };
};

export type FeaturedScientist = KnownScientist & {
  identity?: { birthYear?: number | null; deathYear?: number | null; nationalityContext?: string };
  science: { researchAreas: string[]; facts: ScientistFact[] };
  experience: EditorialExperience;
  facts: ScientistFact[];
  sources: ScientistSource[];
  photo: ScientistPhoto | null;
  reviewStatus?: string;
  editorialNotes?: string;
  scenery?: DiscoveryScenery;
};

export type ImageManifestEntry = {
  id: string;
  fileName: string;
  source: string;
  sourcePage: string | null;
  creator: string | null;
  license: string | null;
  licenseUrl: string | null;
  usageStatus: PhotoUsageStatus;
  creditLine: string | null;
  resolution: string | null;
  notes: string | null;
};

export type CurationInfo = {
  version: string;
  theme: string;
  status: string;
  reviewPolicy: { meaning: string; institutionalApprovalRequired: boolean };
};

export type Catalog = {
  featured: FeaturedScientist[];
  known: KnownScientist[];
};

export type ScientistMatch =
  | { status: "featured"; scientist: FeaturedScientist }
  | { status: "known"; scientist: KnownScientist }
  | { status: "suggestion"; submittedName: string; candidate: KnownScientist }
  | { status: "ambiguous"; submittedName: string; candidates: KnownScientist[] }
  | { status: "incomplete"; submittedName: string; candidateCount: number }
  | { status: "unknown"; submittedName: string }
  | { status: "empty" };

export type Participations = Record<string, number>;

export type PendingScientistSubmission = {
  submittedName: string;
  createdAt: number;
};
