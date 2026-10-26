"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { benchById, type BenchId } from "../benches.ts";
import { SoundButton } from "../SoundButton.tsx";
import { useLabHome } from "./labContext.tsx";
import { objectsIn, objectsInCell, WORLD, type Cell, type Column, type LabPlan } from "./labPlan.ts";

type PlantaProps = {
  plan: LabPlan;
  done: ReadonlySet<BenchId>;
  lensRef: RefObject<HTMLDivElement | null>;
  here: string;
  edges: { start: boolean; end: boolean };
  onCenter: (fraction: number, animate: boolean) => void;
  onStep: (dir: 1 | -1) => void;
  onLensKey: (e: KeyboardEvent<HTMLDivElement>) => void;
};

function place(id: BenchId) {
  return benchById(id)?.room.split(" · ")[0] ?? "";
}

export function cellName(cell: Cell) {
  if (cell.kind === "game") {
    const bench = benchById(cell.id);
    return bench ? `Sala ${cell.number} · ${bench.task}` : "Sala";
  }
  return "Sala em obras";
}

export function columnName(column: Column) {
  if (column.kind === "entrance") return "Entrada e arquivo";
  if (column.kind === "construction") return "Nova ala em obras";
  return column.cells.map(cellName).join(" e ");
}

function Icon({ kind }: { kind: "door" | "drawers" }) {
  return (
    <svg viewBox="0 0 20 20" className="size-[clamp(12px,1.5vmin,16px)] shrink-0" aria-hidden="true" fill="none" stroke="#292929" strokeWidth="1.5" strokeLinecap="round">
      {kind === "door" && (
        <>
          <path d="M6 18 V4 h8 V18" />
          <circle cx="12" cy="11" r="0.8" fill="#292929" />
        </>
      )}
      {kind === "drawers" && <path d="M4 3 h12 v14 H4 Z M4 8 h12 M4 13 h12 M9 5.5 h2 M9 10.5 h2 M9 15.5 h2" />}
    </svg>
  );
}

function Mark({ fresh }: { fresh: boolean }) {
  if (!fresh) return null;
  return <span aria-hidden="true" className="lab-unexplored absolute top-[3px] right-[3px] size-[6px] rounded-full bg-iris-orange" />;
}

function CellView({ cell, done, fresh, wide }: { cell: Cell; done: boolean; fresh: boolean; wide: boolean }) {
  if (cell.kind === "game")
    return (
      <span className={`relative flex h-full min-w-0 items-center gap-1.5 px-1.5 ${done ? "bg-[#fbe2d8]" : "bg-paper"}`}>
        <span className={`flex size-[clamp(15px,1.8vmin,18px)] shrink-0 items-center justify-center rounded-full border-[1.2px] border-ink font-notation text-[clamp(9px,1.1vmin,10.5px)] leading-none ${done ? "bg-iris-orange" : "bg-paper"}`}>
          {done ? "✓" : cell.number}
        </span>
        {wide && <span className="min-w-0 truncate font-notation text-[clamp(9px,1.1vmin,10.5px)] tracking-[0.08em] text-ink">{place(cell.id as BenchId)}</span>}
        <Mark fresh={fresh} />
      </span>
    );
  return <span className="lab-map-site block h-full" />;
}

export function Planta({ plan, done, lensRef, here, edges, onCenter, onStep, onLensKey }: PlantaProps) {
  const lab = useLabHome();
  const trackRef = useRef<HTMLDivElement>(null);
  const grab = useRef<{ id: number; offset: number; moved: boolean; x: number } | null>(null);
  const [tip, setTip] = useState<{ text: string; at: number } | null>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setWide(track.getBoundingClientRect().width / plan.columns.length > 74);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [plan]);

  const fractionAt = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  const lensCenter = () => {
    const lens = lensRef.current;
    const r = trackRef.current?.getBoundingClientRect();
    if (!lens || !r) return 0.5;
    const l = lens.getBoundingClientRect();
    return (l.left + l.width / 2 - r.left) / r.width;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const f = fractionAt(e.clientX);
    const onLens = lensRef.current?.contains(e.target as Node) ?? false;
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = { id: e.pointerId, offset: onLens ? f - lensCenter() : 0, moved: false, x: e.clientX };
    if (!onLens) {
      lab.sfx.press();
      onCenter(f, true);
    }
    e.preventDefault();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) {
      if (e.pointerType !== "mouse") return;
      const f = fractionAt(e.clientX);
      const target = e.target as HTMLElement;
      const label = target.closest<HTMLElement>("[data-tip]")?.dataset.tip;
      setTip(label ? { text: label, at: f } : null);
      return;
    }
    if (!g.moved && Math.abs(e.clientX - g.x) < 3) return;
    g.moved = true;
    setTip(null);
    onCenter(fractionAt(e.clientX) - g.offset, false);
  };

  const onPointerEnd = () => {
    grab.current = null;
  };

  const total = plan.width;
  const arrow = (dir: 1 | -1) => (
    <button
      type="button"
      aria-label={dir > 0 ? "Andar para a direita" : "Andar para a esquerda"}
      disabled={dir > 0 ? edges.end : edges.start}
      onClick={() => {
        lab.sfx.press();
        onStep(dir);
      }}
      className="flex size-[clamp(36px,4.6vmin,44px)] shrink-0 cursor-pointer items-center justify-center border-[1.5px] border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper active:translate-y-px disabled:cursor-default disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.4}>
        <path d={dir > 0 ? "M4 12h15M13 6l6 6-6 6" : "M20 12H5M11 6l-6 6 6 6"} />
      </svg>
    </button>
  );

  return (
    <nav aria-label="Planta do laboratório" className="relative z-10 shrink-0 pt-[clamp(10px,1.8vmin,20px)] pr-[clamp(14px,3vmin,40px)] pb-[clamp(10px,2vmin,22px)] max-[860px]:pl-[clamp(12px,4vw,24px)]">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 font-notation text-[clamp(10px,1.2vmin,11.5px)] tracking-[0.12em] text-ink-soft">
        <span className="flex items-baseline gap-2 truncate">
          <span className="text-ink">PLANTA</span>
          <span className="truncate normal-case tracking-[0.04em] max-[640px]:hidden" aria-live="polite">
            você está em: <span className="text-ink">{here}</span>
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-3 min-[1100px]:flex" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="size-[10px] border-[1.2px] border-ink bg-paper" /> jogo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="lab-map-interactive size-[10px] border-[1.2px] border-ink" /> entrada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="lab-map-construction size-[10px] border-[1.2px] border-ink" /> em obras
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-[6px] rounded-full bg-iris-orange" /> ainda não explorado
          </span>
        </span>
      </div>
      <div className="flex items-center gap-[clamp(6px,1vmin,12px)]">
        {arrow(-1)}
        <div
          ref={trackRef}
          className="relative h-[clamp(44px,6vmin,58px)] min-w-0 flex-1 cursor-pointer touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={() => setTip(null)}
        >
          <div className="lab-map flex h-full overflow-hidden border-[1.5px] border-ink bg-paper">
            <span className="lab-map-ground block h-full" style={{ flexGrow: WORLD.lead, flexBasis: 0 }} />
            {plan.columns.map((column) => {
              const name = columnName(column);
              const keys = objectsIn(column);
              const freshKeys = keys.filter((k) => !lab.used.has(k));
              return (
                <button
                  key={column.index}
                  type="button"
                  tabIndex={-1}
                  aria-label={`Ir para ${name}`}
                  data-tip={name}
                  onClick={(e) => {
                    if (e.detail === 0) onCenter((column.x + column.w / 2) / total, true);
                  }}
                  className="lab-map-col flex min-w-0 flex-col border-l-[1.2px] border-ink/70"
                  style={{ flexGrow: column.w, flexBasis: 0 }}
                >
                  {column.kind === "rooms" ? (
                    column.cells.map((cell, i) => (
                      <span key={i} className={`relative min-h-0 flex-1 ${i === 1 ? "border-t-[1.2px] border-ink/70" : ""}`} data-tip={cellName(cell)}>
                        <CellView cell={cell} done={cell.kind === "game" && done.has(cell.id as BenchId)} fresh={objectsInCell(cell).some((k) => freshKeys.includes(k))} wide={wide} />
                      </span>
                    ))
                  ) : column.kind === "entrance" ? (
                    <>
                      <span className="lab-map-interactive relative flex min-h-0 flex-1 items-center justify-center" data-tip="Arquivo de curiosidades">
                        <Icon kind="drawers" />
                        <Mark fresh={freshKeys.includes("obj:archive")} />
                      </span>
                      <span className="lab-map-interactive relative flex min-h-0 flex-1 items-center justify-center border-t-[1.2px] border-ink/70" data-tip="Entrada · quadro de luz">
                        <Icon kind="door" />
                        <Mark fresh={freshKeys.includes("obj:lever")} />
                      </span>
                    </>
                  ) : (
                    <span className="lab-map-construction relative flex h-full items-center justify-center" data-tip="Nova ala em obras">
                      {wide && <span className="bg-paper px-1 font-notation text-[clamp(9px,1.1vmin,10.5px)] tracking-[0.08em] text-ink">obras</span>}
                      <Mark fresh={freshKeys.length > 0} />
                    </span>
                  )}
                </button>
              );
            })}
            <span className="lab-map-ground block h-full border-l-[1.2px] border-ink/40" style={{ flexGrow: WORLD.tail, flexBasis: 0 }} />
          </div>
          <div
            ref={lensRef}
            role="slider"
            tabIndex={0}
            aria-label="Janela de visão do laboratório"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            aria-valuetext={here}
            onKeyDown={onLensKey}
            className="lab-lens absolute -top-[6px] -bottom-[6px] cursor-grab outline-none focus-visible:outline-[2.5px] focus-visible:outline-offset-2 focus-visible:outline-iris-orange active:cursor-grabbing"
          >
            <span aria-hidden="true" className="lab-lens-grip" />
          </div>
          {tip && (
            <span
              className="pointer-events-none absolute bottom-[calc(100%+12px)] z-10 -translate-x-1/2 border-[1.2px] border-ink bg-paper px-2 py-1 font-notation text-[11px] tracking-[0.04em] whitespace-nowrap text-ink shadow-[2px_2px_0_0_rgba(41,41,41,0.8)]"
              style={{ left: `${Math.max(8, Math.min(92, tip.at * 100))}%` }}
            >
              {tip.text}
            </span>
          )}
        </div>
        {arrow(1)}
        <span className="ml-1 max-[860px]:ml-0">
          <SoundButton inline />
        </span>
      </div>
    </nav>
  );
}
