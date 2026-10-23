"use client";

import { useEffect, useRef, useState } from "react";
import type { RevealDemoCopy } from "../benches.ts";
import { DemoFrame } from "../demo/DemoFrame.tsx";
import { useDemoClock } from "../demo/useDemoClock.ts";
import { INK } from "../riso/inks.ts";
import { Sfx } from "../sound.ts";
import { useMuted } from "../SoundButton.tsx";
import { FrogSvg } from "./FrogSvg.tsx";
import {
  actAt,
  calloutAt,
  CARD,
  cardAt,
  CARDS,
  checkAt,
  clamp01,
  counterAt,
  DRAWER,
  ease,
  easeOutBack,
  FROG,
  fileAt,
  lineAt,
  magnifierAt,
  pointerTarget,
  realness,
  SPECIMEN,
  stampAt,
  T,
  TAG,
  tagAt,
  TRAY,
} from "./identifyDemo.ts";

const HAND = "var(--font-caveat), cursive";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-bai-jamjuree), sans-serif";

function squiggle(x: number, y: number, w: number, seed: number) {
  let d = `M ${x} ${y}`;
  const steps = Math.round(w / 7);
  for (let i = 1; i <= steps; i++) {
    const px = x + (w * i) / steps;
    const py = y + Math.sin(i * 1.7 + seed) * 3.2 - (i % 3 === 0 ? 2.5 : 0);
    d += ` Q ${px - w / steps / 2} ${py - 4 * ((i + seed) % 2 ? 1 : -1)} ${px} ${py}`;
  }
  return d;
}

function Label({ x, y, text, opacity, anchor = "middle", color = INK.black, size = 17 }: { x: number; y: number; text: string; opacity: number; anchor?: "start" | "middle" | "end"; color?: string; size?: number }) {
  if (opacity <= 0.01) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={HAND} fontSize={size} fontWeight={600} fill={color} stroke={INK.paper} strokeWidth={4} paintOrder="stroke" opacity={opacity}>
      {text}
    </text>
  );
}

function Callout({ from, to, text, k, anchor }: { from: [number, number]; to: [number, number]; text: string; k: number; anchor: "start" | "middle" | "end" }) {
  if (k <= 0.01) return null;
  const [x1, y1] = from;
  const [x2, y2] = to;
  return (
    <g opacity={Math.min(1, k * 1.5)}>
      <circle cx={x1} cy={y1} r={3} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
      <path d={`M ${x1} ${y1} L ${x1 + (x2 - x1) * k} ${y1 + (y2 - y1) * k}`} stroke={INK.pencil} strokeWidth={1.4} fill="none" />
      <Label x={x2 + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0)} y={y2 + 5} text={text} opacity={clamp01((k - 0.6) * 2.5)} anchor={anchor} />
    </g>
  );
}

function Drawer({ label, count }: { label: string; count: number }) {
  const { x, y, w, h } = DRAWER;
  return (
    <g>
      <rect x={x - 6} y={y - 8} width={w + 12} height={h + 18} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <rect x={x - 6} y={y - 8} width={w + 12} height={h + 18} fill="url(#idm-blue)" opacity={0.35} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <rect x={x + w / 2 - 34} y={y + 10} width={68} height={18} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
      <text x={x + w / 2} y={y + 23} textAnchor="middle" fontFamily={MONO} fontSize={10} letterSpacing={1.6} fill={INK.black}>
        {label}
      </text>
      <path d={`M ${x + w / 2 - 16} ${y + 38} q 16 10 32 0`} fill="none" stroke={INK.black} strokeWidth={2.2} strokeLinecap="round" />
      {count > 0 && (
        <g transform={`translate(${x + w - 26} ${y + 18})`}>
          <circle r={13} fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />
          <text y={5} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={13} fill={INK.paper}>
            +1
          </text>
        </g>
      )}
    </g>
  );
}

function Card({ index, t, matchLabel }: { index: number; t: number; matchLabel: string }) {
  const card = CARDS[index];
  const { slide, away } = cardAt(index, t);
  const show = slide * (1 - away);
  if (show <= 0.01) return null;
  const y = DRAWER.y + (CARD.y - DRAWER.y) * show;
  const check = checkAt(index, t);
  const matched = card.match && check.mark > 0;
  return (
    <g>
      <rect x={card.x + 4} y={y + 4} width={CARD.w} height={CARD.h} fill={matched ? INK.orange : INK.black} opacity={0.85} />
      <rect x={card.x} y={y} width={CARD.w} height={CARD.h} fill="#f6f0e2" stroke={matched ? INK.orange : INK.black} strokeWidth={matched ? 2.6 : 1.4} />
      <circle cx={card.x + CARD.w / 2} cy={y + 8} r={2.4} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
      <FrogSvg look={card.look} x={card.x + CARD.w / 2 - 2} y={y + 58} size={52} />
      <path d={squiggle(card.x + 10, y + 74, CARD.w - 22, index)} fill="none" stroke={INK.pencil} strokeWidth={1.2} />
      <path d={squiggle(card.x + 10, y + 86, CARD.w - 34, index + 3)} fill="none" stroke={INK.pencil} strokeWidth={1.2} />
      {check.mark > 0 && !card.match && (
        <path
          d={`M ${card.x + 14} ${y + 16} L ${card.x + CARD.w - 14} ${y + CARD.h - 16} M ${card.x + CARD.w - 14} ${y + 16} L ${card.x + 14} ${y + CARD.h - 16}`}
          stroke={INK.pencil}
          strokeWidth={2.6}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${check.mark} 1`}
          opacity={0.85}
        />
      )}
      {matched && (
        <g transform={`translate(${card.x + CARD.w - 6} ${y + 6}) scale(${easeOutBack(check.mark)})`}>
          <circle r={13} fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />
          <path d="M -6 0 L -1.5 5 L 6.5 -5" stroke={INK.paper} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {matched && <Label x={card.x + CARD.w / 2} y={y - 10} text={matchLabel} opacity={check.mark} color={INK.orange} size={20} />}
    </g>
  );
}

export function IdentifyDemo({ copy, reducedMotion }: { copy: RevealDemoCopy; reducedMotion: boolean }) {
  const clock = useDemoClock(T.end, reducedMotion);
  const { t, now } = clock;
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const heard = useRef({ tap: false, checks: 0, stamp: false, file: false });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    if (reducedMotion) return;
    const h = heard.current;
    if (!h.tap && t >= T.tap) {
      h.tap = true;
      sfx.tick(3);
    }
    const checks = T.checks.filter((at) => t >= at).length;
    if (checks > h.checks) {
      h.checks = checks;
      if (CARDS[checks - 1].match) sfx.rescue(3);
      else sfx.tick(1);
    }
    if (!h.stamp && t >= T.stamp) {
      h.stamp = true;
      sfx.thud();
    }
    if (!h.file && t >= T.file + 0.7) {
      h.file = true;
      sfx.scratch();
    }
  }, [t, sfx, reducedMotion]);

  const replay = () => {
    sfx.unlock();
    heard.current = { tap: false, checks: 0, stamp: false, file: false };
    clock.replay();
  };

  const act = actAt(t);
  const real = realness(t);
  const lens = magnifierAt(t);
  const target = pointerTarget(t);
  const tag = tagAt(t);
  const stamp = stampAt(t);
  const file = fileAt(t);
  const tagX = TAG.x + (DRAWER.x + DRAWER.w / 2 - TAG.w * 0.2 - TAG.x) * file;
  const tagY = TAG.y + (DRAWER.y + 10 - TAG.y) * file;
  const tagScale = 1 - file * 0.6;
  const tapK = clamp01((t - T.tap) / 0.45);
  const caption = act === "closing" ? null : copy.captions[act];
  const { marks } = copy;
  const fields = [marks.species, marks.place, marks.date];
  const breathe = reducedMotion ? 0 : Math.sin(now / 420) * 0.03;
  const eye = { x: FROG.x + 0.25 * FROG.size, y: FROG.y - 0.47 * FROG.size };

  return (
    <DemoFrame label={copy.label} replayLabel={copy.replay} canReplay={t >= T.closing} onReplay={replay} caption={caption} closing={act === "closing" ? copy.closing : null}>
      <svg
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animação: no jogo, um toque anota o sapo. Na vida real, Bertha observa os olhos, as pintas e os dedos de uma perereca, compara com os exemplares da coleção do museu até achar a espécie certa e registra nome, local e data numa etiqueta, que vai para a coleção."
      >
        <defs>
          <pattern id="idm-blue" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="2" cy="2" r="1" fill={INK.blue} />
          </pattern>
          <pattern id="idm-orange" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
            <circle cx="2" cy="2" r="1.05" fill={INK.orange} />
          </pattern>
          <pattern id="idm-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke={INK.blue} strokeOpacity={0.16} strokeWidth={0.8} />
          </pattern>
          <clipPath id="idm-lens">
            <circle cx={lens.x} cy={lens.y} r={32} />
          </clipPath>
        </defs>

        {real < 1 && (
          <g opacity={1 - real}>
            <path d={`M 20 ${FROG.y + 2} C 120 ${FROG.y - 6} 200 ${FROG.y + 8} 290 ${FROG.y}`} stroke={INK.black} strokeWidth={7} strokeLinecap="round" fill="none" />
            <path d={`M 20 ${FROG.y + 2} C 120 ${FROG.y - 6} 200 ${FROG.y + 8} 290 ${FROG.y}`} stroke="#6b5a4a" strokeWidth={4} strokeLinecap="round" fill="none" />
            <path d={`M 60 ${FROG.y + 2} q -24 -30 -10 -60 q 18 26 10 60 Z M 252 ${FROG.y} q 14 -34 40 -42 q -8 30 -40 42 Z`} fill={INK.blue} stroke={INK.black} strokeWidth={1.2} />
            {t >= T.tap && tapK < 1 && <circle cx={FROG.x + 6} cy={FROG.y - 36} r={20 + tapK * 40} fill="none" stroke={INK.orange} strokeWidth={4 * (1 - tapK)} />}
          </g>
        )}

        {real > 0 && (
          <g opacity={real} transform={`translate(0 ${(1 - real) * 20})`}>
            <rect x={TRAY.x + 5} y={TRAY.y + 5} width={TRAY.w} height={TRAY.h} fill={INK.blue} opacity={0.85} />
            <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
            <rect x={TRAY.x} y={TRAY.y} width={TRAY.w} height={TRAY.h} fill="url(#idm-grid)" />
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1={FROG.x - 55 + i * 27.5} y1={TRAY.y + TRAY.h - 10} x2={FROG.x - 55 + i * 27.5} y2={TRAY.y + TRAY.h - (i % 2 ? 15 : 19)} stroke={INK.black} strokeWidth={1.1} opacity={clamp01((t - T.ruler) / 0.3)} />
            ))}
            <line x1={FROG.x - 55} y1={TRAY.y + TRAY.h - 10} x2={FROG.x + 55} y2={TRAY.y + TRAY.h - 10} stroke={INK.black} strokeWidth={1.2} opacity={clamp01((t - T.ruler) / 0.3)} />
            <Label x={FROG.x + 64} y={TRAY.y + TRAY.h - 6} text={marks.size} opacity={clamp01((t - T.ruler - 0.15) / 0.3) * (1 - clamp01((t - T.register) / 0.4))} anchor="start" size={15} />
          </g>
        )}

        <Label x={FROG.x - 70} y={FROG.y - 100} text={marks.game} opacity={1 - real} color={INK.orange} size={19} />
        <Label x={FROG.x - 70} y={FROG.y - 100} text={marks.real} opacity={real * (1 - clamp01((t - T.magnifier - 0.4) / 0.4))} size={19} />

        <FrogSvg look={SPECIMEN} x={FROG.x} y={FROG.y - 6} size={FROG.size} pose={{ stretch: 0, squash: act === "observe" && t < T.real ? breathe : 0, tilt: 0, blink: 0, throat: 0 }} />

        {lens.visible > 0 && (
          <g opacity={lens.visible}>
            <g clipPath="url(#idm-lens)">
              <circle cx={lens.x} cy={lens.y} r={32} fill={INK.paper} />
              <g transform={`translate(${lens.x} ${lens.y}) scale(1.8) translate(${-lens.x} ${-lens.y})`}>
                <FrogSvg look={SPECIMEN} x={FROG.x} y={FROG.y - 6} size={FROG.size} />
              </g>
            </g>
            <circle cx={lens.x} cy={lens.y} r={32} fill="none" stroke={INK.black} strokeWidth={3.2} />
            <path d={`M ${lens.x + 23} ${lens.y + 23} L ${lens.x + 46} ${lens.y + 46}`} stroke={INK.black} strokeWidth={7} strokeLinecap="round" />
            <path d={`M ${lens.x - 20} ${lens.y - 12} a 24 24 0 0 1 12 -12`} stroke={INK.paper} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </g>
        )}

        <Callout from={[eye.x, eye.y]} to={[eye.x + 44, eye.y - 56]} text={marks.eye} k={calloutAt(0, t)} anchor="start" />
        <Callout from={[FROG.x - 28, FROG.y - 50]} to={[FROG.x - 82, FROG.y - 96]} text={marks.skin} k={calloutAt(1, t)} anchor="end" />
        <Callout from={[FROG.x + 50, FROG.y - 8]} to={[FROG.x + 104, FROG.y - 30]} text={marks.toes} k={calloutAt(2, t)} anchor="start" />

        {target >= 0 && t < T.register && (
          <path
            d={`M ${eye.x + 8} ${eye.y - 4} Q ${(eye.x + CARDS[target].x) / 2 + 10} ${CARD.y - 40} ${CARDS[target].x + CARD.w / 2} ${CARD.y + 30}`}
            fill="none"
            stroke={INK.blue}
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeDashoffset={-now / 40}
          />
        )}

        {CARDS.map((_, i) => (
          <Card key={i} index={i} t={t} matchLabel={marks.match} />
        ))}

        <Drawer label={marks.collection} count={counterAt(t)} />

        {tag > 0.01 && file < 1 && (
          <g transform={`translate(${tagX} ${tagY}) scale(${tagScale})`} opacity={(tag < 1 ? tag : 1) * (1 - clamp01((file - 0.75) * 4))}>
            <path d={`M 6 0 H ${TAG.w} V ${TAG.h} H 6 L -14 ${TAG.h / 2} Z`} fill={INK.blue} transform="translate(5 5)" opacity={0.85} />
            <path d={`M 6 0 H ${TAG.w} V ${TAG.h} H 6 L -14 ${TAG.h / 2} Z`} fill="#f6f0e2" stroke={INK.black} strokeWidth={1.4} />
            <circle cx={4} cy={TAG.h / 2} r={4} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
            {fields.map((field, i) => {
              const k = lineAt(i, t);
              const y = 30 + i * 30;
              return (
                <g key={field}>
                  <text x={22} y={y} fontFamily={MONO} fontSize={10} letterSpacing={1.4} fill={INK.black} opacity={tag}>
                    {field.toUpperCase()}
                  </text>
                  <line x1={90} y1={y + 3} x2={TAG.w - 14} y2={y + 3} stroke={INK.black} strokeOpacity={0.35} strokeWidth={1} />
                  {k > 0 && <path d={squiggle(94, y - 2, TAG.w - 118 - i * 18, i + 1)} fill="none" stroke={INK.blue} strokeWidth={1.6} pathLength={1} strokeDasharray={`${k} 1`} />}
                </g>
              );
            })}
            {stamp > 0 && (
              <g transform={`translate(${TAG.w - 64} ${TAG.h - 22}) rotate(-8) scale(${stamp < 1 ? 1.6 - stamp * 0.6 : 1})`} opacity={stamp}>
                <rect x={-58} y={-13} width={116} height={26} fill={INK.paper} stroke={INK.orange} strokeWidth={2.6} />
                <text y={5} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={13} letterSpacing={2} fill={INK.orange}>
                  {marks.registered}
                </text>
              </g>
            )}
          </g>
        )}

        {file > 0 && file < 1 && <circle cx={DRAWER.x + DRAWER.w / 2} cy={DRAWER.y + 6} r={10 + ease(file) * 26} fill="none" stroke={INK.orange} strokeWidth={3 * (1 - file)} />}
      </svg>
    </DemoFrame>
  );
}
