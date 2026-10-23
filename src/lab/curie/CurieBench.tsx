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
import { ACTIVE_COUNT, generateStones } from "./stonePlan.ts";
import { StoneScene, type StoneOutcome, type StoneSnapshot } from "./stoneScene.ts";

type CurieBenchProps = {
  active: boolean;
  reducedMotion: boolean;
  onComplete: (record: BenchRecord) => void;
};

const KEYS: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5 };

function verdict(found: number, wrong: number) {
  if (found >= ACTIVE_COUNT && wrong === 0) return "Perfeito!";
  if (found >= ACTIVE_COUNT - 3) return "Mandou bem!";
  if (found >= ACTIVE_COUNT / 2) return "Boa!";
  return "Quase lá!";
}

function wrongText(wrong: number) {
  if (wrong === 0) return "Sem nenhum engano";
  return wrong === 1 ? "1 engano" : `${wrong} enganos`;
}

function recordOf(snapshot: StoneSnapshot): BenchRecord {
  const parts = [];
  if (snapshot.bestStreak >= 2) parts.push(`${snapshot.bestStreak} seguidas`);
  parts.push(wrongText(snapshot.wrong).toLowerCase());
  return { result: `${snapshot.found} de ${ACTIVE_COUNT} pedras que brilhavam`, detail: parts.join(" · ") };
}

function stayStill() {
  return () => {};
}

function requestedSeed() {
  const value = Number(new URLSearchParams(window.location.search).get("seed"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function StonePip({ outcome }: { outcome: StoneOutcome }) {
  const motion = outcome === "found" ? "lab-stamp" : outcome === "missed" ? "lab-shake" : "";
  return (
    <span className="relative inline-flex">
      {outcome === "found" && <span className="lab-ping absolute inset-[-30%] rounded-full border-2 border-accent" aria-hidden="true" />}
      <svg viewBox="0 0 24 20" aria-hidden="true" className={`h-[clamp(14px,2.1vmin,24px)] w-auto ${motion}`} style={{ ["--stamp-tilt" as string]: "0deg" }}>
        <path
          d="M4 14 Q2 8 7 5 Q11 2 16 4 Q22 6 21 12 Q20 17 13 17 Q6 18 4 14 Z"
          fill={outcome === "found" ? "#ee704c" : "transparent"}
          stroke={outcome === "pending" ? "rgba(41,41,41,0.35)" : "#292929"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {outcome === "missed" && <path d="M6 4 L18 17 M18 4 L6 17" stroke="#1001e3" strokeWidth="1.8" />}
      </svg>
    </span>
  );
}

function WrongMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-[clamp(14px,2vmin,22px)] w-auto ${on ? "lab-stamp" : ""}`} style={{ ["--stamp-tilt" as string]: "0deg" }}>
      <circle cx="12" cy="12" r="9" fill={on ? "#292929" : "transparent"} stroke={on ? "#292929" : "rgba(41,41,41,0.3)"} strokeWidth="1.6" />
      {on && <path d="M8 8 L16 16 M16 8 L8 16" stroke="#f7f8f6" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function Hint({ children, tone = "orange" }: { children: ReactNode; tone?: "orange" | "ink" }) {
  return (
    <p
      className={`lab-rise pointer-events-none absolute bottom-[clamp(16px,3.6vmin,44px)] left-1/2 -translate-x-1/2 border-[1.5px] border-ink bg-paper px-4 py-2 font-notation text-[clamp(13px,1.9vmin,19px)] tracking-[0.06em] whitespace-nowrap ${
        tone === "orange" ? "shadow-[4px_4px_0_0_rgba(238,112,76,1)]" : "shadow-[4px_4px_0_0_rgba(41,41,41,1)]"
      }`}
    >
      {children}
    </p>
  );
}

export function CurieBench({ active, reducedMotion, onComplete }: CurieBenchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<StoneScene | null>(null);
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const [snap, setSnap] = useState<StoneSnapshot | null>(null);
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
    const scene = new StoneScene(canvas, { fonts: readFonts(root), reducedMotion, sfx, onChange: setSnap });
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
    sceneRef.current?.start(generateStones(fixedSeed ?? freshSeed()));
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
    e.currentTarget.style.cursor = sceneRef.current?.pointerOverStone(x, y) ? "pointer" : "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!active || !(e.key in KEYS)) return;
    sceneRef.current?.tapSlot(KEYS[e.key]);
    e.preventDefault();
  };

  const outcomes: StoneOutcome[] = snap?.outcomes ?? Array.from({ length: ACTIVE_COUNT }, () => "pending");
  const found = snap?.found ?? 0;
  const wrong = snap?.wrong ?? 0;
  const hint = !active || done ? null : found === 0 && !snap?.plainUp ? "start" : snap?.crystalUp && wrong === 0 ? "crystal" : snap?.plainUp && found < 4 && wrong === 0 ? "plain" : null;

  return (
    <div ref={rootRef} data-seed={snap?.seed ?? undefined} className="graph-paper absolute inset-0 overflow-hidden select-none">
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      <div
        role="application"
        tabIndex={active ? 0 : -1}
        aria-label="Toque nas pedras que brilham. No teclado, use as teclas de 1 a 6."
        className="absolute inset-0 touch-none outline-none focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-iris-blue"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      />

      <header className="pointer-events-none absolute top-[clamp(10px,2.4vmin,30px)] left-[clamp(8px,2.4vmin,36px)] bg-paper/90 px-[clamp(8px,1.2vmin,14px)] py-[clamp(6px,1vmin,10px)]">
        <Eyebrow>Paris · 1898</Eyebrow>
        <h1 className="display mt-1 text-[clamp(28px,5vmin,60px)] leading-none text-iris-blue">Qual pedra brilha?</h1>
      </header>

      <div
        className="pointer-events-none absolute top-[clamp(14px,3.2vmin,40px)] right-[clamp(16px,3.6vmin,48px)] flex flex-col items-end gap-1.5 max-[640px]:top-[clamp(88px,12vmin,110px)]"
        aria-live="polite"
        aria-label={`${found} de ${ACTIVE_COUNT} pedras que brilhavam`}
      >
        <div className="flex max-w-[min(46vw,560px)] flex-wrap justify-end gap-[clamp(2px,0.45vmin,6px)] border-[1.5px] border-ink bg-paper/90 px-[clamp(8px,1.4vmin,14px)] py-[clamp(6px,1vmin,10px)] shadow-[4px_4px_0_0_rgba(41,41,41,0.85)]">
          {outcomes.map((o, i) => (
            <StonePip key={`${i}-${o}`} outcome={o} />
          ))}
        </div>
        <p className="bg-paper/85 px-1.5 font-notation text-[clamp(11px,1.5vmin,16px)] tracking-[0.14em]">
          ACHADAS{" "}
          <span key={found} className={`text-[1.3em] font-medium text-accent tabular-nums ${found > 0 ? "lab-bump" : ""}`}>
            {found}
          </span>
        </p>
        <div className={`flex items-center gap-2 bg-paper/85 px-1.5 py-0.5 ${wrong > 0 ? "lab-rise" : ""}`} key={wrong} aria-label={wrongText(wrong)}>
          <span className="font-notation text-[clamp(11px,1.5vmin,16px)] tracking-[0.14em]">ENGANOS</span>
          <span className="flex gap-1">
            {Array.from({ length: Math.max(3, wrong) }, (_, i) => (
              <WrongMark key={i} on={i < wrong} />
            ))}
          </span>
        </div>
      </div>

      {hint === "start" && (
        <Hint>
          Toque nas pedras que <span className="font-medium text-accent">brilham</span>
        </Hint>
      )}
      {hint === "plain" && <Hint tone="ink">Pedra apagada: deixe passar</Hint>}
      {hint === "crystal" && (
        <Hint tone="ink">
          Só vale o brilho <span className="font-medium text-accent">laranja</span>
        </Hint>
      )}

      <SoundButton />

      {done && snap && (
        <div className="absolute inset-x-0 top-[clamp(90px,17vh,220px)] z-20 flex justify-center px-4">
          <div className="lab-rise relative flex flex-col items-center gap-3 border-[1.5px] border-ink bg-paper px-[clamp(20px,4vmin,48px)] py-[clamp(16px,3vmin,32px)] text-center shadow-[8px_8px_0_0_rgba(238,112,76,1)]">
            <Stamp className="absolute -top-[clamp(26px,4vmin,40px)] text-[clamp(20px,3.2vmin,36px)]" tilt={-5}>
              {verdict(snap.found, snap.wrong)}
            </Stamp>
            <p className="display mt-3 text-[clamp(34px,6.4vmin,76px)] leading-none">
              <span className="text-accent">{snap.found}</span> de {ACTIVE_COUNT}
            </p>
            <p className="font-notation text-[clamp(13px,1.8vmin,18px)] tracking-[0.08em]">PEDRAS QUE BRILHAVAM</p>
            <p className={`text-[clamp(15px,2.1vmin,21px)] ${snap.wrong === 0 ? "font-medium text-accent" : "text-ink-soft"}`}>{wrongText(snap.wrong)}</p>
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
