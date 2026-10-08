import type { Catalog, KnownScientist } from "../content/scientists/types.ts";
import { presenceOf, recallOf, reefOf, type Collective } from "./collective.ts";

export type SheetLayout = {
  points: Record<string, { x: number; y: number; code: string }>;
  order: string[];
  vacancies: { code: string; x: number; y: number }[];
};

export type SheetPoint = {
  key: string;
  scientistId: string | null;
  code: string;
  x: number;
  y: number;
  recall: number;
  reef: number;
  name: string | null;
  featured: boolean;
  fictional: boolean;
};

const PLACEMENT_BOUNDS = { x0: 90, x1: 1350, y0: 210, y1: 840 };

const MARGIN_RESERVES = [
  { x0: 0, y0: 0, x1: 500, y1: 310 },
  { x0: 0, y0: 770, x1: 420, y1: 900 },
];

function reserved(x: number, y: number) {
  return MARGIN_RESERVES.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
}

export function presenceAt(point: SheetPoint) {
  return point.recall + point.reef;
}

export const MIN_SPACING = 80;
const CANDIDATES = 512;

function hash(text: string, seed: number) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function autoPosition(id: string, occupied: { x: number; y: number }[]) {
  let best = { x: PLACEMENT_BOUNDS.x0, y: PLACEMENT_BOUNDS.y0 };
  let bestClearance = -1;
  for (let k = 0; k < CANDIDATES; k++) {
    const x = PLACEMENT_BOUNDS.x0 + hash(id, 2 * k) * (PLACEMENT_BOUNDS.x1 - PLACEMENT_BOUNDS.x0);
    const y = PLACEMENT_BOUNDS.y0 + hash(id, 2 * k + 1) * (PLACEMENT_BOUNDS.y1 - PLACEMENT_BOUNDS.y0);
    if (reserved(x, y)) continue;
    let clearance = Infinity;
    for (const o of occupied) clearance = Math.min(clearance, Math.hypot(o.x - x, o.y - y));
    if (clearance >= MIN_SPACING) return { x, y };
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = { x, y };
    }
  }
  return best;
}

export function sheetPoints(catalog: Catalog, layout: SheetLayout, collective: Collective): SheetPoint[] {
  const featuredById = new Map(catalog.featured.map((f) => [f.id, f]));
  const everyone: KnownScientist[] = [...catalog.featured, ...catalog.known.filter((k) => !featuredById.has(k.id))];
  const catalogIndex = new Map(everyone.map((s, i) => [s.id, i]));
  const present = everyone.filter((s) => featuredById.has(s.id) || presenceOf(collective, s.id) > 0);
  const ordered = new Set(layout.order);
  const sorted = [
    ...layout.order.map((id) => present.find((s) => s.id === id)).filter((s): s is KnownScientist => s !== undefined),
    ...present.filter((s) => !ordered.has(s.id)),
  ];
  const fixed = [
    ...Object.values(layout.points),
    ...catalog.featured.flatMap((f) => (f.scenery?.map ? [f.scenery.map] : [])),
    ...layout.vacancies,
  ];
  const occupied = [...fixed];
  const autoPositions = new Map<string, { x: number; y: number }>();
  const place = (id: string) => {
    const position = autoPosition(id, occupied);
    autoPositions.set(id, position);
    occupied.push(position);
  };
  for (const f of catalog.featured) {
    if (!layout.points[f.id] && !f.scenery?.map) place(f.id);
  }
  const presentIds = new Set(present.map((s) => s.id));
  for (const id of collective.order) {
    if (presentIds.has(id) && !featuredById.has(id) && !layout.points[id] && !autoPositions.has(id)) place(id);
  }

  const points: SheetPoint[] = sorted.map((s) => {
    const explicit = layout.points[s.id];
    const editorial = featuredById.get(s.id)?.scenery?.map;
    const position = explicit ?? editorial ?? autoPositions.get(s.id) ?? autoPosition(s.id, occupied);
    const code = explicit?.code ?? editorial?.code ?? String(100 + (catalogIndex.get(s.id) ?? 0)).padStart(3, "0");
    return {
      key: s.id,
      scientistId: s.id,
      code,
      x: position.x,
      y: position.y,
      recall: recallOf(collective, s.id),
      reef: reefOf(collective, s.id),
      name: s.canonicalName,
      featured: featuredById.has(s.id),
      fictional: s.fictional === true,
    };
  });

  for (const v of layout.vacancies) {
    points.push({
      key: `vacancy-${v.code}`,
      scientistId: null,
      code: v.code,
      x: v.x,
      y: v.y,
      recall: 0,
      reef: 0,
      name: null,
      featured: false,
      fictional: false,
    });
  }
  return points;
}
