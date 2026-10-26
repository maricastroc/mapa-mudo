import type { ReactNode } from "react";
import type { RevealClosing } from "../benches.ts";

type DemoFrameProps = {
  label: string;
  replayLabel: string;
  canReplay: boolean;
  onReplay: () => void;
  caption: string | null;
  closing: RevealClosing | null;
  children: ReactNode;
};

export function DemoFrame({ label, replayLabel, canReplay, onReplay, caption, closing, children }: DemoFrameProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1 overflow-hidden border-[1.5px] border-ink bg-paper shadow-[8px_8px_0_0_var(--frame)] max-[860px]:aspect-[2/1] max-[860px]:flex-none">
        {children}
        <p className="pointer-events-none absolute top-2 left-3 bg-paper/85 px-1 font-notation text-[clamp(9px,1.1vmin,12px)] tracking-[0.12em] text-ink-soft">{label}</p>
        {canReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="lab-rise absolute top-2 right-2 cursor-pointer border-[1.5px] border-ink bg-paper px-3 py-1.5 font-notation text-[clamp(11px,1.35vmin,14px)] tracking-[0.1em] uppercase hover:bg-ink hover:text-paper"
          >
            {replayLabel}
          </button>
        )}
      </div>

      <div
        className={`shrink-0 max-[860px]:min-h-[150px] ${closing ? "mt-[2.6vmin]" : "mt-[2vmin] h-[clamp(52px,7vmin,80px)] overflow-hidden max-[860px]:h-auto"}`}
        aria-live="polite"
      >
        {caption && !closing && (
          <p key={caption} className="lab-rise text-[clamp(17px,2.5vmin,26px)] leading-[1.3]">
            {caption}
          </p>
        )}
        {closing && (
          <>
            <p className="display flex flex-wrap gap-x-[0.35em] text-[clamp(22px,3.5vmin,40px)] leading-[1.1]">
              {closing.beats.map((beat, i) => (
                <span key={beat} className={`lab-rise ${i === closing.highlight ? "text-title-alt" : ""}`} style={{ animationDelay: `${i * 260}ms` }}>
                  {beat}
                </span>
              ))}
            </p>
            <p className="lab-rise mt-[1.6vmin] max-w-[42em] text-[clamp(16px,2.2vmin,24px)] leading-[1.42] text-pretty" style={{ animationDelay: "850ms" }}>
              {closing.summary}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
