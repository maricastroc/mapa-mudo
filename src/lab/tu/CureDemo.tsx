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
  attackAt,
  BOOK,
  CELL,
  chillAt,
  clamp01,
  DROPS,
  dropAt,
  ease,
  FLASK,
  lensAt,
  MOLECULE,
  moleculeAt,
  morphAt,
  parasiteAt,
  PLANT,
  sinkAt,
  T,
  VIAL,
  vialLevel,
} from "./cureDemo.ts";

const HAND = "var(--font-caveat), cursive";
const MONO = "var(--font-dm-mono), ui-monospace, monospace";
const DISPLAY = "var(--font-bai-jamjuree), sans-serif";

function Label({ x, y, text, opacity, anchor = "middle", color = INK.black, size = 17, rotate = 0 }: { x: number; y: number; text: string; opacity: number; anchor?: "start" | "middle" | "end"; color?: string; size?: number; rotate?: number }) {
  if (opacity <= 0.01) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={HAND}
      fontSize={size}
      fontWeight={600}
      fill={color}
      stroke={INK.paper}
      strokeWidth={4}
      paintOrder="stroke"
      opacity={opacity}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {text}
    </text>
  );
}

function Sprig({ x, y, scale, flowers = true }: { x: number; y: number; scale: number; flowers?: boolean }) {
  const branches = [
    { y: -40, dir: -1, len: 34 },
    { y: -62, dir: 1, len: 30 },
    { y: -86, dir: -1, len: 26 },
    { y: -106, dir: 1, len: 22 },
    { y: -124, dir: -1, len: 16 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M 0 0 C 2 -40 -3 -90 1 -140" stroke={INK.black} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {branches.map((b, i) => (
        <g key={i}>
          <path d={`M 0 ${b.y} q ${b.dir * b.len * 0.5} -6 ${b.dir * b.len} -18`} stroke={INK.black} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {[0.3, 0.55, 0.8, 1].map((k) => (
            <g key={k}>
              <ellipse cx={b.dir * b.len * k} cy={b.y - 18 * k * k - 4} rx={5.5} ry={2.2} fill={INK.blue} transform={`rotate(${b.dir * -50} ${b.dir * b.len * k} ${b.y - 18 * k * k - 4})`} />
              <ellipse cx={b.dir * b.len * k} cy={b.y - 18 * k * k + 3} rx={5} ry={2} fill={INK.blue} transform={`rotate(${b.dir * 40} ${b.dir * b.len * k} ${b.y - 18 * k * k + 3})`} />
            </g>
          ))}
          {flowers && <circle cx={b.dir * b.len} cy={b.y - 22} r={3.4} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} />}
        </g>
      ))}
      {flowers && <circle cx={1} cy={-143} r={4} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} />}
    </g>
  );
}

const STROKES = ["M -5 -4 h 10", "M -5 0 h 10", "M -4 4 h 8", "M 0 -6 v 12", "M -3 -6 v 8", "M 3 -5 v 10", "M -5 5 l 4 -4", "M 5 5 l -4 -4", "M -4 -6 l 3 3", "M 1 -2 l 4 6", "M -5 -1 q 5 -3 10 0", "M -2 2 h 6 v 4"];

function glyph(cx: number, cy: number, seed: number) {
  const picks = [seed * 7, seed * 13 + 3, seed * 5 + 1, seed * 11 + 6].map((n) => STROKES[n % STROKES.length]);
  const count = 3 + (seed % 2);
  return picks
    .slice(0, count)
    .map((d) => d.replace(/^M (-?\d+) (-?\d+)/, (_, px, py) => `M ${cx + Number(px)} ${cy + Number(py)}`))
    .join(" ");
}

function Book({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const open = ease((t - T.book) / 0.5);
  if (open <= 0.01) return null;
  const { x, y, w, h } = BOOK;
  const cols = 7;
  return (
    <g opacity={open} transform={`translate(0 ${(1 - open) * 16})`}>
      <path d={`M ${x + 6} ${y + 8} H ${x + w + 6} V ${y + h + 8} H ${x + 6} Z`} fill={INK.blue} opacity={0.9} />
      <path d={`M ${x} ${y} Q ${x + w / 4} ${y - 8} ${x + w / 2} ${y + 4} Q ${x + (w * 3) / 4} ${y - 8} ${x + w} ${y} V ${y + h} Q ${x + (w * 3) / 4} ${y + h - 8} ${x + w / 2} ${y + h + 4} Q ${x + w / 4} ${y + h - 8} ${x} ${y + h} Z`} fill="#f3e7c9" stroke={INK.black} strokeWidth={1.4} />
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h + 4} stroke={INK.black} strokeWidth={1.2} />
      {Array.from({ length: cols }, (_, c) => {
        const cx = x + w - 22 - c * ((w - 40) / cols) - (c >= cols / 2 ? 14 : 0);
        return (
          <g key={c}>
            {Array.from({ length: 6 }, (_, r) => (
              <path key={r} d={glyph(cx, y + 22 + r * 19, c * 6 + r)} stroke={INK.black} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.78} />
            ))}
          </g>
        );
      })}
      <rect x={x + 18} y={y + h - 34} width={22} height={22} fill={INK.orange} opacity={0.85} />
      <Label x={x + w / 2} y={y + h + 30} text={copy.marks.book} opacity={open} size={18} />
    </g>
  );
}

function Lens({ t }: { t: number }) {
  const lens = lensAt(t);
  if (lens.visible <= 0.01) return null;
  return (
    <g opacity={lens.visible}>
      <circle cx={lens.x} cy={lens.y} r={26} fill={INK.paper} fillOpacity={0.35} stroke={INK.black} strokeWidth={3} />
      <path d={`M ${lens.x + 18} ${lens.y + 18} L ${lens.x + 38} ${lens.y + 38}`} stroke={INK.black} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

function Flask({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { x, y, w, h } = FLASK;
  const sink = sinkAt(t);
  const chill = chillAt(t);
  const body = `M ${x - 16} ${y - h} V ${y - h * 0.62} L ${x - w / 2} ${y - 6} Q ${x - w / 2} ${y} ${x - w / 2 + 8} ${y} H ${x + w / 2 - 8} Q ${x + w / 2} ${y} ${x + w / 2} ${y - 6} L ${x + 16} ${y - h * 0.62} V ${y - h} Z`;
  const level = y - h * 0.42;
  return (
    <g>
      <defs>
        <clipPath id="cd-flask">
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={INK.paper} />
      <g clipPath="url(#cd-flask)">
        <rect x={x - w / 2} y={level} width={w} height={h} fill="url(#cd-blue)" opacity={0.55} />
        <g opacity={sink}>
          <Sprig x={x - 6} y={y + 30 - sink * 4} scale={0.45} flowers={false} />
        </g>
      </g>
      <path d={body} fill="none" stroke={INK.black} strokeWidth={1.6} />
      <line x1={x - w / 2 + 10} y1={level} x2={x + w / 2 - 10} y2={level} stroke={INK.blue} strokeWidth={1.4} />
      <g transform={`translate(${x + w / 2 + 18} ${y - 18})`}>
        <rect x={-6} y={-96} width={12} height={92} rx={6} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
        <circle cx={0} cy={0} r={10} fill={INK.blue} stroke={INK.black} strokeWidth={1.4} />
        <rect x={-3} y={-8 - 70 * (1 - chill * 0.75)} width={6} height={70 * (1 - chill * 0.75)} fill={INK.blue} />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={6} y1={-20 - i * 16} x2={12} y2={-20 - i * 16} stroke={INK.black} strokeWidth={1} />
        ))}
        <g transform="translate(26 -82)" opacity={chill}>
          {[0, 60, 120].map((a) => (
            <line key={a} x1={-9} y1={0} x2={9} y2={0} stroke={INK.blue} strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${a})`} />
          ))}
        </g>
        <Label x={20} y={-46} text={copy.marks.cold} opacity={chill} anchor="start" color={INK.blue} size={17} />
      </g>
      <Label x={x} y={y + 24} text={copy.marks.extraction} opacity={ease((t - T.sink) / 0.4)} size={17} />
    </g>
  );
}

function Drops({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const level = vialLevel(t);
  const shown = ease((t - T.drops + 0.3) / 0.3);
  if (shown <= 0.01) return null;
  const { x, y } = VIAL;
  return (
    <g opacity={shown}>
      <path d={`M ${FLASK.x + 16} ${FLASK.y - FLASK.h + 8} q 60 -30 ${x - FLASK.x - 16} 40 V ${y - 74}`} fill="none" stroke={INK.black} strokeWidth={1.4} strokeDasharray="3 3" />
      {Array.from({ length: DROPS }, (_, i) => {
        const k = dropAt(i, t);
        if (k <= 0 || k >= 1) return null;
        return <ellipse key={i} cx={x} cy={y - 70 + k * 30} rx={3.2} ry={4.6} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} />;
      })}
      <rect x={x - 15} y={y - 44} width={30} height={44} rx={8} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <rect x={x - 15} y={y - 44 * level} width={30} height={44 * level} rx={8} fill={INK.orange} opacity={0.9} />
      <rect x={x - 15} y={y - 44} width={30} height={44} rx={8} fill="none" stroke={INK.black} strokeWidth={1.5} />
      <rect x={x - 10} y={y - 54} width={20} height={9} fill={INK.black} />
      <Label x={x} y={y + 22} text={copy.marks.extract} opacity={level} size={17} />
    </g>
  );
}

function Molecule({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { grow, bond } = moleculeAt(t);
  if (grow <= 0.01) return null;
  const { x, y } = MOLECULE;
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${i ? "L" : "M"} ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r}`;
    }).join(" ") + " Z";
  const r = 24;
  const A = { x: x - 34, y: y + 22 };
  const B = { x: x - 34 + r * Math.sqrt(3), y: y + 22 };
  const C = { x: x - 34 + (r * Math.sqrt(3)) / 2, y: y + 22 - r * 1.5 };
  const vertex = (c: { x: number; y: number }, deg: number) => ({ x: c.x + Math.cos((deg * Math.PI) / 180) * r, y: c.y + Math.sin((deg * Math.PI) / 180) * r });
  const o1 = vertex(C, 270);
  const o2 = vertex(C, 330);
  const lactone = vertex(A, 150);
  return (
    <g transform={`translate(${x} ${y}) scale(${grow}) translate(${-x} ${-y})`}>
      <rect x={x - 96} y={y - 76} width={196} height={170} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <rect x={x - 96} y={y - 76} width={196} height={170} fill="url(#cd-grid)" />
      {[A, B, C].map((c, i) => (
        <path key={i} d={hex(c.x, c.y, r)} fill="none" stroke={INK.black} strokeWidth={2} strokeLinejoin="round" />
      ))}
      <line x1={o1.x} y1={o1.y} x2={o1.x + (o2.x - o1.x) * bond} y2={o1.y + (o2.y - o1.y) * bond} stroke={INK.orange} strokeWidth={6} strokeLinecap="round" />
      {[o1, o2].map((o, i) => (
        <g key={i} opacity={i === 0 ? 1 : bond}>
          <circle cx={o.x} cy={o.y} r={9} fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />
          <text x={o.x} y={o.y + 4} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={11} fill={INK.paper}>
            O
          </text>
        </g>
      ))}
      <Label x={o2.x + 14} y={o1.y - 4} text={copy.marks.bond} opacity={bond} anchor="start" color={INK.orange} size={15} />
      <circle cx={lactone.x} cy={lactone.y} r={8} fill={INK.paper} stroke={INK.black} strokeWidth={1.3} />
      <text x={lactone.x} y={lactone.y + 4} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={10} fill={INK.black}>
        O
      </text>
      <text x={x} y={y - 54} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={19} fill={INK.black}>
        {copy.marks.molecule}
      </text>
      {t >= T.year && (
        <g transform={`translate(${x + 62} ${y + 72}) rotate(-8)`} opacity={clamp01((t - T.year) / 0.25)}>
          <rect x={-30} y={-12} width={60} height={24} fill={INK.paper} stroke={INK.orange} strokeWidth={2.4} />
          <text y={5} textAnchor="middle" fontFamily={MONO} fontSize={13} letterSpacing={1.5} fill={INK.orange}>
            {copy.marks.year}
          </text>
        </g>
      )}
    </g>
  );
}

function Parasite({ x, y, crack, fade }: { x: number; y: number; crack: number; fade: number }) {
  if (fade >= 1) return null;
  const parts = 6;
  return (
    <g opacity={1 - fade}>
      {Array.from({ length: parts }, (_, i) => {
        const a0 = (i / parts) * Math.PI * 2;
        const a1 = ((i + 1) / parts) * Math.PI * 2;
        const mid = (a0 + a1) / 2;
        const dx = Math.cos(mid) * crack * 18;
        const dy = Math.sin(mid) * crack * 18;
        const R = 26;
        const r = 13;
        const p = (a: number, rr: number) => `${x + Math.cos(a) * rr} ${y + Math.sin(a) * rr}`;
        return (
          <path
            key={i}
            d={`M ${p(a0, R)} A ${R} ${R} 0 0 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 0 0 ${p(a0, r)} Z`}
            transform={`translate(${dx} ${dy}) rotate(${crack * (i % 2 ? 20 : -20)} ${x} ${y})`}
            fill={INK.orange}
            stroke={INK.black}
            strokeWidth={1.4}
          />
        );
      })}
      <circle cx={x + 18 + crack * 10} cy={y - 16 - crack * 10} r={6} fill={INK.black} />
      {crack < 0.2 && (
        <g>
          <circle cx={x - 5} cy={y} r={4} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
          <circle cx={x + 5} cy={y} r={4} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
          <circle cx={x - 5} cy={y + 1} r={1.8} fill={INK.black} />
          <circle cx={x + 5} cy={y + 1} r={1.8} fill={INK.black} />
        </g>
      )}
    </g>
  );
}

function Cell({ t, copy }: { t: number; copy: RevealDemoCopy }) {
  const { x, y, r } = CELL;
  const { crack, fade } = parasiteAt(t);
  const hit = clamp01((t - T.crack + 0.1) / 0.3);
  const clear = clamp01((t - T.clear) / 0.35);
  const target = { x: x + 22, y: y - 8 };
  const sources = [
    { x: 600, y: 40 },
    { x: 610, y: 150 },
    { x: 590, y: 270 },
  ];
  return (
    <g>
      <circle cx={x + 8} cy={y + 8} r={r} fill={INK.blue} opacity={0.85} />
      <circle cx={x} cy={y} r={r} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={r} fill="url(#cd-orange)" opacity={0.55} />
      <circle cx={x} cy={y} r={r * 0.45} fill={INK.paper} opacity={0.75} />
      <Parasite x={target.x} y={target.y} crack={crack} fade={fade} />
      {sources.map((s, i) => {
        const k = attackAt(i, t);
        if (k <= 0 || fade >= 1) return null;
        const px = s.x + (target.x + (i - 1) * 24 - s.x) * k;
        const py = s.y + (target.y + (i - 1) * 18 - s.y) * k;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${k * 200})`} opacity={1 - fade}>
            <path d="M 9 0 L 4.5 7.8 L -4.5 7.8 L -9 0 L -4.5 -7.8 L 4.5 -7.8 Z" fill="none" stroke={INK.orange} strokeWidth={2.4} />
            <circle cx={7.8} cy={-4.5} r={3} fill={INK.orange} />
            <circle cx={7.8} cy={4.5} r={3} fill={INK.orange} />
          </g>
        );
      })}
      {hit > 0 && hit < 1 && <circle cx={target.x} cy={target.y} r={20 + hit * 40} fill="none" stroke={INK.orange} strokeWidth={4 * (1 - hit)} />}
      <Label x={x - r - 6} y={y + r - 4} text={copy.marks.cell} opacity={ease((t - T.cell) / 0.4)} anchor="end" size={17} />
      <path d={`M ${x - r - 4} ${y + r - 18} Q ${x - r + 12} ${y + r - 34} ${x - r * 0.7} ${y + r * 0.55}`} fill="none" stroke={INK.pencil} strokeWidth={1.3} opacity={ease((t - T.cell) / 0.4)} />
      <Label x={target.x + 40} y={target.y - 46} text={copy.marks.parasite} opacity={ease((t - T.cell - 0.2) / 0.4) * (1 - fade)} anchor="start" size={17} />
      {clear > 0 && (
        <g opacity={clear}>
          <Label x={x} y={y + r + 26} text={copy.marks.clear} opacity={1} size={19} color={INK.orange} />
        </g>
      )}
    </g>
  );
}

export function CureDemo({ copy, reducedMotion }: { copy: RevealDemoCopy; reducedMotion: boolean }) {
  const clock = useDemoClock(T.end, reducedMotion);
  const { t } = clock;
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const heard = useRef({ drops: 0, molecule: false, crack: false });

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    if (reducedMotion) return;
    const h = heard.current;
    const drops = Array.from({ length: DROPS }, (_, i) => dropAt(i, t)).filter((k) => k >= 1).length;
    if (drops > h.drops) {
      h.drops = drops;
      sfx.pluck(drops);
    }
    if (!h.molecule && t >= T.molecule + 0.4) {
      h.molecule = true;
      sfx.tick(5);
    }
    if (!h.crack && t >= T.crack) {
      h.crack = true;
      sfx.rescue(4);
    }
  }, [t, sfx, reducedMotion]);

  const replay = () => {
    sfx.unlock();
    heard.current = { drops: 0, molecule: false, crack: false };
    clock.replay();
  };

  const act = actAt(t);
  const caption = act === "closing" ? null : copy.captions[act];
  const morph = morphAt(t);
  const plant = actOpacity("plant", t);
  const extract = actOpacity("extract", t);
  const attack = actOpacity("act", t);

  return (
    <DemoFrame label={copy.label} replayLabel={copy.replay} canReplay={t >= T.closing} onReplay={replay} caption={caption} closing={act === "closing" ? copy.closing : null}>
      <svg
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Animação: Tu Youyou estuda a planta Artemisia annua e uma receita antiga que usava a planta em água fria. A planta é extraída a frio, gota a gota, e aparece a molécula da artemisinina. Dentro de um glóbulo vermelho, a artemisinina ataca o parasita da malária, que se desfaz."
      >
        <defs>
          <pattern id="cd-orange" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
            <circle cx="2" cy="2" r="1.05" fill={INK.orange} />
          </pattern>
          <pattern id="cd-blue" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="2" cy="2" r="1" fill={INK.blue} />
          </pattern>
          <pattern id="cd-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke={INK.blue} strokeOpacity={0.16} strokeWidth={0.8} />
          </pattern>
        </defs>

        {plant > 0.01 && (
          <g opacity={plant}>
            <g opacity={1 - morph} transform={`translate(${PLANT.x} ${PLANT.y - 110}) scale(${2.2 - morph})`}>
              <ellipse cx={0} cy={-6} rx={9} ry={3.6} fill={INK.blue} transform="rotate(-90)" />
              <ellipse cx={-6} cy={0} rx={8} ry={3.2} fill={INK.blue} transform="rotate(-140 -6 0)" />
              <ellipse cx={6} cy={0} rx={8} ry={3.2} fill={INK.blue} transform="rotate(-40 6 0)" />
              <line x1={0} y1={10} x2={0} y2={-6} stroke={INK.orange} strokeWidth={1.6} />
            </g>
            <g opacity={morph}>
              <Sprig x={PLANT.x} y={PLANT.y} scale={1.25} />
              <ellipse cx={PLANT.x} cy={PLANT.y + 4} rx={46} ry={8} fill="url(#cd-orange)" opacity={0.6} />
            </g>
            <Label x={PLANT.x + 70} y={86} text={copy.marks.game} opacity={1 - morph} color={INK.orange} size={19} />
            <Label x={PLANT.x + 70} y={86} text={copy.marks.real} opacity={morph * (1 - clamp01((t - T.book) / 0.4))} size={19} />
            <Label x={PLANT.x} y={292} text={copy.marks.plant} opacity={morph} size={18} />
            <Book t={t} copy={copy} />
            <Lens t={t} />
            <Label x={BOOK.x + BOOK.w / 2} y={BOOK.y - 16} text={copy.marks.recipe} opacity={ease((t - T.cold) / 0.4)} color={INK.blue} size={19} />
          </g>
        )}

        {extract > 0.01 && (
          <g opacity={extract}>
            <Flask t={t} copy={copy} />
            <Drops t={t} copy={copy} />
            <Molecule t={t} copy={copy} />
            <Label x={MOLECULE.x - 10} y={262} text={copy.marks.note} opacity={ease((t - T.note) / 0.4)} color={INK.pencil} size={16} />
          </g>
        )}

        {attack > 0.01 && (
          <g opacity={attack}>
            <Cell t={t} copy={copy} />
          </g>
        )}
      </svg>
    </DemoFrame>
  );
}
