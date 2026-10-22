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
  BAR_W,
  barHeight,
  CHART,
  circleAt,
  clamp01,
  ease,
  expectedLine,
  gameGlow,
  liftAt,
  METER,
  needleAt,
  onPlate,
  PLATE,
  sample,
  SAMPLES,
  T,
  TILE,
  TILES,
  tileProgress,
  type SampleKey,
} from "./measureDemo.ts";

const HAND = "var(--font-caveat), cursive";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-bai-jamjuree), sans-serif";
const ROCK = "M -20 6 Q -24 -8 -10 -14 Q 4 -20 16 -12 Q 26 -4 20 8 Q 12 16 -2 15 Q -16 16 -20 6 Z";
const CRYSTALLINE = "M -20 8 L -16 -8 L -6 -16 L 8 -14 L 20 -4 L 18 10 L 4 15 L -10 14 Z";

function dialAngle(value: number) {
  return Math.PI * (1.08 + 0.84 * Math.max(0, Math.min(1.05, value)));
}

function polar(r: number, value: number) {
  const a = dialAngle(value);
  return { x: METER.x + Math.cos(a) * r, y: METER.y + Math.sin(a) * r };
}

function arc(r: number, from: number, to: number) {
  const a = polar(r, from);
  const b = polar(r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

function Glow({ x, y, strength, now }: { x: number; y: number; strength: number; now: number }) {
  if (strength <= 0.02) return null;
  const k = (now / 900) % 1;
  return (
    <g opacity={strength}>
      <circle cx={x} cy={y} r={26} fill={INK.orange} opacity={0.18} />
      <circle cx={x} cy={y} r={34} fill="url(#md-orange)" opacity={0.75} />
      <circle cx={x} cy={y} r={22 + k * 26} fill="none" stroke={INK.orange} strokeWidth={3} opacity={1 - k} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + now / 2400;
        return <line key={i} x1={x + Math.cos(a) * 27} y1={y + Math.sin(a) * 25} x2={x + Math.cos(a) * 38} y2={y + Math.sin(a) * 35} stroke={INK.orange} strokeWidth={2.2} strokeLinecap="round" />;
      })}
    </g>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const tip = polar(METER.r * 0.88, value);
  const face = `${arc(METER.r, 0, 1)} L ${METER.x} ${METER.y} Z`;
  return (
    <g>
      <rect x={METER.x - 82} y={METER.y - 4} width={164} height={74} rx={6} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <rect x={METER.x - 82} y={METER.y + 44} width={164} height={12} fill="url(#md-orange)" opacity={0.55} />
      <path d={face} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <path d={face} fill="url(#md-orange)" opacity={Math.min(0.85, value * 0.9)} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = polar(METER.r * (i % 5 === 0 ? 0.8 : 0.88), i / 10);
        const b = polar(METER.r, i / 10);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK.black} strokeWidth={i % 5 === 0 ? 1.6 : 1} />;
      })}
      <path d={arc(METER.r * 0.93, 0.7, 1)} fill="none" stroke={INK.orange} strokeWidth={4} />
      {value > 0.5 &&
        [1.08, 1.18].map((r) => <path key={r} d={arc(METER.r * r, 0.2, 0.8)} fill="none" stroke={INK.orange} strokeWidth={2} opacity={clamp01((value - 0.5) * 2.5)} />)}
      <line x1={METER.x} y1={METER.y} x2={tip.x} y2={tip.y} stroke={INK.black} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={METER.x} cy={METER.y} r={5} fill={INK.orange} stroke={INK.black} strokeWidth={1.2} />
      <text x={METER.x} y={METER.y + 30} textAnchor="middle" fontFamily={MONO} fontSize={11} letterSpacing={2.2} fill={INK.black}>
        {label}
      </text>
      <path d={`M ${METER.x} ${METER.y + 70} L ${PLATE.x} ${PLATE.y - 8}`} stroke={INK.black} strokeWidth={1.2} strokeDasharray="2 3" />
      <ellipse cx={PLATE.x} cy={PLATE.y} rx={42} ry={9} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
    </g>
  );
}

function SampleShape({ kind }: { kind: SampleKey }) {
  if (kind === "uranium") {
    return (
      <g>
        <rect x={PLATE.x - 22} y={PLATE.y - 24} width={44} height={20} rx={4} fill="#a9a6a0" stroke={INK.black} strokeWidth={1.4} />
        <path d={`M ${PLATE.x - 16} ${PLATE.y - 18} L ${PLATE.x + 10} ${PLATE.y - 18}`} stroke={INK.paper} strokeWidth={1.5} opacity={0.8} />
      </g>
    );
  }
  if (kind === "chalcolite") {
    return (
      <g transform={`translate(${PLATE.x} ${PLATE.y - 14}) scale(1.1)`}>
        <path d={CRYSTALLINE} fill={INK.paper} stroke={INK.black} strokeWidth={1.3} />
        <path d={CRYSTALLINE} fill="url(#md-blue)" opacity={0.7} />
        <path d="M -6 -16 L -2 14 M 8 -14 L 6 15" stroke={INK.black} strokeWidth={0.8} />
      </g>
    );
  }
  return <path d={ROCK} transform={`translate(${PLATE.x} ${PLATE.y - 14}) scale(1.15)`} fill="#4b4a47" stroke={INK.black} strokeWidth={1.4} />;
}

function Tile({ index, t, now, copy }: { index: number; t: number; now: number; copy: RevealDemoCopy }) {
  const tile = TILES[index];
  const { grow, stamp } = tileProgress(index, t);
  if (grow <= 0.01) return null;
  const cx = tile.x + TILE.w / 2;
  const cy = tile.y + TILE.h / 2;
  const name = index === 0 ? copy.marks.polonium : copy.marks.radium;
  const date = index === 0 ? copy.marks.poloniumDate : copy.marks.radiumDate;
  const k = ((now / 1000 + index * 0.4) % 1.2) / 1.2;
  return (
    <g transform={`translate(${cx} ${cy}) scale(${grow}) translate(${-cx} ${-cy})`}>
      <rect x={tile.x - 8 - k * 10} y={tile.y - 8 - k * 10} width={TILE.w + 16 + k * 20} height={TILE.h + 16 + k * 20} fill="none" stroke={INK.orange} strokeWidth={2} opacity={(1 - k) * 0.9} />
      <rect x={tile.x + 6} y={tile.y + 6} width={TILE.w} height={TILE.h} fill={INK.blue} />
      <rect x={tile.x} y={tile.y} width={TILE.w} height={TILE.h} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <rect x={tile.x} y={tile.y} width={TILE.w} height={TILE.h} fill="url(#md-orange)" opacity={0.75} />
      <text x={tile.x + 10} y={tile.y + 20} fontFamily={MONO} fontSize={13} fill={INK.black}>
        {tile.number}
      </text>
      <text x={cx} y={tile.y + 72} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={46} fill={INK.black}>
        {tile.symbol}
      </text>
      <text x={cx} y={tile.y + 96} textAnchor="middle" fontFamily={HAND} fontSize={20} fontWeight={600} fill={INK.black}>
        {name}
      </text>
      <text x={cx} y={tile.y + 114} textAnchor="middle" fontFamily={MONO} fontSize={9.5} letterSpacing={0.6} fill={INK.black}>
        {date}
      </text>
      {stamp > 0 && (
        <g transform={`translate(${tile.x + TILE.w - 22} ${tile.y + 2}) rotate(10) scale(${stamp < 1 ? 1.6 - stamp * 0.6 : 1})`} opacity={stamp}>
          <rect x={-30} y={-12} width={60} height={24} fill={INK.paper} stroke={INK.orange} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={14} letterSpacing={2} fill={INK.orange}>
            {copy.marks.fresh}
          </text>
        </g>
      )}
    </g>
  );
}

function Bar({ kind, t, copy }: { kind: SampleKey; t: number; copy: RevealDemoCopy }) {
  const s = sample(kind);
  const height = barHeight(kind, t);
  const { base, scale } = CHART;
  const expected = s.expected ?? s.reading;
  const lower = Math.min(height, expected);
  const lift = kind === "pitchblende" ? liftAt(t) : 0;
  const excess = Math.max(0, height - expected);
  const line = expectedLine(kind, t);
  const circle = circleAt(kind, t);
  const excessTop = base - height * scale;
  const label = kind === "uranium" ? copy.marks.uranium : kind === "chalcolite" ? copy.marks.chalcolite : copy.marks.pitchblende;
  return (
    <g>
      {lower > 0 && (
        <g>
          <rect x={s.x} y={base - lower * scale} width={BAR_W} height={lower * scale} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
          <rect x={s.x} y={base - lower * scale} width={BAR_W} height={lower * scale} fill="url(#md-blue)" opacity={0.6} />
        </g>
      )}
      {excess > 0 && lift < 1 && (
        <g opacity={1 - lift} transform={`translate(0 ${-lift * 30})`}>
          <rect x={s.x} y={excessTop} width={BAR_W} height={excess * scale} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
          <rect x={s.x} y={excessTop} width={BAR_W} height={excess * scale} fill="url(#md-orange)" />
        </g>
      )}
      <text x={s.x + BAR_W / 2} y={base + 15} textAnchor="middle" fontFamily={HAND} fontSize={15} fontWeight={600} fill={INK.pencil} opacity={clamp01((t - s.bar) / 0.4)}>
        {label}
      </text>
      {line > 0 && (
        <line x1={s.x - 6} y1={base - expected * scale} x2={s.x - 6 + (BAR_W + 12) * line} y2={base - expected * scale} stroke={INK.black} strokeWidth={1.6} strokeDasharray="5 4" />
      )}
      {circle > 0 && lift < 1 && (
        <g opacity={1 - lift}>
          <ellipse
            cx={s.x + BAR_W / 2}
            cy={excessTop + (excess * scale) / 2}
            rx={BAR_W / 2 + 11}
            ry={(excess * scale) / 2 + 10}
            fill="none"
            stroke={INK.pencil}
            strokeWidth={2.2}
            pathLength={1}
            strokeDasharray={`${circle * 1.05} 2`}
            transform={`rotate(-4 ${s.x + BAR_W / 2} ${excessTop + (excess * scale) / 2})`}
          />
          <text
            x={s.x + BAR_W / 2}
            y={excessTop - 16}
            textAnchor="middle"
            fontFamily={HAND}
            fontSize={kind === "pitchblende" ? 21 : 26}
            fontWeight={700}
            fill={kind === "pitchblende" ? INK.orange : INK.pencil}
            stroke={INK.paper}
            strokeWidth={4}
            paintOrder="stroke"
            opacity={clamp01((circle - 0.5) * 2)}
          >
            {kind === "pitchblende" ? copy.marks.extra : "?"}
          </text>
        </g>
      )}
    </g>
  );
}

export function MeasureDemo({ copy, reducedMotion }: { copy: RevealDemoCopy; reducedMotion: boolean }) {
  const clock = useDemoClock(T.end, reducedMotion);
  const { t, now } = clock;
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const heard = useRef({ readings: 0, stamps: 0 });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    if (reducedMotion) return;
    const readings = SAMPLES.filter((s) => t >= s.read + 0.4).length;
    if (readings > heard.current.readings) {
      heard.current.readings = readings;
      sfx.tick(2 + readings * 2);
    }
    const stamps = TILES.filter((_, i) => tileProgress(i, t).stamp > 0).length;
    if (stamps > heard.current.stamps) {
      heard.current.stamps = stamps;
      sfx.rescue(stamps + 2);
    }
  }, [t, sfx, reducedMotion]);

  const replay = () => {
    sfx.unlock();
    heard.current = { readings: 0, stamps: 0 };
    clock.replay();
  };

  const act = actAt(t);
  const needle = needleAt(t);
  const plate = onPlate(t);
  const glow = gameGlow(t);
  const lift = liftAt(t);
  const fade = 1 - 0.8 * ease((t - T.tiles) / 0.6);
  const pitch = sample("pitchblende");
  const excessTop = CHART.base - pitch.reading * CHART.scale;
  const excessHeight = (pitch.reading - (pitch.expected ?? 0)) * CHART.scale;
  const from = { x: pitch.x + BAR_W / 2, y: excessTop + excessHeight / 2 };
  const target = { x: (TILES[0].x + TILES[1].x + TILE.w) / 2, y: TILES[0].y + TILE.h / 2 };
  const fly = { x: from.x + (target.x - from.x) * lift, y: from.y + (target.y - from.y) * lift };
  const pulse = clamp01((t - T.gameGlowFade) / 0.5);
  const legend = expectedLine("chalcolite", t);
  const caption = act === "closing" ? null : copy.captions[act];

  return (
    <DemoFrame label={copy.label} replayLabel={copy.replay} canReplay={t >= T.closing} onReplay={replay} caption={caption} closing={act === "closing" ? copy.closing : null}>
      <svg
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animação: no jogo a pedra brilha, mas na vida real ela não brilha; um aparelho mede a radiação de vários minerais. A calcolita e a pechblenda marcam mais do que o urânio dentro delas explicaria, e da pechblenda saem dois elementos novos, o polônio e o rádio."
      >
        <defs>
          <pattern id="md-orange" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
            <circle cx="2" cy="2" r="1.05" fill={INK.orange} />
          </pattern>
          <pattern id="md-blue" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="2" cy="2" r="1" fill={INK.blue} />
          </pattern>
          <pattern id="md-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke={INK.blue} strokeOpacity={0.14} strokeWidth={0.8} />
          </pattern>
        </defs>

        <g opacity={fade}>
          <Meter value={needle} label={copy.marks.meter} />

          {pulse > 0 && pulse < 1 && (
            <circle cx={PLATE.x} cy={PLATE.y - 8 - (PLATE.y - 8 - (METER.y + 70)) * pulse} r={5} fill={INK.orange} stroke={INK.black} strokeWidth={1.2} />
          )}

          {plate && (
            <g transform={`translate(${plate.x} 0)`}>
              {plate.sample.key === "uranium" && <Glow x={PLATE.x} y={PLATE.y - 14} strength={glow} now={now} />}
              <SampleShape kind={plate.sample.key} />
              <text x={PLATE.x} y={PLATE.y + 26} textAnchor="middle" fontFamily={HAND} fontSize={17} fontWeight={600} fill={INK.pencil}>
                {plate.sample.key === "uranium" ? copy.marks.uranium : plate.sample.key === "chalcolite" ? copy.marks.chalcolite : copy.marks.pitchblende}
              </text>
            </g>
          )}

          {act === "real" && (
            <g>
              <text
                x={PLATE.x + 52}
                y={PLATE.y - 40}
                fontFamily={HAND}
                fontSize={18}
                fontWeight={700}
                fill={INK.orange}
                stroke={INK.paper}
                strokeWidth={4}
                paintOrder="stroke"
                opacity={glow}
              >
                {copy.marks.game}
              </text>
              <text
                x={PLATE.x + 52}
                y={PLATE.y - 40}
                fontFamily={HAND}
                fontSize={18}
                fontWeight={700}
                fill={INK.black}
                stroke={INK.paper}
                strokeWidth={4}
                paintOrder="stroke"
                opacity={1 - glow}
              >
                {copy.marks.real}
              </text>
              <path d={`M ${PLATE.x + 50} ${PLATE.y - 46} Q ${PLATE.x + 36} ${PLATE.y - 44} ${PLATE.x + 26} ${PLATE.y - 30}`} fill="none" stroke={INK.pencil} strokeWidth={1.4} />
            </g>
          )}

          <rect x={CHART.x + 6} y={CHART.y + 6} width={CHART.w} height={CHART.h} fill={INK.blue} opacity={0.9} />
          <rect x={CHART.x} y={CHART.y} width={CHART.w} height={CHART.h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
          <rect x={CHART.x} y={CHART.y} width={CHART.w} height={CHART.h} fill="url(#md-grid)" />
          <line x1={CHART.x + 12} y1={CHART.base} x2={CHART.x + CHART.w - 12} y2={CHART.base} stroke={INK.black} strokeWidth={1.4} />
          {legend > 0 && (
            <g opacity={legend}>
              <line x1={CHART.x + 12} y1={CHART.y + 18} x2={CHART.x + 34} y2={CHART.y + 18} stroke={INK.black} strokeWidth={1.6} strokeDasharray="5 4" />
              <text x={CHART.x + 40} y={CHART.y + 22} fontFamily={HAND} fontSize={14} fontWeight={600} fill={INK.black}>
                {copy.marks.expected}
              </text>
            </g>
          )}
          {SAMPLES.map((s) => (
            <Bar key={s.key} kind={s.key} t={t} copy={copy} />
          ))}
        </g>

        {lift > 0 && lift < 1 && (
          <g transform={`translate(${fly.x} ${fly.y}) scale(${1 - lift * 0.4})`}>
            <rect x={-BAR_W / 2} y={-excessHeight / 2} width={BAR_W} height={excessHeight} fill="url(#md-orange)" stroke={INK.black} strokeWidth={1.4} />
          </g>
        )}

        <Tile index={0} t={t} now={now} copy={copy} />
        <Tile index={1} t={t} now={now} copy={copy} />

        {t >= T.couple && (
          <text
            x={target.x}
            y={TILES[0].y + TILE.h + 30}
            textAnchor="middle"
            fontFamily={HAND}
            fontSize={20}
            fontWeight={700}
            fill={INK.black}
            stroke={INK.paper}
            strokeWidth={5}
            paintOrder="stroke"
            opacity={clamp01((t - T.couple) / 0.4)}
          >
            {copy.marks.couple}
          </text>
        )}
      </svg>
    </DemoFrame>
  );
}
