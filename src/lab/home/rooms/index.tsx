"use client";

import { benchById, type BenchId } from "../../benches.ts";
import { cellRect, type Column } from "../labPlan.ts";
import { EntranceColumn } from "./entrance.tsx";
import { GameRoom } from "./game.tsx";
import { ConstructionColumn, SiteRoom } from "./utility.tsx";

type LabColumnProps = {
  column: Column;
  s: number;
  done: ReadonlySet<BenchId>;
  compact: boolean;
};

export function LabColumn({ column, s, done, compact }: LabColumnProps) {
  if (column.kind === "entrance") return <EntranceColumn column={column} s={s} />;
  if (column.kind === "construction") return <ConstructionColumn column={column} s={s} />;
  return (
    <>
      {column.cells.map((cell, floor) => {
        const rect = cellRect(column, floor as 0 | 1);
        const key = `${column.index}-${floor}`;
        if (cell.kind === "game") {
          const bench = benchById(cell.id);
          if (!bench) return <SiteRoom key={key} rect={rect} s={s} />;
          return <GameRoom key={key} bench={bench} number={cell.number} rect={rect} s={s} done={done.has(bench.id)} compact={compact} />;
        }
        return <SiteRoom key={key} rect={rect} s={s} />;
      })}
    </>
  );
}
