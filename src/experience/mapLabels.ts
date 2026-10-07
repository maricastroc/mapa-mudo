export type Box = { x0: number; y0: number; x1: number; y1: number };

export type Side = "east" | "northeast" | "southeast" | "west" | "northwest" | "southwest" | "north" | "south";

export type LabelRequest = { key: string; x: number; y: number; width: number; height: number; priority: number };

export type LabelPlacement = { key: string; side: Side; box: Box };

const MARKER_RADIUS = 6;
const GAP = 5;
const PADDING = 6;
const AREA_PER_LABEL = 42000;
const AMBIGUITY = 12;
const SIDES: Side[] = ["east", "northeast", "southeast", "west", "northwest", "southwest", "north", "south"];

function letterWidth(letter: string) {
  if (letter === " ") return 0.3;
  if (letter === "I" || letter === "Í") return 0.32;
  if ("MW".includes(letter)) return 0.86;
  return 0.68;
}

export function labelFontSize(mentions: number, unit: number) {
  const tier = Math.min(1, Math.max(0, Math.log10(Math.max(1, mentions)) / 2.5));
  return Math.max(13, (15 + 4 * tier) * unit);
}

export function labelSize(name: string, mentions: number, fontSize: number, extra = 0) {
  const letters = [...name.toUpperCase()];
  const nameWidth = letters.reduce((sum, l) => sum + letterWidth(l) + 0.08, 0) * fontSize;
  const count = String(mentions).length * 0.62 * fontSize * 0.74 + 0.5 * fontSize;
  return { width: Math.ceil(nameWidth + count + extra * fontSize), height: Math.ceil(fontSize * 1.25) };
}

export function candidateBox(r: LabelRequest, side: Side): Box {
  const { x, y, width: w, height: h } = r;
  const off = MARKER_RADIUS + GAP;
  switch (side) {
    case "east":
      return { x0: x + off, y0: y - h / 2, x1: x + off + w, y1: y + h / 2 };
    case "northeast":
      return { x0: x + off - 2, y0: y - off - h + 4, x1: x + off - 2 + w, y1: y - off + 4 };
    case "southeast":
      return { x0: x + off - 2, y0: y + off - 4, x1: x + off - 2 + w, y1: y + off - 4 + h };
    case "west":
      return { x0: x - off - w, y0: y - h / 2, x1: x - off, y1: y + h / 2 };
    case "northwest":
      return { x0: x - off + 2 - w, y0: y - off - h + 4, x1: x - off + 2, y1: y - off + 4 };
    case "southwest":
      return { x0: x - off + 2 - w, y0: y + off - 4, x1: x - off + 2, y1: y + off - 4 + h };
    case "north":
      return { x0: x - w / 2, y0: y - off - h, x1: x + w / 2, y1: y - off };
    case "south":
      return { x0: x - w / 2, y0: y + off, x1: x + w / 2, y1: y + off + h };
  }
}

function distanceToBox(box: Box, x: number, y: number) {
  return Math.hypot(Math.max(box.x0 - x, 0, x - box.x1), Math.max(box.y0 - y, 0, y - box.y1));
}

export function overlaps(a: Box, b: Box, padding = PADDING) {
  return a.x0 < b.x1 + padding && b.x0 < a.x1 + padding && a.y0 < b.y1 + padding && b.y0 < a.y1 + padding;
}

export function placeLabels({
  labels,
  markers,
  obstacles,
  bounds,
}: {
  labels: LabelRequest[];
  markers: { key: string; x: number; y: number; named: boolean }[];
  obstacles: Box[];
  bounds: Box;
}): Map<string, LabelPlacement> {
  const markerBoxes = markers.map((m) => ({ x0: m.x - MARKER_RADIUS, y0: m.y - MARKER_RADIUS, x1: m.x + MARKER_RADIUS, y1: m.y + MARKER_RADIUS }));
  const named = markers.filter((m) => m.named);
  const taken: Box[] = [...obstacles];
  const placed = new Map<string, LabelPlacement>();
  const ordered = [...labels].sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
  const fits = (box: Box) => box.x0 >= bounds.x0 && box.y0 >= bounds.y0 && box.x1 <= bounds.x1 && box.y1 <= bounds.y1;
  const free = (box: Box) => !taken.some((t) => overlaps(box, t)) && !markerBoxes.some((m) => overlaps(box, m, 1));
  const clear = (box: Box, label: LabelRequest) => {
    const own = distanceToBox(box, label.x, label.y);
    return !named.some((m) => m.key !== label.key && distanceToBox(box, m.x, m.y) < own + AMBIGUITY);
  };
  const place = (label: LabelRequest, accept: (box: Box) => boolean) => {
    for (const side of SIDES) {
      const box = candidateBox(label, side);
      if (!fits(box) || !accept(box)) continue;
      placed.set(label.key, { key: label.key, side, box });
      taken.push(box);
      return true;
    }
    return false;
  };
  const budget = Math.max(6, Math.floor(((bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0)) / AREA_PER_LABEL));
  for (const label of ordered) {
    const forced = label.priority === Number.POSITIVE_INFINITY;
    if (!forced && placed.size >= budget) continue;
    if (place(label, (box) => free(box) && clear(box, label))) continue;
    if (!forced) continue;
    if (place(label, free)) continue;
    place(label, () => true);
  }
  return placed;
}
