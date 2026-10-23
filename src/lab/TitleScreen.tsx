import { Button } from "./ui.tsx";
import { BENCHES, type Bench, type BenchId } from "./benches.ts";
import { Eyebrow } from "./LabUi.tsx";
import { RoomArt } from "./RoomArt.tsx";
import { Grain } from "./riso/Grain.tsx";

type TitleScreenProps = {
  done: ReadonlySet<BenchId>;
  onStart: () => void;
  onOpen: (id: BenchId) => void;
};

function Room({ bench, done, onOpen }: { bench: Bench; done: boolean; onOpen: (id: BenchId) => void }) {
  const enabled = bench.available;
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onOpen(bench.id)}
      className={`group relative flex min-h-0 flex-1 cursor-pointer overflow-hidden border-t-[1.5px] border-ink bg-paper text-left first:border-t-0 disabled:cursor-default ${enabled ? "" : "saturate-[0.6]"}`}
    >
      <RoomArt id={bench.id} lit={enabled} />
      {!enabled && <span className="absolute inset-0 bg-paper/45" aria-hidden="true" />}
      <span
        className={`relative m-[clamp(8px,1.4vmin,16px)] flex flex-col self-start border-[1.5px] border-ink bg-paper px-[clamp(10px,1.5vmin,16px)] py-[clamp(6px,1vmin,10px)] shadow-[4px_4px_0_0_rgba(41,41,41,0.85)] transition-transform ${enabled ? "group-hover:-translate-y-0.5" : ""}`}
      >
        <span className="font-notation text-[clamp(10px,1.25vmin,13px)] tracking-[0.14em] text-ink-soft">{bench.room}</span>
        {done ? (
          <span className="display text-[clamp(14px,2.1vmin,22px)] leading-tight text-ink">
            {bench.reveal.name} <span className="text-accent">✓</span>
          </span>
        ) : (
          <span className="display text-[clamp(14px,2.1vmin,22px)] leading-tight text-ink">{bench.task}</span>
        )}
        <span
          className={`mt-1.5 self-start px-2 py-0.5 font-notation text-[clamp(10px,1.2vmin,12px)] tracking-[0.14em] ${enabled ? "bg-action text-on-action" : "border border-ink-soft text-ink-soft"}`}
        >
          {enabled ? (done ? "JOGAR DE NOVO" : "JOGAR") : "EM BREVE"}
        </span>
      </span>
    </button>
  );
}

export function TitleScreen({ done, onStart, onOpen }: TitleScreenProps) {
  return (
    <section className="graph-paper absolute inset-0 grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] overflow-y-auto max-[860px]:grid-cols-1">
      <div className="flex flex-col justify-center px-[clamp(22px,7vmin,110px)] py-[clamp(24px,6vmin,80px)]">
        <Eyebrow className="lab-rise">Ciência Delas · Feira do Conhecimento 2026</Eyebrow>
        <h1 className="display lab-rise mt-[2vmin] text-[clamp(72px,16vmin,210px)] leading-[0.84] tracking-[-0.05em] text-iris-blue" style={{ animationDelay: "100ms" }}>
          Elas
          <br />
          em Jogo
        </h1>
        <p className="display lab-rise mt-[3.4vmin] text-[clamp(24px,4.4vmin,52px)] leading-[1.05] text-iris-blue" style={{ animationDelay: "220ms" }}>
          Laboratório de descobertas
        </p>
        <p className="lab-rise mt-[3vmin] max-w-[26em] font-notation text-[clamp(15px,2.2vmin,22px)] leading-[1.45] text-balance" style={{ animationDelay: "340ms" }}>
          Primeiro você joga. No final, descobre a cientista por trás do jogo.
        </p>
        <div className="lab-rise mt-[4.5vmin]" style={{ animationDelay: "460ms" }}>
          <Button variant="primary" onClick={onStart} className="min-h-[clamp(64px,9vmin,92px)] px-[clamp(28px,4vmin,48px)] text-[clamp(17px,2.4vmin,24px)]">
            Toque para começar
          </Button>
        </div>
        <p className="lab-rise mt-[3vmin] flex items-center gap-2.5 font-notation text-[clamp(11px,1.4vmin,14px)] tracking-[0.12em]" style={{ animationDelay: "560ms" }}>
          <span className="inline-block size-3 bg-accent" aria-hidden="true" />
          {done.size === 0 ? `${BENCHES.length} JOGOS, ${BENCHES.length} CIENTISTAS` : `VOCÊ JÁ DESCOBRIU ${done.size} DE ${BENCHES.length}`}
        </p>
      </div>
      <div className="relative flex min-h-[520px] items-stretch justify-center px-[clamp(16px,4vmin,56px)] pt-[clamp(20px,5vmin,64px)] pb-[clamp(16px,4vmin,48px)]">
        <div className="lab-rise relative flex w-full max-w-[760px] flex-col" style={{ animationDelay: "200ms" }}>
          <svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true" className="block h-[clamp(44px,8vmin,90px)] w-full">
            <path d="M6 69 L200 4 L394 69 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d="M60 50 L200 10 L340 50" fill="none" stroke="#1001e3" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <rect x="300" y="14" width="20" height="30" fill="#292929" />
          </svg>
          <div className="relative flex flex-1 flex-col border-[1.5px] border-ink bg-paper shadow-[12px_12px_0_0_rgba(16,1,227,0.9)]">
            {BENCHES.map((b) => (
              <Room key={b.id} bench={b} done={done.has(b.id)} onOpen={onOpen} />
            ))}
          </div>
          <div className="h-[clamp(10px,1.6vmin,18px)] border-x-[1.5px] border-b-[1.5px] border-ink bg-[repeating-linear-gradient(90deg,#292929_0_2px,transparent_2px_14px)] opacity-60" aria-hidden="true" />
        </div>
      </div>
      <Grain className="opacity-70" />
    </section>
  );
}
