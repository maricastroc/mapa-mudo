import type { Catalog, KnownScientist, Participations } from "../content/scientists/types.ts";

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
  mentions: number;
  name: string | null;
  featured: boolean;
  fictional: boolean;
};

const PLACEMENT_BOUNDS = { x0: 90, x1: 1350, y0: 210, y1: 840 };
const MIN_SPACING = 80;

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
  for (let k = 0; k < 64; k++) {
    const x = PLACEMENT_BOUNDS.x0 + hash(id, 2 * k) * (PLACEMENT_BOUNDS.x1 - PLACEMENT_BOUNDS.x0);
    const y = PLACEMENT_BOUNDS.y0 + hash(id, 2 * k + 1) * (PLACEMENT_BOUNDS.y1 - PLACEMENT_BOUNDS.y0);
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

export function sheetPoints(catalog: Catalog, layout: SheetLayout, participations: Participations): SheetPoint[] {
  const featuredById = new Map(catalog.featured.map((f) => [f.id, f]));
  const everyone: KnownScientist[] = [...catalog.featured, ...catalog.known.filter((k) => !featuredById.has(k.id))];
  const catalogIndex = new Map(everyone.map((s, i) => [s.id, i]));
  const present = everyone.filter((s) => featuredById.has(s.id) || (participations[s.id] ?? 0) > 0);
  const ordered = new Set(layout.order);
  const sorted = [
    ...layout.order.map((id) => present.find((s) => s.id === id)).filter((s): s is KnownScientist => s !== undefined),
    ...present.filter((s) => !ordered.has(s.id)),
  ];
  const fixed = [
    ...Object.values(layout.points),
    ...catalog.featured.flatMap((f) => (f.experience ? [f.experience.map] : [])),
    ...layout.vacancies,
  ];

  const points: SheetPoint[] = sorted.map((s) => {
    const explicit = layout.points[s.id];
    const editorial = featuredById.get(s.id)?.experience?.map;
    const position = explicit ?? editorial ?? autoPosition(s.id, fixed);
    const code = explicit?.code ?? editorial?.code ?? String(100 + (catalogIndex.get(s.id) ?? 0)).padStart(3, "0");
    return {
      key: s.id,
      scientistId: s.id,
      code,
      x: position.x,
      y: position.y,
      mentions: participations[s.id] ?? 0,
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
      mentions: 0,
      name: null,
      featured: false,
      fictional: false,
    });
  }
  return points;
}
