import { useMemo } from "react";
import { BENCHES } from "../../benches.ts";
import { INK } from "../../riso/inks.ts";
import { formatDate, halftone, type Box, type CertificateData } from "../certificate.ts";
import type { Plate, PlateArtProps } from "../plate.ts";
import { Display, Hand, Mono, SOFT } from "../text.tsx";

type Point = { x: number; y: number };

const ROCK = { x: 900, y: 590 };
const ROCK_SIZE = { rx: 98, ry: 66 };
const ROCK_OUTLINE: Point[] = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const r = 1 + 0.07 * Math.sin(3 * a + 0.6) + 0.045 * Math.sin(5 * a + 1.9) + 0.03 * Math.sin(9 * a);
  return { x: Math.cos(a) * ROCK_SIZE.rx * r, y: Math.min(40, Math.sin(a) * ROCK_SIZE.ry * r) };
});
const PLATE = { x: 900, y: 644, rx: 116, ry: 19 };
const METER = { x: 760, y: 344, r: 64 };
const TILES = [
  { symbol: "Po", number: 84, name: "polônio", date: "JUL · 1898", x: 968, y: 236 },
  { symbol: "Ra", number: 88, name: "rádio", date: "DEZ · 1898", x: 1062, y: 236 },
];
const TILE = { w: 82, h: 104 };
const RINGS = [108, 138, 166, 194];
const INSET = { x: 1300, y: 758, r: 102 };
const CARD = { x: 1150, y: 202, w: 263, h: 304 };
const LATTICE = { x: 676, y: 812, edge: 70 };
const STONE_PIP = "M4 14 Q2 8 7 5 Q11 2 16 4 Q22 6 21 12 Q20 17 13 17 Q6 18 4 14 Z";

function round(v: number) {
  return Math.round(v * 100) / 100;
}

function dialPoint(r: number, value: number) {
  const a = Math.PI * (1.08 + 0.84 * value);
  return { x: round(METER.x + Math.cos(a) * r), y: round(METER.y + Math.sin(a) * r) };
}

function dialArc(r: number, from: number, to: number) {
  const a = dialPoint(r, from);
  const b = dialPoint(r, to);
  return `M${a.x} ${a.y}A${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

function polygon(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z";
}

function tangents(a: Point & { r: number }, b: Point & { r: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const beta = Math.acos((a.r - b.r) / d);
  return [phi + beta, phi - beta].map((angle) => ({
    from: { x: round(a.x + a.r * Math.cos(angle)), y: round(a.y + a.r * Math.sin(angle)) },
    to: { x: round(b.x + b.r * Math.cos(angle)), y: round(b.y + b.r * Math.sin(angle)) },
  }));
}

function useRockDots() {
  return useMemo(() => {
    const points = ROCK_OUTLINE.map((p) => ({ x: ROCK.x + p.x, y: ROCK.y + p.y }));
    const box: Box = { x: ROCK.x - 112, y: ROCK.y - 78, w: 224, h: 122 };
    const sheen = halftone(box, 3.2, 45, (x, y) => {
      const nx = (x - ROCK.x) / (ROCK_SIZE.rx * 1.05);
      const ny = (y - ROCK.y + 8) / (ROCK_SIZE.ry * 1.05);
      const d2 = nx * nx + ny * ny;
      if (d2 >= 1) return 0;
      const nz = Math.sqrt(1 - d2);
      const lambert = Math.max(0, -nx * 0.55 - ny * 0.62 + nz * 0.56);
      const bumps = 0.5 + 0.5 * Math.sin(nx * 9 + 1) * Math.sin(ny * 7 + 2);
      return Math.pow(lambert, 3) * (0.55 + 0.35 * bumps);
    }, 0.5);
    const tileBox: Box = { x: TILES[0].x, y: TILES[0].y, w: TILES[1].x + TILE.w - TILES[0].x, h: TILE.h };
    const tileDots = halftone(tileBox, 4.2, 75, (x, y) => (x > TILES[0].x + TILE.w && x < TILES[1].x ? 0 : y > TILES[0].y + 68 ? 0 : 0.36), 0.5);
    const faceDots = halftone({ x: METER.x - METER.r, y: METER.y - METER.r, w: METER.r * 2, h: METER.r }, 3.6, 75, (x, y) => {
      const d = Math.hypot(x - METER.x, y - METER.y);
      if (d > METER.r - 2 || y > METER.y) return 0;
      const a = (Math.atan2(y - METER.y, x - METER.x) / Math.PI + 2) % 2;
      const value = (a - 1.08) / 0.84;
      return value > 0.62 ? 0.25 + (value - 0.62) * 1.6 : 0;
    }, 0.5);
    return { outline: polygon(points), sheen, tileDots, faceDots };
  }, []);
}

function Rock() {
  const { outline, sheen } = useRockDots();
  return (
    <g>
      <ellipse cx={PLATE.x + 6} cy={PLATE.y + 6} rx={PLATE.rx} ry={PLATE.ry} fill={INK.blue} />
      <ellipse cx={PLATE.x} cy={PLATE.y} rx={PLATE.rx} ry={PLATE.ry} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <ellipse cx={PLATE.x} cy={PLATE.y - 2} rx={PLATE.rx - 14} ry={PLATE.ry - 6} fill="none" stroke={INK.black} strokeWidth={0.9} opacity={0.5} />
      <path d={outline} fill={INK.black} />
      <path d={sheen} fill={INK.paper} />
      <path d={`M${ROCK.x - 60} ${ROCK.y - 32} Q${ROCK.x - 46} ${ROCK.y - 52} ${ROCK.x - 20} ${ROCK.y - 58}`} fill="none" stroke={INK.paper} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${ROCK.x + 10} ${ROCK.y - 20} l14 10 l-4 14 M${ROCK.x + 24} ${ROCK.y - 10} l18 -6`} fill="none" stroke={INK.paper} strokeWidth={0.9} opacity={0.5} />
      <path d={outline} fill="none" stroke={INK.black} strokeWidth={1.4} strokeLinejoin="round" />
    </g>
  );
}

function Radiation() {
  const from = -168;
  const to = -12;
  return (
    <g>
      {RINGS.map((r, i) => {
        const a = (from * Math.PI) / 180;
        const b = (to * Math.PI) / 180;
        return (
          <path
            key={r}
            d={`M${round(ROCK.x + Math.cos(a) * r)} ${round(ROCK.y + Math.sin(a) * r * 0.92)}A${r} ${round(r * 0.92)} 0 0 1 ${round(ROCK.x + Math.cos(b) * r)} ${round(ROCK.y + Math.sin(b) * r * 0.92)}`}
            fill="none"
            stroke={INK.orange}
            strokeWidth={3.2 - i * 0.5}
            strokeLinecap="round"
            strokeDasharray={`0.1 ${7 + i * 2}`}
            opacity={1 - i * 0.16}
          />
        );
      })}
      {[-158, -136, -114, -90, -66, -44, -22].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const r0 = 208;
        const r1 = 222;
        return (
          <line
            key={deg}
            x1={round(ROCK.x + Math.cos(a) * r0)}
            y1={round(ROCK.y + Math.sin(a) * r0 * 0.92)}
            x2={round(ROCK.x + Math.cos(a) * r1)}
            y2={round(ROCK.y + Math.sin(a) * r1 * 0.92)}
            stroke={INK.orange}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Meter() {
  const { faceDots } = useRockDots();
  const tip = dialPoint(METER.r * 0.86, 0.86);
  const uranium = 0.48;
  const face = `${dialArc(METER.r, 0, 1)}L${METER.x} ${METER.y}Z`;
  return (
    <g>
      <rect x={METER.x - 82 + 6} y={METER.y - 4 + 6} width={164} height={60} fill={INK.blue} />
      <rect x={METER.x - 82} y={METER.y - 4} width={164} height={60} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <path d={face} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <path d={faceDots} fill={INK.orange} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = dialPoint(METER.r * (i % 5 === 0 ? 0.78 : 0.87), i / 10);
        const b = dialPoint(METER.r, i / 10);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK.black} strokeWidth={i % 5 === 0 ? 1.6 : 1} />;
      })}
      <path d={dialArc(METER.r * 0.93, 0.62, 1)} fill="none" stroke={INK.orange} strokeWidth={4} />
      <line
        x1={METER.x}
        y1={METER.y}
        x2={dialPoint(METER.r * 1.1, uranium).x}
        y2={dialPoint(METER.r * 1.1, uranium).y}
        stroke={INK.black}
        strokeWidth={1.2}
        strokeDasharray="4 3"
      />
      <line x1={METER.x} y1={METER.y} x2={tip.x} y2={tip.y} stroke={INK.black} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={METER.x} cy={METER.y} r={5.5} fill={INK.orange} stroke={INK.black} strokeWidth={1.2} />
      <Mono x={METER.x} y={METER.y + 30} size={11} track={0.2} textAnchor="middle">
        MEDIDOR
      </Mono>
      <Mono x={METER.x} y={METER.y + 46} size={8.5} track={0.16} fill={SOFT} textAnchor="middle">
        RADIAÇÃO DA AMOSTRA
      </Mono>
      <Hand x={dialPoint(METER.r * 1.2, uranium).x - 4} y={dialPoint(METER.r * 1.2, uranium).y - 6} size={17} fill={INK.pencil} textAnchor="middle">
        só o urânio
      </Hand>
      <Hand x={dialPoint(METER.r * 1.28, 0.95).x + 22} y={dialPoint(METER.r * 1.28, 0.95).y + 6} size={21} fill={INK.orange} textAnchor="middle">
        a mais!
      </Hand>
      <path d={`M${METER.x} ${METER.y + 56} C${METER.x} ${METER.y + 150} ${PLATE.x - 150} ${PLATE.y - 30} ${PLATE.x - PLATE.rx + 6} ${PLATE.y - 4}`} fill="none" stroke={INK.black} strokeWidth={1.1} strokeDasharray="2 3" />
    </g>
  );
}

function Tiles() {
  const { tileDots } = useRockDots();
  const from = { x: ROCK.x + 12, y: ROCK.y - 66 };
  const to = { x: TILES[0].x - 6, y: TILES[0].y + 70 };
  return (
    <g>
      <path d={`M${from.x} ${from.y} C${from.x} ${from.y - 110} ${to.x - 50} ${to.y + 20} ${to.x} ${to.y}`} fill="none" stroke={INK.black} strokeWidth={1.1} strokeDasharray="2 4" />
      <path d="M0 0 L-7 -3.4 L-7 3.4 Z" transform={`translate(${to.x} ${to.y}) rotate(-12)`} fill={INK.black} />
      {TILES.map((tile) => (
        <rect key={`s-${tile.symbol}`} x={tile.x + 6} y={tile.y + 6} width={TILE.w} height={TILE.h} fill={INK.blue} />
      ))}
      {TILES.map((tile) => (
        <rect key={`p-${tile.symbol}`} x={tile.x} y={tile.y} width={TILE.w} height={TILE.h} fill={INK.paper} />
      ))}
      <path d={tileDots} fill={INK.orange} />
      {TILES.map((tile) => {
        const cx = tile.x + TILE.w / 2;
        return (
          <g key={tile.symbol}>
            <rect x={tile.x} y={tile.y} width={TILE.w} height={TILE.h} fill="none" stroke={INK.black} strokeWidth={1.5} />
            <Mono x={tile.x + 8} y={tile.y + 17} size={11} track={0.04}>
              {tile.number}
            </Mono>
            <Display x={cx} y={tile.y + 62} size={40} fontWeight={700} track={-0.02} textAnchor="middle">
              {tile.symbol}
            </Display>
            <Hand x={cx} y={tile.y + 82} size={18} textAnchor="middle">
              {tile.name}
            </Hand>
            <Mono x={cx} y={tile.y + 97} size={8.5} track={0.12} textAnchor="middle">
              {tile.date}
            </Mono>
          </g>
        );
      })}
      <Hand x={(TILES[0].x + TILES[1].x + TILE.w) / 2} y={TILES[0].y + TILE.h + 30} size={18} fill={INK.pencil} textAnchor="middle">
        Marie e Pierre Curie
      </Hand>
      <Mono x={TILES[0].x} y={TILES[0].y - 12} size={9} track={0.16} fill={SOFT}>
        ELEMENTOS NOVOS
      </Mono>
    </g>
  );
}

function Lattice() {
  const e = LATTICE.edge;
  const project = (x: number, y: number, z: number): Point => ({
    x: LATTICE.x + (x + z * 0.42) * e,
    y: LATTICE.y + (-y + z * 0.3) * e,
  });
  const corners: [number, number, number][] = [];
  for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) corners.push([x, y, z]);
  const faces: [number, number, number][] = [
    [0.5, 0.5, 0],
    [0.5, 0.5, 1],
    [0.5, 0, 0.5],
    [0.5, 1, 0.5],
    [0, 0.5, 0.5],
    [1, 0.5, 0.5],
  ];
  const inner: [number, number, number][] = [];
  for (const x of [0.25, 0.75]) for (const y of [0.25, 0.75]) for (const z of [0.25, 0.75]) inner.push([x, y, z]);
  const edges: [[number, number, number], [number, number, number]][] = [];
  corners.forEach((a) =>
    corners.forEach((b) => {
      const diff = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (diff === 1 && a.join() < b.join()) edges.push([a, b]);
    }),
  );
  const depth = (p: [number, number, number]) => -p[2];
  const atoms = [
    ...[...corners, ...faces].map((p) => ({ p, kind: "u" as const })),
    ...inner.map((p) => ({ p, kind: "o" as const })),
  ].sort((a, b) => depth(a.p) - depth(b.p));
  return (
    <g>
      {edges.map(([a, b], i) => {
        const pa = project(...a);
        const pb = project(...b);
        const back = (a[0] === 0 && b[0] === 0) || (a[1] === 0 && b[1] === 0) || (a[2] === 1 && b[2] === 1);
        return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={INK.blue} strokeWidth={1} strokeDasharray={back ? "3 3" : undefined} opacity={0.7} />;
      })}
      {atoms.map(({ p, kind }, i) => {
        const q = project(...p);
        return kind === "u" ? (
          <circle key={i} cx={q.x} cy={q.y} r={4.3} fill={INK.blue} stroke={INK.black} strokeWidth={0.8} />
        ) : (
          <circle key={i} cx={q.x} cy={q.y} r={2.7} fill={INK.orange} stroke={INK.black} strokeWidth={0.7} />
        );
      })}
      <circle cx={LATTICE.x + 4} cy={LATTICE.y + 52} r={4.4} fill={INK.blue} stroke={INK.black} strokeWidth={0.9} />
      <Mono x={LATTICE.x + 12} y={LATTICE.y + 55.5} size={8.5} track={0.14}>
        URÂNIO
      </Mono>
      <circle cx={LATTICE.x + 74} cy={LATTICE.y + 52} r={3} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} />
      <Mono x={LATTICE.x + 81} y={LATTICE.y + 55.5} size={8.5} track={0.14}>
        OXIGÊNIO
      </Mono>
      <Mono x={LATTICE.x} y={LATTICE.y - 92} size={9} track={0.16} fill={SOFT}>
        PECHBLENDA POR DENTRO
      </Mono>
    </g>
  );
}

function Check({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <circle r={9} fill={INK.orange} stroke={INK.black} strokeWidth={1.3} />
      <path d="M-4.4 0.4 L-1.3 3.8 L4.8 -3.6" fill="none" stroke={INK.paper} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Gauge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={20} height={14} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
      <path d="M3.5 11 A6.5 6.5 0 0 1 16.5 11" fill="none" stroke={INK.black} strokeWidth={1} />
      <path d="M10 11 L14.5 5.5" stroke={INK.orange} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function Pencil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-38)`}>
      <rect width={17} height={5} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
      <path d="M0 0 L-5 2.5 L0 5 Z" fill="#f3d9b8" stroke={INK.black} strokeWidth={0.8} />
    </g>
  );
}

function ScoreCard({ data }: { data: CertificateData }) {
  const { x, y, w, h } = CARD;
  const mid = x + 150;
  const total = data.score.of ?? data.score.value;
  const rows = data.stats.slice(0, 2);
  const perRow = Math.ceil(total / 2);
  return (
    <g transform={`rotate(-1.5 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 7} y={y + 7} width={w} height={h} fill={INK.blue} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <Gauge x={x + 14} y={y + 15} />
      <Mono x={x + 41} y={y + 27} size={9.5} track={0.13}>
        MEDIDOR
      </Mono>
      <Pencil x={mid + 14} y={y + 30} />
      <Mono x={mid + 32} y={y + 27} size={9.5} track={0.13}>
        CADERNO
      </Mono>
      <line x1={x + 12} y1={y + 42} x2={x + w - 12} y2={y + 42} stroke={INK.black} strokeOpacity={0.3} />
      <line x1={mid} y1={y + 12} x2={mid} y2={y + 236} stroke={INK.black} strokeOpacity={0.3} />

      <Mono x={x + 16} y={y + 66} size={9.5} track={0.13} fill={SOFT}>
        {data.score.unit.toUpperCase()}
      </Mono>
      {data.score.of !== undefined && (
        <Mono x={x + 16} y={y + 84} size={12} track={0.06} fill={SOFT}>
          {`de ${data.score.of}`}
        </Mono>
      )}
      <Display x={mid - 14} y={y + 136} size={80} track={-0.04} textAnchor="end">
        {data.score.value}
      </Display>
      <Hand x={mid + 18} y={y + 130} size={54} fill={INK.pencil}>
        {data.score.value}
      </Hand>
      <Check x={x + w - 22} y={y + 108} />

      {rows.map((row, i) => {
        const top = y + 152 + i * 42;
        return (
          <g key={row.label}>
            <line x1={x + 12} y1={top} x2={x + w - 12} y2={top} stroke={INK.black} strokeOpacity={0.3} />
            <Mono x={x + 16} y={top + 26} size={9.5} track={0.13} fill={SOFT}>
              {row.label}
            </Mono>
            <Mono x={mid - 14} y={top + 29} size={21} textAnchor="end">
              {row.value}
            </Mono>
            <Hand x={mid + 18} y={top + 31} size={30} fill={INK.pencil}>
              {row.value}
            </Hand>
            <Check x={x + w - 22} y={top + 21} size={0.8} />
          </g>
        );
      })}

      <line x1={x + 12} y1={y + 244} x2={x + w - 12} y2={y + 244} stroke={INK.black} strokeOpacity={0.3} />
      {Array.from({ length: total }, (_, i) => {
        const found = i < data.score.value;
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        return (
          <g key={i} transform={`translate(${x + 18 + col * 33} ${y + 251 + row * 24}) scale(0.95)`}>
            <path d={STONE_PIP} fill={found ? INK.orange : "none"} stroke={INK.black} strokeWidth={1.4} strokeLinejoin="round" />
            {!found && <path d="M6 4 L18 17 M18 4 L6 17" stroke={INK.blue} strokeWidth={1.8} />}
          </g>
        );
      })}
    </g>
  );
}

function Stamp({ text, date, x, y }: { text: string; date: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <rect x={-71} y={-24} width={148} height={54} fill={INK.black} opacity={0.85} />
      <rect x={-74} y={-27} width={148} height={54} fill={INK.paper} stroke={INK.orange} strokeWidth={3.5} />
      <Display x={0} y={4} size={24} fontWeight={700} track={0.14} fill={INK.orange} textAnchor="middle">
        {text}
      </Display>
      <Mono x={0} y={19} size={9.5} track={0.2} fill={INK.orange} textAnchor="middle">
        {date}
      </Mono>
    </g>
  );
}

function useInsetDots() {
  return useMemo(() => {
    const stone = { x: INSET.x, y: INSET.y + 8 };
    const glow = halftone({ x: INSET.x - INSET.r, y: INSET.y - INSET.r, w: INSET.r * 2, h: INSET.r * 2 }, 3.8, 75, (x, y) => {
      const d = Math.hypot(x - stone.x, (y - stone.y) * 1.15);
      if (d < 30 || d > 82) return 0;
      return 0.75 * Math.pow(1 - (d - 30) / 52, 1.2);
    }, 0.52);
    const table = halftone({ x: INSET.x - INSET.r, y: INSET.y + 34, w: INSET.r * 2, h: INSET.r }, 4.2, 15, (_, y) => 0.18 + 0.4 * Math.min(1, (y - INSET.y - 34) / 70), 0.5);
    return { stone, glow, table };
  }, []);
}

function Inset({ uid }: { uid: string }) {
  const { stone, glow, table } = useInsetDots();
  const rays = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2 + 0.3);
  return (
    <g>
      <circle cx={INSET.x + 7} cy={INSET.y + 7} r={INSET.r} fill={INK.orange} />
      <clipPath id={`${uid}-inset`}>
        <circle cx={INSET.x} cy={INSET.y} r={INSET.r} />
      </clipPath>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill={INK.paper} />
      <g clipPath={`url(#${uid}-inset)`}>
        <path d={table} fill={INK.blue} />
        <line x1={INSET.x - INSET.r} y1={INSET.y + 34} x2={INSET.x + INSET.r} y2={INSET.y + 34} stroke={INK.black} strokeWidth={1.1} />
        <ellipse cx={stone.x} cy={stone.y + 30} rx={58} ry={13} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
        <ellipse cx={stone.x} cy={stone.y + 29} rx={46} ry={8} fill="#c9c6f3" stroke={INK.black} strokeWidth={0.9} opacity={0.9} />
        <path d={glow} fill={INK.orange} />
        {rays.map((a, i) => (
          <line
            key={i}
            x1={round(stone.x + Math.cos(a) * 40)}
            y1={round(stone.y + Math.sin(a) * 34)}
            x2={round(stone.x + Math.cos(a) * 54)}
            y2={round(stone.y + Math.sin(a) * 46)}
            stroke={INK.orange}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        ))}
        <path d="M-26 6 Q-28 -10 -12 -16 Q4 -22 18 -14 Q30 -6 24 8 Q16 18 0 17 Q-20 18 -26 6 Z" transform={`translate(${stone.x} ${stone.y})`} fill={INK.black} stroke={INK.orange} strokeWidth={2.2} />
        {[
          [-10, -6],
          [6, -9],
          [12, 4],
          [-4, 8],
        ].map(([dx, dy]) => (
          <circle key={`${dx}-${dy}`} cx={stone.x + dx} cy={stone.y + dy} r={1.4} fill={INK.paper} />
        ))}
        <g transform={`translate(${INSET.x - 70} ${INSET.y - 54}) rotate(-6)`}>
          <rect x={0} y={-19} width={86} height={26} fill={INK.paper} stroke={INK.black} strokeWidth={1.1} />
          <Hand x={43} y={1} size={21} textAnchor="middle">
            esta brilha!
          </Hand>
        </g>
      </g>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill="none" stroke={INK.black} strokeWidth={1.5} />
    </g>
  );
}

function CurieArt({ data, uid }: PlateArtProps) {
  const date = formatDate(data.achievedAt);
  const callout = { x: ROCK.x + 10, y: ROCK.y - 6, r: 92 };
  const lines = tangents(callout, INSET);
  return (
    <g>
      <Mono x={652} y={206} size={11} track={0.16}>
        MEDIÇÕES DE MARIE CURIE · PARIS, 1898
      </Mono>
      <Mono x={652} y={224} size={11} track={0.16} fill={SOFT}>
        ESQUEMA FORA DE ESCALA
      </Mono>

      {lines.map((line, i) => (
        <line key={i} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={INK.black} strokeWidth={0.8} strokeOpacity={0.55} strokeDasharray="5 4" />
      ))}
      <Radiation />
      <Rock />
      <Hand x={PLATE.x + PLATE.rx + 8} y={PLATE.y + 26} size={20} fill={INK.pencil}>
        pechblenda
      </Hand>
      <Mono x={ROCK.x - 214} y={ROCK.y - 34} size={9.5} track={0.16} fill={INK.orange} fontWeight={500} textAnchor="end">
        RADIAÇÃO
      </Mono>
      <Mono x={ROCK.x - 214} y={ROCK.y - 20} size={9} track={0.16} fill={SOFT} textAnchor="end">
        INVISÍVEL A OLHO NU
      </Mono>
      <Meter />
      <Tiles />
      <Lattice />
      <path d={`M${ROCK.x - 64} ${ROCK.y + 30} Q${ROCK.x - 110} ${ROCK.y + 90} ${LATTICE.x + 104} ${LATTICE.y - 76}`} fill="none" stroke={INK.black} strokeWidth={0.9} strokeDasharray="2 3" />

      <Inset uid={uid} />
      <Mono x={INSET.x + INSET.r + 2} y={INSET.y + INSET.r + 28} size={10} track={0.16} textAnchor="end">
        DETALHE · NO JOGO
      </Mono>

      <ScoreCard data={data} />
      <Stamp text="MEDIDO" date={`${date.day} ${date.month} ${date.year}`} x={CARD.x + CARD.w - 86} y={CARD.y + CARD.h + 26} />
    </g>
  );
}

const bench = BENCHES.find((b) => b.id === "curie");
if (!bench?.reveal.photo) throw new Error("curie bench is missing");

export const curiePlate: Plate = {
  scientist: {
    name: "Marie Curie",
    line: "Física e química. Com Pierre, achou o polônio e o rádio em 1898.",
    photo: { ...bench.reveal.photo, focus: [0.58, 0.36], zoom: 1.7 },
    credit: "FOTO: FUNDAÇÃO NOBEL, 1903, DOMÍNIO PÚBLICO",
  },
  game: { name: bench.task, room: bench.room, unit: "pedras" },
  stamp: "MEDIDO",
  demo: {
    bench: "curie",
    name: "Ana Clara Rocha",
    position: 1,
    score: { value: 12, of: 14, unit: "pedras" },
    stats: [
      { label: "SEGUIDAS", value: "7" },
      { label: "ENGANOS", value: "0" },
    ],
    achievedAt: "2026-10-26T15:42:00",
    serial: 0,
    demo: true,
  },
  describe: (data) => `${data.position}º lugar no ranking do dia de ${bench.task}. ${data.score.value}${data.score.of ? ` de ${data.score.of}` : ""} pedras que brilhavam.`,
  Art: CurieArt,
};
