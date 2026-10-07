import featuredPackage from "./featured.json" with { type: "json" };
import imageManifest from "./image-manifest.json" with { type: "json" };
import {
  CurationError,
  curationProblems,
  declaredPhotoSources,
  parseCuratedPackage,
  parseImageManifest,
} from "./curatedPackage.ts";
import { BUNDLED_PORTRAITS } from "./portraits.ts";
import type { FeaturedScientist, ImageManifestEntry } from "./types.ts";

const curated = parseCuratedPackage(featuredPackage, new Set(Object.keys(BUNDLED_PORTRAITS)));

export const CURATION_INFO = curated.info;

export const FEATURED: FeaturedScientist[] = curated.featured;

export const IMAGE_MANIFEST: ImageManifestEntry[] = parseImageManifest(imageManifest);

const problems = curationProblems(FEATURED, IMAGE_MANIFEST, declaredPhotoSources(featuredPackage));
if (problems.length > 0) throw new CurationError(`Curadoria inválida:\n${problems.join("\n")}`);
