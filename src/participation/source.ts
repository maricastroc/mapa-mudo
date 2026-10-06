import { USE_FIXTURES } from "../content/scientists/catalog.ts";
import { LAYOUT_FIXTURE, PARTICIPATIONS_FIXTURE } from "../content/scientists/fixtures.ts";
import type { Participations } from "../content/scientists/types.ts";
import type { SheetLayout } from "./sheetLayout.ts";

const EMPTY_SHEET: SheetLayout = { points: {}, order: [], vacancies: [] };

export const SHEET_LAYOUT: SheetLayout = USE_FIXTURES ? LAYOUT_FIXTURE : EMPTY_SHEET;

export const INITIAL_PARTICIPATIONS: Participations = USE_FIXTURES ? PARTICIPATIONS_FIXTURE : {};

export const PARTICIPATIONS_ARE_ILLUSTRATIVE = USE_FIXTURES;
