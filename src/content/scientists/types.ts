export type ScientistSource = {
  label: string;
  url: string;
};

export type ScientistPhoto = {
  src: string;
  alt: string;
  credit?: string;
  sourceUrl?: string;
  usageStatus: "prototype-only" | "permission-pending" | "authorized";
};

export type KnownScientist = {
  id: string;
  canonicalName: string;
  aliases: string[];
  field?: string;
  fictional?: true;
};

export type DiscoveryHint = {
  text: string;
  note?: string;
};

export type MapPlace = {
  text: string;
  dx: number;
  dy: number;
  rotation: number;
};

export type ScientistExperience = {
  map: { x: number; y: number; code?: string };
  territory: { places: MapPlace[] };
  problem: {
    kind: "transect";
    direction: { x: number; y: number };
    step: number;
    points: number;
    prefix: string;
    sample: number;
  };
  research: {
    kind: "core";
    depths: string[];
    layers: { text: string; at: number }[];
    caption: string;
  };
  portrait: { kind: "generic-contour" };
};

export type FeaturedScientist = KnownScientist & {
  institution?: string;
  hints: [DiscoveryHint, DiscoveryHint, DiscoveryHint];
  reveal: {
    role: string;
    contribution: string;
    whyItMatters?: string;
  };
  photo?: ScientistPhoto;
  sources: ScientistSource[];
  experience?: ScientistExperience;
};

export type DiscoverableScientist = FeaturedScientist & { experience: ScientistExperience };

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
