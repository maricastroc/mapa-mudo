import type { KnownScientist } from "../content/scientists/types.ts";
import { CLUE_STEPS, type Step } from "./state.ts";

export function simulatedSpeech(step: Step, discovery: KnownScientist | null): string | null {
  if (step === "askAgain" || CLUE_STEPS.includes(step)) return discovery?.canonicalName ?? null;
  return null;
}
