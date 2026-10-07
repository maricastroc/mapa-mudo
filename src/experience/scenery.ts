import type { DiscoveryScenery, FeaturedScientist } from "@/content/scientists/types";

const MOTIF_SLOTS = [
  { dx: -15, dy: -30, rotation: -6 },
  { dx: 45, dy: -12, rotation: 4 },
  { dx: 30, dy: 32, rotation: -3 },
  { dx: 60, dy: 22, rotation: 6 },
  { dx: -25, dy: 18, rotation: -4 },
];

export function sceneryFor(scientist: FeaturedScientist): DiscoveryScenery {
  if (scientist.scenery) return scientist.scenery;
  return {
    places: scientist.experience.visualMotifs.slice(0, MOTIF_SLOTS.length).map((motif, i) => ({ text: motif, ...MOTIF_SLOTS[i] })),
  };
}
