"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { shownSources } from "@/content/scientists/catalog";
import { scientistProfile } from "@/content/scientists/profile";
import { FICTIONAL_NOTICE } from "@/content/scientists/fixtures";
import type { DiscoveryScenery, FeaturedScientist } from "@/content/scientists/types";
import type { SheetPoint } from "@/participation/sheetLayout";
import { Actions, type ResponseHandlers } from "./Actions";
import type { State, Step } from "./state";
import type { Screen } from "./screen";
import { ProfilePlane } from "./ProfilePlane";
import { CONTRIBUTION_TIMING } from "./scenes";
import { sceneryFor } from "./scenery";
import { widestWordInEm } from "./typography";
import { ArrowIcon, Button, PaperStrip, TriangleMarker } from "./ui";

export type Commands = {
  dontKnow: () => void;
  silence: () => void;
  approach: () => void;
  nextClue: () => void;
  reachHumanScale: () => void;
  continue: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  seeAgain: () => void;
  name: (text: string) => void;
  seeMap: () => void;
  anotherName: () => void;
  confirm: (id: string) => void;
  reject: () => void;
  submitForReview: () => void;
  clearResponse: () => void;
};

export type PlaneContext = {
  discovery: FeaturedScientist | null;
  code: string;
  points: SheetPoint[];
  illustrative: boolean;
  speech: string | null;
};

type PlaneProps = { state: State; screen: Screen; commands: Commands; reducedMotion: boolean; context: PlaneContext };

const DISCOVERY_STAGES = ["território", "problema", "pesquisa"] as const;

function handlersFrom(c: Commands): ResponseHandlers {
  return {
    onName: c.name,
    onSilence: c.silence,
    onConfirm: c.confirm,
    onReject: c.reject,
    onSubmitForReview: c.submitForReview,
    onClear: c.clearResponse,
  };
}

function Stage({ screen, children }: { screen: Screen; children: ReactNode }) {
  if (screen.compact) {
    return (
      <div className="absolute inset-x-0 bottom-0 flex max-h-[62%] flex-col items-start gap-3 overflow-y-auto px-4 pt-4 pb-14">
        {children}
      </div>
    );
  }
  return (
    <div
      className="absolute top-0 left-0 h-[900px] w-[1440px] origin-top-left"
      style={{ transform: `translate(${screen.ox}px, ${screen.oy}px) scale(${screen.fit})` }}
    >
      {children}
    </div>
  );
}

function SheetHeader({ children }: { children: ReactNode }) {
  return (
    <p className="absolute top-[40px] left-[64px] font-notation text-[13px] tracking-[0.06em] text-ink-soft compact:hidden">
      <PaperStrip className="px-2 py-1">{children}</PaperStrip>
    </p>
  );
}

function Heading({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <h1 tabIndex={-1} className={`outline-none ${className ?? ""}`} style={style}>
      {children}
    </h1>
  );
}

function SayAName({ state, screen, commands, reducedMotion, context, again }: PlaneProps & { again: boolean }) {
  return (
    <Stage screen={screen}>
      <SheetHeader>
        {again ? "FOLHA 01 — MAPA MUDO · 1 PONTO ESPERANDO NOME" : "FOLHA 01 — CIÊNCIA DELAS · MAPA MUDO · RELEVO ILUSTRATIVO"}
      </SheetHeader>
      <Heading className="display absolute top-[228px] left-[64px] text-[150px] leading-none compact:static compact:text-[60px]">
        <span className="block w-fit bg-paper px-4 compact:px-2">DIGA</span>
        <span className="block w-fit bg-paper px-4 compact:px-2">UM NOME.</span>
      </Heading>
      <p
        key={again ? "knows" : "ask"}
        className={`absolute top-[548px] left-[64px] text-[32px] leading-[1.25] font-medium compact:static compact:text-[20px] ${again ? "fade-in" : ""}`}
        style={{ animationDelay: "2400ms" }}
      >
        <PaperStrip className="px-4 py-1.5 compact:px-2">{again ? "Agora você sabe." : "Diga o nome de uma cientista brasileira."}</PaperStrip>
      </p>
      <Actions
        className="absolute top-[618px] left-[52px] compact:static"
        speak={{ label: "Falar", accent: again }}
        type
        extras={again ? [{ label: "Ver de novo", onClick: commands.seeAgain }] : [{ label: "Não sei", onClick: commands.dontKnow }]}
        speech={context.speech}
        response={state.response}
        reducedMotion={reducedMotion}
        handlers={handlersFrom(commands)}
      />
    </Stage>
  );
}

function NoName({ screen, commands }: PlaneProps) {
  return (
    <Stage screen={screen}>
      <SheetHeader>FOLHA 01 — MAPA MUDO · 1 PONTO SELECIONADO</SheetHeader>
      <p className="fade-in absolute top-[236px] left-[64px] text-[32px] font-medium compact:static compact:text-[20px]">
        <PaperStrip className="px-4 py-1.5 compact:px-2">Não veio nenhum nome?</PaperStrip>
      </p>
      <Heading className="display fade-in absolute top-[304px] left-[64px] text-[92px] leading-[1.06] [animation-delay:250ms] compact:static compact:text-[40px]">
        <span className="block w-fit bg-paper px-4 compact:px-2">ENTÃO VAMOS</span>
        <span className="block w-fit bg-paper px-4 compact:px-2">DESCOBRIR UMA.</span>
      </Heading>
      <div className="fade-in absolute top-[540px] left-[64px] [animation-delay:900ms] compact:static">
        <Button variant="primary" arrow onClick={commands.approach}>
          Aproximar
        </Button>
      </div>
    </Stage>
  );
}

const CLUE_MAX_SIZES = [62, 54, 44];

function clueSize(index: number, length: number) {
  return Math.min(CLUE_MAX_SIZES[index], Math.max(34, Math.floor(Math.sqrt(334000 / Math.max(length, 1)))));
}

function nameSize(name: string) {
  const widest = widestWordInEm(name);
  return Math.min(104, Math.floor(620 / widest), Math.floor(104 * Math.sqrt(16 / Math.max(name.length, 16))));
}

function Clue({ state, screen, commands, reducedMotion, context, index }: PlaneProps & { index: 0 | 1 | 2 }) {
  const discovery = context.discovery;
  if (!discovery) return null;
  const hint = discovery.experience.hints[index];
  const core = sceneryFor(discovery).core;
  return (
    <Stage screen={screen}>
      <div className="absolute top-[84px] left-[64px] flex w-[600px] flex-col items-start gap-4 compact:static compact:w-full compact:gap-2">
        <p className="font-primary text-[14px] font-semibold tracking-[0.18em] text-iris-blue uppercase">
          <PaperStrip className="px-2 py-1">
            Pista {index + 1} de 3 · {DISCOVERY_STAGES[index]}
          </PaperStrip>
        </p>
        <Heading
          className="leading-[1.16] font-semibold tracking-[-0.02em] compact:text-[28px]"
          style={screen.compact ? undefined : { fontSize: clueSize(index, hint.text.length) }}
        >
          <PaperStrip className="px-3 compact:px-2">{hint.text}</PaperStrip>
        </Heading>
        {hint.note && (
          <p className="font-primary text-[17px] text-ink-soft">
            <PaperStrip className="px-2 py-1">{hint.note}</PaperStrip>
          </p>
        )}
      </div>
      {index === 2 && core && <CoreAnnotations research={core} />}
      <Actions
        className="absolute top-[752px] left-[52px] compact:static"
        speak={{ label: "Dizer o nome" }}
        type
        extras={[
          index < 2
            ? { label: "Outra pista", arrow: true, onClick: commands.nextClue }
            : { label: "Chegar à escala 1:1", arrow: true, onClick: commands.reachHumanScale },
        ]}
        speech={context.speech}
        response={state.response}
        reducedMotion={reducedMotion}
        handlers={handlersFrom(commands)}
      />
    </Stage>
  );
}

const CORE_LAYOUT = { top: 130, height: 640, firstTick: 150, lastTick: 770 };

function CoreAnnotations({ research }: { research: NonNullable<DiscoveryScenery["core"]> }) {
  const depths = research.depths;
  const spacing = (CORE_LAYOUT.lastTick - CORE_LAYOUT.firstTick) / Math.max(1, depths.length - 1);
  const layers = research.layers.map((l) => ({ text: l.text, y: CORE_LAYOUT.top + l.at * CORE_LAYOUT.height }));
  return (
    <div aria-hidden="true" className="fade-in absolute inset-0 [animation-delay:2300ms] compact:hidden">
      {depths.map((d, i) => (
        <div
          key={d}
          className="absolute right-[548px] flex -translate-y-1/2 items-center gap-2 font-notation text-[12px] text-ink-soft"
          style={{ top: CORE_LAYOUT.firstTick + i * spacing }}
        >
          <PaperStrip className="px-1">{d}</PaperStrip>
          <span className="block h-0 w-[14px] border-t-[1.5px] border-ink" />
        </div>
      ))}
      {layers.map((l) => (
        <div key={l.text} className="absolute left-[1062px] flex -translate-y-1/2 items-center gap-2 font-notation text-[13px]" style={{ top: l.y }}>
          <span className="block h-0 w-[18px] border-t border-ink" />
          <PaperStrip className="px-1">{l.text}</PaperStrip>
        </div>
      ))}
      <p className="absolute top-[792px] left-[905px] font-notation text-[12px] tracking-[0.06em] text-ink-soft">
        <PaperStrip className="px-1">ESCALA 1:10 · {research.caption}</PaperStrip>
      </p>
    </div>
  );
}

function TypedName({ name, delay }: { name: string; delay: number }) {
  let i = 0;
  return (
    <span aria-hidden="true">
      {name.split(" ").map((word, w) => (
        <span key={`${word}-${w}`}>
          {w > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {[...word].map((letter) => {
              const k = i++;
              return (
                <span key={k} className="fade-in inline-block" style={{ animationDelay: `${delay + k * 70}ms`, animationDuration: "180ms" }}>
                  {letter}
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}

function HumanScale({ state, screen, commands, context }: PlaneProps) {
  const [settled] = useState(() => state.previous === "profile");
  const discovery = context.discovery;
  if (!discovery) return null;
  const sources = shownSources(discovery);
  return (
    <Stage screen={screen}>
      <div className={settled ? "settled contents" : "contents"}>
        <p className="absolute top-[40px] left-[64px] font-notation text-[14px] font-medium tracking-[0.08em] text-iris-blue compact:static">
          <PaperStrip className="px-2 py-1">ESCALA 1:1 — ESCALA HUMANA</PaperStrip>
        </p>
        <div className="absolute top-[176px] left-[64px] flex w-[620px] flex-col items-start compact:static compact:w-full">
          <p className="fade-in flex items-center gap-2.5 font-notation text-[14px] tracking-[0.06em] text-ink-soft [animation-delay:1800ms]">
            <TriangleMarker tone="accent" />
            PONTO {context.code} · AGORA COM NOME
          </p>
          <Heading
            className="mt-4 leading-[0.98] font-bold tracking-[0.01em] uppercase compact:text-[44px]"
            style={screen.compact ? undefined : { fontSize: nameSize(discovery.canonicalName) }}
          >
            <span className="sr-only">{discovery.canonicalName}</span>
            <TypedName name={discovery.canonicalName} delay={2300} />
          </Heading>
          <span aria-hidden="true" className="fade-in mt-3 block h-0 w-[540px] border-b-2 border-accent [animation-delay:2000ms] compact:w-full" />
          <p className="fade-in mt-6 font-primary text-[16px] font-semibold tracking-[0.14em] uppercase [animation-delay:3400ms]">{discovery.field}</p>
          <p className="fade-in mt-3 text-[40px] leading-[1.1] font-medium [animation-delay:3900ms] compact:text-[24px]">Agora você conhece uma.</p>
          {discovery.fictional ? (
            <p className="fade-in mt-6 border-[1.5px] border-accent px-3 py-2 font-notation text-[12px] tracking-[0.04em] text-ink [animation-delay:3900ms]">
              {FICTIONAL_NOTICE}
            </p>
          ) : (
            sources.length > 0 && (
              <div className="fade-in mt-6 flex items-baseline gap-3 border-[1.5px] border-accent px-3 py-2 font-notation text-[12px] tracking-[0.04em] text-ink [animation-delay:3900ms]">
                <span className="text-ink-soft">{sources.length > 1 ? "FONTES" : "FONTE"}</span>
                <ul className="flex flex-col gap-1">
                  {sources.map((source) => (
                    <li key={source.id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto inline-flex items-center gap-1.5 underline decoration-accent decoration-[1.5px] underline-offset-[3px] hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris-blue"
                      >
                        {source.label}
                        <ArrowIcon className="size-3 shrink-0 -rotate-45" />
                        <span className="sr-only">(abre em nova aba)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          <div className="fade-in mt-7 [animation-delay:4300ms] compact:mt-4">
            <Button variant="primary" arrow onClick={commands.continue}>
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </Stage>
  );
}

function NameSaid({ state, screen, commands, context }: PlaneProps) {
  const said = context.points.find((p) => p.scientistId !== null && p.scientistId === state.saidId);
  const first = (said?.mentions ?? 1) <= 1;
  const ready = CONTRIBUTION_TIMING.settle + CONTRIBUTION_TIMING.settleFor - 400;
  return (
    <Stage screen={screen}>
      <div className="absolute top-[84px] left-[64px] flex w-[480px] flex-col items-start gap-4 compact:static compact:w-full compact:gap-2">
        <p className="fade-in font-primary text-[14px] font-semibold tracking-[0.18em] text-iris-blue [animation-delay:1200ms]">
          <PaperStrip className="px-2 py-1">DITO EM VOZ ALTA</PaperStrip>
        </p>
        <Heading className="fade-in text-[52px] leading-[1.14] font-semibold tracking-[-0.02em] [animation-delay:1400ms] compact:text-[30px]">
          <PaperStrip className="px-3 compact:px-2">{first ? "O ponto agora tem nome." : "Este nome já estava no mapa."}</PaperStrip>
        </Heading>
        <p className="fade-in text-[23px] leading-[1.45] text-ink-soft [animation-delay:3900ms] compact:text-[17px]">
          <PaperStrip className="px-3 py-0.5 compact:px-2">
            {first ? "Cada vez que um nome é dito, o relevo dele sobe uma curva." : "Agora seu relevo cresce."}
          </PaperStrip>
        </p>
        <p className="fade-in font-notation text-[12px] tracking-[0.06em] text-ink-soft [animation-delay:4300ms]">
          <PaperStrip className="px-2 py-1">EQUIDISTÂNCIA DESTA VISTA: 1 NOME DITO</PaperStrip>
        </p>
      </div>
      <div className="fade-in absolute top-[776px] left-[64px] compact:static" style={{ animationDelay: `${ready}ms` }}>
        <Button variant="primary" arrow onClick={commands.seeMap}>
          Ver o mapa inteiro
        </Button>
      </div>
      <span className="sr-only" role="status">
        {first
          ? `${said?.name ?? ""} +1. O ponto agora tem nome: a primeira curva de nível surgiu no relevo.`
          : `${said?.name ?? ""} +1. Este nome já estava no mapa: uma nova curva de nível surgiu no topo do relevo.`}
      </span>
    </Stage>
  );
}

function Collective({ state, screen, commands, context }: PlaneProps) {
  const named = context.points.filter((p) => p.name !== null && p.mentions > 0);
  const silentCount = context.points.length - named.length;
  const said = named.find((p) => p.scientistId === state.saidId);
  const notices = [named.some((p) => p.fictional) ? "NOMES FICTÍCIOS" : null, context.illustrative ? "COTAS ILUSTRATIVAS" : null].filter(
    (n): n is string => n !== null,
  );
  return (
    <Stage screen={screen}>
      <div className="fade-in absolute top-[30px] left-[36px] flex flex-col gap-1 border-[1.5px] border-ink bg-paper px-4 pt-3 pb-3.5 compact:static">
        <p className="font-notation text-[11px] tracking-[0.08em] text-ink-soft">FOLHA 01</p>
        <Heading className="text-[22px] leading-[1.1] font-bold tracking-[0.04em] uppercase">Mapa dos nomes ditos</Heading>
        <p className="font-notation text-[11px] text-ink-soft">relevo: quanto mais dito, mais alto</p>
      </div>
      <p className="fade-in absolute top-[74px] right-[48px] font-notation text-[11px] tracking-[0.06em] text-ink-soft compact:static">
        <PaperStrip className="px-2 py-1">
          {[`${named.length} NOMES DITOS`, `${silentCount} PONTOS AINDA MUDOS`, ...notices].join(" · ")}
        </PaperStrip>
      </p>
      {said && (
        <p className="sr-only" role="status">
          {said.name} agora tem {said.mentions} menções no mapa coletivo.
        </p>
      )}
      <div className="fade-in absolute bottom-[36px] left-[36px] [animation-delay:2600ms] compact:static">
        <Button variant="primary" arrow onClick={commands.anotherName}>
          Diga outro nome
        </Button>
      </div>
    </Stage>
  );
}

export function PlaneContent({ step, ...props }: PlaneProps & { step: Step }) {
  switch (step) {
    case "opening":
      return <SayAName {...props} again={false} />;
    case "askAgain":
      return <SayAName {...props} again />;
    case "noName":
      return <NoName {...props} />;
    case "clue1":
      return <Clue {...props} index={0} />;
    case "clue2":
      return <Clue {...props} index={1} />;
    case "clue3":
      return <Clue {...props} index={2} />;
    case "humanScale":
      return <HumanScale {...props} />;
    case "profile":
      return props.context.discovery ? (
        <ProfilePlane
          profile={scientistProfile(props.context.discovery)}
          code={props.context.code}
          screen={props.screen}
          returnTo={props.state.profileReturn === "askAgain" ? "map" : "portrait"}
          onBack={props.commands.closeProfile}
          onContinue={props.commands.continue}
        />
      ) : null;
    case "nameSaid":
      return <NameSaid {...props} />;
    case "collective":
      return <Collective {...props} />;
  }
}

export const PLANE_LABELS: Record<Step, string> = {
  opening: "Diga um nome",
  noName: "Sem nome",
  clue1: "Pista 1 de 3",
  clue2: "Pista 2 de 3",
  clue3: "Pista 3 de 3",
  humanScale: "Escala humana",
  profile: "Perfil da cientista",
  askAgain: "Diga um nome, de novo",
  nameSaid: "Nome dito",
  collective: "Mapa coletivo dos nomes",
};

export function mapDescription(state: State, context: PlaneContext) {
  const name = context.points.find((p) => p.scientistId !== null && p.scientistId === state.saidId)?.name ?? "";
  const scenery = context.discovery ? sceneryFor(context.discovery) : null;
  const point = `ponto ${context.code}`;
  switch (state.step) {
    case "opening":
      return "Mapa topográfico mudo: relevo com pontos marcados por triângulos, todos sem nome.";
    case "noName":
      return `Mapa mudo com o ${point} selecionado por uma mira.`;
    case "clue1": {
      const places = scenery?.places.map((l) => l.text.toLowerCase()).join(", ");
      return `Aproximação ao ${point}, escala 1:250 000${places ? `: ${places}` : ""}.`;
    }
    case "clue2":
      return scenery?.transect
        ? `Escala 1:25 000: um transecto com ${scenery.transect.points} pontos de coleta parte do ${point}.`
        : `Escala 1:25 000: aproximação ao ${point}.`;
    case "clue3":
      return scenery?.core
        ? "Escala 1:10: as curvas de nível viram camadas de sedimento."
        : "Escala 1:10: dentro do círculo, as curvas de nível desenham a silhueta de uma pessoa.";
    case "humanScale":
      return context.discovery?.photo?.src
        ? `Escala 1:1: dentro do círculo, a fotografia de ${context.discovery.canonicalName}, cercada pelas curvas de nível do seu retrato.`
        : "Escala 1:1: as curvas de nível desenham o busto de uma pessoa.";
    case "profile":
      return `Escala 1:1: o retrato de ${context.discovery?.canonicalName ?? "uma cientista"} continua à direita enquanto a ficha dela é lida.`;
    case "askAgain":
      return `Mapa mudo inteiro. O ${point} agora mostra o retrato de ${context.discovery?.canonicalName ?? "uma cientista"}, esperando que o nome seja dito.`;
    case "nameSaid":
      return `Aproximação ao relevo de ${name}: uma nova curva de nível surge ao redor do topo e depois se integra às demais.`;
    case "collective":
      return "Mapa dos nomes ditos: cada nome no topo do seu relevo; quanto mais dito, mais alto e maior.";
  }
}
