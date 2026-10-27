import { useMemo } from "react";
import { BENCHES } from "../../benches.ts";
import { CAPSULE_BODY, CAPSULE_SHIELD, CAPSULE_WINDOW, SHIP_DECK, SHIP_FLAG, SHIP_HULL, SHIP_LINES } from "../../johnson/sprites.ts";
import { INK } from "../../riso/inks.ts";
import { formatDate, halftone, type Box, type CertificateData } from "../certificate.ts";
import type { Plate, PlateArtProps } from "../plate.ts";
import { Display, Hand, Mono, SOFT } from "../text.tsx";
import { LAND, landPath, lonLat, meridian, parallel, VIEW, type Globe } from "./earth.ts";

type Point = { x: number; y: number };

const GLOBE: Globe = { x: 872, y: 556, r: 198 };
const DEG = Math.PI / 180;
const ORBIT = { rx: GLOBE.r * 1.5, ry: GLOBE.r * 0.38 };
const TILTS = [-1.5, -4.5, -7.5].map((d) => d * DEG);
const RETRO = 4.12;
const LIGHT = (() => {
  const v = { x: -0.55, y: -0.62, z: 0.56 };
  const len = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
})();
const SPLASH = { lon: -68.7, lat: 21.4 };
const INSET = { x: 1300, y: 758, r: 102 };
const CARD = { x: 1150, y: 202, w: 263, h: 300 };
const PIP = "M3 22 L6.5 8 L13.5 8 L17 22 Z M7.5 8 L7.5 4 L12.5 4 L12.5 8 M9 4 L9 1.5 L11 1.5 L11 4";

function orbitPoint(tilt: number, theta: number): Point {
  const x = ORBIT.rx * Math.cos(theta);
  const y = ORBIT.ry * Math.sin(theta);
  return { x: GLOBE.x + x * Math.cos(tilt) - y * Math.sin(tilt), y: GLOBE.y + x * Math.sin(tilt) + y * Math.cos(tilt) };
}

function orbitArc(tilt: number, from: number, to: number, steps = 120) {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = orbitPoint(tilt, from + ((to - from) * i) / steps);
    parts.push(`${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return parts.join(" ");
}

function bezier([a, b, c, d]: Point[], k: number): Point {
  const u = 1 - k;
  return {
    x: u * u * u * a.x + 3 * u * u * k * b.x + 3 * u * k * k * c.x + k * k * k * d.x,
    y: u * u * u * a.y + 3 * u * u * k * b.y + 3 * u * k * k * c.y + k * k * k * d.y,
  };
}

function lambert(x: number, y: number) {
  const nx = (x - GLOBE.x) / GLOBE.r;
  const ny = (y - GLOBE.y) / GLOBE.r;
  const d2 = nx * nx + ny * ny;
  if (d2 > 1) return -1;
  const nz = Math.sqrt(1 - d2);
  return Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
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

function useEarth() {
  return useMemo(() => {
    const box: Box = { x: GLOBE.x - GLOBE.r, y: GLOBE.y - GLOBE.r, w: GLOBE.r * 2, h: GLOBE.r * 2 };
    const halo = 24;
    const air: Box = { x: box.x - halo, y: box.y - halo, w: box.w + halo * 2, h: box.h + halo * 2 };
    const ocean = halftone(box, 6.6, 15, (x, y) => {
      const l = lambert(x, y);
      return l < 0 ? 0 : 0.06 + 0.58 * Math.pow(1 - l, 1.6);
    }, 0.52);
    const land = halftone(box, 4.4, 75, (x, y) => {
      const l = lambert(x, y);
      return l < 0 ? 0 : 0.14 + 0.5 * Math.pow(1 - l, 1.2);
    }, 0.5);
    const glow = halftone(air, 4.4, 15, (x, y) => {
      const d = Math.hypot(x - GLOBE.x, y - GLOBE.y);
      if (d <= GLOBE.r + 3 || d > GLOBE.r + halo) return 0;
      return 0.42 * Math.pow(1 - (d - GLOBE.r) / halo, 1.7);
    });
    const coasts = LAND.map((ring) => landPath(GLOBE, ring)).join("");
    const grid = [
      ...[-60, -30, 30, 60].map((lat) => parallel(GLOBE, lat)),
      ...[-150, -120, -90, -60, -30, 0, 30].map((lon) => meridian(GLOBE, lon)),
    ].join("");
    const equator = parallel(GLOBE, 0);
    const orbits = TILTS.map((tilt) => ({ back: orbitArc(tilt, 0, Math.PI), front: orbitArc(tilt, Math.PI, 2 * Math.PI) }));
    const lapLabels = TILTS.map((tilt) => orbitPoint(tilt, Math.PI));
    const capsule = orbitPoint(TILTS[2], RETRO);
    const ahead = orbitPoint(TILTS[2], RETRO + 0.02);
    const len = Math.hypot(ahead.x - capsule.x, ahead.y - capsule.y) || 1;
    const heading = { x: (ahead.x - capsule.x) / len, y: (ahead.y - capsule.y) / len };
    const splash = lonLat(GLOBE, SPLASH.lon, SPLASH.lat);
    const curve = [capsule, { x: capsule.x + heading.x * 60, y: capsule.y + heading.y * 60 }, { x: splash.x - 30, y: splash.y - 30 }, splash];
    const descent: Point[] = [];
    for (let k = 0.12; k <= 0.93; k += 0.09) descent.push(bezier(curve, k));
    const equatorEdge = lonLat(GLOBE, VIEW.lon - 88, 0);
    return { ocean, land, glow, coasts, grid, equator, orbits, lapLabels, capsule, heading, splash, descent, equatorEdge };
  }, []);
}

function useInsetDots() {
  return useMemo(() => {
    const box: Box = { x: INSET.x - INSET.r, y: INSET.y - INSET.r, w: INSET.r * 2, h: INSET.r * 2 };
    const horizon = INSET.y + 12;
    const sea = halftone({ ...box, y: horizon, h: box.y + box.h - horizon }, 4.4, 15, (_, y) => 0.28 + 0.6 * Math.min(1, (y - horizon) / (INSET.r * 0.85)), 0.54);
    const sun = { x: INSET.x + 52, y: horizon, r: 40 };
    const sunDots = halftone({ x: sun.x - sun.r, y: sun.y - sun.r, w: sun.r * 2, h: sun.r }, 3.6, 72, (x, y) => {
      const d = Math.hypot(x - sun.x, y - sun.y);
      return d > sun.r ? 0 : 0.36 + 0.42 * (1 - d / sun.r);
    });
    return { sea, sunDots, horizon };
  }, []);
}

function CapsuleSprite({ at, heading, scale }: { at: Point; heading: Point; scale: number }) {
  const angle = (Math.atan2(heading.y, heading.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${angle}) scale(${scale})`}>
      <path d="M2 -9 Q34 0 2 9 Z" fill={INK.orange} transform="translate(2 0)" />
      <path d={CAPSULE_BODY} fill={INK.black} />
      <path d={CAPSULE_WINDOW} fill={INK.blue} />
      <path d={CAPSULE_SHIELD} fill="#5a5a5a" />
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

function Pencil({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-38)`}>
      <rect width={17} height={5} fill={INK.orange} stroke={INK.black} strokeWidth={1} />
      <path d="M0 0 L-5 2.5 L0 5 Z" fill="#f3d9b8" stroke={INK.black} strokeWidth={0.8} />
    </g>
  );
}

function Computer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={18} height={14} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
      <circle cx={5.5} cy={5.5} r={3} fill="none" stroke={INK.black} strokeWidth={1} />
      <circle cx={12.5} cy={5.5} r={3} fill="none" stroke={INK.black} strokeWidth={1} />
      <rect x={3} y={10.5} width={12} height={1.6} fill={INK.blue} />
    </g>
  );
}

function ScoreCard({ data }: { data: CertificateData }) {
  const { x, y, w, h } = CARD;
  const mid = x + 150;
  const total = data.score.of ?? data.score.value;
  const rows = data.stats.slice(0, 2);
  return (
    <g transform={`rotate(-1.5 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 7} y={y + 7} width={w} height={h} fill={INK.blue} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <Computer x={x + 14} y={y + 15} />
      <Mono x={x + 39} y={y + 27} size={9.5} track={0.13}>
        PLACAR
      </Mono>
      <Pencil x={mid + 14} y={y + 30} />
      <Mono x={mid + 32} y={y + 27} size={9.5} track={0.13}>
        CONFERIDO
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
        const rescued = i < data.score.value;
        return (
          <g key={i} transform={`translate(${x + 18 + i * 23} ${y + 258}) scale(0.95)`}>
            <path d={PIP} fill={rescued ? INK.orange : "none"} stroke={INK.black} strokeWidth={1.3} strokeLinejoin="round" />
            {!rescued && <path d="M4 4 L16 20 M16 4 L4 20" stroke={INK.blue} strokeWidth={1.8} />}
          </g>
        );
      })}
    </g>
  );
}

function Stamp({ text, date, x, y }: { text: string; date: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <rect x={-81} y={-24} width={168} height={54} fill={INK.black} opacity={0.85} />
      <rect x={-84} y={-27} width={168} height={54} fill={INK.paper} stroke={INK.orange} strokeWidth={3.5} />
      <Display x={0} y={4} size={23} fontWeight={700} track={0.12} fill={INK.orange} textAnchor="middle">
        {text}
      </Display>
      <Mono x={0} y={19} size={9.5} track={0.2} fill={INK.orange} textAnchor="middle">
        {date}
      </Mono>
    </g>
  );
}

function Inset({ uid }: { uid: string }) {
  const { sea, sunDots, horizon } = useInsetDots();
  const chute = { x: INSET.x - 14, y: INSET.y - 34 };
  const target = { x: chute.x, y: horizon + 22 };
  const ship = { x: INSET.x + 38, y: INSET.y + 64 };
  return (
    <g>
      <circle cx={INSET.x + 7} cy={INSET.y + 7} r={INSET.r} fill={INK.orange} />
      <clipPath id={`${uid}-inset`}>
        <circle cx={INSET.x} cy={INSET.y} r={INSET.r} />
      </clipPath>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill={INK.paper} />
      <g clipPath={`url(#${uid}-inset)`}>
        <path d={sunDots} fill={INK.orange} />
        <path d={sea} fill={INK.blue} />
        <line x1={INSET.x - INSET.r} y1={horizon} x2={INSET.x + INSET.r} y2={horizon} stroke={INK.black} strokeWidth={1.2} />
        {[
          [-82, 42, 22],
          [-44, 58, 16],
          [26, 40, 18],
          [-70, 80, 14],
          [-6, 90, 18],
        ].map(([dx, dy, len]) => (
          <line key={`${dx}-${dy}`} x1={INSET.x + dx} y1={INSET.y + dy} x2={INSET.x + dx + len} y2={INSET.y + dy} stroke={INK.paper} strokeWidth={2.2} strokeLinecap="round" />
        ))}
        <g transform={`translate(${target.x} ${target.y})`}>
          <ellipse rx={20} ry={6.5} fill={INK.paper} stroke={INK.orange} strokeWidth={2.4} />
          <path d="M-7 -3 L7 3 M7 -3 L-7 3" stroke={INK.orange} strokeWidth={2.2} strokeLinecap="round" />
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={chute.x} cy={chute.y + 36 + i * 9} r={2.2} fill={INK.orange} opacity={i < 3 ? 1 : 0} />
        ))}
        <g transform={`translate(${ship.x} ${ship.y}) scale(-0.7 0.7)`}>
          <path d={SHIP_HULL} fill={INK.paper} stroke={INK.black} strokeWidth={3.2} strokeLinejoin="round" />
          <path d={SHIP_DECK} fill={INK.paper} stroke={INK.black} strokeWidth={2.8} strokeLinejoin="round" />
          <path d={SHIP_LINES} fill="none" stroke={INK.black} strokeWidth={2.4} />
          <path d={SHIP_FLAG} fill={INK.orange} />
          <path d="M-59 -3.4 L56 -3.4" stroke={INK.orange} strokeWidth={4} />
        </g>
        <g transform={`translate(${chute.x} ${chute.y})`}>
          <path d="M-28 -6 Q0 -44 28 -6 Z" fill={INK.paper} />
          <path d="M-28 -6 Q-23 -27 -11 -34 L-7 -6 Z M7 -6 L11 -34 Q23 -27 28 -6 Z" fill={INK.orange} />
          <path d="M-28 -6 Q0 -44 28 -6 Z" fill="none" stroke={INK.black} strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M-28 -6 L-3 20 M28 -6 L3 20 M-9 -6 L-1.5 20 M9 -6 L1.5 20" stroke={INK.black} strokeWidth={0.9} />
          <g transform="translate(0 30) rotate(-90) scale(0.42)">
            <path d={CAPSULE_BODY} fill={INK.black} />
            <path d={CAPSULE_WINDOW} fill={INK.blue} />
            <path d={CAPSULE_SHIELD} fill="#5a5a5a" />
          </g>
        </g>
        <g transform={`translate(${INSET.x - 92} ${horizon - 14}) rotate(-6)`}>
          <rect x={0} y={-19} width={64} height={26} fill={INK.paper} stroke={INK.black} strokeWidth={1.1} />
          <Hand x={32} y={1} size={21} textAnchor="middle">
            cai aqui
          </Hand>
        </g>
      </g>
      <circle cx={INSET.x} cy={INSET.y} r={INSET.r} fill="none" stroke={INK.black} strokeWidth={1.5} />
    </g>
  );
}

function JohnsonArt({ data, uid }: PlateArtProps) {
  const earth = useEarth();
  const date = formatDate(data.achievedAt);
  const callout = { x: earth.splash.x, y: earth.splash.y, r: 14 };
  const lines = tangents(callout, INSET);

  return (
    <g>
      <Mono x={652} y={206} size={11} track={0.16}>
        VOO DE JOHN GLENN · 20 FEV 1962
      </Mono>
      <Mono x={652} y={224} size={11} track={0.16} fill={SOFT}>
        3 VOLTAS EM 4 H 55 MIN · ESQUEMA FORA DE ESCALA
      </Mono>

      {earth.orbits.map((orbit, i) => (
        <path key={i} d={orbit.back} fill="none" stroke={INK.black} strokeOpacity={0.22} strokeWidth={1} strokeDasharray="3 5" />
      ))}

      <path d={earth.glow} fill={INK.blue} />
      <circle cx={GLOBE.x} cy={GLOBE.y} r={GLOBE.r} fill={INK.paper} />
      <path d={earth.ocean} fill={INK.blue} />
      <clipPath id={`${uid}-land`}>
        <path d={earth.coasts} />
      </clipPath>
      <clipPath id={`${uid}-globe`}>
        <circle cx={GLOBE.x} cy={GLOBE.y} r={GLOBE.r} />
      </clipPath>
      <g clipPath={`url(#${uid}-globe)`}>
        <path d={earth.coasts} fill={INK.land} />
        <g clipPath={`url(#${uid}-land)`}>
          <path d={earth.land} fill={INK.orange} />
        </g>
        <path d={earth.coasts} fill="none" stroke={INK.orange} strokeWidth={1.1} strokeLinejoin="round" />
        <path d={earth.grid} fill="none" stroke={INK.blue} strokeWidth={0.8} opacity={0.4} />
        <path d={earth.equator} fill="none" stroke={INK.orange} strokeWidth={1.5} strokeDasharray="5 4" />
      </g>
      <circle cx={GLOBE.x} cy={GLOBE.y} r={GLOBE.r} fill="none" stroke={INK.blue} strokeWidth={2} />
      <path
        d={`M ${GLOBE.x - GLOBE.r * 0.78} ${GLOBE.y - GLOBE.r * 0.42} A ${GLOBE.r * 0.9} ${GLOBE.r * 0.9} 0 0 1 ${GLOBE.x - GLOBE.r * 0.2} ${GLOBE.y - GLOBE.r * 0.86}`}
        fill="none"
        stroke={INK.paper}
        strokeOpacity={0.85}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Mono x={earth.equatorEdge.x - 12} y={earth.equatorEdge.y + 4} size={10} track={0.16} fill={INK.orange} textAnchor="end">
        EQUADOR
      </Mono>

      {earth.orbits.map((orbit, i) => (
        <path
          key={i}
          d={orbit.front}
          fill="none"
          stroke={INK.black}
          strokeOpacity={0.45 + i * 0.2}
          strokeWidth={i === 2 ? 1.5 : 1.1}
          strokeDasharray={i === 2 ? undefined : "4 4"}
        />
      ))}
      {earth.lapLabels.map((p, i) => (
        <g key={i}>
          <line x1={p.x - 4} y1={p.y} x2={p.x - 22} y2={p.y + 8 + i * 6} stroke={INK.black} strokeWidth={0.8} />
          <Mono x={p.x - 26} y={p.y + 12 + i * 6} size={10} track={0.12} textAnchor="end">
            {`${i + 1}ª VOLTA`}
          </Mono>
        </g>
      ))}

      {earth.descent.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={INK.orange} stroke={INK.black} strokeWidth={0.7} />
      ))}
      <CapsuleSprite at={earth.capsule} heading={earth.heading} scale={0.6} />
      <g transform={`translate(${earth.splash.x} ${earth.splash.y})`}>
        <ellipse rx={8} ry={3.6} fill={INK.orange} stroke={INK.black} strokeWidth={0.9} />
      </g>
      <circle cx={callout.x} cy={callout.y} r={callout.r} fill="none" stroke={INK.black} strokeWidth={1} strokeDasharray="3 3" />
      {lines.map((line, i) => (
        <line key={i} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={INK.black} strokeWidth={0.8} strokeOpacity={0.7} />
      ))}
      <Inset uid={uid} />
      <Mono x={INSET.x + INSET.r + 2} y={INSET.y + INSET.r + 28} size={10} track={0.16} textAnchor="end">
        DETALHE · O RESGATE
      </Mono>

      <ScoreCard data={data} />
      <Stamp text="CONFERIDO" date={`${date.day} ${date.month} ${date.year}`} x={CARD.x + CARD.w - 96} y={CARD.y + CARD.h + 26} />
    </g>
  );
}

const bench = BENCHES.find((b) => b.id === "johnson");
if (!bench?.reveal.photo) throw new Error("johnson bench is missing");

export const johnsonPlate: Plate = {
  scientist: {
    name: "Katherine Johnson",
    line: "Matemática da NASA. Em 1962, conferiu à mão as contas do computador para o voo de John Glenn.",
    photo: { ...bench.reveal.photo, focus: [0.43, 0.3], zoom: 2.5 },
    credit: "FOTO: NASA, 1966, DOMÍNIO PÚBLICO",
  },
  game: { name: bench.task, room: bench.room, unit: "resgates" },
  stamp: "CONFERIDO",
  describe: (data) => `${data.position}º lugar no ranking do dia de ${bench.task}. ${data.score.value}${data.score.of ? ` de ${data.score.of}` : ""} ${data.score.unit}.`,
  Art: JohnsonArt,
};
