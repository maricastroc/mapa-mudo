import { USE_ILLUSTRATIVE_FIXTURES } from "../content/scientists/catalog.ts";
import { LAYOUT_FIXTURE, PARTICIPATIONS_FIXTURE } from "../content/scientists/fixtures.ts";
import { EMPTY_COLLECTIVE, fromCounts, type Collective } from "./collective.ts";
import type { SheetLayout } from "./sheetLayout.ts";

const EMPTY_SHEET: SheetLayout = { points: {}, order: [], vacancies: [] };

export const SHEET_LAYOUT: SheetLayout = USE_ILLUSTRATIVE_FIXTURES ? LAYOUT_FIXTURE : EMPTY_SHEET;

export const INITIAL_COLLECTIVE: Collective = USE_ILLUSTRATIVE_FIXTURES ? fromCounts(PARTICIPATIONS_FIXTURE) : EMPTY_COLLECTIVE;

export const PARTICIPATIONS_ARE_ILLUSTRATIVE = USE_ILLUSTRATIVE_FIXTURES;
