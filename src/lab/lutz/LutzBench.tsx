"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Button } from "../ui.tsx";
import type { BenchRecord } from "../benches.ts";
import { Eyebrow, Stamp } from "../LabUi.tsx";
import { freshSeed } from "../random.ts";
import { readFonts } from "../riso/inks.ts";
import { Grain } from "../riso/Grain.tsx";
import { Sfx } from "../sound.ts";
import { SoundButton, useMuted } from "../SoundButton.tsx";
import { CHANCES, generatePlan, SPECIES_COUNT } from "./frogPlan.ts";
import { FrogScene, type FrogSnapshot } from "./frogScene.ts";

type LutzBenchProps = {
  active: boolean;
  reducedMotion: boolean;
  onComplete: (record: BenchRecord) => void;
};

function verdict(registered: number, wrong: number) {
  if (registered >= SPECIES_COUNT && wrong === 0) return "Perfeito!";
  if (registered >= SPECIES_COUNT) return "Caderno completo!";
  if (registered >= SPECIES_COUNT - 2) return "Mandou bem!";
  if (registered >= SPECIES_COUNT / 2) return "Boa!";
  return "Quase lá!";
}

function wrongText(wrong: number) {
  if (wrong === 0) return "Sem nenhum engano";
  return wrong === 1 ? "1 engano" : `${wrong} enganos`;
}

function recordOf(snapshot: FrogSnapshot): BenchRecord {
  const parts = [];
  if (snapshot.bestStreak >= 2) parts.push(`${snapshot.bestStreak} seguidos`);
  parts.push(wrongText(snapshot.wrong).toLowerCase());
  return { result: `${snapshot.registered} de ${SPECIES_COUNT} sapos no caderno`, detail: parts.join(" · ") };
}

function stayStill() {
  return () => {};
}

function requestedSeed() {
  const value = Number(new URLSearchParams(window.location.search).get("seed"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function ChanceMark({ lost }: { lost: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-[clamp(14px,2vmin,22px)] w-auto ${lost ? "lab-shake" : ""}`}>
      <circle cx="12" cy="12" r="9" fill={lost ? "#f7f8f6" : "#ee704c"} stroke={lost ? "rgba(41,41,41,0.45)" : "#292929"} strokeWidth="1.6" />
      {lost && <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke="#292929" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function Hint({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "ink" | "blue" }) {
  const shadow = tone === "orange" ? "shadow-[4px_4px_0_0_rgba(238,112,76,1)]" : tone === "blue" ? "shadow-[4px_4px_0_0_rgba(16,1,227,1)]" : "shadow-[4px_4px_0_0_rgba(41,41,41,1)]";
  return (
    <p
      className={`lab-rise pointer-events-none absolute bottom-[clamp(10px,2.2vmin,26px)] left-1/2 max-w-[calc(100vw-120px)] -translate-x-1/2 border-[1.5px] border-ink bg-paper px-4 py-2 text-center font-notation text-[clamp(13px,1.9vmin,19px)] tracking-[0.06em] ${shadow}`}
    >
      {children}
    </p>
  );
}

export function LutzBench({ active, reducedMotion, onComplete }: LutzBenchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FrogScene | null>(null);
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const [snap, setSnap] = useState<FrogSnapshot | null>(null);
  const fixedSeed = useSyncExternalStore(stayStill, requestedSeed, () => null);
  const completeRef = useRef(onComplete);
  const finishedRef = useRef(false);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const scene = new FrogScene(canvas, { fonts: readFonts(root), reducedMotion, sfx, onChange: setSnap });
    sceneRef.current = scene;
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      scene.resize(r.width, r.height, window.devicePixelRatio || 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) scene.setFonts(readFonts(root));
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      scene.destroy();
      sceneRef.current = null;
    };
  }, [reducedMotion, sfx]);

  useEffect(() => {
    if (!active) return;
    sfx.unlock();
    sceneRef.current?.start(generatePlan(fixedSeed ?? freshSeed()));
  }, [active, sfx, fixedSeed]);

  const done = snap?.phase === "done";

  useEffect(() => {
    if (!done || !snap) return;
    const timer = window.setTimeout(() => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      completeRef.current(recordOf(snap));
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [done, snap]);

  const finish = () => {
    if (finishedRef.current || !snap) return;
    finishedRef.current = true;
    completeRef.current(recordOf(snap));
  };

  const local = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    sfx.unlock();
    const { x, y } = local(e);
    sceneRef.current?.tapAt(x, y);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!active || e.pointerType !== "mouse") return;
    const { x, y } = local(e);
    e.currentTarget.style.cursor = sceneRef.current?.pointerOverTarget(x, y) ? "pointer" : "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!active || (e.key !== "c" && e.key !== "C")) return;
    sceneRef.current?.toggleCatalog();
    e.preventDefault();
  };

  const registered = snap?.registered ?? 0;
  const wrong = snap?.wrong ?? 0;
  const playing = active && !done && !snap?.ended;
  const hint = !playing
    ? null
    : registered === 0 && wrong === 0
      ? "start"
      : snap?.lookalikeOut && wrong <= 1
        ? "lookalike"
        : snap?.seenOut && (snap?.passed ?? 0) === 0 && wrong <= 1
          ? "seen"
          : null;

  return (
    <div ref={rootRef} data-seed={snap?.seed ?? undefined} className="absolute inset-0 overflow-hidden bg-paper select-none">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      <div
        role="application"
        tabIndex={active ? 0 : -1}
        aria-label="Toque nos sapos que ainda não estão no caderno de campo. Os que já estão, deixe passar. A tecla C abre e fecha o caderno."
        className="absolute inset-0 touch-none outline-none focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-iris-blue"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      />

      <div className="pointer-events-none absolute top-[clamp(10px,2.4vmin,30px)] left-[clamp(8px,2.4vmin,36px)] flex flex-col items-start gap-[clamp(6px,1vmin,10px)] max-[640px]:right-[clamp(8px,2.4vmin,36px)]">
        <header className="self-stretch border-[1.5px] border-ink bg-paper/92 px-[clamp(8px,1.2vmin,14px)] py-[clamp(6px,1vmin,10px)]">
          <Eyebrow>Mata Atlântica · Rio de Janeiro</Eyebrow>
          <h1 className="display mt-1 text-[clamp(28px,5vmin,60px)] leading-none text-iris-blue">Já vi esse sapo!</h1>
        </header>
        <div className="flex items-center gap-[clamp(6px,1vmin,10px)] border-[1.5px] border-ink bg-paper/92 px-[clamp(8px,1.2vmin,12px)] py-[clamp(4px,0.7vmin,7px)]" aria-label={`${snap?.chances ?? CHANCES} chances`}>
          <span className="font-notation text-[clamp(11px,1.5vmin,16px)] tracking-[0.14em]">CHANCES</span>
          <span className="flex gap-1">
            {Array.from({ length: CHANCES }, (_, i) => {
              const lost = i >= (snap?.chances ?? CHANCES);
              return <ChanceMark key={`${i}-${lost}`} lost={lost} />;
            })}
          </span>
        </div>
      </div>

      <button
        type="button"
        tabIndex={active ? 0 : -1}
        aria-expanded={snap?.catalogOpen ?? false}
        onClick={() => sceneRef.current?.toggleCatalog()}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:right-2 focus-visible:z-30 focus-visible:bg-paper focus-visible:px-3 focus-visible:py-2 focus-visible:font-notation"
      >
        {snap?.catalogOpen ? "Fechar o caderno de campo" : "Abrir o caderno de campo"}
      </button>

      <p className="sr-only" aria-live="polite">
        {`${registered} de ${SPECIES_COUNT} sapos no caderno. ${snap?.chances ?? 3} chances.`}
      </p>

      {hint === "start" && (
        <Hint>
          Sapo <span className="font-medium text-accent">novo</span>? Toque para anotar no caderno
        </Hint>
      )}
      {hint === "seen" && (
        <Hint tone="blue">
          Já está no caderno? <span className="font-medium text-iris-blue">Deixe passar</span>
        </Hint>
      )}
      {hint === "lookalike" && <Hint tone="ink">Olho vivo nos detalhes: cor, pintas, listras</Hint>}

      <SoundButton />

      {done && snap && (
        <div className="absolute inset-x-0 top-[clamp(90px,24vh,300px)] z-20 flex justify-center px-4">
          <div className="lab-rise relative flex flex-col items-center gap-3 border-[1.5px] border-ink bg-paper px-[clamp(20px,4vmin,48px)] py-[clamp(16px,3vmin,32px)] text-center shadow-[8px_8px_0_0_rgba(238,112,76,1)]">
            <Stamp className="absolute -top-[clamp(26px,4vmin,40px)] text-[clamp(20px,3.2vmin,36px)] whitespace-nowrap" tilt={-5}>
              {verdict(snap.registered, snap.wrong)}
            </Stamp>
            <p className="display mt-3 text-[clamp(34px,6.4vmin,76px)] leading-none">
              <span className="text-accent">{snap.registered}</span> de {SPECIES_COUNT}
            </p>
            <p className="font-notation text-[clamp(13px,1.8vmin,18px)] tracking-[0.08em]">SAPOS NO CADERNO</p>
            <p className={`text-[clamp(15px,2.1vmin,21px)] ${snap.wrong === 0 ? "font-medium text-accent" : "text-ink-soft"}`}>
              {snap.ended === "chances" ? "Acabaram as chances" : wrongText(snap.wrong)}
            </p>
            <Button variant="primary" arrow onClick={finish} className="mt-1">
              Descobrir a cientista
            </Button>
          </div>
        </div>
      )}

      <Grain className="opacity-50" />
    </div>
  );
}
