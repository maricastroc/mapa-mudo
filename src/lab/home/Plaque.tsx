"use client";

import type { Bench } from "../benches.ts";
import { useLabHome } from "./labContext.tsx";
import { useRoom } from "./RoomFrame.tsx";

type PlaqueProps = {
  bench: Bench;
  number: number;
  done: boolean;
  compact: boolean;
};

export function Plaque({ bench, number, done, compact }: PlaqueProps) {
  const lab = useLabHome();
  const room = useRoom();
  const enabled = bench.available;
  const title = done ? bench.reveal.name : bench.task;
  const label = enabled ? `${done ? "Jogar de novo" : "Jogar"}: ${bench.task}. ${bench.room}${bench.teaser ? `. ${bench.teaser}` : ""}` : `${bench.task}: em breve`;
  const call = (on: boolean) => room?.setCall(on);
  return (
    <button
      type="button"
      disabled={!enabled}
      aria-label={label}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        call(true);
        if (lab.heard()) lab.sfx.hover();
      }}
      onPointerLeave={() => call(false)}
      onFocus={() => call(true)}
      onBlur={() => call(false)}
      onClick={() => {
        lab.sfx.press();
        lab.use(`obj:${bench.id}`);
        if (room) lab.enter(bench.id, room.rect);
      }}
      className={`lab-plaque group absolute top-[11.5%] left-[4.5%] flex max-w-[min(74%,256px)] cursor-pointer flex-col items-start border-[1.5px] border-ink bg-paper text-left disabled:cursor-default ${
        compact ? "px-2.5 pt-2 pb-2" : "px-[clamp(10px,calc(var(--lab-s)*14px),16px)] pt-[clamp(8px,calc(var(--lab-s)*10px),12px)] pb-[clamp(9px,calc(var(--lab-s)*12px),14px)]"
      }`}
    >
      <span aria-hidden="true" className="lab-plaque-strings pointer-events-none absolute right-[16%] left-[16%]" />
      <span
        aria-hidden="true"
        className={`absolute -top-[11px] -right-[11px] flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-ink font-notation text-[11px] leading-none ${done ? "bg-accent text-ink" : "bg-paper text-ink"}`}
      >
        {done ? "✓" : number}
      </span>
      <span className="font-notation text-[clamp(9.5px,calc(var(--lab-s)*11px),12px)] tracking-[0.13em] text-ink-soft">{bench.room}</span>
      <span className="display mt-0.5 text-[clamp(16px,calc(var(--lab-s)*21px),24px)] leading-[1.06] tracking-[-0.01em] text-ink">{title}</span>
      {bench.teaser && !compact && <span className="mt-1 text-[clamp(11.5px,calc(var(--lab-s)*13px),14px)] leading-snug text-[#3d4f5c]">{bench.teaser}</span>}
      <span
        className={`mt-[clamp(7px,calc(var(--lab-s)*9px),10px)] inline-flex items-center gap-1.5 px-2.5 py-[4px] font-notation text-[clamp(10.5px,calc(var(--lab-s)*12px),13px)] tracking-[0.14em] transition-colors duration-150 ${
          enabled ? "bg-action text-on-action group-hover:bg-iris-orange group-hover:text-ink group-focus-visible:bg-iris-orange group-focus-visible:text-ink" : "border border-ink-soft text-ink-soft"
        }`}
      >
        {enabled ? (done ? "JOGAR DE NOVO" : "JOGAR") : "EM BREVE"}
        {enabled && (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        )}
      </span>
    </button>
  );
}
