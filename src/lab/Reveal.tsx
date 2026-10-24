import type { ReactNode } from "react";
import { Button } from "./ui.tsx";
import type { Bench, BenchId, BenchRecord } from "./benches.ts";
import { Eyebrow, LabProgress } from "./LabUi.tsx";
import { Grain } from "./riso/Grain.tsx";
import { RisoPortrait } from "./riso/RisoPortrait.tsx";

type RevealProps = {
  bench: Bench;
  record: BenchRecord | null;
  done: ReadonlySet<BenchId>;
  demo: ReactNode;
  onNext: () => void;
  onPass: () => void;
};

export function Reveal({ bench, record, done, demo, onNext, onPass }: RevealProps) {
  const { reveal } = bench;
  return (
    <section
      aria-labelledby="reveal-title"
      className="graph-paper absolute inset-0 grid grid-cols-[minmax(0,40fr)_minmax(0,60fr)] overflow-y-auto max-[860px]:grid-cols-1 max-[860px]:grid-rows-[minmax(240px,38vh)_auto] max-[860px]:content-start"
    >
      <div className="relative overflow-hidden border-r-[1.5px] border-ink max-[860px]:border-r-0 max-[860px]:border-b-[1.5px]">
        {reveal.photo && <RisoPortrait src={reveal.photo.src} alt={reveal.photo.alt} focus={reveal.photo.focus} zoom={reveal.photo.zoom} className="lab-ink" />}
        {!reveal.photo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="display text-[clamp(64px,16vmin,180px)] leading-none text-iris-blue" aria-hidden="true">
              {reveal.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </p>
            <Eyebrow className="text-ink-soft">Foto em breve</Eyebrow>
          </div>
        )}
        {reveal.photo && (
          <p className="absolute right-0 bottom-0 left-0 bg-paper/85 px-4 py-2 font-notation text-[clamp(10px,1.25vmin,13px)] tracking-[0.04em] text-ink-soft">
            {reveal.photo.credit}
          </p>
        )}
      </div>

      <div className="relative flex min-h-0 flex-col px-[clamp(20px,5vmin,72px)] pt-[clamp(18px,3.6vmin,44px)] pb-[clamp(16px,3vmin,36px)]">
        <LabProgress done={done} className="absolute top-[clamp(16px,3vmin,32px)] right-[clamp(16px,3vmin,36px)]" />
        <header className="shrink-0 pr-[clamp(88px,12vmin,130px)]">
          <Eyebrow className="lab-rise">{reveal.eyebrow}</Eyebrow>
          <div className="mt-[0.6vmin] flex flex-wrap items-baseline gap-x-[2.4vmin] gap-y-1">
            <h1
              id="reveal-title"
              className="display lab-rise text-[clamp(56px,10.5vmin,136px)] leading-[0.86] tracking-[-0.045em] text-iris-blue"
              style={{ animationDelay: "120ms" }}
            >
              Foi ela.
            </h1>
            <div className="lab-rise" style={{ animationDelay: "300ms" }}>
              <h2 className="display text-[clamp(26px,4.6vmin,58px)] leading-none">{reveal.name}</h2>
              <Eyebrow className="mt-[0.8vmin] text-ink-soft">{reveal.meta}</Eyebrow>
            </div>
          </div>
        </header>

        <div className="lab-rise mt-[3vmin] flex min-h-0 flex-1 flex-col max-[860px]:flex-none" style={{ animationDelay: "480ms" }}>
          {demo}
        </div>

        <footer className="lab-rise mt-[1.6vmin] flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3" style={{ animationDelay: "640ms" }}>
          {record && (
            <p className="font-notation text-[clamp(12px,1.5vmin,16px)] tracking-[0.04em]">
              <span className="mr-2 tracking-[0.14em] text-accent">SEU RESULTADO</span>
              <span className="font-medium">{record.result}</span>
              <span className="text-ink-soft"> · {record.detail}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" arrow onClick={onNext}>
              Próximo jogo
            </Button>
            <Button variant="outline" onClick={onPass}>
              Passar a vez
            </Button>
          </div>
        </footer>
      </div>
      <Grain className="opacity-70" />
    </section>
  );
}
