import { USE_ILLUSTRATIVE_FIXTURES } from "../content/scientists/catalog.ts";
import { LAYOUT_FIXTURE, PARTICIPATIONS_FIXTURE } from "../content/scientists/fixtures.ts";
import type { Participations } from "../content/scientists/types.ts";
import type { SheetLayout } from "./sheetLayout.ts";

const EMPTY_SHEET: SheetLayout = { points: {}, order: [], vacancies: [] };

export const SHEET_LAYOUT: SheetLayout = USE_ILLUSTRATIVE_FIXTURES ? LAYOUT_FIXTURE : EMPTY_SHEET;

export const INITIAL_PARTICIPATIONS: Participations = USE_ILLUSTRATIVE_FIXTURES ? PARTICIPATIONS_FIXTURE : {};

export const PARTICIPATIONS_ARE_ILLUSTRATIVE = USE_ILLUSTRATIVE_FIXTURES;
