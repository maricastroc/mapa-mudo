"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RevealDemoCopy } from "../benches.ts";
import { DemoFrame } from "../demo/DemoFrame.tsx";
import { useDemoClock } from "../demo/useDemoClock.ts";
import { INK } from "../riso/inks.ts";
import { readMuted, Sfx, subscribeMuted } from "../sound.ts";
import { CAPSULE_BODY, CAPSULE_SHIELD, CAPSULE_WINDOW, SHIP_DECK, SHIP_HULL, SHIP_LINES } from "./sprites.ts";
import {
  actAt,
  CARD,
  cardOpacity,
  capsuleAt,
  clamp01,
  curvePoints,
  DESCENT,
  ease,
  GLOBE,
  GUESSES,
  LANDING,
  orbitPath,
  ROW_COUNT,
  T,
  toPath,
  viewBoxAt,
  zoomAt,
  type Point,
} from "./trajectoryCheck.ts";

const HAND = "var(--font-caveat), cursive";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";
const BACK_ORBIT = toPath(orbitPath(Math.PI, 2 * Math.PI));
const FRONT_ORBIT = toPath(orbitPath(0, Math.PI));
const COMPUTED = toPath(curvePoints(DESCENT, 0, 1, 60));
const SEGMENTS = Array.from({ length: ROW_COUNT }, (_, i) => toPath(curvePoints(DESCENT, i / ROW_COUNT, (i + 1) / ROW_COUNT, 16)));
const LAND_NORTH = `M${GLOBE.cx - 78} ${GLOBE.cy - 52} q 20 -26 58 -22 q 30 4 34 22 q -6 16 -26 20 q -10 14 -2 30 q -16 8 -30 -6 q -18 -2 -26 -18 q -14 -6 -8 -26 Z`;
const LAND_SOUTH = `M${GLOBE.cx - 12} ${GLOBE.cy + 22} q 22 -4 30 12 q 6 22 -8 40 q -10 18 -14 34 q -10 -6 -12 -24 q -8 -20 -4 -40 q 0 -14 8 -22 Z`;

function fadeIn(t: number, at: number, length = 0.35) {
  return clamp01((t - at) / length);
}

function Capsule({ point, heading, scale, glow, flame, chute }: { point: Point; heading: Point; scale: number; glow: number; flame: boolean; chute: number }) {
  const angle = (Math.atan2(heading.y, heading.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      {glow > 0.02 && <circle r={6 + glow * 5} fill={INK.orange} opacity={0.3 + glow * 0.5} />}
      {chute > 0 && (
        <g transform={`rotate(${angle + 90}) scale(${0.18 + chute * 0.12})`}>
          <path d="M-22 -56 Q0 -88 22 -56 Z" fill={INK.orange} stroke={INK.black} strokeWidth={2.4} />
          <path d="M-8 -66 Q0 -88 8 -66 L8 -58 L-8 -58 Z" fill={INK.paper} />
          <path d="M-22 -56 L0 -16 M22 -56 L0 -16 M0 -60 L0 -16" stroke={INK.black} strokeWidth={1.4} />
        </g>
      )}
      <g transform={`rotate(${angle}) scale(${scale})`}>
        {flame && <path d="M2 -9 Q34 0 2 9 Z" fill={INK.orange} transform="translate(2 0)" />}
        <path d={CAPSULE_BODY} fill={INK.black} />
        <path d={CAPSULE_WINDOW} fill={INK.blue} />
        <path d={CAPSULE_SHIELD} fill={glow > 0.2 ? "#ffcf9a" : "#5a5a5a"} />
      </g>
    </g>
  );
}

function Ship({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-14) scale(${-scale} ${scale})`}>
      <path d={SHIP_HULL} fill={INK.paper} stroke={INK.black} strokeWidth={4} strokeLinejoin="round" />
      <path d={SHIP_DECK} fill={INK.paper} stroke={INK.black} strokeWidth={3.4} strokeLinejoin="round" />
      <path d={SHIP_LINES} fill="none" stroke={INK.black} strokeWidth={3} />
      <path d="M-59 -3.4 L56 -3.4" stroke={INK.orange} strokeWidth={5} />
    </g>
  );
}

function Check({ x, y, size, pop }: { x: number; y: number; size: number; pop: number }) {
  if (pop <= 0) return null;
  const s = size * (pop < 1 ? 0.6 + pop * 0.55 : 1);
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 10})`} opacity={clamp01(pop * 2)}>
      <circle r={9} fill={INK.orange} stroke={INK.black} strokeWidth={1.4} />
      <path d="M-4.4 0.4 L-1.3 3.8 L4.8 -3.6" fill="none" stroke={INK.paper} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function CalculationCard({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const appear = ease((t - T.computing) / 0.5);
  const leave = ease((t - T.landing) / 0.6);
  const opacity = cardOpacity(t);
  if (opacity <= 0.01) return null;
  const { x, y, w, h } = CARD;
  const mid = x + w / 2;
  const rowY = (i: number) => y + 72 + i * 32;
  const stamp = clamp01((t - T.confirmed) / 0.25);
  const pencilRow = Math.min(ROW_COUNT - 1, Math.max(0, Math.floor((t - T.verify) / 0.3)));
  const writing = t >= T.verify && t < T.verify + ROW_COUNT * 0.3 + 0.1;
  return (
    <g opacity={opacity} transform={`translate(${(1 - appear) * 30 + leave * 24} 0) rotate(-1.5 ${mid} ${y + h / 2})`}>
      <rect x={x + 6} y={y + 6} width={w} height={h} fill={INK.blue} opacity={0.9} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <line x1={mid} y1={y + 12} x2={mid} y2={y + h - 14} stroke={INK.black} strokeOpacity={0.3} strokeWidth={1} />
      <line x1={x + 12} y1={y + 46} x2={x + w - 12} y2={y + 46} stroke={INK.black} strokeOpacity={0.3} strokeWidth={1} />
      <g transform={`translate(${x + 14} ${y + 18})`}>
        <rect width={18} height={14} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
        <circle cx={5.5} cy={5.5} r={3} fill="none" stroke={INK.black} strokeWidth={1} />
        <circle cx={12.5} cy={5.5} r={3} fill="none" stroke={INK.black} strokeWidth={1} />
        <rect x={3} y={10.5} width={12} height={1.6} fill={INK.blue} />
      </g>
      <text x={x + 38} y={y + 30} fontFamily={MONO} fontSize={9.5} letterSpacing={1.2} fill={INK.black}>
        {copy.marks.computer}
      </text>
      <g transform={`translate(${mid + 14} ${y + 32}) rotate(-38)`}>
        <rect width={18} height={5} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
        <path d="M0 0 L-5 2.5 L0 5 Z" fill="#f3d9b8" stroke={INK.black} strokeWidth={0.8} />
      </g>
      <text x={mid + 34} y={y + 30} fontFamily={MONO} fontSize={9.5} letterSpacing={1.2} fill={INK.black}>
        {copy.marks.katherine}
      </text>
      {(copy.rows ?? []).map((value, i) => {
        const typed = clamp01((t - (T.computing + 0.3 + i * 0.25)) / 0.2);
        const chars = Math.round(value.length * typed);
        const written = clamp01((t - (T.verify + i * 0.3)) / 0.22);
        const ticked = clamp01((t - (T.verify + i * 0.3 + 0.2)) / 0.15);
        return (
          <g key={value}>
            <text x={mid - 14} y={rowY(i)} textAnchor="end" fontFamily={MONO} fontSize={15} fill={INK.black}>
              {value.slice(0, chars)}
            </text>
            <clipPath id={`tc-write-${i}`}>
              <rect x={mid + 6} y={rowY(i) - 22} width={(w / 2 - 34) * written} height={30} />
            </clipPath>
            <text x={mid + 14} y={rowY(i) + 1} fontFamily={HAND} fontSize={22} fontWeight={600} fill={INK.pencil} clipPath={`url(#tc-write-${i})`}>
              {value}
            </text>
            <Check x={x + w - 16} y={rowY(i) - 5} size={8} pop={ticked} />
          </g>
        );
      })}
      {writing && (
        <g transform={`translate(${mid + 18 + ((t - T.verify - pencilRow * 0.3) / 0.22) * 58} ${rowY(pencilRow) - 2}) rotate(-38)`}>
          <path d="M0 0 L7 -3.5 L7 3.5 Z" fill="#f3d9b8" stroke={INK.black} strokeWidth={1} />
          <rect x={7} y={-3.5} width={26} height={7} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
        </g>
      )}
      {stamp > 0 && (
        <g transform={`translate(${mid} ${y + h - 22}) rotate(-8) scale(${stamp < 1 ? 1.5 - stamp * 0.5 : 1})`} opacity={stamp}>
          <rect x={-62} y={-15} width={124} height={30} fill={INK.paper} stroke={INK.orange} strokeWidth={3} />
          <text y={6} textAnchor="middle" fontFamily="var(--font-bai-jamjuree), sans-serif" fontWeight={700} fontSize={17} letterSpacing={2} fill={INK.orange}>
            {copy.marks.checked}
          </text>
        </g>
      )}
    </g>
  );
}

export function TrajectoryCheck({ copy, reducedMotion }: { copy: RevealDemoCopy; reducedMotion: boolean }) {
  const clock = useDemoClock(T.end, reducedMotion);
  const { t, now } = clock;
  const [sfx] = useState(() => new Sfx());
  const muted = useSyncExternalStore(subscribeMuted, readMuted, () => false);
  const heard = useRef({ rows: 0, stamp: false, splash: false });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    if (reducedMotion) return;
    const rows = Math.max(0, Math.min(ROW_COUNT, Math.floor((t - T.verify - 0.2) / 0.3) + 1));
    if (rows > heard.current.rows) {
      heard.current.rows = rows;
      sfx.tick(rows + 1);
    }
    if (t >= T.confirmed && !heard.current.stamp) {
      heard.current.stamp = true;
      sfx.rescue(3);
    }
    if (t >= T.splash && !heard.current.splash) {
      heard.current.splash = true;
      sfx.splash();
    }
  }, [t, sfx, reducedMotion]);

  const replay = () => {
    sfx.unlock();
    heard.current = { rows: 0, stamp: false, splash: false };
    clock.replay();
  };

  const act = actAt(t);
  const zoom = zoomAt(t);
  const box = viewBoxAt(zoom);
  const dot = (box.w / 600).toFixed(3);
  const capsule = capsuleAt(t);
  const departed = t >= T.depart;
  const landed = t >= T.splash;
  const guesses = fadeIn(t, 0.7, 0.6) * (1 - fadeIn(t, T.computing, 0.6));
  const computed = clamp01((t - (T.computing + 0.3)) / 1.0);
  const confirmed = fadeIn(t, T.confirmed, 0.3);
  const afterSplash = Math.max(0, t - T.splash);
  const glow = departed && !landed ? clamp01((capsule.k - 0.25) / 0.15) * clamp01((0.7 - capsule.k) / 0.15) : 0;
  const chute = landed ? 0 : clamp01((capsule.k - 0.78) / 0.08);
  const shipApproach = ease(afterSplash / 1.6);
  const capsuleScale = 0.2 + zoom * 0.04;
  const glennLabel = 1 - fadeIn(t, T.computing - 0.4, 0.4);
  const caption = act === "closing" ? null : copy.captions[act];
  const capsuleNode = (
    <Capsule
      point={landed ? { x: LANDING.x, y: LANDING.y + Math.sin(now / 420) * 0.5 } : capsule.point}
      heading={landed ? { x: 0, y: 1 } : capsule.heading}
      scale={capsuleScale}
      glow={glow}
      flame={departed && t < T.depart + 0.35}
      chute={chute}
    />
  );

  return (
    <DemoFrame
      label={copy.label}
      replayLabel={copy.replay}
      canReplay={t >= T.closing}
      onReplay={replay}
      caption={caption}
      closing={act === "closing" ? copy.closing : null}
    >
        <svg
          viewBox={`${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.w.toFixed(2)} ${box.h.toFixed(2)}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Animação: a cápsula de John Glenn dá voltas na Terra, o computador calcula o caminho de volta, Katherine Johnson confere as contas e a cápsula cai no mar, na área prevista, perto do navio."
        >
          <defs>
            <pattern id="tc-ocean" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`rotate(15) scale(${dot})`}>
              <circle cx="2" cy="2" r="1.15" fill={INK.blue} />
            </pattern>
            <pattern id="tc-air" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`rotate(15) scale(${dot})`}>
              <circle cx="2" cy="2" r="0.6" fill={INK.blue} />
            </pattern>
            <pattern id="tc-land" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`rotate(75) scale(${dot})`}>
              <circle cx="2" cy="2" r="0.8" fill={INK.orange} />
            </pattern>
            <clipPath id="tc-globe">
              <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} />
            </clipPath>
          </defs>

          <path d={BACK_ORBIT} fill="none" stroke={INK.black} strokeOpacity={0.35 * (1 - zoom)} strokeWidth={1.2} strokeDasharray="4 5" />
          {!departed && !capsule.front && capsuleNode}

          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r + 9} fill="url(#tc-air)" opacity={0.6} />
          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill={INK.paper} />
          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="url(#tc-ocean)" opacity={0.85} />
          <g clipPath="url(#tc-globe)">
            <path d={LAND_NORTH} fill="#f3ede1" stroke={INK.orange} strokeWidth={1.2} />
            <path d={LAND_NORTH} fill="url(#tc-land)" />
            <path d={LAND_SOUTH} fill="#f3ede1" stroke={INK.orange} strokeWidth={1.2} />
            <path d={LAND_SOUTH} fill="url(#tc-land)" />
          </g>
          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="none" stroke={INK.blue} strokeWidth={1.8} />
          <path
            d={`M ${GLOBE.cx + GLOBE.r * 0.32} ${GLOBE.cy - GLOBE.r * 0.82} A ${GLOBE.r * 0.88} ${GLOBE.r * 0.88} 0 0 1 ${GLOBE.cx + GLOBE.r * 0.84} ${GLOBE.cy - GLOBE.r * 0.18}`}
            fill="none"
            stroke={INK.paper}
            strokeOpacity={0.75}
            strokeWidth={3}
            strokeLinecap="round"
          />

          <path d={FRONT_ORBIT} fill="none" stroke={INK.black} strokeOpacity={0.55 * (1 - zoom)} strokeWidth={1.4} strokeDasharray="4 5" />

          {guesses > 0.01 &&
            GUESSES.map((curve, i) => {
              const end = curve[3];
              const show = clamp01((guesses - i * 0.12) / 0.5);
              return (
                <g key={i} opacity={show}>
                  <path d={toPath(curvePoints(curve, 0, 1, 30))} fill="none" stroke={INK.paper} strokeWidth={3.6} strokeLinecap="round" />
                  <path d={toPath(curvePoints(curve, 0, 1, 30))} fill="none" stroke={INK.black} strokeWidth={1.4} strokeDasharray="3 4" strokeLinecap="round" />
                  <text x={end.x} y={end.y + 6} textAnchor="middle" fontFamily={HAND} fontSize={22} fontWeight={700} fill={INK.black} stroke={INK.paper} strokeWidth={4} paintOrder="stroke">
                    ?
                  </text>
                </g>
              );
            })}

          <g transform={`translate(${LANDING.x} ${LANDING.y + 1}) rotate(-12)`}>
            <ellipse
              rx={11}
              ry={4.5}
              fill={confirmed > 0 ? INK.orange : "rgba(247,248,246,0.8)"}
              fillOpacity={0.35 + confirmed * 0.55}
              stroke={confirmed > 0 ? INK.black : INK.pencil}
              strokeWidth={0.9}
              strokeDasharray={confirmed > 0 ? undefined : "2 2"}
              opacity={Math.max(computed > 0 ? 1 : 0, guesses)}
            />
            {landed &&
              [0, 1, 2].map((k) => {
                const age = ((afterSplash + k * 0.5) % 1.5) / 1.5;
                return <ellipse key={k} rx={11 + age * 16} ry={4.5 + age * 5} fill="none" stroke={INK.orange} strokeWidth={1} opacity={1 - age} />;
              })}
          </g>

          {computed > 0 && (
            <path
              d={computed < 1 ? toPath(curvePoints(DESCENT, 0, computed, 60)) : COMPUTED}
              fill="none"
              stroke={INK.pencil}
              strokeWidth={1.6}
              strokeDasharray="3 3"
              opacity={1 - confirmed * 0.6}
            />
          )}
          {SEGMENTS.map((d, i) => {
            const on = clamp01((t - (T.verify + i * 0.3 + 0.2)) / 0.2);
            if (on <= 0) return null;
            return <path key={i} d={d} fill="none" stroke={INK.orange} strokeWidth={2.4 + confirmed * 0.8} strokeLinecap="round" opacity={on} />;
          })}
          {departed && (
            <path
              d={toPath(curvePoints(DESCENT, 0, capsule.k, 40))}
              fill="none"
              stroke={INK.black}
              strokeWidth={1}
              strokeDasharray="1.5 2.5"
              opacity={0.7}
            />
          )}

          <Ship x={LANDING.x + 22 - shipApproach * 8} y={LANDING.y - 3 - shipApproach * 2} scale={0.085 + zoom * 0.02} />

          {!departed && capsule.front && capsuleNode}
          {departed && capsuleNode}

          {glennLabel > 0.01 && !departed && (
            <g opacity={glennLabel * (capsule.front ? 1 : 0.35)}>
              <text
                x={capsule.point.x + 10}
                y={capsule.point.y - 9}
                fontFamily={HAND}
                fontSize={15}
                fontWeight={600}
                fill={INK.black}
                stroke={INK.paper}
                strokeWidth={3.5}
                paintOrder="stroke"
              >
                {copy.marks.glenn}
              </text>
            </g>
          )}

          <g opacity={fadeIn(t, 0.2, 0.4) * (1 - zoom)}>
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={24 + k * 11} cy={252} r={3.6} fill={capsule.lap > k ? INK.orange : INK.paper} stroke={INK.black} strokeWidth={1} />
            ))}
            <text x={20} y={272} fontFamily={HAND} fontSize={15} fontWeight={600} fill={INK.pencil}>
              {copy.marks.laps}
            </text>
          </g>

          <CalculationCard t={t} copy={copy} />

          {landed && <Check x={LANDING.x - 16} y={LANDING.y - 14} size={7} pop={clamp01((afterSplash - 0.3) / 0.25)} />}
        </svg>
    </DemoFrame>
  );
}
