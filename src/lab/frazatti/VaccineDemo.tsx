"use client";

import { useEffect, useRef, useState } from "react";
import type { RevealDemoCopy } from "../benches.ts";
import { DemoFrame } from "../demo/DemoFrame.tsx";
import { useDemoClock } from "../demo/useDemoClock.ts";
import { INK } from "../riso/inks.ts";
import { Sfx } from "../sound.ts";
import { useMuted } from "../SoundButton.tsx";
import {
  actAt,
  actOpacity,
  BODY,
  clamp01,
  clearAt,
  defendAt,
  dropIn,
  doseAt,
  ease,
  fillAt,
  invadeAt,
  invaderEnd,
  invaderStart,
  shieldAt,
  SYRINGE,
  T,
  VIAL,
  VIRUS,
  VIRUS_COUNT,
  virusIn,
  weakened,
} from "./vaccineDemo.ts";

const HAND = "var(--font-caveat), cursive";
const TONES = [INK.orange, INK.blue, INK.black, INK.pencil];

function Label({ x, y, text, opacity, anchor = "middle", color = INK.black, size = 17 }: { x: number; y: number; text: string; opacity: number; anchor?: "start" | "middle" | "end"; color?: string; size?: number }) {
  if (opacity <= 0.01) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={HAND} fontSize={size} fontWeight={600} fill={color} stroke={INK.paper} strokeWidth={4} paintOrder="stroke" opacity={opacity}>
      {text}
    </text>
  );
}

function Virus({ x, y, r, index, weak = 0, opacity = 1, wobble = 0 }: { x: number; y: number; r: number; index: number; weak?: number; opacity?: number; wobble?: number }) {
  const spikes = 12;
  const tone = TONES[index];
  const reach = r * (1.32 - weak * 0.2);
  return (
    <g transform={`translate(${x} ${y}) rotate(${wobble})`} opacity={opacity}>
      {Array.from({ length: spikes }, (_, i) => {
        const a = (i / spikes) * Math.PI * 2;
        return (
          <g key={i}>
            <line x1={Math.cos(a) * r * 0.9} y1={Math.sin(a) * r * 0.9} x2={Math.cos(a) * reach} y2={Math.sin(a) * reach} stroke={INK.black} strokeWidth={r * 0.07} strokeLinecap="round" />
            <circle cx={Math.cos(a) * reach} cy={Math.sin(a) * reach} r={r * 0.1} fill={tone} stroke={INK.black} strokeWidth={r * 0.04} />
          </g>
        );
      })}
      <circle r={r} fill={INK.paper} stroke={INK.black} strokeWidth={Math.max(1.4, r * 0.06)} strokeDasharray={weak > 0.5 ? `${r * 0.2} ${r * 0.14}` : undefined} />
      <circle r={r} fill={tone} opacity={0.34 - weak * 0.2} />
      <circle r={r * 0.5} fill={INK.paper} stroke={INK.black} strokeWidth={Math.max(1.1, r * 0.04)} />
      <text textAnchor="middle" y={r * 0.2} fontFamily="var(--font-bai-jamjuree), sans-serif" fontWeight={700} fontSize={r * 0.62} fill={INK.black}>
        {index + 1}
      </text>
    </g>
  );
}

function Viruses({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  return (
    <g>
      {VIRUS.xs.map((x, i) => {
        const k = virusIn(i, t);
        return (
          <g key={i}>
            <Virus x={x} y={VIRUS.y} r={VIRUS.r * Math.max(0.01, k)} index={i} opacity={clamp01(k * 2)} wobble={Math.sin(t * 2 + i * 1.7) * 6} />
            <Label x={x} y={VIRUS.y + VIRUS.r + 46} text={`${copy.marks.type} ${i + 1}`} opacity={ease((t - 1.6 - i * 0.12) / 0.3)} size={20} />
          </g>
        );
      })}
      <Label x={300} y={58} text={copy.marks.dengue} opacity={ease((t - 1.1) / 0.4)} size={24} color={INK.orange} />
    </g>
  );
}

function Vial({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { x, y, w, h } = VIAL;
  const neck = w * 0.34;
  const body = `M ${x - neck} ${y - h} V ${y - h * 0.82} Q ${x - w / 2} ${y - h * 0.78} ${x - w / 2} ${y - h * 0.62} V ${y - 8} Q ${x - w / 2} ${y} ${x - w / 2 + 10} ${y} H ${x + w / 2 - 10} Q ${x + w / 2} ${y} ${x + w / 2} ${y - 8} V ${y - h * 0.62} Q ${x + w / 2} ${y - h * 0.78} ${x + neck} ${y - h * 0.82} V ${y - h} Z`;
  const level = 0.18 + 0.52 * (VIRUS_COUNT === 4 ? [0, 1, 2, 3].filter((i) => dropIn(i, t) >= 1).length / 4 : 0) - fillAt(t) * 0.7;
  const liquidTop = y - h * 0.62 * Math.max(0.02, level) - 6;
  const weak = weakened(t);
  return (
    <g>
      <path d={`M ${x - w / 2 + 8} ${y + 8} H ${x + w / 2 + 8} V ${y + 14} H ${x - w / 2 + 8} Z`} fill={INK.blue} opacity={0.9} />
      <clipPath id="vd-vial">
        <path d={body} />
      </clipPath>
      <path d={body} fill={INK.paper} />
      <g clipPath="url(#vd-vial)">
        <rect x={x - w / 2} y={liquidTop} width={w} height={y - liquidTop} fill={INK.orange} opacity={0.5} />
        <rect x={x - w / 2} y={liquidTop} width={w} height={y - liquidTop} fill="url(#vd-orange)" opacity={0.8} />
      </g>
      <path d={body} fill="none" stroke={INK.black} strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={x - neck - 6} y={y - h - 14} width={neck * 2 + 12} height={16} rx={3} fill={INK.blue} stroke={INK.black} strokeWidth={1.6} />
      <rect x={x - w / 2 + 8} y={y - h * 0.5} width={w - 16} height={h * 0.26} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} opacity={ease((t - T.weaken) / 0.4)} />
      <text x={x} y={y - h * 0.5 + h * 0.18} textAnchor="middle" fontFamily="var(--font-bai-jamjuree), sans-serif" fontWeight={700} fontSize={h * 0.12} fill={INK.blue} opacity={ease((t - T.weaken) / 0.4)}>
        DV
      </text>
      {[0, 1, 2, 3].map((i) => {
        const k = dropIn(i, t);
        if (k <= 0 || k >= 1) return null;
        const sx = 110 + i * 40;
        const px = sx + (x + (i - 1.5) * 16 - sx) * ease(k);
        const py = 74 + (y - h * 0.5 + 14 - 74) * k * k;
        return <Virus key={i} x={px} y={py} r={16} index={i} weak={weak} />;
      })}
      <Label x={x} y={y + 44} text={copy.marks.weak} opacity={weak} size={19} color={INK.blue} />
    </g>
  );
}

function Syringe({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { x, y, w } = SYRINGE;
  const fill = fillAt(t);
  const dose = doseAt(t);
  const open = ease((t - T.weaken) / 0.5);
  const barrel = { x: x + 52, y: y - 20, w: w - 90, h: 40 };
  const liquid = fill * (1 - dose);
  const rod = barrel.x + barrel.w + 6 - dose * (barrel.w - 20);
  return (
    <g opacity={open}>
      <path d={`M ${barrel.x + 6} ${barrel.y + 7} H ${barrel.x + barrel.w + 6} V ${barrel.y + barrel.h + 7} H ${barrel.x + 6} Z`} fill={INK.blue} opacity={0.9} />
      <line x1={x} y1={y} x2={barrel.x} y2={y} stroke={INK.black} strokeWidth={3} strokeLinecap="round" />
      <path d={`M ${barrel.x - 10} ${y - 6} L ${barrel.x} ${y - 10} V ${y + 10} L ${barrel.x - 10} ${y + 6} Z`} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <rect x={barrel.x} y={barrel.y} width={barrel.w} height={barrel.h} fill={INK.paper} />
      <rect x={barrel.x + 3} y={barrel.y + 4} width={(barrel.w - 8) * liquid} height={barrel.h - 8} fill={INK.orange} opacity={0.8} />
      {[0.2, 0.4, 0.6, 0.8].map((k) => (
        <line key={k} x1={barrel.x + barrel.w * k} y1={barrel.y} x2={barrel.x + barrel.w * k} y2={barrel.y + 7} stroke={INK.black} strokeWidth={1.2} />
      ))}
      <rect x={barrel.x} y={barrel.y} width={barrel.w} height={barrel.h} fill="none" stroke={INK.black} strokeWidth={1.8} />
      <line x1={barrel.x + barrel.w} y1={y} x2={rod} y2={y} stroke={INK.black} strokeWidth={4} />
      <line x1={barrel.x + barrel.w} y1={barrel.y - 8} x2={barrel.x + barrel.w} y2={barrel.y + barrel.h + 8} stroke={INK.black} strokeWidth={4} strokeLinecap="round" />
      <rect x={rod - 4} y={y - 16} width={8} height={32} rx={2} fill={INK.blue} stroke={INK.black} strokeWidth={1.6} />
      <Label x={barrel.x + barrel.w / 2} y={barrel.y - 22} text={copy.marks.single} opacity={ease((t - T.dose + 0.4) / 0.4)} size={26} color={INK.orange} />
      <Label x={barrel.x + barrel.w / 2} y={barrel.y + barrel.h + 40} text={copy.marks.one} opacity={ease((t - T.fill) / 0.4)} size={19} />
    </g>
  );
}

function Antibody({ x, y, angle, scale, opacity }: { x: number; y: number; angle: number; scale: number; opacity: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} opacity={opacity}>
      <path d="M 0 12 V 0 M 0 0 L -8 -11 M 0 0 L 8 -11" stroke={INK.blue} strokeWidth={4.2} strokeLinecap="round" fill="none" />
      <path d="M 0 12 V 0 M 0 0 L -8 -11 M 0 0 L 8 -11" stroke={INK.paper} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Body({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { x, y, r } = BODY;
  const shield = shieldAt(t);
  return (
    <g>
      <circle cx={x + 8} cy={y + 8} r={r} fill={INK.blue} opacity={0.85} />
      <circle cx={x} cy={y} r={r} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={r} fill="url(#vd-orange)" opacity={0.5} />
      <circle cx={x} cy={y} r={r * 0.34} fill={INK.paper} opacity={0.8} />
      {Array.from({ length: VIRUS_COUNT }, (_, i) => {
        const a = invaderStart(i);
        const b = invaderEnd(i);
        const k = clamp01(invadeAt(i, t));
        const clear = clearAt(i, t);
        const px = a.x + (b.x - a.x) * k;
        const py = a.y + (b.y - a.y) * k;
        return (
          <g key={i}>
            <Virus x={px} y={py} r={19 * (1 - clear * 0.6)} index={i} opacity={(k > 0 ? 1 : 0) * (1 - clear)} wobble={t * 40} />
            {Array.from({ length: 3 }, (_, j) => {
              const d = defendAt(i, t);
              if (d <= 0 || clear >= 1) return null;
              const start = { x, y };
              const ang = (j - 1) * 1.1 + i;
              const tx = b.x + Math.cos(ang) * 26;
              const ty = b.y + Math.sin(ang) * 26;
              const ax = start.x + (tx - start.x) * d;
              const ay = start.y + (ty - start.y) * d;
              return <Antibody key={j} x={ax} y={ay} angle={(Math.atan2(b.y - ay, b.x - ax) * 180) / Math.PI + 90} scale={1 - clear * 0.5} opacity={1 - clear} />;
            })}
          </g>
        );
      })}
      <Label x={x - r - 8} y={y - r * 0.5} text={copy.marks.body} opacity={ease((t - T.body) / 0.4)} anchor="end" size={19} />
      <Label x={x + r + 8} y={y + r * 0.3} text={copy.marks.defence} opacity={ease((t - T.defend) / 0.4) * (1 - ease((t - T.shield) / 0.3))} anchor="start" size={19} color={INK.blue} />
      {shield > 0.01 && (
        <g transform={`translate(${x} ${y}) scale(${shield})`}>
          <path d="M 0 -42 L 34 -28 V 4 Q 34 32 0 46 Q -34 32 -34 4 V -28 Z" fill={INK.orange} stroke={INK.black} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M -15 2 L -4 14 L 17 -12" fill="none" stroke={INK.paper} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      <Label x={x} y={y + r + 28} text={copy.marks.protected} opacity={ease((t - T.shield - 0.2) / 0.4)} size={20} color={INK.orange} />
    </g>
  );
}

export function VaccineDemo({ copy, reducedMotion }: { copy: RevealDemoCopy; reducedMotion: boolean }) {
  const clock = useDemoClock(T.end, reducedMotion);
  const { t } = clock;
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const heard = useRef({ fill: false, dose: false, shield: false });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    if (reducedMotion) return;
    const h = heard.current;
    if (!h.fill && t >= T.fill) {
      h.fill = true;
      sfx.pluck(1);
    }
    if (!h.dose && t >= T.dose + 0.4) {
      h.dose = true;
      sfx.jab();
    }
    if (!h.shield && t >= T.shield) {
      h.shield = true;
      sfx.rescue(4);
    }
  }, [t, sfx, reducedMotion]);

  const replay = () => {
    sfx.unlock();
    heard.current = { fill: false, dose: false, shield: false };
    clock.replay();
  };

  const act = actAt(t);
  const caption = act === "closing" ? null : copy.captions[act];
  const virus = actOpacity("virus", t);
  const vaccine = actOpacity("vaccine", t);
  const protect = actOpacity("protect", t);

  return (
    <DemoFrame label={copy.label} replayLabel={copy.replay} canReplay={t >= T.closing} onReplay={replay} caption={caption} closing={act === "closing" ? copy.closing : null}>
      <svg
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animação: o vírus da dengue tem quatro tipos. A vacina da Neuza Frazatti coloca os quatro vírus enfraquecidos num frasco e vira uma única dose na seringa. No corpo, as defesas aparecem, cercam os quatro vírus e eles desaparecem, e um escudo mostra que a pessoa está protegida."
      >
        <defs>
          <pattern id="vd-orange" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
            <circle cx="2" cy="2" r="1.05" fill={INK.orange} />
          </pattern>
        </defs>
        {virus > 0.01 && (
          <g opacity={virus}>
            <Viruses t={t} copy={copy} />
          </g>
        )}
        {vaccine > 0.01 && (
          <g opacity={vaccine}>
            <Vial t={t} copy={copy} />
            <Syringe t={t} copy={copy} />
          </g>
        )}
        {protect > 0.01 && (
          <g opacity={protect}>
            <Body t={t} copy={copy} />
          </g>
        )}
      </svg>
    </DemoFrame>
  );
}
