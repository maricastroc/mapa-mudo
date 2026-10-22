"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/experience/ui";
import type { RevealDemoCopy } from "../benches.ts";
import { INK } from "../riso/inks.ts";
import { readMuted, Sfx, subscribeMuted } from "../sound.ts";
import { CAPSULE_BODY, CAPSULE_SHIELD, CAPSULE_WINDOW, SHIP_DECK, SHIP_HULL, SHIP_LINES } from "./sprites.ts";
import {
  ATMOSPHERE_R,
  CHECKPOINTS,
  EARTH,
  flightFraction,
  LAUNCH,
  ORBIT_R,
  ORBIT_TO,
  phaseAt,
  ROUTE,
  routeAt,
  routeUpTo,
  SPLASH,
  TIMING,
  toPath,
  TOTAL_SECONDS,
  VIEW,
  type Checkpoint,
} from "./trajectoryCheck.ts";

const AUTOPLAY_MS = 6500;
const TRAIL = Array.from({ length: 70 }, (_, i) => (i + 1) / 71);
const SCRIBBLES = [
  { at: 0.05, text: "3,2", tilt: -6, side: 1 },
  { at: 0.14, text: "×", tilt: 4, side: -1 },
  { at: 0.22, text: "160", tilt: -3, side: -1 },
  { at: 0.58, text: "÷ 2", tilt: 5, side: 1 },
  { at: 0.66, text: "7,8", tilt: -4, side: -1 },
  { at: 0.76, text: "=", tilt: 3, side: 1 },
  { at: 0.85, text: "√", tilt: -5, side: -1 },
  { at: 0.94, text: "✓", tilt: 0, side: 1 },
];
const HAND = "var(--font-caveat), cursive";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function surfaceAngle(x: number) {
  return (Math.asin((x - EARTH.cx) / EARTH.r) * 180) / Math.PI;
}

function Scribble({ x, y, seed }: { x: number; y: number; seed: number }) {
  const rows = [0, 1, 2].map((row) => {
    let d = `M${x} ${y + row * 6}`;
    const len = 22 + ((seed * 7 + row * 5) % 14);
    for (let i = 1; i <= 6; i++) d += ` q ${len / 12} ${i % 2 ? -3 : 3} ${len / 6} 0`;
    return d;
  });
  return <path d={rows.join(" ")} fill="none" stroke={INK.pencil} strokeWidth={1} strokeLinecap="round" opacity={0.75} />;
}

function CheckpointMark({ c, checkedFor, index }: { c: Checkpoint; checkedFor: number; index: number }) {
  const checked = checkedFor >= 0;
  const pop = checked ? 1 + 0.45 * Math.max(0, 1 - checkedFor / 0.18) : 1;
  const offsets: Record<Checkpoint["labelSide"], [number, number, "start" | "middle" | "end"]> = {
    above: [0, -16, "middle"],
    below: [0, 26, "middle"],
    left: [-14, 5, "end"],
    right: [14, 5, "start"],
  };
  const [dx, dy, anchor] = offsets[c.labelSide];
  const scribbleX = anchor === "end" ? c.at.x + dx - 64 : anchor === "middle" ? c.at.x - 22 : c.at.x + dx;
  return (
    <g>
      <g transform={`translate(${c.at.x} ${c.at.y}) scale(${pop})`}>
        {checked ? (
          <>
            <circle r={8.5} fill={INK.orange} stroke={INK.black} strokeWidth={1.4} />
            <path d="M-4 0.5 L-1.2 3.6 L4.4 -3.4" fill="none" stroke={INK.paper} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <circle r={8} fill={INK.paper} stroke={INK.pencil} strokeWidth={1.3} strokeDasharray="2.6 2.2" />
            <text y={4} textAnchor="middle" fontFamily={HAND} fontSize={14} fill={INK.pencil}>
              ?
            </text>
          </>
        )}
      </g>
      {checked && (
        <g opacity={clamp01(checkedFor / 0.25)}>
          <text x={c.at.x + dx} y={c.at.y + dy} textAnchor={anchor} fontFamily={HAND} fontSize={17} fontWeight={600} fill={INK.black} stroke={INK.paper} strokeWidth={4} paintOrder="stroke">
            {c.label}
          </text>
          {c.labelSide !== "above" && <Scribble x={scribbleX} y={c.at.y + dy + 8} seed={index} />}
        </g>
      )}
    </g>
  );
}

function Pencil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-38)`}>
      <path d="M0 0 L7 -3.5 L7 3.5 Z" fill="#f3d9b8" stroke={INK.black} strokeWidth={1} />
      <path d="M0 0 L2.6 -1.3 L2.6 1.3 Z" fill={INK.black} />
      <rect x={7} y={-3.5} width={30} height={7} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
      <rect x={37} y={-3.5} width={6} height={7} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
    </g>
  );
}

function Capsule({ x, y, angle, glow, flame, chute }: { x: number; y: number; angle: number; glow: number; flame: boolean; chute: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {glow > 0.02 && <circle r={9 + glow * 6} fill={INK.orange} opacity={0.35 + glow * 0.45} />}
      {chute > 0 && (
        <g transform={`rotate(${angle + 90}) scale(${0.32 + chute * 0.2})`}>
          <path d="M-22 -56 Q0 -88 22 -56 Z" fill={INK.orange} stroke={INK.black} strokeWidth={2.2} />
          <path d="M-8 -66 Q0 -88 8 -66 L8 -58 L-8 -58 Z" fill={INK.paper} />
          <path d="M-22 -56 L0 -16 M22 -56 L0 -16 M0 -60 L0 -16" stroke={INK.black} strokeWidth={1.2} />
        </g>
      )}
      <g transform={`rotate(${angle}) scale(0.44)`}>
        {flame && <path d="M2 -8 Q30 0 2 8 Z" fill={INK.orange} transform="translate(2 0)" />}
        <path d={CAPSULE_BODY} fill={INK.black} />
        <path d={CAPSULE_WINDOW} fill={INK.blue} />
        <path d={CAPSULE_SHIELD} fill={glow > 0.2 ? "#ffcf9a" : "#5a5a5a"} />
      </g>
    </g>
  );
}

const LAND = `M${LAUNCH.x - 34} ${LAUNCH.y + 12} Q${LAUNCH.x - 22} ${LAUNCH.y - 9} ${LAUNCH.x + 2} ${LAUNCH.y - 1} Q${LAUNCH.x + 14} ${LAUNCH.y + 5} ${LAUNCH.x + 8} ${LAUNCH.y + 30} L${LAUNCH.x - 30} ${LAUNCH.y + 40} Z`;

function Ship({ approach }: { approach: number }) {
  const along = 58 - approach * 24;
  const rad = Math.asin((SPLASH.x - EARTH.cx) / EARTH.r);
  const x = SPLASH.x + along * Math.cos(rad);
  const y = SPLASH.y + along * Math.sin(rad);
  return (
    <g transform={`translate(${x} ${y}) rotate(${surfaceAngle(SPLASH.x)}) scale(0.32)`}>
      <path d={SHIP_HULL} fill={INK.paper} stroke={INK.black} strokeWidth={4} strokeLinejoin="round" />
      <path d={SHIP_DECK} fill={INK.paper} stroke={INK.black} strokeWidth={3.4} strokeLinejoin="round" />
      <path d={SHIP_LINES} fill="none" stroke={INK.black} strokeWidth={3} />
      <path d="M-59 -3.4 L56 -3.4" stroke={INK.orange} strokeWidth={4} />
    </g>
  );
}

export function TrajectoryCheck({ copy, quote, reducedMotion }: { copy: RevealDemoCopy; quote?: { text: string; by: string }; reducedMotion: boolean }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [sfx] = useState(() => new Sfx());
  const muted = useSyncExternalStore(subscribeMuted, readMuted, () => false);
  const heard = useRef({ ticks: 0, splash: false });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  const elapsed = startedAt === null ? -1 : Math.max(0, now - startedAt) / 1000;
  const { phase, check, fly } = phaseAt(elapsed);
  const running = phase === "checking" || phase === "flying" || (phase === "done" && elapsed < TOTAL_SECONDS + 2.5);

  useEffect(() => {
    if (startedAt !== null) return;
    const timer = window.setTimeout(() => {
      const t = performance.now();
      setStartedAt(reducedMotion ? t - TOTAL_SECONDS * 1000 : t);
      setNow(t);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [startedAt, reducedMotion]);

  useEffect(() => {
    if (!running) return;
    let frame = requestAnimationFrame(function loop() {
      setNow(performance.now());
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (startedAt === null) return;
    const passed = CHECKPOINTS.filter((c) => check >= c.fraction).length;
    if (passed > heard.current.ticks) {
      heard.current.ticks = passed;
      sfx.tick(passed + 1);
    }
    if (fly >= 1 && !heard.current.splash) {
      heard.current.splash = true;
      sfx.splash();
    }
  }, [check, fly, startedAt, sfx]);

  const start = () => {
    sfx.unlock();
    heard.current = { ticks: 0, splash: false };
    const t = performance.now();
    setStartedAt(reducedMotion ? t - TOTAL_SECONDS * 1000 : t);
    setNow(t);
  };

  const head = routeAt(check);
  const inked = toPath(routeUpTo(check));
  const flying = phase === "flying";
  const landed = phase === "done";
  const capsuleOn = flying || landed;
  const travelled = landed ? 1 : flightFraction(fly);
  const capsule = routeAt(travelled);
  const capsuleAngle = (Math.atan2(capsule.direction.y, capsule.direction.x) * 180) / Math.PI;
  const height = Math.hypot(capsule.point.x - EARTH.cx, capsule.point.y - EARTH.cy);
  const glow = flying && travelled > ORBIT_TO ? clamp01((ATMOSPHERE_R + 4 - height) / 10) * clamp01((height - EARTH.r - 18) / 14) : 0;
  const flame = flying && travelled >= ORBIT_TO && travelled < ORBIT_TO + 0.035;
  const chute = landed ? 0 : clamp01((travelled - 0.93) / 0.04);
  const afterLanding = landed ? Math.max(0, elapsed - (TOTAL_SECONDS - TIMING.settle)) : 0;
  const bob = landed && !reducedMotion ? Math.sin(now / 420) * 0.8 : 0;
  const splashAngle = surfaceAngle(SPLASH.x);
  const zoom = reducedMotion ? 0 : ease(clamp01(afterLanding / 0.7));
  const fullH = VIEW.h - VIEW.top;
  const focusW = VIEW.w / 1.28;
  const focusH = fullH / 1.28;
  const focusX = Math.max(0, Math.min(VIEW.w - focusW, SPLASH.x - focusW * 0.62));
  const focusY = Math.max(VIEW.top, Math.min(VIEW.h - focusH, SPLASH.y - focusH * 0.68));
  const viewBox = [zoom * focusX, VIEW.top + zoom * (focusY - VIEW.top), VIEW.w + zoom * (focusW - VIEW.w), fullH + zoom * (focusH - fullH)].map((v) => v.toFixed(2)).join(" ");
  const trail = capsuleOn ? TRAIL.filter((f) => f < travelled - 0.004) : [];
  const circled = clamp01((afterLanding - 0.15) / 0.45);
  const caption = landed ? copy.closing : copy.idle;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden border-[1.5px] border-ink bg-paper shadow-[8px_8px_0_0_rgba(16,1,227,0.9)] max-[860px]:aspect-[5/3] max-[860px]:flex-none"
        onClick={phase === "idle" ? start : undefined}
      >
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label="Esquema do voo de John Glenn: do lançamento à volta ao mar, perto do navio de resgate.">
          <defs>
            <pattern id="tc-ocean" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <circle cx="2.5" cy="2.5" r="1.45" fill={INK.blue} />
            </pattern>
            <pattern id="tc-air" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <circle cx="2.5" cy="2.5" r="0.75" fill={INK.blue} />
            </pattern>
            <pattern id="tc-land" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
              <circle cx="2.5" cy="2.5" r="0.9" fill={INK.orange} />
            </pattern>
            <clipPath id="tc-frame">
              <rect y={VIEW.top} width={VIEW.w} height={VIEW.h - VIEW.top} />
            </clipPath>
          </defs>
          <g clipPath="url(#tc-frame)">
            <circle cx={EARTH.cx} cy={EARTH.cy} r={ATMOSPHERE_R} fill="url(#tc-air)" opacity={0.55} />
            <circle cx={EARTH.cx} cy={EARTH.cy} r={EARTH.r} fill={INK.paper} />
            <circle cx={EARTH.cx} cy={EARTH.cy} r={EARTH.r} fill="url(#tc-ocean)" opacity={0.85} stroke={INK.blue} strokeWidth={2} />
            <path d={LAND} fill="#f3ede1" stroke={INK.orange} strokeWidth={1.4} />
            <path d={LAND} fill="url(#tc-land)" />
            <circle cx={EARTH.cx} cy={EARTH.cy} r={ORBIT_R} fill="none" stroke={INK.black} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 6" />

            <path d={toPath(ROUTE)} fill="none" stroke={INK.pencil} strokeWidth={2} strokeDasharray="7 6" strokeLinecap="round" opacity={0.8} />
            <g opacity={1 - zoom}>
              <text x={176} y={124} fontFamily={MONO} fontSize={10.5} letterSpacing={1.6} fill={INK.pencil}>
                CONTAS DO COMPUTADOR
              </text>
              <path d="M214 128 Q222 136 224 146" fill="none" stroke={INK.pencil} strokeWidth={1} />
            </g>

            {check > 0 && (
              <>
                <path d={inked} fill="none" stroke={INK.paper} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
                <path d={inked} fill="none" stroke={INK.orange} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}

            {startedAt !== null &&
              SCRIBBLES.map((note) => {
                const age = (check - note.at) * TIMING.check + (phase === "checking" ? 0 : 9);
                if (check < note.at || age > 1.1) return null;
                const { point } = routeAt(note.at);
                const nx = point.x - EARTH.cx;
                const ny = point.y - EARTH.cy;
                const len = Math.hypot(nx, ny) || 1;
                const x = point.x + (nx / len) * 20 * note.side;
                const y = point.y + (ny / len) * 20 * note.side - age * 10;
                return (
                  <text
                    key={note.at}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fontFamily={HAND}
                    fontSize={17}
                    fontWeight={600}
                    fill={INK.pencil}
                    opacity={clamp01(age / 0.12) * (1 - clamp01((age - 0.7) / 0.4))}
                    transform={`rotate(${note.tilt} ${x} ${y})`}
                  >
                    {note.text}
                  </text>
                );
              })}

            <g transform={`translate(${SPLASH.x} ${SPLASH.y}) rotate(${splashAngle})`}>
              <ellipse rx={20} ry={6} fill={landed ? INK.orange : "rgba(247,248,246,0.7)"} fillOpacity={landed ? 0.85 : 1} stroke={landed ? INK.black : INK.pencil} strokeWidth={1.4} strokeDasharray={landed ? undefined : "3 3"} />
              {landed &&
                [0, 1, 2].map((k) => {
                  const age = ((afterLanding + k * 0.5) % 1.5) / 1.5;
                  return <ellipse key={k} rx={20 + age * 26} ry={6 + age * 8} fill="none" stroke={INK.orange} strokeWidth={1.6} opacity={1 - age} />;
                })}
              {landed && (
                <ellipse
                  rx={40}
                  ry={17}
                  fill="none"
                  stroke={INK.orange}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1.08 1"
                  strokeDashoffset={1.08 - circled * 1.08}
                  transform="rotate(-6)"
                />
              )}
            </g>
            <Ship approach={landed ? clamp01(afterLanding / 2.5) : 0} />

            <g opacity={1 - zoom * 0.7}>
              {CHECKPOINTS.filter((c) => !(landed && c.id === "splash")).map((c, i) => (
                <CheckpointMark key={c.id} c={c} index={i} checkedFor={check >= c.fraction && startedAt !== null ? (check - c.fraction) * 2.8 + (check >= 1 ? 1 : 0) : -1} />
              ))}
            </g>

            {trail.map((f) => {
              const { point } = routeAt(f);
              const fade = clamp01(1 - (travelled - f) / 0.3);
              return <circle key={f} cx={point.x} cy={point.y} r={2.3} fill={INK.black} opacity={0.15 + fade * 0.6} />;
            })}

            {phase === "checking" && check < 1 && <Pencil x={head.point.x} y={head.point.y} />}

            {capsuleOn && (
              <Capsule
                x={capsule.point.x}
                y={capsule.point.y + bob}
                angle={landed ? splashAngle - 90 : capsuleAngle}
                glow={glow}
                flame={flame}
                chute={landed ? 0 : chute}
              />
            )}

            {landed && (
              <text
                x={SPLASH.x - 46}
                y={SPLASH.y - 22}
                textAnchor="end"
                fontFamily={HAND}
                fontSize={19}
                fontWeight={600}
                fill={INK.orange}
                stroke={INK.paper}
                strokeWidth={7}
                strokeLinejoin="round"
                paintOrder="stroke"
                opacity={clamp01((afterLanding - 0.5) / 0.3)}
              >
                área de resgate
              </text>
            )}
          </g>
        </svg>

        <p className="pointer-events-none absolute top-2 left-3 bg-paper/80 font-notation text-[clamp(9px,1.1vmin,12px)] tracking-[0.12em] text-ink-soft">{copy.label}</p>

        {phase === "idle" && (
          <div className="absolute inset-x-0 top-[40%] flex justify-center">
            <Button variant="primary" arrow onClick={start} className="shadow-[5px_5px_0_0_rgba(238,112,76,1)] max-[860px]:min-h-[46px] max-[860px]:px-4 max-[860px]:text-[14px]">
              {copy.cta}
            </Button>
          </div>
        )}
        {landed && (
          <button
            type="button"
            onClick={start}
            className="absolute top-2 right-2 cursor-pointer border-[1.5px] border-ink bg-paper px-3 py-1.5 font-notation text-[clamp(11px,1.35vmin,14px)] tracking-[0.1em] uppercase hover:bg-ink hover:text-paper"
          >
            {copy.replay}
          </button>
        )}
      </div>

      <div className="mt-[2vmin] min-h-[clamp(84px,13vmin,150px)] shrink-0" aria-live="polite">
        <p key={caption} className="lab-rise text-[clamp(17px,2.5vmin,26px)] leading-[1.3]">
          {caption}
        </p>
        {landed && quote && (
          <blockquote className="lab-rise mt-[1vmin] border-l-[3px] border-iris-blue pl-3" style={{ animationDelay: "250ms" }}>
            <p className="display text-[clamp(18px,2.7vmin,30px)] leading-[1.2] text-iris-blue">“{quote.text}”</p>
            <footer className="mt-0.5 font-notation text-[clamp(11px,1.35vmin,14px)] tracking-[0.06em] text-ink-soft">{quote.by}</footer>
          </blockquote>
        )}
      </div>
    </div>
  );
}
