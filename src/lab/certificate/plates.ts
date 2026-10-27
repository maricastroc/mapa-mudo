import type { BenchId } from "../benches.ts";
import { curiePlate } from "./curie/CuriePlate.tsx";
import { frazattiPlate } from "./frazatti/FrazattiPlate.tsx";
import { johnsonPlate } from "./johnson/JohnsonPlate.tsx";
import { lutzPlate } from "./lutz/LutzPlate.tsx";
import type { Plate } from "./plate.ts";
import { tuPlate } from "./tu/TuPlate.tsx";

export const PLATES: Record<BenchId, Plate> = {
  curie: curiePlate,
  johnson: johnsonPlate,
  lutz: lutzPlate,
  tu: tuPlate,
  frazatti: frazattiPlate,
};
