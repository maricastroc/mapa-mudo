export const WORLD = {
  height: 760,
  roof: 100,
  floor: 300,
  ground: 60,
  column: 440,
  entrance: 250,
  construction: 340,
  lead: 120,
  tail: 150,
} as const;

export type Cell<Id extends string = string> =
  | { kind: "game"; id: Id; number: number }
  | { kind: "site" };

export type Column<Id extends string = string> =
  | { kind: "entrance"; index: number; x: number; w: number }
  | { kind: "rooms"; index: number; x: number; w: number; cells: [Cell<Id>, Cell<Id>] }
  | { kind: "construction"; index: number; x: number; w: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type LabPlan<Id extends string = string> = {
  columns: Column<Id>[];
  width: number;
  games: { id: Id; number: number; column: number; floor: 0 | 1 }[];
};

export function floorTop(floor: 0 | 1) {
  return WORLD.roof + floor * WORLD.floor;
}

export function groundY() {
  return WORLD.roof + 2 * WORLD.floor;
}

export function planLab<Id extends string>(ids: readonly Id[]): LabPlan<Id> {
  const cells: Cell<Id>[] = ids.map((id, i) => ({ kind: "game", id, number: i + 1 }));
  if (cells.length % 2 === 1) cells.push({ kind: "site" });

  const columns: Column<Id>[] = [{ kind: "entrance", index: 0, x: WORLD.lead, w: WORLD.entrance }];
  let x = WORLD.lead + WORLD.entrance;
  for (let i = 0; i < cells.length; i += 2) {
    columns.push({ kind: "rooms", index: columns.length, x, w: WORLD.column, cells: [cells[i], cells[i + 1]] });
    x += WORLD.column;
  }
  columns.push({ kind: "construction", index: columns.length, x, w: WORLD.construction });
  x += WORLD.construction + WORLD.tail;

  const games: LabPlan<Id>["games"] = [];
  for (const column of columns) {
    if (column.kind !== "rooms") continue;
    column.cells.forEach((cell, floor) => {
      if (cell.kind === "game") games.push({ id: cell.id, number: cell.number, column: column.index, floor: floor as 0 | 1 });
    });
  }
  return { columns, width: x, games };
}

export function cellRect(column: Pick<Column, "x" | "w">, floor: 0 | 1): Rect {
  return { x: column.x, y: floorTop(floor), w: column.w, h: WORLD.floor };
}

export function columnAt(plan: Pick<LabPlan, "columns">, worldX: number) {
  let found = plan.columns[0];
  for (const column of plan.columns) if (worldX >= column.x) found = column;
  return found;
}

export function buildingSpan(plan: Pick<LabPlan, "columns">) {
  const first = plan.columns[0];
  const last = plan.columns[plan.columns.length - 1];
  return { start: first.x, end: last.kind === "construction" ? last.x : last.x + last.w, finish: last.x + last.w };
}

export type ObjectKey = string;

export function objectsInCell(cell: Cell): ObjectKey[] {
  if (cell.kind === "game") return [`obj:${cell.id}`];
  return [];
}

export function objectsIn(column: Column): ObjectKey[] {
  if (column.kind === "entrance") return ["obj:archive", "obj:lever"];
  if (column.kind === "construction") return ["obj:crane", "obj:sign"];
  return column.cells.flatMap(objectsInCell);
}

export function labScale(viewW: number, viewH: number, stacked: boolean) {
  const wide = viewW / (WORLD.lead * 0.5 + WORLD.entrance + WORLD.column * 1.12);
  if (stacked) return wide >= 0.75 ? Math.min(1.3, wide) : Math.max(0.45, Math.min(1, viewW / (WORLD.column * 1.18)));
  return Math.max(0.45, Math.min(1.5, viewH / WORLD.height, wide));
}
