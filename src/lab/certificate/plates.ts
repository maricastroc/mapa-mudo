import type { BenchId } from "../benches.ts";
import { johnsonPlate } from "./johnson/JohnsonPlate.tsx";
import type { Plate } from "./plate.ts";

export const PLATES: Partial<Record<BenchId, Plate>> = {
  johnson: johnsonPlate,
};
