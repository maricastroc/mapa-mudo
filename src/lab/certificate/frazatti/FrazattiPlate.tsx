import { useMemo } from "react";
import { BENCHES } from "../../benches.ts";
import { INK } from "../../riso/inks.ts";
import { formatDate, halftone, type CertificateData } from "../certificate.ts";
import type { Plate, PlateArtProps } from "../plate.ts";
import { Display, Hand, Mono, SOFT } from "../text.tsx";

type Point = { x: number; y: number };

const LIGHT = (() => {
  const v = { x: -0.55, y: -0.62, z: 0.56 };
  const len = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
})();

const VIAL = { x: 900, top: 392, shoulder: 490, bottom: 846, w: 232, neck: 92 };
const LEVEL = 574;
const LABEL = { y: 634, h: 128 };
const TYPES = [
  { x: 712, y: 476, r: 44, tone: INK.orange, angle: 15 },
  { x: 772, y: 326, r: 48, tone: INK.blue, angle: 75 },
  { x: 1028, y: 326, r: 48, tone: INK.black, angle: 45 },
  { x: 1088, y: 476, r: 44, tone: INK.pencil, angle: 105 },
];
const WEAK = [
  { x: 822, y: 606, r: 13, type: 0 },
  { x: 874, y: 606, r: 13, type: 1 },
  { x: 926, y: 606, r: 13, type: 2 },
  { x: 978, y: 606, r: 13, type: 3 },
];
const INSET = { x: 1300, y: 758, r: 102 };
const CARD = { x: 1150, y: 202, w: 263, h: 300 };

function r1(v: number) {
  return Math.round(v * 10) / 10;
}

function lambert(x: number, y: number, c: Point & { r: number }) {
  const nx = (x - c.x) / c.r;
  const ny = (y - c.y) / c.r;
  const d2 = nx * nx + ny * ny;
  if (d2 > 1) return -1;
  const nz = Math.sqrt(1 - d2);
  return Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
}

function sphereDots(c: Point & { r: number }, cell: number, angle: number, floor: number, depth: number) {
  return halftone({ x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 }, cell, angle, (x, y) => {
    const l = lambert(x, y, c);
    return l < 0 ? 0 : floor + depth * Math.pow(1 - l, 1.4);
  });
}

function vialPath() {
  const { x, top, shoulder, bottom, w, neck } = VIAL;
  const half = w / 2;
  const n = neck / 2;
  return [
    `M${x - n} ${top}`,
    `V${shoulder - 46}`,
    `Q${x - n} ${shoulder - 18} ${x - half + 26} ${shoulder - 4}`,
    `Q${x - half} ${shoulder + 6} ${x - half} ${shoulder + 34}`,
    `V${bottom - 18}`,
    `Q${x - half} ${bottom} ${x - half + 18} ${bottom}`,
    `H${x + half - 18}`,
    `Q${x + half} ${bottom} ${x + half} ${bottom - 18}`,
    `V${shoulder + 34}`,
    `Q${x + half} ${shoulder + 6} ${x + half - 26} ${shoulder - 4}`,
    `Q${x + n} ${shoulder - 18} ${x + n} ${shoulder - 46}`,
    `V${top}Z`,
  ].join("");
}

function useDots() {
  return useMemo(() => {
    const viruses = TYPES.map((t) => sphereDots(t, 4.2, t.angle, 0.1, 0.62));
    const half = VIAL.w / 2;
    const liquid = halftone({ x: VIAL.x - half, y: LEVEL, w: VIAL.w, h: VIAL.bottom - LEVEL }, 5.2, 72, (x, y) => {
      const depth = (y - LEVEL) / (VIAL.bottom - LEVEL);
      const edge = Math.abs(x - VIAL.x) / half;
      return 0.16 + 0.42 * depth + 0.18 * edge * edge;
    });
    const body = { x: INSET.x, y: INSET.y, r: 46 };
    const bodyDots = sphereDots(body, 3.8, 72, 0.14, 0.6);
    return { viruses, liquid, bodyDots, body };
  }, []);
}

function Spikes({ x, y, r, tone, count = 12, reach = 1.34, weak = false }: Point & { r: number; tone: string; count?: number; reach?: number; weak?: boolean }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.2;
        const tip = r * reach;
        return (
          <g key={i} opacity={weak ? 0.75 : 1}>
            <line x1={r1(x + Math.cos(a) * r * 0.92)} y1={r1(y + Math.sin(a) * r * 0.92)} x2={r1(x + Math.cos(a) * tip)} y2={r1(y + Math.sin(a) * tip)} stroke={INK.black} strokeWidth={r1(Math.max(1, r * 0.07))} strokeLinecap="round" />
            <circle cx={r1(x + Math.cos(a) * tip)} cy={r1(y + Math.sin(a) * tip)} r={r1(Math.max(1.6, r * 0.1))} fill={tone} stroke={INK.black} strokeWidth={r1(Math.max(0.7, r * 0.035))} />
          </g>
        );
      })}
    </g>
  );
}

function Virus({ type, dots }: { type: (typeof TYPES)[number] & { index: number }; dots: string }) {
  const { x, y, r, tone, index } = type;
  return (
    <g>
      <Spikes x={x} y={y} r={r} tone={tone} />
      <circle cx={x} cy={y} r={r} fill={INK.paper} />
      <path d={dots} fill={tone} opacity={tone === INK.pencil ? 0.85 : 1} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK.black} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={r * 0.42} fill={INK.paper} stroke={INK.black} strokeWidth={1.3} />
      <Display x={x} y={y + r * 0.16} size={r * 0.5} fontWeight={700} track={0} textAnchor="middle">
        {index + 1}
      </Display>
      <Mono x={x} y={y + r * 1.34 + 22} size={10} track={0.16} textAnchor="middle">
        {`TIPO ${index + 1}`}
      </Mono>
    </g>
  );
}

function WeakVirus({ x, y, r, type }: (typeof WEAK)[number]) {
  const tone = TYPES[type].tone;
  return (
    <g>
      <Spikes x={x} y={y} r={r} tone={tone} count={9} reach={1.28} weak />
      <circle cx={x} cy={y} r={r} fill={INK.paper} stroke={INK.black} strokeWidth={1.1} strokeDasharray="2.6 2.2" />
      <circle cx={x} cy={y} r={r} fill={tone} opacity={0.18} />
      <Display x={x} y={y + r * 0.34} size={r * 0.9} fontWeight={700} track={0} textAnchor="middle" fill={INK.black}>
        {type + 1}
      </Display>
    </g>
  );
}

function Vial({ uid, liquid }: { uid: string; liquid: string }) {
  const { x, top, shoulder, bottom, w, neck } = VIAL;
  const half = w / 2;
  const body = vialPath();
  return (
    <g>
      <path d={body} fill={INK.blue} transform="translate(9 9)" />
      <clipPath id={`${uid}-vial`}>
        <path d={body} />
      </clipPath>
      <path d={body} fill={INK.paper} />
      <g clipPath={`url(#${uid}-vial)`}>
        <rect x={x - half} y={LEVEL} width={w} height={bottom - LEVEL} fill={INK.orange} opacity={0.14} />
        <path d={liquid} fill={INK.orange} />
        <path d={`M${x - half} ${LEVEL} Q${x - half / 2} ${LEVEL - 7} ${x} ${LEVEL} T${x + half} ${LEVEL}`} fill="none" stroke={INK.black} strokeWidth={1.2} />
        {WEAK.map((v) => (
          <WeakVirus key={v.type} {...v} />
        ))}
        <path d={`M${x - half + 20} ${shoulder + 40} V${bottom - 40}`} stroke={INK.paper} strokeWidth={7} strokeLinecap="round" opacity={0.85} />
        <path d={`M${x - half + 36} ${shoulder + 60} V${shoulder + 140}`} stroke={INK.paper} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      </g>
      <path d={body} fill="none" stroke={INK.black} strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = bottom - 40 - i * 34;
        if (y < LABEL.y + LABEL.h + 8 && y > LABEL.y - 8) return null;
        return <line key={i} x1={x + half} y1={y} x2={x + half - (i % 2 ? 9 : 16)} y2={y} stroke={INK.black} strokeWidth={1.2} />;
      })}

      <rect x={x - neck / 2 - 10} y={top - 34} width={neck + 20} height={36} rx={4} fill={INK.blue} stroke={INK.black} strokeWidth={1.8} />
      <rect x={x - neck / 2 - 10} y={top - 6} width={neck + 20} height={10} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      {[-30, -15, 0, 15, 30].map((dx) => (
        <line key={dx} x1={x + dx} y1={top - 30} x2={x + dx} y2={top - 10} stroke={INK.paper} strokeWidth={1.4} opacity={0.7} />
      ))}

      <rect x={x - half - 1} y={LABEL.y} width={w + 2} height={LABEL.h} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <rect x={x - half - 1} y={LABEL.y} width={w + 2} height={22} fill={INK.black} />
      <Mono x={x} y={LABEL.y + 15} size={9.5} track={0.22} fill={INK.paper} textAnchor="middle">
        VACINA DENGUE
      </Mono>
      <Display x={x} y={LABEL.y + 62} size={34} fontWeight={700} track={-0.01} textAnchor="middle">
        Butantan-DV
      </Display>
      <line x1={x - half + 18} y1={LABEL.y + 76} x2={x + half - 18} y2={LABEL.y + 76} stroke={INK.black} strokeOpacity={0.3} />
      <Mono x={x} y={LABEL.y + 96} size={10} track={0.16} textAnchor="middle">
        TIPOS 1 · 2 · 3 · 4
      </Mono>
      <Mono x={x} y={LABEL.y + 115} size={10} track={0.16} fill={INK.orange} fontWeight={500} textAnchor="middle">
        DOSE ÚNICA
      </Mono>
    </g>
  );
}

function Antibody({ x, y, angle, scale = 1 }: Point & { angle: number; scale?: number }) {
  return (
    <g transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)}) scale(${scale})`}>
      <path d="M0 12V0M0 0L-8 -11M0 0L8 -11" stroke={INK.blue} strokeWidth={4.2} strokeLinecap="round" fill="none" />
      <path d="M0 12V0M0 0L-8 -11M0 0L8 -11" stroke={INK.paper} strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Inset({ uid, body, bodyDots }: { uid: string; body: Point & { r: number }; bodyDots: string }) {
  const guards = TYPES.map((t, i) => {
    const a = -Math.PI / 2 + (i / 4) * Math.PI * 2 + Math.PI / 4;
    const at = { x: body.x + Math.cos(a) * 84, y: body.y + Math.sin(a) * 84 };
    return { ...t, index: i, a, at: { x: r1(at.x), y: r1(at.y) } };
  });
  return (
    <g>
      <circle cx={INSET.x + 7} cy={INSET.y + 7} r={INSET.r} fill={INK.orange} />
      <clipPath id={`${uid}-inset`}>
        <circle cx={INSET.x} cy={INSET.y} r={INSET.r} />
      </clipPath>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill={INK.paper} />
      <g clipPath={`url(#${uid}-inset)`}>
        <circle cx={body.x} cy={body.y} r={body.r + 22} fill="none" stroke={INK.blue} strokeWidth={1.1} strokeDasharray="3 4" />
        <circle cx={body.x} cy={body.y} r={body.r} fill={INK.paper} />
        <path d={bodyDots} fill={INK.orange} />
        <circle cx={body.x} cy={body.y} r={body.r} fill="none" stroke={INK.black} strokeWidth={1.4} />
        {guards.map((g) => (
          <g key={g.index}>
            <g opacity={0.6}>
              <Spikes x={g.at.x} y={g.at.y} r={10} tone={g.tone} count={9} reach={1.3} weak />
              <circle cx={g.at.x} cy={g.at.y} r={10} fill={INK.paper} stroke={INK.black} strokeWidth={1} strokeDasharray="2.4 2" />
            </g>
            {[-0.3, 0.3].map((spread) => {
              const a = g.a + spread;
              const d = body.r + 16;
              return <Antibody key={spread} x={body.x + Math.cos(a) * d} y={body.y + Math.sin(a) * d} angle={(a * 180) / Math.PI + 90} scale={0.72} />;
            })}
          </g>
        ))}
        <g transform={`translate(${body.x} ${body.y}) scale(0.66)`}>
          <path d="M0 -42L34 -28V4Q34 32 0 46Q-34 32 -34 4V-28Z" fill={INK.orange} stroke={INK.black} strokeWidth={2.6} strokeLinejoin="round" />
          <path d="M-15 2L-4 14L17 -12" fill="none" stroke={INK.paper} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill="none" stroke={INK.black} strokeWidth={1.5} />
    </g>
  );
}

function StampMark({ x, y, tilt, size = 1 }: Point & { tilt: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${size})`} opacity={0.92}>
      <circle r={13} fill="none" stroke={INK.orange} strokeWidth={2} />
      <circle r={9.5} fill="none" stroke={INK.orange} strokeWidth={0.8} />
      <Display x={0} y={3.2} size={8.5} fontWeight={700} track={0.04} fill={INK.orange} textAnchor="middle">
        DV
      </Display>
    </g>
  );
}

function SyringeIcon({ x, y }: Point) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-38)`}>
      <rect x={0} y={-3.5} width={16} height={7} fill={INK.paper} stroke={INK.black} strokeWidth={1} />
      <rect x={1.5} y={-2} width={8} height={4} fill={INK.orange} />
      <line x1={16} y1={0} x2={21} y2={0} stroke={INK.black} strokeWidth={2} />
      <line x1={21} y1={-4} x2={21} y2={4} stroke={INK.black} strokeWidth={1.6} />
      <line x1={0} y1={0} x2={-7} y2={0} stroke={INK.black} strokeWidth={1} />
    </g>
  );
}

function VaccineCard({ data }: { data: CertificateData }) {
  const { x, y, w, h } = CARD;
  const total = data.score.of ?? data.score.value;
  const boxes = Math.min(10, total);
  const cols = 5;
  const box = { w: 43, h: 40, gap: 4 };
  const gridX = x + (w - (cols * box.w + (cols - 1) * box.gap)) / 2;
  const gridY = y + 132;
  const rows = data.stats.slice(0, 2);
  const tilts = [-14, 9, -4, 17, -11, 6, -18, 12, -7, 3];
  return (
    <g transform={`rotate(-1.5 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 7} y={y + 7} width={w} height={h} fill={INK.blue} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <SyringeIcon x={x + 18} y={y + 26} />
      <Mono x={x + 42} y={y + 27} size={9.5} track={0.13}>
        CARTÃO DE VACINA
      </Mono>
      <line x1={x + 12} y1={y + 42} x2={x + w - 12} y2={y + 42} stroke={INK.black} strokeOpacity={0.3} />

      <Display x={x + 14} y={y + 114} size={70} track={-0.04}>
        {data.score.value}
      </Display>
      <Mono x={x + w - 16} y={y + 78} size={9.5} track={0.13} fill={SOFT} textAnchor="end">
        {data.score.unit.toUpperCase()}
      </Mono>
      <Mono x={x + w - 16} y={y + 94} size={9.5} track={0.13} fill={SOFT} textAnchor="end">
        VACINADAS
      </Mono>
      {data.score.of !== undefined && (
        <Mono x={x + w - 16} y={y + 114} size={13} track={0.06} textAnchor="end">
          {`de ${data.score.of}`}
        </Mono>
      )}

      {Array.from({ length: boxes }, (_, i) => {
        const bx = gridX + (i % cols) * (box.w + box.gap);
        const by = gridY + Math.floor(i / cols) * (box.h + box.gap);
        const done = i < data.score.value;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={box.w} height={box.h} fill="none" stroke={INK.black} strokeWidth={1} strokeOpacity={done ? 0.85 : 0.4} strokeDasharray={done ? undefined : "3 3"} />
            <Mono x={bx + 4} y={by + 10} size={7.5} track={0.05} fill={SOFT}>
              {i + 1}
            </Mono>
            {done && <StampMark x={bx + box.w / 2 + 3} y={by + box.h / 2 + 3} tilt={tilts[i % tilts.length]} size={0.95} />}
          </g>
        );
      })}

      {rows.map((row, i) => {
        const left = x + 14 + i * ((w - 28) / 2);
        return (
          <g key={row.label}>
            <Mono x={left} y={y + 248} size={9.5} track={0.13} fill={SOFT}>
              {row.label}
            </Mono>
            <Display x={left} y={y + 280} size={28} track={-0.02}>
              {row.value}
            </Display>
          </g>
        );
      })}
      <line x1={x + w / 2} y1={y + 234} x2={x + w / 2} y2={y + h - 14} stroke={INK.black} strokeOpacity={0.3} />
      <line x1={x + 12} y1={y + 228} x2={x + w - 12} y2={y + 228} stroke={INK.black} strokeOpacity={0.3} />
    </g>
  );
}

function Stamp({ text, date, x, y }: { text: string; date: string; x: number; y: number }) {
  const w = 190;
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <rect x={-w / 2 + 3} y={-24} width={w} height={54} fill={INK.black} opacity={0.85} />
      <rect x={-w / 2} y={-27} width={w} height={54} fill={INK.paper} stroke={INK.orange} strokeWidth={3.5} />
      <Display x={0} y={4} size={23} fontWeight={700} track={0.1} fill={INK.orange} textAnchor="middle">
        {text}
      </Display>
      <Mono x={0} y={19} size={9.5} track={0.2} fill={INK.orange} textAnchor="middle">
        {date}
      </Mono>
    </g>
  );
}

function FrazattiArt({ data, uid }: PlateArtProps) {
  const { viruses, liquid, bodyDots, body } = useDots();
  const date = formatDate(data.achievedAt);
    const dose = { from: { x: VIAL.x + VIAL.w / 2 + 14, y: 790 }, to: { x: INSET.x - INSET.r - 10, y: INSET.y + 4 } };
  const doseDots = Array.from({ length: 9 }, (_, i) => {
    const k = (i + 0.5) / 9;
    const cx = (dose.from.x + dose.to.x) / 2;
    const cy = Math.min(dose.from.y, dose.to.y) - 44;
    const u = 1 - k;
    return { x: r1(u * u * dose.from.x + 2 * u * k * cx + k * k * dose.to.x), y: r1(u * u * dose.from.y + 2 * u * k * cy + k * k * dose.to.y) };
  });

  return (
    <g>
      <Mono x={652} y={206} size={11} track={0.16}>
        VACINA BUTANTAN-DV · INSTITUTO BUTANTAN
      </Mono>
      <Mono x={652} y={224} size={11} track={0.16} fill={SOFT}>
        4 TIPOS DE VÍRUS EM UMA DOSE SÓ · ESQUEMA ILUSTRATIVO
      </Mono>

      <Vial uid={uid} liquid={liquid} />

      {TYPES.map((t, i) => {
        const w = WEAK[i];
        const dx = w.x - t.x;
        const dy = w.y - t.y;
        const len = Math.hypot(dx, dy);
        const from = t.r * (t.y < 400 ? 1.85 : 1.25);
        const to = len - w.r * 1.5;
        const count = Math.max(3, Math.floor((to - from) / 13));
        return (
          <g key={i}>
            {Array.from({ length: count }, (_, k) => {
              const d = from + ((to - from) * (k + 0.5)) / count;
              return <circle key={k} cx={r1(t.x + (dx / len) * d)} cy={r1(t.y + (dy / len) * d)} r={2.4} fill={INK.orange} stroke={INK.black} strokeWidth={0.6} />;
            })}
          </g>
        );
      })}

      {TYPES.map((t, i) => (
        <Virus key={i} type={{ ...t, index: i }} dots={viruses[i]} />
      ))}
      <g>
        <path d={`M${VIAL.x - VIAL.w / 2 - 10} 616 Q${VIAL.x - VIAL.w / 2 - 50} 650 ${VIAL.x - VIAL.w / 2 - 62} 694`} fill="none" stroke={INK.pencil} strokeWidth={1.2} />
        <path d={`M${VIAL.x - VIAL.w / 2 - 10} 616 l-3 9 M${VIAL.x - VIAL.w / 2 - 10} 616 l-9 3`} fill="none" stroke={INK.pencil} strokeWidth={1.2} />
        <Hand x={VIAL.x - VIAL.w / 2 - 70} y={712} size={22} fill={INK.pencil} textAnchor="middle">
          enfraquecidos
        </Hand>
      </g>

      {doseDots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.7} fill={INK.orange} stroke={INK.black} strokeWidth={0.7} />
      ))}
      <Hand x={(dose.from.x + dose.to.x) / 2} y={Math.min(dose.from.y, dose.to.y) - 34} size={22} textAnchor="middle">
        uma picada só
      </Hand>

      <Inset uid={uid} body={body} bodyDots={bodyDots} />
      <Mono x={INSET.x + INSET.r + 2} y={INSET.y + INSET.r + 28} size={10} track={0.16} textAnchor="end">
        DETALHE · O CORPO SE DEFENDE
      </Mono>

      <VaccineCard data={data} />
      <Stamp text="DOSE ÚNICA" date={`${date.day} ${date.month} ${date.year}`} x={CARD.x + CARD.w - 100} y={CARD.y + CARD.h + 28} />
    </g>
  );
}

const bench = BENCHES.find((b) => b.id === "frazatti");
if (!bench?.reveal.photo) throw new Error("frazatti bench is missing");

export const frazattiPlate: Plate = {
  scientist: {
    name: "Neuza Frazatti",
    line: "Pesquisadora do Butantan. Liderou a criação da vacina da dengue de dose única.",
    photo: { ...bench.reveal.photo, focus: [0.49, 0.3], zoom: 2.15 },
    credit: "FOTO: INSTITUTO BUTANTAN, ADAPTADA",
  },
  game: { name: bench.task, room: bench.room, unit: "crianças" },
  stamp: "DOSE ÚNICA",
  demo: {
    bench: "frazatti",
    name: "Beatriz Albuquerque",
    position: 1,
    score: { value: 10, of: 10, unit: "crianças" },
    stats: [
      { label: "SEGUIDAS", value: "10" },
      { label: "ENGANOS", value: "0" },
    ],
    achievedAt: "2026-10-26T15:42:00",
    serial: 0,
    demo: true,
  },
  describe: (data) => `${data.position}º lugar no ranking do dia de ${bench.task}. ${data.score.value}${data.score.of ? ` de ${data.score.of}` : ""} crianças vacinadas.`,
  Art: FrazattiArt,
};
