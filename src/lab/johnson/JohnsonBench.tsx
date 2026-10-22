"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/experience/ui";
import type { BenchRecord } from "../benches.ts";
import { Eyebrow, Stamp } from "../LabUi.tsx";
import { readFonts } from "../riso/inks.ts";
import { Grain } from "../riso/Grain.tsx";
import { readMuted, setMuted, Sfx, subscribeMuted } from "../sound.ts";
import { CAPSULE_COUNT } from "./rescuePlan.ts";
import { RescueScene, type Outcome, type RescueSnapshot } from "./rescueScene.ts";

type JohnsonBenchProps = {
  active: boolean;
  reducedMotion: boolean;
  onComplete: (record: BenchRecord) => void;
};

function verdict(rescued: number, hits: number) {
  if (rescued >= CAPSULE_COUNT && hits === 0) return "Perfeito!";
  if (rescued >= 8) return "Mandou bem!";
  if (rescued >= 5) return "Boa!";
  return "Quase lá!";
}

function hitsText(hits: number) {
  if (hits === 0) return "O navio saiu sem um arranhão";
  return hits === 1 ? "O navio levou 1 pancada" : `O navio levou ${hits} pancadas`;
}

function recordOf(snapshot: RescueSnapshot): BenchRecord {
  const parts = [];
  if (snapshot.bestStreak >= 2) parts.push(`${snapshot.bestStreak} seguidos`);
  parts.push(snapshot.damage === 0 ? "sem um arranhão" : snapshot.damage === 1 ? "1 pancada" : `${snapshot.damage} pancadas`);
  return {
    result: `${snapshot.rescued} de ${CAPSULE_COUNT} resgates`,
    detail: parts.join(" · "),
  };
}

function DamageMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-[clamp(16px,2.3vmin,26px)] w-auto ${on ? "lab-stamp" : ""}`} style={{ ["--stamp-tilt" as string]: "0deg" }}>
      <path d="M3 8 L9 3 L13 6 L20 4 L21 12 L17 15 L20 21 L11 21 L7 17 L2 19 L5 12 Z" fill={on ? "#292929" : "transparent"} stroke={on ? "#ee704c" : "rgba(41,41,41,0.3)"} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CapsulePip({ outcome }: { outcome: Outcome }) {
  const fill = outcome === "rescued" ? "#ee704c" : "transparent";
  const stroke = outcome === "pending" ? "rgba(41,41,41,0.35)" : "#292929";
  return (
    <svg viewBox="0 0 20 24" aria-hidden="true" className={`h-[clamp(18px,2.6vmin,30px)] w-auto ${outcome === "rescued" ? "lab-stamp" : ""}`} style={{ ["--stamp-tilt" as string]: "0deg" }}>
      <path d="M3 22 L6.5 8 L13.5 8 L17 22 Z M7.5 8 L7.5 4 L12.5 4 L12.5 8 M9 4 L9 1.5 L11 1.5 L11 4" fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      {outcome === "missed" && <path d="M4 4 L16 20 M16 4 L4 20" stroke="#1001e3" strokeWidth="1.8" />}
    </svg>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.8 6c3 3.3 3 8.7 0 12" />}
    </svg>
  );
}

export function JohnsonBench({ active, reducedMotion, onComplete }: JohnsonBenchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<RescueScene | null>(null);
  const [sfx] = useState(() => new Sfx());
  const muted = useSyncExternalStore(subscribeMuted, readMuted, () => false);
  const [snap, setSnap] = useState<RescueSnapshot | null>(null);
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
    const scene = new RescueScene(canvas, { fonts: readFonts(root), reducedMotion, sfx, onChange: setSnap });
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
    sceneRef.current?.start();
  }, [active, sfx]);

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

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const r = e.currentTarget.getBoundingClientRect();
    sceneRef.current?.pointer(e.clientX - r.left);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    sfx.unlock();
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!active) return;
    if (e.key === "ArrowRight") sceneRef.current?.nudge(1);
    else if (e.key === "ArrowLeft") sceneRef.current?.nudge(-1);
    else return;
    e.preventDefault();
  };

  const outcomes: Outcome[] = snap?.outcomes ?? Array.from({ length: CAPSULE_COUNT }, () => "pending");
  const rescued = snap?.rescued ?? 0;
  const damage = snap?.damage ?? 0;
  const resolved = outcomes.filter((o) => o !== "pending").length;

  return (
    <div ref={rootRef} className="graph-paper absolute inset-0 overflow-hidden select-none">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      <div
        role="application"
        tabIndex={active ? 0 : -1}
        aria-label="Mova o navio para os lados com o dedo, o mouse ou as setas do teclado"
        className="absolute inset-0 cursor-ew-resize touch-none outline-none focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-iris-blue"
        onPointerDown={onPointerDown}
        onPointerMove={move}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      />

      <header className="pointer-events-none absolute top-[clamp(10px,2.4vmin,30px)] left-[clamp(8px,2.4vmin,36px)] bg-paper/90 px-[clamp(8px,1.2vmin,14px)] py-[clamp(6px,1vmin,10px)]">
        <Eyebrow>NASA · anos 1960</Eyebrow>
        <h1 className="display mt-1 text-[clamp(28px,5vmin,60px)] leading-none text-iris-blue">Resgate no mar</h1>
      </header>

      <div
        className="pointer-events-none absolute top-[clamp(14px,3.2vmin,40px)] right-[clamp(16px,3.6vmin,48px)] flex flex-col items-end gap-1.5 max-[640px]:top-[clamp(76px,12vmin,110px)]"
        aria-live="polite"
        aria-label={`${rescued} de ${CAPSULE_COUNT} cápsulas resgatadas`}
      >
        <div className="flex gap-[clamp(3px,0.6vmin,7px)] border-[1.5px] border-ink bg-paper/90 px-[clamp(8px,1.4vmin,14px)] py-[clamp(6px,1vmin,10px)] shadow-[4px_4px_0_0_rgba(41,41,41,0.85)]">
          {outcomes.map((o, i) => (
            <CapsulePip key={`${i}-${o}`} outcome={o} />
          ))}
        </div>
        <p className="bg-paper/85 px-1.5 font-notation text-[clamp(11px,1.5vmin,16px)] tracking-[0.14em]">
          RESGATES <span className="text-[1.3em] font-medium text-accent tabular-nums">{rescued}</span>
        </p>
        <div className={`flex items-center gap-2 bg-paper/85 px-1.5 py-0.5 ${damage > 0 ? "lab-rise" : ""}`} key={damage} aria-label={hitsText(damage)}>
          <span className="font-notation text-[clamp(11px,1.5vmin,16px)] tracking-[0.14em]">PANCADAS</span>
          <span className="flex gap-1">
            {Array.from({ length: Math.max(3, damage) }, (_, i) => (
              <DamageMark key={i} on={i < damage} />
            ))}
          </span>
        </div>
      </div>

      {active && !done && resolved === 0 && (
        <p className="pointer-events-none absolute bottom-[clamp(16px,3.6vmin,44px)] left-1/2 -translate-x-1/2 border-[1.5px] border-ink bg-paper px-4 py-2 font-notation text-[clamp(13px,1.9vmin,19px)] tracking-[0.06em] whitespace-nowrap shadow-[4px_4px_0_0_rgba(238,112,76,1)]">
          Leve o navio até o <span className="font-medium text-accent">×</span>
        </p>
      )}

      {active && !done && snap?.debrisSeen === 1 && (
        <p className="lab-rise pointer-events-none absolute bottom-[clamp(16px,3.6vmin,44px)] left-1/2 -translate-x-1/2 border-[1.5px] border-ink bg-paper px-4 py-2 font-notation text-[clamp(13px,1.9vmin,19px)] tracking-[0.06em] whitespace-nowrap shadow-[4px_4px_0_0_rgba(41,41,41,1)]">
          Desvie do que cai <span className="font-medium text-accent">pegando fogo</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setMuted(!muted)}
        aria-pressed={!muted}
        aria-label={muted ? "Ligar o som" : "Desligar o som"}
        className="absolute right-[clamp(14px,3vmin,40px)] bottom-[clamp(14px,3vmin,40px)] z-10 flex size-[52px] cursor-pointer items-center justify-center border-[1.5px] border-ink bg-paper text-ink hover:bg-ink hover:text-paper"
      >
        <SoundIcon muted={muted} />
      </button>

      {done && snap && (
        <div className="absolute inset-x-0 top-[clamp(90px,17vh,220px)] z-20 flex justify-center px-4">
          <div className="lab-rise relative flex flex-col items-center gap-3 border-[1.5px] border-ink bg-paper px-[clamp(20px,4vmin,48px)] py-[clamp(16px,3vmin,32px)] text-center shadow-[8px_8px_0_0_rgba(238,112,76,1)]">
            <Stamp className="absolute -top-[clamp(26px,4vmin,40px)] bg-paper text-[clamp(20px,3.2vmin,36px)]" tilt={-5}>
              {verdict(snap.rescued, snap.damage)}
            </Stamp>
            <p className="display mt-3 text-[clamp(34px,6.4vmin,76px)] leading-none">
              <span className="text-accent">{snap.rescued}</span> de {CAPSULE_COUNT}
            </p>
            <p className="font-notation text-[clamp(13px,1.8vmin,18px)] tracking-[0.08em]">CÁPSULAS RESGATADAS</p>
            <p className={`text-[clamp(15px,2.1vmin,21px)] ${snap.damage === 0 ? "font-medium text-accent" : "text-ink-soft"}`}>{hitsText(snap.damage)}</p>
            <Button variant="primary" arrow onClick={finish} className="mt-1">
              Descobrir a cientista
            </Button>
          </div>
        </div>
      )}

      <Grain className="opacity-60" />
    </div>
  );
}
