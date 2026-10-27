import Image from "next/image";
import { Button } from "./ui.tsx";
import { BENCHES, type BenchId } from "./benches.ts";
import { LabExplorer } from "./home/LabExplorer.tsx";
import { Eyebrow } from "./LabUi.tsx";
import { Grain } from "./riso/Grain.tsx";

type TitleScreenProps = {
  done: ReadonlySet<BenchId>;
  onStart: () => void;
  onOpen: (id: BenchId) => void;
};

export function TitleScreen({ done, onStart, onOpen }: TitleScreenProps) {
  return (
    <section className="graph-paper absolute inset-0 grid grid-cols-[minmax(0,40fr)_minmax(0,60fr)] grid-rows-[1fr_auto] overflow-x-hidden overflow-y-auto max-[860px]:grid-cols-1 max-[860px]:grid-rows-none max-[860px]:content-start">
      <div className="relative z-10 flex flex-col justify-center px-[clamp(22px,6vmin,96px)] pt-[clamp(24px,4.2vmin,80px)] pb-[clamp(16px,2.6vmin,44px)] max-[860px]:pb-[clamp(12px,3vmin,24px)]">
        <Eyebrow className="lab-rise">Ciência Delas · Feira do Conhecimento 2026</Eyebrow>
        <h1 className="display lab-rise mt-[2vmin] text-[clamp(64px,13.5vmin,190px)] leading-[0.84] tracking-[-0.05em] text-title" style={{ animationDelay: "100ms" }}>
          Elas
          <br />
          em Jogo
        </h1>
        <p className="display lab-rise mt-[3.4vmin] text-[clamp(24px,4.4vmin,52px)] leading-[1.05] text-title-alt" style={{ animationDelay: "220ms" }}>
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
      <div className="lab-rise relative row-span-2 flex max-h-dvh min-h-0 flex-col pt-[clamp(14px,3vmin,40px)] max-[860px]:row-span-1 max-[860px]:max-h-none max-[860px]:min-h-auto max-[860px]:pt-0" style={{ animationDelay: "200ms" }}>
        <LabExplorer done={done} onOpen={onOpen} />
      </div>
      <footer className="lab-rise relative z-10 px-[clamp(22px,6vmin,96px)] pb-[clamp(14px,2.6vmin,40px)] max-[860px]:pt-[clamp(20px,4vmin,32px)]" style={{ animationDelay: "640ms" }}>
        <div className="flex flex-wrap items-center gap-x-[clamp(18px,3vmin,40px)] gap-y-4 border-t-[1.5px] border-ink pt-[clamp(12px,2vmin,22px)]">
          <Image src="/logos/feira.svg" alt="Feira do Conhecimento, 10ª edição" width={854} height={394} unoptimized className="h-[clamp(34px,4.6vmin,58px)] w-auto" />
          <Image src="/logos/iris.png" alt="ÍRIS, Laboratório de Inovação e Dados" width={466} height={97} className="h-[clamp(22px,3vmin,36px)] w-auto -translate-y-[10%]" />
          <Image src="/logos/ceara.png" alt="Governo do Estado do Ceará" width={341} height={110} className="h-[clamp(26px,3.5vmin,42px)] w-auto translate-y-[5%]" />
        </div>
      </footer>
      <Grain className="opacity-70" />
    </section>
  );
}
