import type { ReactNode } from "react";
import { Button } from "@/experience/ui";
import type { Bench } from "./benches.ts";
import { Eyebrow } from "./LabUi.tsx";

export function IntroCard({ bench, art, onStart }: { bench: Bench; art?: ReactNode; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper/55 px-4 backdrop-blur-[1.5px]" onPointerDown={onStart}>
      <div
        role="dialog"
        aria-labelledby="bench-intro-title"
        className="lab-rise relative w-full max-w-[min(680px,92vw)] border-[1.5px] border-ink bg-paper px-[clamp(22px,4.5vmin,52px)] py-[clamp(22px,4.2vmin,48px)] shadow-[10px_10px_0_0_rgba(16,1,227,0.9)]"
      >
        <Eyebrow className="text-ink-soft">{bench.intro.eyebrow}</Eyebrow>
        <h1 id="bench-intro-title" className="display mt-3 text-[clamp(34px,6vmin,68px)] leading-[0.98] text-iris-blue">
          {bench.intro.title}
        </h1>
        <p className="mt-5 max-w-[30em] text-[clamp(17px,2.35vmin,24px)] leading-[1.4]">{bench.intro.body}</p>
        {art}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button variant="primary" arrow autoFocus onClick={onStart}>
            Começar
          </Button>
          <span className="font-notation text-[13px] tracking-[0.1em] text-ink-soft">OU TOQUE EM QUALQUER LUGAR</span>
        </div>
      </div>
    </div>
  );
}
