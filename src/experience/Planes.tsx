"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { shownSources } from "@/content/scientists/catalog";
import { completesName } from "@/content/scientists/matcher";
import { scientistProfile } from "@/content/scientists/profile";
import { findReference } from "@/content/scientists/references";
import { FICTIONAL_NOTICE } from "@/content/scientists/fixtures";
import type { DiscoveryScenery, FeaturedScientist } from "@/content/scientists/types";
import { SILENCE_SAMPLE_MIN, unnamedCount, type Collective } from "@/participation/collective";
import { presenceAt, type SheetPoint } from "@/participation/sheetLayout";
import { NameEntry, type ResponseHandlers } from "./Actions";
import { describeCounts } from "./MapOverlays";
import { KEYBOARD_BOX, Keyboard } from "./Keyboard";
import { MAX_HINT, type State, type Step } from "./state";
import type { Screen } from "./screen";
import { ProfilePlane } from "./ProfilePlane";
import { CARTOUCHE, NEXT_ACTION } from "./collectiveLayout";
import { CONTRIBUTION_TIMING } from "./scenes";
import { sceneryFor } from "./scenery";
import { useTotem } from "./totem";
import { widestWordInEm } from "./typography";
import { ArrowIcon, Button, PaperStrip, TriangleMarker } from "./ui";

export type Commands = {
  dontKnow: () => void;
  approach: () => void;
  nextClue: () => void;
  reachHumanScale: () => void;
  continue: () => void;
  openProfile: () => void;
  openProfileOf: (id: string) => void;
  closeProfile: () => void;
  hint: () => void;
  name: (text: string) => void;
  seeMap: () => void;
  anotherName: () => void;
  discoverAnother: () => void;
  passTurn: () => void;
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
  sharedSilence: number | null;
};

type PlaneProps = { state: State; screen: Screen; commands: Commands; context: PlaneContext };

export const DISCOVERY_STAGES = ["A pergunta", "O trabalho", "A contribuição"] as const;

function handlersFrom(c: Commands): ResponseHandlers {
  return {
    onName: c.name,
    onConfirm: c.confirm,
    onReject: c.reject,
    onSubmitForReview: c.submitForReview,
    onClear: c.clearResponse,
    onDiscover: c.discoverAnother,
    onSeeMap: c.seeMap,
  };
}

function Stage({ screen, children }: { screen: Screen; children: ReactNode }) {
  if (screen.compact) {
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-(--footer) flex max-h-[calc(62%_-_var(--footer))] flex-col items-start gap-3 overflow-y-auto overscroll-contain px-4 pt-4 pb-3">
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

const FOOTER_GAP = 16;

function useLift(ref: RefObject<HTMLDivElement | null>, screen: Screen, max: number, limit: number | null = null): CSSProperties {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || screen.compact) return;
    const update = () => {
      const footer = document.querySelector<HTMLElement>("footer")?.offsetHeight ?? 0;
      const footerBottom = (screen.H - footer - FOOTER_GAP - screen.oy) / screen.fit;
      const safeBottom = limit === null ? footerBottom : Math.min(footerBottom, limit - FOOTER_GAP);
      setLift(Math.min(max, Math.max(0, Math.ceil(el.offsetTop + el.offsetHeight - safeBottom))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, screen, max, limit]);
  const amount = screen.compact ? 0 : lift;
  return { transform: amount > 0 ? `translateY(${-amount}px)` : undefined };
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

function silenceLine(collective: Collective) {
  if (collective.answers < SILENCE_SAMPLE_MIN) return null;
  return `Até agora, ${unnamedCount(collective)} de ${collective.answers} pessoas não lembraram de nenhuma.`;
}

function SayAName({ state, screen, commands, context, again }: PlaneProps & { again: boolean }) {
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState("");
  const block = useRef<HTMLDivElement>(null);
  const keyboard = !screen.compact;
  const docked = typing && keyboard;
  const lift = useLift(block, screen, docked ? 260 : 120, docked ? KEYBOARD_BOX.y : null);
  const discovery = context.discovery;
  const names = again && discovery ? [discovery.canonicalName, ...discovery.aliases] : [];
  const completion = typing && names.length > 0 && completesName(value, names) ? (discovery?.canonicalName ?? null) : null;
  const responseKind = state.response?.kind ?? null;
  const settled = responseKind !== null && responseKind !== "incomplete";
  const [closedFor, setClosedFor] = useState<State["response"]>(null);
  if (settled && typing && closedFor !== state.response) {
    setClosedFor(state.response);
    setTyping(false);
  }
  const handlers = handlersFrom(commands);
  const edit = (next: string) => {
    setValue(next.slice(0, 80));
    commands.clearResponse();
  };
  const submit = (text: string) => {
    if (text.trim()) commands.name(text);
  };
  const open = () => {
    commands.clearResponse();
    setValue("");
    setTyping(true);
  };
  const cancel = () => {
    setTyping(false);
    setValue("");
    commands.clearResponse();
  };
  const ownCalls = responseKind === "reference" || responseKind === "submitted";
  const extras = again
    ? [
        ...(state.hint < MAX_HINT ? [{ label: "Mostrar o nome", onClick: commands.hint }] : []),
        { label: "Ver o mapa", arrow: true, onClick: commands.seeMap },
      ]
    : ownCalls
      ? []
      : [{ label: "Não sei", onClick: commands.dontKnow }];
  const stat = again ? null : silenceLine(state.collective);
  return (
    <Stage screen={screen}>
      <SheetHeader>
        {again
          ? `FOLHA 01 — MAPA MUDO · PONTO ${context.code} ESPERANDO NOME`
          : `FOLHA 01 — CIÊNCIA DELAS · MAPA MUDO${context.illustrative ? " · RELEVO ILUSTRATIVO" : ""}`}
      </SheetHeader>
      <div className="absolute inset-0 transition-transform duration-500 compact:contents" style={lift}>
        <div
          ref={block}
          className={`absolute left-[64px] flex flex-col items-start compact:static compact:gap-3 ${again ? "top-[150px] gap-5" : "top-[228px] gap-5"}`}
        >
          {again && !docked && (
            <p className="text-[40px] leading-[1.25] font-medium compact:text-[22px]">
              <PaperStrip className="px-4 py-1.5 compact:px-2">A mesma pergunta.</PaperStrip>
            </p>
          )}
          <Heading
            className="display leading-none transition-[font-size] duration-500 compact:text-[60px]"
            style={screen.compact ? undefined : { fontSize: docked ? 100 : 150 }}
          >
            <span className="block w-fit bg-paper px-4 compact:px-2">DIGA</span>
            <span className="block w-fit bg-paper px-4 compact:px-2">UM NOME.</span>
          </Heading>
          <p className="text-[32px] leading-[1.25] font-medium compact:text-[20px]">
            <PaperStrip className="px-4 py-1.5 compact:px-2">Diga o nome de uma cientista brasileira.</PaperStrip>
          </p>
          {stat && !docked && (
            <p className="-mt-2 text-[24px] leading-[1.3] text-ink-soft compact:text-[16px]">
              <PaperStrip className="px-4 py-1 compact:px-2">{stat}</PaperStrip>
            </p>
          )}
          <div className="pl-1 compact:pl-0">
            <NameEntry
              extras={extras}
              response={state.response}
              handlers={{ ...handlers, onName: submit }}
              typing={typing}
              value={value}
              completion={completion}
              keyboard={keyboard}
              again={again}
              onOpen={open}
              onCancel={cancel}
              onChange={edit}
            />
          </div>
        </div>
      </div>
      {docked && (
        <Keyboard
          onType={(letter) => edit(value + letter)}
          onErase={() => edit(value.slice(0, -1))}
          onSubmit={() => submit(value)}
          canSubmit={value.trim().length > 0}
        />
      )}
      {again && state.hint >= MAX_HINT && (
        <span className="sr-only" role="status">
          O nome dela é {discovery?.canonicalName ?? ""}.
        </span>
      )}
    </Stage>
  );
}

const NO_NAME_COPY: Record<State["intro"], { lead: string; heading: [string, string] }> = {
  silence: { lead: "Nenhum nome veio?", heading: ["ENTÃO VAMOS", "DESCOBRIR UMA."] },
  again: { lead: "Vamos a mais uma.", heading: ["ENTÃO VAMOS", "DESCOBRIR UMA."] },
  another: { lead: "Você lembrou de uma.", heading: ["VAMOS", "DESCOBRIR OUTRA."] },
  reference: { lead: "Vamos a uma cientista brasileira.", heading: ["ENTÃO VAMOS", "DESCOBRIR UMA."] },
};

function NoName({ state, screen, commands, context }: PlaneProps) {
  const copy = NO_NAME_COPY[state.intro];
  const chosen = context.points.find((p) => p.scientistId !== null && p.scientistId === context.discovery?.id);
  const unknownHere = !chosen || presenceAt(chosen) === 0;
  const lines =
    state.intro === "silence"
      ? [
          context.sharedSilence !== null ? `Até agora, ${context.sharedSilence} pessoas também não lembraram.` : null,
          "Não é falta de cientistas. É falta de quem conte sobre elas.",
        ]
      : state.intro === "another"
        ? [unknownHere ? "Agora, uma que ninguém lembrou aqui ainda." : "Agora, uma das menos lembradas aqui."]
        : [];
  return (
    <Stage screen={screen}>
      <SheetHeader>FOLHA 01 — MAPA MUDO · PONTO {context.code} SEM NOME</SheetHeader>
      <div className="absolute bottom-[612px] left-[64px] flex flex-col items-start gap-2 compact:static compact:gap-1.5">
        <p className="fade-in text-[32px] font-medium compact:text-[20px]">
          <PaperStrip className="px-4 py-1.5 compact:px-2">{copy.lead}</PaperStrip>
        </p>
        {lines
          .filter((l): l is string => l !== null)
          .map((line, i, all) => (
            <p
              key={line}
              className={`fade-in text-[24px] leading-[1.35] font-medium compact:text-[17px] ${i === all.length - 1 && state.intro === "silence" ? "text-ink-soft" : ""}`}
              style={{ animationDelay: `${150 + i * 250}ms` }}
            >
              <PaperStrip className="px-4 py-1 compact:px-2">{line}</PaperStrip>
            </p>
          ))}
      </div>
      <Heading className="display fade-in absolute top-[304px] left-[64px] text-[92px] leading-[1.06] [animation-delay:450ms] compact:static compact:text-[40px]">
        <span className="block w-fit bg-paper px-4 compact:px-2">{copy.heading[0]}</span>
        <span className="block w-fit bg-paper px-4 compact:px-2">{copy.heading[1]}</span>
      </Heading>
      <div className="fade-in absolute top-[540px] left-[80px] [animation-delay:1000ms] compact:static compact:ml-2">
        <Button variant="primary" arrow onClick={commands.approach}>
          Aproximar
        </Button>
      </div>
    </Stage>
  );
}

const CLUE_MAX_SIZES = [62, 56, 50];

function clueSize(index: number, length: number) {
  return Math.min(CLUE_MAX_SIZES[index], Math.max(36, Math.floor(Math.sqrt(334000 / Math.max(length, 1)))));
}

function nameSize(name: string) {
  const widest = widestWordInEm(name);
  return Math.min(104, Math.floor(620 / widest), Math.floor(104 * Math.sqrt(16 / Math.max(name.length, 16))));
}

function Clue({ screen, commands, context, index }: PlaneProps & { index: 0 | 1 | 2 }) {
  const discovery = context.discovery;
  if (!discovery) return null;
  const hint = discovery.experience.hints[index];
  const core = sceneryFor(discovery).core;
  const last = index === 2;
  return (
    <Stage screen={screen}>
      <div className="absolute top-[84px] left-[64px] flex w-[600px] flex-col items-start gap-4 compact:static compact:w-full compact:gap-2">
        <p className="font-primary text-[15px] font-semibold tracking-[0.18em] text-iris-blue uppercase">
          <PaperStrip className="px-2 py-1">{DISCOVERY_STAGES[index]}</PaperStrip>
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
      {last && core && <CoreAnnotations research={core} />}
      <div className="fade-in absolute top-[752px] left-[64px] [animation-delay:900ms] compact:static">
        <div className="pointer-events-auto bg-paper p-3 compact:p-2">
          {last ? (
            <Button variant="primary" arrow onClick={commands.reachHumanScale}>
              Ver quem fez
            </Button>
          ) : (
            <Button variant="primary" arrow onClick={commands.nextClue}>
              Mais perto
            </Button>
          )}
        </div>
      </div>
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
  const totem = useTotem();
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
          <p className="fade-in mt-2 text-[22px] leading-[1.3] text-ink-soft [animation-delay:4300ms] compact:text-[17px]">Ela também começou como estudante.</p>
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
                      {totem ? (
                        <span>{source.label}</span>
                      ) : (
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
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
          <div className="fade-in mt-7 [animation-delay:4600ms] compact:mt-4">
            <Button variant="primary" arrow onClick={commands.continue}>
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </Stage>
  );
}

type ContributionCopy = { kicker: string; heading: string; note: string };

export function contributionCopy(kind: State["saidKind"], said: SheetPoint | undefined): ContributionCopy {
  const recall = said?.recall ?? 0;
  const reef = said?.reef ?? 0;
  const returned = said?.returned ?? 0;
  if (kind === "recall") {
    if (returned === 1) {
      return {
        kicker: "LEMBRADA SEM PISTA",
        heading: "A descoberta virou memória.",
        note: "Ela foi apresentada aqui antes. Agora alguém chegou sabendo o nome dela.",
      };
    }
    if (returned > 1) {
      return { kicker: "LEMBRADA SEM PISTA", heading: "O nome dela voltou.", note: "Ela foi apresentada aqui antes, e mais uma pessoa chegou sabendo." };
    }
    if (recall === 1) return { kicker: "LEMBRADA SEM PISTA", heading: "Ela veio à tona.", note: "Você foi a primeira pessoa a chegar sabendo este nome." };
    return { kicker: "LEMBRADA SEM PISTA", heading: "Este nome já estava no mapa.", note: "Mais uma pessoa lembrou dela. A rocha sobe." };
  }
  if (kind === "discovery") {
    if (reef === 1 && recall === 0) {
      return { kicker: "CONHECIDA NESTA FEIRA", heading: "O ponto agora tem nome.", note: "Você foi a primeira pessoa a conhecê-la aqui." };
    }
    return { kicker: "CONHECIDA NESTA FEIRA", heading: "O ponto agora tem nome.", note: "Mais uma pessoa a conhece. O recife dela cresce." };
  }
  return { kicker: "CONHECIDA NESTA FEIRA", heading: "Este nome já estava no mapa.", note: "Agora o recife dela cresce." };
}

function NameSaid({ state, screen, commands, context }: PlaneProps) {
  const said = context.points.find((p) => p.scientistId !== null && p.scientistId === state.saidId);
  const copy = contributionCopy(state.saidKind, said);
  const learned = state.saidKind === "discovery";
  const profileId = said?.featured && said.scientistId ? said.scientistId : null;
  const ready = CONTRIBUTION_TIMING.settle + CONTRIBUTION_TIMING.settleFor - 400;
  return (
    <Stage screen={screen}>
      <div className="absolute top-[84px] left-[64px] flex w-[500px] flex-col items-start gap-4 compact:static compact:w-full compact:gap-2">
        <p className="fade-in font-primary text-[15px] font-semibold tracking-[0.18em] text-iris-blue [animation-delay:1200ms]">
          <PaperStrip className="px-2 py-1">{copy.kicker}</PaperStrip>
        </p>
        <Heading className="fade-in text-[52px] leading-[1.14] font-semibold tracking-[-0.02em] [animation-delay:1400ms] compact:text-[30px]">
          <PaperStrip className="px-3 compact:px-2">{copy.heading}</PaperStrip>
        </Heading>
        <p className="fade-in text-[23px] leading-[1.45] text-ink-soft [animation-delay:3900ms] compact:text-[17px]">
          <PaperStrip className="px-3 py-0.5 compact:px-2">{copy.note}</PaperStrip>
        </p>
        {learned && (
          <p className="fade-in mt-2 text-[28px] leading-[1.3] font-medium [animation-delay:4600ms] compact:text-[19px]">
            <PaperStrip className="px-3 py-1 compact:px-2">Diga o nome dela para alguém da fila.</PaperStrip>
          </p>
        )}
      </div>
      <div
        className="fade-in absolute top-[776px] left-[76px] flex flex-wrap items-center gap-4 compact:static compact:gap-2.5 compact:pl-2"
        style={{ animationDelay: `${ready}ms` }}
      >
        {learned ? (
          <>
            <Button variant="primary" arrow onClick={commands.seeMap}>
              Ver o mapa inteiro
            </Button>
            {profileId && (
              <Button variant="outline" onClick={() => commands.openProfileOf(profileId)}>
                Ver perfil
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="primary" arrow onClick={commands.discoverAnother}>
              Conhecer outra cientista
            </Button>
            <Button variant="outline" onClick={commands.seeMap}>
              Ver o mapa inteiro
            </Button>
          </>
        )}
      </div>
      <span className="sr-only" role="status">
        {`${said?.name ?? ""} +1. ${copy.heading} ${copy.note}${learned ? " Diga o nome dela para alguém da fila." : ""}`}
      </span>
    </Stage>
  );
}

function LegendMark({ kind }: { kind: "sea" | "rock" | "reef" | "returned" | "silent" }) {
  if (kind === "sea") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 12" className="h-[18px] w-6 overflow-visible compact:h-3 compact:w-4">
        <rect x={0.5} y={0.5} width={15} height={11} rx={1.5} fill="var(--water)" />
        <g fill="none" stroke="var(--isobath-index)" strokeWidth={0.9}>
          <path d="M2 4.2 Q5 2.6 8 4.2 T14 4.2" />
          <path d="M2 7.8 Q5 6.2 8 7.8 T14 7.8" />
        </g>
      </svg>
    );
  }
  if (kind === "rock" || kind === "reef" || kind === "returned") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 12" className="h-[18px] w-6 overflow-visible compact:h-3 compact:w-4">
        <ellipse cx={8} cy={6} rx={7.5} ry={5.5} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.4} />
        {kind !== "reef" && (
          <g fill="none" stroke="var(--terrain-line-index)" strokeWidth={1}>
            <ellipse cx={8} cy={6} rx={kind === "returned" ? 3.2 : 4.6} ry={kind === "returned" ? 2.3 : 3.3} />
            <ellipse cx={8} cy={6} rx={1.4} ry={1} />
          </g>
        )}
        {kind !== "rock" && (
          <g fill="var(--accent)">
            {Array.from({ length: 12 }, (_, i) => {
              const t = (i / 12) * Math.PI * 2;
              return <circle key={i} cx={8 + 5.6 * Math.cos(t)} cy={6 + 3.9 * Math.sin(t)} r={0.85} />;
            })}
          </g>
        )}
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 10 9" className="h-[13px] w-[14px] overflow-visible opacity-60 compact:h-[9px] compact:w-[10px]">
      <path d="M5 0.8 L9.3 8.2 L0.7 8.2 Z" fill="none" stroke="var(--ink-soft)" strokeWidth={1.1} />
    </svg>
  );
}

function LegendRow({ mark, title, count, children }: { mark: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-x-3 compact:grid-cols-[20px_1fr_auto] compact:gap-x-2">
      <span className="flex justify-center">{mark}</span>
      <span className="font-primary text-[17px] font-semibold tracking-[0.1em] uppercase compact:text-[13px]">{title}</span>
      <span className="font-notation text-[24px] leading-none font-medium compact:text-[17px]">{count}</span>
      <span />
      <span className="col-span-2 text-[15px] leading-[1.3] text-ink-soft compact:text-[12px]">{children}</span>
    </div>
  );
}

function Collective({ state, screen, commands, context }: PlaneProps) {
  const [celebrate] = useState(() => state.previous !== "profile");
  const named = context.points.filter((p) => p.name !== null && presenceAt(p) > 0);
  const rocks = named.filter((p) => p.recall > 0).length;
  const reefs = named.filter((p) => p.reef > 0).length;
  const returned = named.filter((p) => p.returned > 0).length;
  const silentCount = context.points.length - named.length;
  const unnamed = unnamedCount(state.collective);
  const sampled = state.collective.answers >= SILENCE_SAMPLE_MIN;
  const said = named.find((p) => p.scientistId === state.saidId);
  const elsewhere = Object.entries(state.collective.references)
    .map(([id, n]) => ({ reference: findReference(id), n }))
    .filter((r) => r.reference?.category === "elsewhere")
    .sort((a, b) => b.n - a.n);
  const notices = [named.some((p) => p.fictional) ? "nomes fictícios" : null, context.illustrative ? "cotas ilustrativas" : null].filter(
    (n): n is string => n !== null,
  );
  return (
    <Stage screen={screen}>
      <div
        className="fade-in absolute flex flex-col border-[1.5px] border-ink bg-paper px-6 pt-5 pb-5 compact:static compact:w-full compact:px-4 compact:pt-3 compact:pb-3.5"
        style={screen.compact ? undefined : { left: CARTOUCHE.x, top: CARTOUCHE.y, width: CARTOUCHE.w }}
      >
        <p className="font-notation text-[15px] tracking-[0.08em] text-ink-soft compact:text-[12px]">FOLHA 01 · CIÊNCIA DELAS</p>
        <Heading className="mt-1.5 text-[30px] leading-[1.08] font-bold tracking-[0.03em] text-balance uppercase compact:text-[22px]">
          Mapa dos nomes ditos
        </Heading>
        <span aria-hidden="true" className="mt-4 block border-t border-ink/30 compact:mt-3" />
        <div className="mt-4 flex flex-col gap-3.5 compact:mt-2.5 compact:gap-2">
          <LegendRow mark={<LegendMark kind="sea" />} title="Mar" count={unnamed}>
            {sampled ? `de ${state.collective.answers} pessoas` : unnamed === 1 ? "pessoa" : "pessoas"}{" "}
            {unnamed === 1 && !sampled ? "não lembrou" : "não lembraram"} de nenhuma cientista brasileira
          </LegendRow>
          <LegendRow mark={<LegendMark kind="rock" />} title="Rocha" count={rocks}>
            nomes que as pessoas já traziam na memória
          </LegendRow>
          <LegendRow mark={<LegendMark kind="reef" />} title="Recife" count={reefs}>
            nomes conhecidos aqui, uma cientista de cada vez
          </LegendRow>
          {returned > 0 && (
            <LegendRow mark={<LegendMark kind="returned" />} title="Voltaram" count={returned}>
              conhecidas aqui e depois lembradas por outra pessoa
            </LegendRow>
          )}
          <LegendRow mark={<LegendMark kind="silent" />} title="Sem nome" count={silentCount}>
            pontos que ninguém nomeou ainda
          </LegendRow>
        </div>
        {elsewhere.length > 0 && (
          <>
            <span aria-hidden="true" className="mt-4 block border-t border-ink/30 compact:mt-3" />
            <p className="mt-3 font-primary text-[14px] font-semibold tracking-[0.12em] uppercase compact:text-[12px]">Fora desta folha</p>
            <p className="mt-1 text-[15px] leading-[1.35] compact:text-[12px]">
              {elsewhere
                .slice(0, 6)
                .map((r) => `${r.reference?.canonicalName}${r.n > 1 ? ` (${r.n})` : ""}`)
                .join(" · ")}
            </p>
          </>
        )}
        {notices.length > 0 && (
          <p className="mt-3 font-notation text-[13px] tracking-[0.03em] text-ink-soft compact:text-[11px]">{notices.join(" · ")}</p>
        )}
      </div>
      {said && celebrate && (
        <p className="sr-only" role="status">
          {said.name} agora tem {describeCounts(said)} no mapa coletivo.
        </p>
      )}
      <div
        className="fade-in absolute flex flex-col items-start gap-3 [animation-delay:2600ms] compact:sticky compact:-bottom-3 compact:-mx-4 compact:-mb-3 compact:flex-row compact:flex-wrap compact:self-stretch compact:border-t compact:border-ink/15 compact:bg-paper compact:px-4 compact:py-3"
        style={screen.compact ? undefined : { left: NEXT_ACTION.x, top: NEXT_ACTION.y - 76 }}
      >
        <Button variant="outline" arrow onClick={commands.discoverAnother}>
          Conhecer outra cientista
        </Button>
        <Button variant="primary" arrow onClick={commands.passTurn}>
          Passar a vez
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
          returnTo={props.state.profileReturn === "humanScale" ? "portrait" : "map"}
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
  clue1: "A pergunta",
  clue2: "O trabalho",
  clue3: "A contribuição",
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
  const sea = `${unnamedCount(state.collective)} de ${state.collective.answers} pessoas não lembraram de nenhuma cientista brasileira`;
  switch (state.step) {
    case "opening":
      return `Mapa mudo: um mar com pontos marcados por triângulos e ilhas sem nome, uma para cada cientista já nomeada aqui. No alto, o mar dos nomes não ditos: ${sea}.`;
    case "noName":
      return `Mapa mudo com o ${point} selecionado por uma mira. No alto, o mar dos nomes não ditos.`;
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
      if (state.hint >= MAX_HINT) return `Mapa mudo inteiro. O ${point} mostra o retrato e o nome de ${context.discovery?.canonicalName ?? "uma cientista"}.`;
      return `Mapa mudo inteiro. O ${point}, da cientista que você acabou de conhecer, mostra o retrato dela, ainda sem nome.`;
    case "nameSaid":
      return state.saidKind === "recall"
        ? `Aproximação à ilha de ${name}: uma nova curva de nível surge ao redor do topo e depois se integra às demais.`
        : `Aproximação a ${name}: o recife dela, conhecido nesta feira, se alarga ao redor do ponto.`;
    case "collective":
      return `Mapa dos nomes ditos: ilhas de rocha para as cientistas lembradas sem pista, mais altas a cada lembrança; ilhas de recife para as conhecidas nesta feira, mais largas a cada pessoa; no alto, o mar dos nomes não ditos.${name ? ` O contorno de ${name} aparece destacado e depois se integra ao mapa.` : ""}`;
  }
}
