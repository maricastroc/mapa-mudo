import { MAX_HINT, type Step } from "./state.ts";

export type Layer =
  | "sheetMarkers"
  | "placeNames"
  | "transect"
  | "pointLabel"
  | "portraitPhoto"
  | "portraitButton"
  | "medallion"
  | "summitPortrait"
  | "saidName"
  | "silenceTrench";

export const LAYER_STEPS: Record<Layer, readonly Step[]> = {
  sheetMarkers: ["opening", "noName", "askAgain", "collective"],
  placeNames: ["clue1"],
  transect: ["clue2"],
  pointLabel: ["noName", "clue1", "clue2"],
  portraitPhoto: ["humanScale", "profile"],
  portraitButton: ["humanScale"],
  medallion: ["askAgain"],
  summitPortrait: ["nameSaid"],
  saidName: ["nameSaid"],
  silenceTrench: ["collective"],
};

export function isLayerActive(layer: Layer, step: Step) {
  return LAYER_STEPS[layer].includes(step);
}

export function activeLayers(step: Step) {
  return (Object.keys(LAYER_STEPS) as Layer[]).filter((layer) => isLayerActive(layer, step));
}

export function medallionShown(step: Step, hint: number) {
  return isLayerActive("medallion", step) && hint >= 1;
}

export function discoveryNameShown(step: Step, hint: number) {
  return isLayerActive("medallion", step) && hint >= MAX_HINT;
}

export type SheetMarkTone = "unknown" | "revealed" | "waiting";

export function sheetMarkTone(presence: number, selected: boolean, step: Step): SheetMarkTone {
  if (selected && step === "askAgain") return "waiting";
  return presence > 0 ? "revealed" : "unknown";
}

export type LensVariant = "none" | "crosshair" | "crosshairLong" | "dot" | "core" | "portrait";

export function lensVariantFor(step: Step): LensVariant {
  switch (step) {
    case "noName":
      return "crosshair";
    case "clue1":
      return "crosshairLong";
    case "clue2":
      return "dot";
    case "clue3":
      return "core";
    case "humanScale":
    case "profile":
      return "portrait";
    default:
      return "none";
  }
}
