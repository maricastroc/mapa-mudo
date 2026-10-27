import { useMemo, useSyncExternalStore } from "react";
import { BENCHES } from "../../benches.ts";
import { FrogSvg } from "../../lutz/FrogSvg.tsx";
import type { Look } from "../../lutz/frogArt.ts";
import { INK } from "../../riso/inks.ts";
import { formatDate, halftone, type Box, type CertificateData } from "../certificate.ts";
import type { Plate, PlateArtProps } from "../plate.ts";
import { Display, Hand, Mono, SOFT } from "../text.tsx";

type Point = { x: number; y: number };
type Leaf = { base: Point; c1: Point; c2: Point; tip: Point; width: number };

const CARD_PAPER = "#f6f0e2";
const SPECIMEN: Look = { build: "tree", skin: "orange", mark: "spots" };
const FROG = { x: 884, y: 642, size: 272 };
const CARD = { x: 1150, y: 206, w: 263, h: 304 };
const LENS = { x: 1298, y: 770, r: 96 };
const MAIN_LEAF: Leaf = { base: { x: 790, y: 888 }, c1: { x: 812, y: 700 }, c2: { x: 950, y: 460 }, tip: { x: 1104, y: 300 }, width: 250 };
const BACK_LEAF: Leaf = { base: { x: 770, y: 892 }, c1: { x: 742, y: 720 }, c2: { x: 690, y: 560 }, tip: { x: 676, y: 420 }, width: 136 };
const TWIG = "M684 652 C 760 640, 860 650, 930 644 C 990 639, 1030 628, 1074 616";
const SPECIES: Look[] = [
  SPECIMEN,
  { build: "toad", skin: "blue", mark: "plain" },
  { build: "frog", skin: "black", mark: "stripe" },
  { build: "tree", skin: "blue", mark: "bands" },
  { build: "toad", skin: "orange", mark: "bands" },
  { build: "frog", skin: "orange", mark: "plain" },
  { build: "tree", skin: "black", mark: "spots" },
  { build: "toad", skin: "black", mark: "stripe" },
];
const COLLECTION: { look: Look; match: boolean; x: number; tilt: number }[] = [
  { look: { build: "toad", skin: "blue", mark: "plain" }, match: false, x: 668, tilt: -5 },
  { look: { build: "tree", skin: "orange", mark: "bands" }, match: false, x: 752, tilt: 2 },
  { look: SPECIMEN, match: true, x: 838, tilt: -2 },
];

function bezier([a, b, c, d]: Point[], k: number): Point {
  const u = 1 - k;
  return {
    x: u * u * u * a.x + 3 * u * u * k * b.x + 3 * u * k * k * c.x + k * k * k * d.x,
    y: u * u * u * a.y + 3 * u * u * k * b.y + 3 * u * k * k * c.y + k * k * k * d.y,
  };
}

function leafShape(leaf: Leaf) {
  const curve = [leaf.base, leaf.c1, leaf.c2, leaf.tip];
  const steps = 64;
  const at = (k: number) => {
    const p = bezier(curve, k);
    const q = bezier(curve, Math.min(1, k + 0.002));
    const r = bezier(curve, Math.max(0, k - 0.002));
    const len = Math.hypot(q.x - r.x, q.y - r.y) || 1;
    const n = { x: -(q.y - r.y) / len, y: (q.x - r.x) / len };
    const w = (leaf.width / 2) * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.85)), 0.9);
    return { p, n, w };
  };
  const left: Point[] = [];
  const right: Point[] = [];
  const mid: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const { p, n, w } = at(i / steps);
    mid.push(p);
    left.push({ x: p.x + n.x * w, y: p.y + n.y * w });
    right.push({ x: p.x - n.x * w, y: p.y - n.y * w });
  }
  const f = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  const outline = `M${f(left[0])}` + left.slice(1).map((p) => `L${f(p)}`).join("") + right.reverse().map((p) => `L${f(p)}`).join("") + "Z";
  const midrib = `M${f(mid[0])}` + mid.slice(1).map((p) => `L${f(p)}`).join("");
  const veins: string[] = [];
  for (let k = 0.12; k <= 0.86; k += 0.085) {
    for (const side of [1, -1]) {
      const start = at(k);
      const end = at(Math.min(0.98, k + 0.13));
      const control = at(k + 0.04);
      const ex = end.p.x + end.n.x * end.w * 0.86 * side;
      const ey = end.p.y + end.n.y * end.w * 0.86 * side;
      const cx = control.p.x + control.n.x * control.w * 0.34 * side;
      const cy = control.p.y + control.n.y * control.w * 0.34 * side;
      veins.push(`M${f(start.p)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
    }
  }
  const xs = [...left, ...right].map((p) => p.x);
  const ys = [...left, ...right].map((p) => p.y);
  const box: Box = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, h: Math.max(...ys) - Math.min(...ys) + 8 };
  return { outline, midrib, veins: veins.join(""), box };
}

function tangents(a: Point & { r: number }, b: Point & { r: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const beta = Math.acos((a.r - b.r) / d);
  return [phi + beta, phi - beta].map((angle) => ({
    from: { x: a.x + a.r * Math.cos(angle), y: a.y + a.r * Math.sin(angle) },
    to: { x: b.x + b.r * Math.cos(angle), y: b.y + b.r * Math.sin(angle) },
  }));
}

function useForest() {
  return useMemo(() => {
    const main = leafShape(MAIN_LEAF);
    const back = leafShape(BACK_LEAF);
    const mainDots = halftone(main.box, 6.4, 15, (_, y) => 0.1 + 0.44 * Math.min(1, Math.max(0, (y - main.box.y) / main.box.h)), 0.54);
    const backDots = halftone(back.box, 5, 72, (_, y) => 0.22 + 0.4 * Math.min(1, Math.max(0, (y - back.box.y) / back.box.h)), 0.54);
    const lensBox: Box = { x: LENS.x - LENS.r, y: LENS.y - LENS.r, w: LENS.r * 2, h: LENS.r * 2 };
    const lensDots = halftone(lensBox, 7, 15, (x, y) => 0.18 + 0.26 * Math.min(1, Math.max(0, (y - lensBox.y + (x - lensBox.x) * 0.3) / (lensBox.h * 1.2))), 0.54);
    return { main, back, mainDots, backDots, lensDots };
  }, []);
}

function Callout({ from, to, text, anchor }: { from: Point; to: Point; text: string; anchor: "start" | "middle" | "end" }) {
  return (
    <g>
      <path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} stroke={INK.pencil} strokeWidth={1.3} fill="none" />
      <circle cx={from.x} cy={from.y} r={3.6} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
      <Hand x={to.x + (anchor === "start" ? 5 : anchor === "end" ? -5 : 0)} y={to.y + 6} size={24} textAnchor={anchor} stroke={INK.paper} strokeWidth={5} paintOrder="stroke">
        {text}
      </Hand>
    </g>
  );
}

function Step({ x, y, n, text }: { x: number; y: number; n: number; text: string }) {
  return (
    <g>
      <circle cx={x + 9} cy={y - 4} r={9} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
      <Mono x={x + 9} y={y} size={10.5} track={0} textAnchor="middle" fontWeight={500}>
        {n}
      </Mono>
      <Mono x={x + 25} y={y} size={10.5} track={0.16} fontWeight={500} stroke={INK.paper} strokeWidth={4} paintOrder="stroke">
        {text}
      </Mono>
    </g>
  );
}

function squiggle(x: number, y: number, w: number, seed: number) {
  let d = `M ${x} ${y}`;
  const steps = Math.round(w / 7);
  for (let i = 1; i <= steps; i++) {
    const px = x + (w * i) / steps;
    const py = y + Math.sin(i * 1.7 + seed) * 2.6;
    d += ` Q ${(px - w / steps / 2).toFixed(1)} ${(py - 3.4 * ((i + seed) % 2 ? 1 : -1)).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return d;
}

function CollectionCard({ look, match, x, tilt, index, hydrated }: { look: Look; match: boolean; x: number; tilt: number; index: number; hydrated: boolean }) {
  const y = 748;
  const w = 76;
  const h = 98;
  return (
    <g transform={`rotate(${tilt} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 4} y={y + 4} width={w} height={h} fill={match ? INK.orange : INK.black} opacity={0.85} />
      <rect x={x} y={y} width={w} height={h} fill={CARD_PAPER} stroke={match ? INK.orange : INK.black} strokeWidth={match ? 2.4 : 1.3} />
      <circle cx={x + w / 2} cy={y + 8} r={2.4} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
      {hydrated && <FrogSvg look={look} x={x + w / 2 - 2} y={y + 58} size={52} />}
      <path d={squiggle(x + 10, y + 74, w - 22, index)} fill="none" stroke={INK.pencil} strokeWidth={1.1} />
      <path d={squiggle(x + 10, y + 86, w - 34, index + 3)} fill="none" stroke={INK.pencil} strokeWidth={1.1} />
      {!match && <path d={`M${x + 14} ${y + 16} L${x + w - 14} ${y + h - 16} M${x + w - 14} ${y + 16} L${x + 14} ${y + h - 16}`} stroke={INK.pencil} strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />}
      {match && (
        <g transform={`translate(${x + w - 6} ${y + 6})`}>
          <circle r={12} fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />
          <path d="M -5.5 0 L -1.4 4.6 L 6 -4.6" stroke={INK.paper} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

function Lens({ uid, dots }: { uid: string; dots: string }) {
  const { x, y, r } = LENS;
  const palm = { x: x - 104, y: y - 74 };
  const toes = [18, 42, 66].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const length = [128, 140, 122][i];
    return { x: palm.x + Math.cos(a) * length, y: palm.y + Math.sin(a) * length };
  });
  const handle = (Math.PI * 3) / 4;
  const hx = x + Math.cos(handle) * (r + 2);
  const hy = y + Math.sin(handle) * (r + 2);
  return (
    <g>
      <g transform={`translate(${hx} ${hy}) rotate(${(handle * 180) / Math.PI - 90})`}>
        <rect x={-9} y={0} width={18} height={62} rx={5} fill={INK.black} />
        <rect x={-9} y={12} width={18} height={7} fill={INK.orange} />
      </g>
      <circle cx={x + 7} cy={y + 7} r={r} fill={INK.orange} />
      <clipPath id={`${uid}-lens`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill={INK.paper} />
      <g clipPath={`url(#${uid}-lens)`}>
        <path d={dots} fill={INK.blue} />
        {[-60, -10, 40].map((dy) => (
          <path key={dy} d={`M${x - r} ${y + dy + 30} Q ${x} ${y + dy} ${x + r} ${y + dy - 40}`} fill="none" stroke={INK.paper} strokeWidth={3} />
        ))}
        <circle cx={palm.x} cy={palm.y} r={40} fill={INK.black} />
        {toes.map((to, i) => (
          <path key={`o${i}`} d={`M${palm.x} ${palm.y} L${to.x} ${to.y}`} stroke={INK.black} strokeWidth={19} strokeLinecap="round" />
        ))}
        <circle cx={palm.x} cy={palm.y} r={36} fill={INK.orange} />
        {toes.map((to, i) => (
          <g key={i}>
            <path d={`M${palm.x} ${palm.y} L${to.x} ${to.y}`} stroke={INK.orange} strokeWidth={13} strokeLinecap="round" />
            <path d={`M${palm.x + 6} ${palm.y + 8} L${to.x - 2} ${to.y + 5}`} stroke="rgba(41,41,41,0.25)" strokeWidth={4} strokeLinecap="round" />
            <circle cx={to.x} cy={to.y} r={18} fill={INK.orange} stroke={INK.black} strokeWidth={3} />
            <circle cx={to.x - 5} cy={to.y - 6} r={5} fill="rgba(247,248,246,0.75)" />
            <circle cx={to.x + 5} cy={to.y + 5} r={2.2} fill="rgba(41,41,41,0.32)" />
            <circle cx={to.x + 8} cy={to.y - 2} r={1.6} fill="rgba(41,41,41,0.32)" />
          </g>
        ))}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK.black} strokeWidth={5} />
      <circle cx={x} cy={y} r={r - 6} fill="none" stroke={INK.black} strokeWidth={0.8} opacity={0.6} />
      <path d={`M ${x + r * 0.2} ${y - r * 0.78} A ${r * 0.8} ${r * 0.8} 0 0 1 ${x + r * 0.76} ${y - r * 0.26}`} fill="none" stroke={INK.paper} strokeOpacity={0.85} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function Notebook({ data, hydrated }: { data: CertificateData; hydrated: boolean }) {
  const { x, y, w, h } = CARD;
  const total = data.score.of ?? data.score.value;
  const rows = data.stats.slice(0, 2);
  const margin = x + 34;
  const complete = data.score.of !== undefined && data.score.value >= data.score.of;
  const slot = { w: 50, h: 34, gap: 7 };
  const gridX = x + (w - (slot.w * 4 + slot.gap * 3)) / 2;
  const gridY = y + 222;
  return (
    <g transform={`rotate(1.5 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 7} y={y + 7} width={w} height={h} fill={INK.blue} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={x + 1} y1={y + 52 + i * 24} x2={x + w - 1} y2={y + 52 + i * 24} stroke={INK.blue} strokeOpacity={0.22} strokeWidth={0.9} />
      ))}
      <line x1={margin} y1={y + 1} x2={margin} y2={y + h - 1} stroke={INK.orange} strokeOpacity={0.75} strokeWidth={1.2} />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <circle cx={x + 22 + i * 27.5} cy={y + 2} r={5.5} fill="none" stroke={INK.black} strokeWidth={1.6} />
          <circle cx={x + 22 + i * 27.5} cy={y + 12} r={2.4} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
        </g>
      ))}
      <Mono x={margin + 10} y={y + 38} size={9.5} track={0.13}>
        CADERNO DE CAMPO
      </Mono>

      <Mono x={margin + 10} y={y + 68} size={9.5} track={0.13} fill={SOFT}>
        {`${data.score.unit.toUpperCase()} NO CADERNO`}
      </Mono>
      <Display x={margin + 6} y={y + 140} size={82} track={-0.04}>
        {data.score.value}
      </Display>
      {data.score.of !== undefined && (
        <Mono x={margin + 10 + String(data.score.value).length * 50} y={y + 140} size={15}>
          de {data.score.of}
        </Mono>
      )}
      {complete && (
        <Hand x={x + w - 16} y={y + 112} size={27} fill={INK.orange} textAnchor="end" transform={`rotate(-6 ${x + w - 60} ${y + 104})`}>
          completo!
        </Hand>
      )}

      {rows.map((row, i) => {
        const base = y + 172 + i * 24;
        return (
          <g key={row.label}>
            <Mono x={margin + 10} y={base} size={9.5} track={0.13} fill={SOFT}>
              {row.label}
            </Mono>
            <Hand x={x + 150} y={base + 2} size={26} fill={INK.pencil}>
              {row.value}
            </Hand>
          </g>
        );
      })}

      {Array.from({ length: total }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const sx = gridX + col * (slot.w + slot.gap);
        const sy = gridY + row * (slot.h + slot.gap);
        const found = i < data.score.value;
        return (
          <g key={i}>
            <rect x={sx} y={sy} width={slot.w} height={slot.h} fill={found ? CARD_PAPER : INK.paper} stroke={found ? INK.black : INK.pencil} strokeWidth={found ? 1.1 : 1} strokeDasharray={found ? undefined : "3 3"} />
            {found ? (
              hydrated && <FrogSvg look={SPECIES[i % SPECIES.length]} x={sx + slot.w / 2 - 1} y={sy + slot.h - 4} size={30} />
            ) : (
              <Hand x={sx + slot.w / 2} y={sy + slot.h / 2 + 8} size={22} fill={INK.pencil} textAnchor="middle" opacity={0.7}>
                ?
              </Hand>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Stamp({ text, date, x, y }: { text: string; date: string; x: number; y: number }) {
  const w = 196;
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <rect x={-w / 2 + 3} y={-24} width={w} height={54} fill={INK.black} opacity={0.85} />
      <rect x={-w / 2} y={-27} width={w} height={54} fill={INK.paper} stroke={INK.orange} strokeWidth={3.5} />
      <Display x={0} y={4} size={23} fontWeight={700} track={0.12} fill={INK.orange} textAnchor="middle">
        {text}
      </Display>
      <Mono x={0} y={19} size={9.5} track={0.2} fill={INK.orange} textAnchor="middle">
        {date}
      </Mono>
    </g>
  );
}

function subscribeNothing() {
  return () => {};
}

function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

function LutzArt({ data, uid }: PlateArtProps) {
  const forest = useForest();
  const hydrated = useHydrated();
  const date = formatDate(data.achievedAt);
  const unit = FROG.size / 100;
  const eye = { x: FROG.x + 25 * unit, y: FROG.y - 47 * unit };
  const spot = { x: FROG.x - 8 * unit, y: FROG.y - 45 * unit };
  const toe = { x: FROG.x + 38 * unit, y: FROG.y - 2 };
  const callout = { ...toe, r: 16 };
  const cone = tangents(callout, LENS);

  return (
    <g>
      <Mono x={652} y={206} size={11} track={0.16}>
        PESQUISA NO MUSEU NACIONAL · RIO DE JANEIRO
      </Mono>
      <Mono x={652} y={224} size={11} track={0.16} fill={SOFT}>
        OBSERVAR, COMPARAR, REGISTRAR · ESQUEMA ILUSTRATIVO
      </Mono>

      <clipPath id={`${uid}-back`}>
        <path d={forest.back.outline} />
      </clipPath>
      <clipPath id={`${uid}-main`}>
        <path d={forest.main.outline} />
      </clipPath>
      <g clipPath={`url(#${uid}-back)`}>
        <path d={forest.backDots} fill={INK.orange} />
        <path d={forest.back.veins} fill="none" stroke={INK.paper} strokeWidth={2.2} strokeLinecap="round" />
      </g>
      <path d={forest.back.outline} fill="none" stroke={INK.orange} strokeWidth={1.4} />
      <path d={forest.back.midrib} fill="none" stroke={INK.paper} strokeWidth={2.6} strokeLinecap="round" />

      <path d={forest.main.outline} fill={INK.paper} />
      <g clipPath={`url(#${uid}-main)`}>
        <path d={forest.mainDots} fill={INK.blue} />
        <path d={forest.main.veins} fill="none" stroke={INK.paper} strokeWidth={2.4} strokeLinecap="round" />
      </g>
      <path d={forest.main.outline} fill="none" stroke={INK.blue} strokeWidth={1.8} />
      <path d={forest.main.midrib} fill="none" stroke={INK.paper} strokeWidth={3.4} strokeLinecap="round" />

      <path d={TWIG} fill="none" stroke={INK.black} strokeWidth={9} strokeLinecap="round" />
      <path d={TWIG} fill="none" stroke={INK.land} strokeWidth={5} strokeLinecap="round" />
      <path d={TWIG} fill="none" stroke={INK.black} strokeWidth={0.9} strokeLinecap="round" strokeDasharray="10 26" opacity={0.55} transform="translate(0 1.2)" />
      <path d="M1022 632 q 18 -22 44 -26 q -10 22 -44 26 Z" fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />

      {hydrated && <FrogSvg look={SPECIMEN} x={FROG.x} y={FROG.y} size={FROG.size} />}

      <Callout from={eye} to={{ x: 1004, y: 438 }} text="olhos" anchor="start" />
      <Callout from={spot} to={{ x: 772, y: 436 }} text="pintas" anchor="end" />
      <circle cx={callout.x} cy={callout.y} r={callout.r} fill="none" stroke={INK.black} strokeWidth={1} strokeDasharray="3 3" />
      <Hand x={callout.x + 10} y={callout.y + 44} size={24} stroke={INK.paper} strokeWidth={5} paintOrder="stroke">
        dedos
      </Hand>
      {cone.map((line, i) => (
        <line key={i} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={INK.black} strokeWidth={0.8} strokeOpacity={0.7} />
      ))}

      <Step x={656} y={300} n={1} text="OBSERVAR" />
      <Step x={656} y={734} n={2} text="COMPARAR" />
      <Step x={CARD.x} y={194} n={3} text="REGISTRAR" />

      {COLLECTION.map((card, i) => (
        <CollectionCard key={i} {...card} index={i} hydrated={hydrated} />
      ))}
      <Hand x={COLLECTION[2].x + 38} y={738} size={22} fill={INK.orange} textAnchor="middle" stroke={INK.paper} strokeWidth={5} paintOrder="stroke">
        é esta!
      </Hand>

      <Lens uid={uid} dots={forest.lensDots} />
      <Mono x={LENS.x + LENS.r + 6} y={LENS.y + LENS.r + 32} size={10} track={0.16} textAnchor="end">
        DETALHE · DISCOS NOS DEDOS
      </Mono>

      <Notebook data={data} hydrated={hydrated} />
      <Stamp text="REGISTRADO" date={`${date.day} ${date.month} ${date.year}`} x={CARD.x + CARD.w - 104} y={CARD.y + CARD.h + 28} />
    </g>
  );
}

const bench = BENCHES.find((b) => b.id === "lutz");
if (!bench?.reveal.photo) throw new Error("lutz bench is missing");

export const lutzPlate: Plate = {
  scientist: {
    name: "Bertha Lutz",
    line: "Zoóloga do Museu Nacional. Estudou sapos, rãs e pererecas por décadas.",
    photo: { ...bench.reveal.photo, focus: [0.53, 0.34], zoom: 2.6 },
    credit: "FOTO: LIBRARY OF CONGRESS, 1925, DOMÍNIO PÚBLICO",
  },
  game: { name: bench.task, room: bench.room, unit: "sapos" },
  stamp: "REGISTRADO",
  demo: {
    bench: "lutz",
    name: "Luiza Fernandes",
    position: 1,
    score: { value: 8, of: 8, unit: "sapos" },
    stats: [
      { label: "SEGUIDOS", value: "8" },
      { label: "ENGANOS", value: "1" },
    ],
    achievedAt: "2026-10-26T15:42:00",
    serial: 0,
    demo: true,
  },
  describe: (data) => `${data.position}º lugar no ranking do dia de ${bench.task}. ${data.score.value}${data.score.of ? ` de ${data.score.of}` : ""} ${data.score.unit} no caderno.`,
  Art: LutzArt,
};
