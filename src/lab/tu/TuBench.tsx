"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "../ui.tsx";
import type { BenchRecord } from "../benches.ts";
import { Eyebrow, Stamp } from "../LabUi.tsx";
import { freshSeed } from "../random.ts";
import { readFonts } from "../riso/inks.ts";
import { Grain } from "../riso/Grain.tsx";
import { Sfx } from "../sound.ts";
import { SoundButton, useMuted } from "../SoundButton.tsx";
import type { Dir } from "./maze.ts";
import { LIVES, MazeRound } from "./mazeRound.ts";
import { MazeScene, type MazeSnapshot } from "./mazeScene.ts";

type TuBenchProps = {
  active: boolean;
  reducedMotion: boolean;
  onComplete: (record: BenchRecord) => void;
};

const KEYS: Record<string, Dir> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const SWIPE = 22;

function verdict(snap: MazeSnapshot) {
  if (snap.ended === "complete" && snap.lives === LIVES) return "Perfeito!";
  if (snap.ended === "complete") return "Corredores limpos!";
  if (snap.eaten >= snap.total * 0.8) return "Quase lá!";
  if (snap.eaten >= snap.total * 0.4) return "Boa!";
  return "Valeu a tentativa!";
}

function endLine(snap: MazeSnapshot) {
  if (snap.ended === "complete") return snap.lives === 1 ? "Sobrou 1 vida" : `Sobraram ${snap.lives} vidas`;
  if (snap.ended === "lives") return "Acabaram as vidas";
  return "O tempo acabou";
}

function recordOf(snap: MazeSnapshot): BenchRecord {
  const parts = [];
  if (snap.neutralized > 0) parts.push(snap.neutralized === 1 ? "1 parasita neutralizado" : `${snap.neutralized} parasitas neutralizados`);
  parts.push(endLine(snap).toLowerCase());
  return { result: `${snap.eaten} de ${snap.total} folhas`, detail: parts.join(" · ") };
}

function stayStill() {
  return () => {};
}

function requestedSeed() {
  const value = Number(new URLSearchParams(window.location.search).get("seed"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function LifeIcon({ lost }: { lost: boolean }) {
  return (
    <svg viewBox="0 0 24 28" aria-hidden="true" className={`h-[clamp(18px,2.6vmin,28px)] w-auto ${lost ? "opacity-30" : ""}`}>
      <rect x="2" y="12" width="6" height="8" rx="2" fill="#ee704c" stroke="#292929" strokeWidth="1.3" />
      <path d="M8 11 H16 L18 22 H6 Z" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="5" fill="#f7f8f6" stroke="#292929" strokeWidth="1.3" />
      <path d="M7 8 Q6 1.5 12.5 2 Q17 2.5 17 6 Q13 4.5 10 6 L9.5 9.5 Z" fill="#292929" />
      <path d="M10 22 L9 27 M14 22 L15 27" stroke="#292929" strokeWidth="1.6" strokeLinecap="round" />
      {lost && <path d="M3 3 L21 25 M21 3 L3 25" stroke="#292929" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function Vial({ level, warning }: { level: number; warning: boolean }) {
  return (
    <svg viewBox="0 0 20 30" aria-hidden="true" className={`h-[clamp(20px,3vmin,30px)] w-auto ${warning ? "animate-pulse" : ""}`}>
      <defs>
        <clipPath id="hud-vial">
          <rect x="3" y="8" width="14" height="20" rx="4" />
        </clipPath>
      </defs>
      <rect x="3" y="8" width="14" height="20" rx="4" fill="#f7f8f6" />
      <rect x="3" y={8 + 20 * (1 - level)} width="14" height={20 * level} fill="#ee704c" clipPath="url(#hud-vial)" />
      <rect x="3" y="8" width="14" height="20" rx="4" fill="none" stroke="#292929" strokeWidth="1.5" />
      <rect x="5" y="2" width="10" height="5" fill="#292929" />
    </svg>
  );
}

function Hud({ snap }: { snap: MazeSnapshot | null }) {
  const eaten = snap?.eaten ?? 0;
  const total = snap?.total || 99;
  const lives = snap?.lives ?? LIVES;
  const fright = snap?.fright ?? 0;
  const warning = snap?.warning ?? false;
  return (
    <div className="flex flex-col gap-[clamp(6px,1.2vmin,14px)] portrait:flex-row portrait:items-stretch portrait:gap-2" aria-live="polite">
      <div className="flex flex-1 flex-col gap-1 border-[1.5px] border-ink bg-paper/92 px-[clamp(8px,1.2vmin,14px)] py-[clamp(5px,0.9vmin,10px)] shadow-[4px_4px_0_0_rgba(41,41,41,0.85)]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-notation text-[clamp(10px,1.4vmin,15px)] tracking-[0.14em]">FOLHAS</span>
          <span className="display text-[clamp(16px,2.8vmin,30px)] leading-none tabular-nums">
            <span key={eaten} className={`inline-block text-accent ${eaten > 0 ? "lab-bump" : ""}`}>
              {eaten}
            </span>
            /{total}
          </span>
        </div>
        <div className="h-[clamp(6px,1vmin,10px)] border-[1.2px] border-ink bg-paper">
          <div className="h-full bg-iris-blue transition-[width] duration-200" style={{ width: `${(eaten / total) * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-[1.5px] border-ink bg-paper/92 px-[clamp(8px,1.2vmin,14px)] py-[clamp(5px,0.9vmin,10px)] portrait:flex-col portrait:justify-center portrait:gap-0.5">
        <span className="font-notation text-[clamp(10px,1.4vmin,15px)] tracking-[0.14em]">VIDAS</span>
        <span className="flex gap-1" aria-label={`${lives} vidas`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <span key={`${i}-${i >= lives}`} className={i >= lives ? "lab-shake" : ""}>
              <LifeIcon lost={i >= lives} />
            </span>
          ))}
        </span>
      </div>
      <div
        className={`flex items-center gap-2 border-[1.5px] px-[clamp(8px,1.2vmin,14px)] py-[clamp(5px,0.9vmin,10px)] ${fright > 0 ? "border-accent bg-[#fde3d9] shadow-[4px_4px_0_0_rgba(238,112,76,1)]" : "border-ink bg-paper/92"}`}
        aria-label={fright > 0 ? "Artemisinina ativa" : "Artemisinina: pegue um frasco"}
      >
        <Vial level={fright} warning={warning} />
        <div className="flex min-w-0 flex-1 flex-col gap-1 portrait:hidden">
          <span className="font-notation text-[clamp(10px,1.4vmin,15px)] tracking-[0.1em]">{fright > 0 ? "ARTEMISININA ATIVA" : "PEGUE UM FRASCO"}</span>
          <div className="h-[clamp(5px,0.8vmin,8px)] border-[1.2px] border-ink bg-paper">
            <div className={`h-full bg-accent ${warning ? "animate-pulse" : ""}`} style={{ width: `${fright * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const ARROWS: Record<Dir, string> = {
  up: "M12 5 L19 15 H5 Z",
  down: "M12 19 L5 9 H19 Z",
  left: "M5 12 L15 5 V19 Z",
  right: "M19 12 L9 19 V5 Z",
};

const LABELS: Record<Dir, string> = { up: "Para cima", down: "Para baixo", left: "Para a esquerda", right: "Para a direita" };

function DPad({ onSteer, pressed }: { onSteer: (dir: Dir) => void; pressed: Dir | null }) {
  const cell = (dir: Dir, area: string) => (
    <button
      key={dir}
      type="button"
      aria-label={LABELS[dir]}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSteer(dir);
      }}
      onClick={(e) => e.preventDefault()}
      className={`${area} flex touch-none items-center justify-center border-[1.5px] border-ink transition-transform select-none active:translate-x-[2px] active:translate-y-[2px] ${
        pressed === dir ? "bg-iris-blue text-paper shadow-none" : "bg-paper text-ink shadow-[4px_4px_0_0_rgba(16,1,227,0.9)]"
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[45%]">
        <path d={ARROWS[dir]} fill="currentColor" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
  return (
    <div className="grid size-[clamp(180px,min(56vw,30vh),300px)] grid-cols-3 grid-rows-3 gap-[clamp(4px,1vmin,8px)] landscape:size-[clamp(170px,22vw,260px)]" role="group" aria-label="Direcional">
      {cell("up", "col-start-2 row-start-1")}
      {cell("left", "col-start-1 row-start-2")}
      <span className="col-start-2 row-start-2 flex items-center justify-center" aria-hidden="true">
        <span className="size-[40%] rounded-full border-[1.5px] border-ink bg-accent" />
      </span>
      {cell("right", "col-start-3 row-start-2")}
      {cell("down", "col-start-2 row-start-3")}
    </div>
  );
}

export function TuBench({ active, reducedMotion, onComplete }: TuBenchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<MazeScene | null>(null);
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const [snap, setSnap] = useState<MazeSnapshot | null>(null);
  const [pressed, setPressed] = useState<Dir | null>(null);
  const fixedSeed = useSyncExternalStore(stayStill, requestedSeed, () => null);
  const completeRef = useRef(onComplete);
  const finishedRef = useRef(false);
  const swipeRef = useRef<{ id: number; x: number; y: number } | null>(null);

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
    const scene = new MazeScene(canvas, { fonts: readFonts(root), reducedMotion, sfx, onChange: setSnap });
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
    sceneRef.current?.start(new MazeRound(fixedSeed ?? freshSeed()));
  }, [active, sfx, fixedSeed]);

  const steer = (dir: Dir) => {
    if (!active) return;
    sfx.unlock();
    sceneRef.current?.steer(dir);
    setPressed(dir);
  };

  const steerRef = useRef(steer);
  useEffect(() => {
    steerRef.current = steer;
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key.toLowerCase()];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      steerRef.current(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const done = snap?.phase === "over";

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

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!active || (e.target as HTMLElement).closest("button")) return;
    sfx.unlock();
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerEnd = () => {
    swipeRef.current = null;
  };

  const playing = active && !done && !snap?.ended;

  return (
    <div
      ref={rootRef}
      data-seed={snap?.seed ?? undefined}
      className="graph-paper absolute inset-0 flex touch-none overflow-hidden overscroll-none select-none portrait:flex-col landscape:flex-row"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <aside className="relative z-10 flex shrink-0 flex-col gap-[clamp(8px,1.6vmin,18px)] p-[clamp(10px,2.4vmin,32px)] portrait:gap-2 portrait:px-3 portrait:pt-3 portrait:pb-1 landscape:w-[clamp(210px,26vw,420px)]">
        <header className="border-[1.5px] border-ink bg-paper/92 px-[clamp(8px,1.2vmin,14px)] py-[clamp(6px,1vmin,10px)] portrait:flex portrait:items-baseline portrait:justify-between portrait:gap-3">
          <Eyebrow className="portrait:hidden">Pequim · anos 1970</Eyebrow>
          <h1 className="display mt-1 text-[clamp(26px,4.6vmin,56px)] leading-[0.95] text-iris-blue portrait:mt-0 portrait:text-[clamp(22px,6.4vw,34px)]">A Cura no Labirinto</h1>
        </header>
        <Hud snap={snap} />
        <p className="hidden font-notation text-[clamp(11px,1.4vmin,14px)] leading-snug tracking-[0.06em] text-ink-soft landscape:block">
          Pegue todas as folhas. O frasco de artemisinina deixa os parasitas fracos por alguns segundos.
        </p>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
        <p className="sr-only">Labirinto. Use as setas, WASD, o direcional ou deslize o dedo para andar.</p>
        {playing && !snap?.steered && (
          <p className="lab-rise pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 border-[1.5px] border-ink bg-paper px-3 py-1.5 text-center font-notation text-[clamp(12px,1.8vmin,17px)] tracking-[0.05em] whitespace-nowrap shadow-[4px_4px_0_0_rgba(238,112,76,1)]">
            <span className="pointer-coarse:hidden">Use as setas ou WASD</span>
            <span className="hidden pointer-coarse:inline">Toque nas setas ou deslize o dedo</span>
          </p>
        )}
      </div>

      <aside className="relative z-10 flex shrink-0 items-center justify-center p-[clamp(8px,2vmin,28px)] portrait:pt-2 portrait:pb-[clamp(12px,3vh,28px)] landscape:w-[clamp(210px,26vw,420px)]">
        <div className="hidden portrait:flex pointer-coarse:flex">
          <DPad onSteer={steer} pressed={pressed} />
        </div>
        <div className="hidden flex-col items-center gap-3 landscape:pointer-fine:flex" aria-hidden="true">
          <div className="grid grid-cols-3 gap-1.5 font-notation text-[clamp(12px,1.6vmin,16px)]">
            {[
              ["", "↑", ""],
              ["←", "↓", "→"],
            ].flatMap((row, r) =>
              row.map((k, c) => (
                <span key={`${r}-${c}`} className={`flex size-[clamp(34px,4.6vmin,48px)] items-center justify-center ${k ? "border-[1.5px] border-ink bg-paper shadow-[3px_3px_0_0_rgba(16,1,227,0.9)]" : ""}`}>
                  {k}
                </span>
              )),
            )}
          </div>
          <span className="font-notation text-[clamp(11px,1.4vmin,14px)] tracking-[0.12em] text-ink-soft">SETAS OU WASD</span>
        </div>
      </aside>

      <SoundButton />

      {done && snap && (
        <div className="absolute inset-x-0 top-[clamp(90px,22vh,280px)] z-20 flex justify-center px-4">
          <div className="lab-rise relative flex flex-col items-center gap-3 border-[1.5px] border-ink bg-paper px-[clamp(20px,4vmin,48px)] py-[clamp(16px,3vmin,32px)] text-center shadow-[8px_8px_0_0_rgba(238,112,76,1)]">
            <Stamp className="absolute -top-[clamp(26px,4vmin,40px)] text-[clamp(20px,3.2vmin,36px)] whitespace-nowrap" tilt={-5}>
              {verdict(snap)}
            </Stamp>
            <p className="display mt-3 text-[clamp(34px,6.4vmin,76px)] leading-none">
              <span className="text-accent">{snap.eaten}</span> de {snap.total}
            </p>
            <p className="font-notation text-[clamp(13px,1.8vmin,18px)] tracking-[0.08em]">FOLHAS COLETADAS</p>
            <p className={`text-[clamp(15px,2.1vmin,21px)] ${snap.ended === "complete" ? "font-medium text-accent" : "text-ink-soft"}`}>{endLine(snap)}</p>
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
