import type { CSSProperties, ReactNode } from "react";
import { BENCHES, type BenchId } from "./benches.ts";

export function Eyebrow({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p className={`font-notation text-[clamp(11px,1.45vmin,16px)] font-medium tracking-[0.14em] uppercase ${className ?? ""}`} style={style}>
      {children}
    </p>
  );
}

export function LabProgress({ done, className }: { done: ReadonlySet<BenchId>; className?: string }) {
  return (
    <div className={`flex flex-col items-end gap-1.5 ${className ?? ""}`} aria-label={`${done.size} de ${BENCHES.length} cientistas descobertas`}>
      <div className="flex gap-1.5" aria-hidden="true">
        {BENCHES.map((b) => (
          <span
            key={b.id}
            className={`block size-[clamp(14px,2vmin,22px)] border-[1.5px] ${done.has(b.id) ? "border-accent bg-accent" : "border-iris-blue bg-paper"}`}
          />
        ))}
      </div>
      <span className="font-notation text-[clamp(10px,1.3vmin,14px)] tracking-[0.14em]" aria-hidden="true">
        {done.size} DE {BENCHES.length}
      </span>
    </div>
  );
}

export function Stamp({ children, tilt = -7, className, style }: { children: ReactNode; tilt?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`lab-stamp inline-block border-[3px] border-accent bg-paper px-4 py-1.5 font-primary font-bold tracking-[0.08em] text-accent uppercase shadow-[3px_3px_0_0_rgba(41,41,41,0.85)] ${className ?? ""}`}
      style={{ "--stamp-tilt": `${tilt}deg`, ...style } as CSSProperties}
    >
      {children}
    </span>
  );
}
