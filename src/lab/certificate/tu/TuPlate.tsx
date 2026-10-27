import { useMemo } from "react";
import { BENCHES } from "../../benches.ts";
import { INK } from "../../riso/inks.ts";
import { formatDate, halftone, type CertificateData } from "../certificate.ts";
import type { Plate, PlateArtProps } from "../plate.ts";
import { Display, Hand, Mono, SOFT } from "../text.tsx";
import { artemisinin, flaskPath, frond, heads, type Frond, type Point } from "./artemisia.ts";

const FLASK = { cx: 902, lip: 424, neck: 33, shoulder: 590, base: 862, half: 168 };
const LEVEL = 664;
const BOOK = { x: 646, y: 416, w: 146, h: 94 };
const THERMO = { x: 722, y: 842 };
const VIAL = { x: 1128, y: 846 };
const INSET = { x: 1300, y: 762, r: 100 };
const CARD = { x: 1150, y: 196, w: 263, h: 372 };
const GRID = { cols: 11, cell: 19.6 };
const STEM = { from: { x: FLASK.cx + 6, y: 850 }, to: { x: FLASK.cx - 10, y: 302 } };

function halfWidth(y: number) {
  if (y <= FLASK.shoulder) return FLASK.neck;
  return FLASK.neck + (FLASK.half - FLASK.neck) * Math.min(1, (y - FLASK.shoulder) / (FLASK.base - 18 - FLASK.shoulder));
}

function stemAt(k: number): Point {
  const { from, to } = STEM;
  const bend = Math.sin(k * Math.PI) * 10;
  return { x: from.x + (to.x - from.x) * k + bend, y: from.y + (to.y - from.y) * k };
}

function useSprig() {
  return useMemo(() => {
    const fronds: Frond[] = [];
    const inside = [0.03, 0.09, 0.15, 0.21, 0.27];
    inside.forEach((k, i) => {
      const at = stemAt(k);
      const side = i % 2 === 0 ? -1 : 1;
      const room = halfWidth(at.y) - 20;
      fronds.push(frond(at, side < 0 ? -165 + i * 4 : -15 - i * 4, Math.min(104, room), side * 0.14, 1.1, 11 + i));
    });
    const outside = [
      { k: 0.84, side: -1, len: 96, angle: -164 },
      { k: 0.86, side: 1, len: 112, angle: -14 },
      { k: 0.9, side: -1, len: 98, angle: -140 },
      { k: 0.92, side: 1, len: 94, angle: -38 },
      { k: 0.955, side: -1, len: 74, angle: -116 },
      { k: 0.965, side: 1, len: 70, angle: -62 },
    ];
    outside.forEach((f, i) => fronds.push(frond(stemAt(f.k), f.angle, f.len, f.side * 0.22, 1.35, 31 + i)));
    const panicles = [
      heads(stemAt(0.995), -92, 40, 5, 71),
      heads(fronds[fronds.length - 2].tip, -150, 26, 4, 72),
      heads(fronds[fronds.length - 1].tip, -30, 26, 4, 73),
      heads(fronds[5].tip, -120, 22, 3, 74),
      heads(fronds[6].tip, -60, 22, 3, 75),
    ];
    const stem = Array.from({ length: 41 }, (_, i) => stemAt(i / 40))
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join("");
    return { fronds, panicles, stem };
  }, []);
}

function useLiquid() {
  return useMemo(() => {
    const box = { x: FLASK.cx - FLASK.half, y: LEVEL, w: FLASK.half * 2, h: FLASK.base - LEVEL };
    return halftone(box, 5.8, 15, (_, y) => 0.07 + 0.46 * Math.pow((y - LEVEL) / (FLASK.base - LEVEL), 1.2), 0.55);
  }, []);
}

function Sprig() {
  const { fronds, panicles, stem } = useSprig();
  return (
    <g>
      <path d={stem} fill="none" stroke={INK.black} strokeWidth={2.4} strokeLinecap="round" />
      {fronds.map((fr, i) => (
        <g key={i}>
          <path d={fr.rachis} fill="none" stroke={INK.black} strokeWidth={1.1} strokeLinecap="round" />
          {fr.lobes.map((l, j) => (
            <ellipse key={j} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} fill={INK.blue} transform={`rotate(${l.angle.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} />
          ))}
        </g>
      ))}
      {panicles.map((p, i) => (
        <g key={i}>
          <path d={p.stalk} fill="none" stroke={INK.black} strokeWidth={0.9} strokeLinecap="round" />
          {p.heads.map((h, j) => (
            <circle key={j} cx={h.x} cy={h.y} r={h.r} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} />
          ))}
        </g>
      ))}
    </g>
  );
}

function Flask({ uid }: { uid: string }) {
  const liquid = useLiquid();
  const body = flaskPath(FLASK.cx, FLASK.lip, FLASK.neck, FLASK.shoulder, FLASK.base, FLASK.half);
  const marks = [
    { y: 800, label: "300" },
    { y: 742, label: "200" },
    { y: 684, label: "100" },
  ];
  return (
    <g>
      <clipPath id={`${uid}-flask`}>
        <path d={`${body}Z`} />
      </clipPath>
      <path d={`${body}Z`} fill={INK.paper} />
      <Sprig />
      <g clipPath={`url(#${uid}-flask)`}>
        <path d={liquid} fill={INK.blue} />
      </g>
      <path d={`M${FLASK.cx - halfWidth(LEVEL) + 6} ${LEVEL} Q${FLASK.cx} ${LEVEL + 7} ${FLASK.cx + halfWidth(LEVEL) - 6} ${LEVEL}`} fill="none" stroke={INK.blue} strokeWidth={1.6} />
      <path d={body} fill="none" stroke={INK.black} strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={FLASK.cx - FLASK.neck - 6} y={FLASK.lip - 8} width={(FLASK.neck + 6) * 2} height={10} rx={3} fill={INK.paper} stroke={INK.black} strokeWidth={1.6} />
      <path
        d={`M${FLASK.cx + FLASK.neck} ${FLASK.lip + 40} L${FLASK.cx + FLASK.neck + 30} ${FLASK.lip + 52} M${FLASK.cx + FLASK.neck} ${FLASK.lip + 52} L${FLASK.cx + FLASK.neck + 30} ${FLASK.lip + 64}`}
        fill="none"
        stroke={INK.black}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d={`M${FLASK.cx - FLASK.neck + 8} ${FLASK.lip + 26} V${FLASK.shoulder + 6} L${FLASK.cx - FLASK.half + 34} ${FLASK.base - 46}`}
        fill="none"
        stroke={INK.paper}
        strokeOpacity={0.85}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {marks.map((m) => {
        const x = FLASK.cx + halfWidth(m.y) - 4;
        return (
          <g key={m.y}>
            <line x1={x - 16} y1={m.y} x2={x} y2={m.y} stroke={INK.black} strokeWidth={1} />
            <Mono x={x - 20} y={m.y + 3.5} size={8.5} track={0.08} textAnchor="end" fill={INK.black}>
              {m.label}
            </Mono>
          </g>
        );
      })}
      <Mono x={FLASK.cx + halfWidth(850) - 22} y={850} size={8.5} track={0.1} textAnchor="end">
        mL
      </Mono>
    </g>
  );
}

const STROKES = ["M -5 -4 h 10", "M -5 0 h 10", "M -4 4 h 8", "M 0 -6 v 12", "M -3 -6 v 8", "M 3 -5 v 10", "M -5 5 l 4 -4", "M 5 5 l -4 -4", "M -4 -6 l 3 3", "M 1 -2 l 4 6", "M -5 -1 q 5 -3 10 0", "M -2 2 h 6 v 4"];

function glyph(cx: number, cy: number, seed: number) {
  const picks = [seed * 7, seed * 13 + 3, seed * 5 + 1, seed * 11 + 6].map((n) => STROKES[n % STROKES.length]);
  return picks
    .slice(0, 3 + (seed % 2))
    .map((d) => d.replace(/^M (-?\d+) (-?\d+)/, (_, px, py) => `M ${(cx + Number(px)).toFixed(1)} ${(cy + Number(py)).toFixed(1)}`))
    .join(" ");
}

function RecipeBook() {
  const { x, y, w, h } = BOOK;
  const cols = 6;
  return (
    <g transform={`rotate(-4 ${x + w / 2} ${y + h / 2})`}>
      <path d={`M ${x + 6} ${y + 8} H ${x + w + 6} V ${y + h + 8} H ${x + 6} Z`} fill={INK.blue} />
      <path
        d={`M ${x} ${y} Q ${x + w / 4} ${y - 7} ${x + w / 2} ${y + 4} Q ${x + (w * 3) / 4} ${y - 7} ${x + w} ${y} V ${y + h} Q ${x + (w * 3) / 4} ${y + h - 7} ${x + w / 2} ${y + h + 4} Q ${x + w / 4} ${y + h - 7} ${x} ${y + h} Z`}
        fill="#f3e7c9"
        stroke={INK.black}
        strokeWidth={1.4}
      />
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h + 4} stroke={INK.black} strokeWidth={1.2} />
      {Array.from({ length: cols }, (_, c) => {
        const cx = x + w - 16 - c * ((w - 30) / cols) - (c >= cols / 2 ? 10 : 0);
        return (
          <g key={c}>
            {Array.from({ length: 5 }, (_, r) => (
              <path key={r} d={glyph(cx, y + 18 + r * 16, c * 5 + r)} stroke={INK.black} strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.75} />
            ))}
          </g>
        );
      })}
      <rect x={x + 12} y={y + h - 26} width={16} height={16} fill={INK.orange} opacity={0.9} />
    </g>
  );
}

function Thermometer() {
  const { x, y } = THERMO;
  const length = 176;
  const level = 30;
  return (
    <g>
      <rect x={x - 7} y={y - length} width={14} height={length} rx={7} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <circle cx={x} cy={y} r={12} fill={INK.blue} stroke={INK.black} strokeWidth={1.4} />
      <rect x={x - 3} y={y - 10 - level} width={6} height={level + 4} fill={INK.blue} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={x + 7} y1={y - 26 - i * 26} x2={x + (i % 2 ? 12 : 16)} y2={y - 26 - i * 26} stroke={INK.black} strokeWidth={1} />
      ))}
      <g transform={`translate(${x - 22} ${y - length + 22})`}>
        {[0, 60, 120].map((a) => (
          <line key={a} x1={-8} y1={0} x2={8} y2={0} stroke={INK.blue} strokeWidth={2.2} strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
      </g>
      <Hand x={x - 22} y={y - length + 54} size={20} fill={INK.blue} textAnchor="middle">
        frio
      </Hand>
    </g>
  );
}

function Vial({ data }: { data: CertificateData }) {
  const { x, y } = VIAL;
  const total = data.score.of ?? data.score.value;
  const level = total > 0 ? data.score.value / total : 0;
  const h = 58;
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={x} cy={y - h - 34 + i * 11} rx={3} ry={4.3} fill={INK.orange} stroke={INK.black} strokeWidth={0.8} opacity={1 - i * 0.18} />
      ))}
      <rect x={x - 17} y={y - h} width={34} height={h} rx={9} fill={INK.paper} stroke={INK.black} strokeWidth={1.5} />
      <rect x={x - 17} y={y - h * level} width={34} height={h * level} rx={9} fill={INK.orange} />
      <rect x={x - 17} y={y - h} width={34} height={h} rx={9} fill="none" stroke={INK.black} strokeWidth={1.5} />
      <rect x={x - 11} y={y - h - 10} width={22} height={10} fill={INK.black} />
      <line x1={x + 6} y1={y - h + 10} x2={x + 6} y2={y - 10} stroke={INK.paper} strokeOpacity={0.8} strokeWidth={3} strokeLinecap="round" />
      <Hand x={x} y={y + 24} size={19} textAnchor="middle">
        extrato
      </Hand>
    </g>
  );
}

function Molecule({ uid }: { uid: string }) {
  const { x, y, r } = INSET;
  const { atoms, bonds } = useMemo(() => artemisinin(x - 19, y + 23, 22), [x, y]);
  const grid: string[] = [];
  for (let gx = x - r; gx <= x + r; gx += 14) grid.push(`M${gx} ${y - r}V${y + r}`);
  for (let gy = y - r; gy <= y + r; gy += 14) grid.push(`M${x - r} ${gy}H${x + r}`);
  return (
    <g>
      <circle cx={x + 7} cy={y + 7} r={r} fill={INK.blue} />
      <clipPath id={`${uid}-molecule`}>
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <circle cx={x} cy={y} r={r} fill={INK.paper} />
      <g clipPath={`url(#${uid}-molecule)`}>
        <path d={grid.join("")} stroke={INK.blue} strokeOpacity={0.16} strokeWidth={0.8} fill="none" />
        {bonds.map((b, i) => {
          const a = atoms[b.a];
          const c = atoms[b.b];
          if (b.peroxide) return <line key={i} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={INK.orange} strokeWidth={6} strokeLinecap="round" />;
          if (b.double) {
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ox = Math.round((-dy / len) * 26) / 10;
            const oy = Math.round((dx / len) * 26) / 10;
            return (
              <g key={i}>
                <line x1={a.x + ox} y1={a.y + oy} x2={c.x + ox} y2={c.y + oy} stroke={INK.black} strokeWidth={1.7} />
                <line x1={a.x - ox} y1={a.y - oy} x2={c.x - ox} y2={c.y - oy} stroke={INK.black} strokeWidth={1.7} />
              </g>
            );
          }
          return <line key={i} x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={INK.black} strokeWidth={1.9} strokeLinecap="round" />;
        })}
        {atoms.map((a, i) =>
          a.label ? (
            <g key={i}>
              <circle cx={a.x} cy={a.y} r={7.6} fill={a.peroxide ? INK.orange : INK.paper} stroke={INK.black} strokeWidth={1.2} />
              <Display x={a.x} y={a.y + 3.6} size={10} fontWeight={700} track={0} textAnchor="middle" fill={a.peroxide ? INK.paper : INK.black}>
                {a.label}
              </Display>
            </g>
          ) : null,
        )}
        <Display x={x} y={y - r + 30} size={16} fontWeight={700} track={0} textAnchor="middle">
          artemisinina
        </Display>
        <Mono x={x} y={y + r - 18} size={10} track={0.08} textAnchor="middle" fill={SOFT}>
          C<tspan fontSize={7.5} dy={2.5}>15</tspan>
          <tspan dy={-2.5}>H</tspan>
          <tspan fontSize={7.5} dy={2.5}>22</tspan>
          <tspan dy={-2.5}>O</tspan>
          <tspan fontSize={7.5} dy={2.5}>5</tspan>
        </Mono>
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK.black} strokeWidth={1.5} />
    </g>
  );
}

function Leaf({ x, y, size, filled }: { x: number; y: number; size: number; filled: boolean }) {
  const r = size * 0.5;
  const lobes = [
    [0, -r * 0.55, -90, r * 0.6],
    [-r * 0.55, -r * 0.05, -145, r * 0.52],
    [r * 0.55, -r * 0.05, -35, r * 0.52],
    [-r * 0.4, r * 0.52, 150, r * 0.4],
    [r * 0.4, r * 0.52, 30, r * 0.4],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {lobes.map(([lx, ly, a, l], i) => (
        <ellipse
          key={i}
          cx={lx}
          cy={ly}
          rx={l}
          ry={l * 0.44}
          transform={`rotate(${a} ${lx} ${ly})`}
          fill={filled ? INK.blue : "none"}
          stroke={filled ? "none" : INK.pencil}
          strokeWidth={0.7}
          strokeOpacity={0.7}
        />
      ))}
      {filled && <line x1={0} y1={r * 0.95} x2={0} y2={-r * 0.45} stroke={INK.orange} strokeWidth={1.1} strokeLinecap="round" />}
    </g>
  );
}

function BookIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 2 Q5 0 10 3 Q15 0 20 2 V15 Q15 13 10 16 Q5 13 0 15 Z" fill="#f3e7c9" stroke={INK.black} strokeWidth={1.1} />
      <line x1={10} y1={3} x2={10} y2={16} stroke={INK.black} strokeWidth={1} />
    </g>
  );
}

function FlaskIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M6 0 V5 L0 15 H16 L10 5 V0 Z" fill={INK.paper} stroke={INK.black} strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M2.4 11 H13.6 L16 15 H0 Z" fill={INK.blue} />
    </g>
  );
}

function RecordCard({ data }: { data: CertificateData }) {
  const { x, y, w, h } = CARD;
  const total = data.score.of ?? data.score.value;
  const gridTop = y + 120;
  const rows = data.stats.slice(0, 2);
  const lives = rows[1] ? Math.max(0, Math.min(3, Number(rows[1].value) || 0)) : 0;
  return (
    <g transform={`rotate(-1.5 ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 7} y={y + 7} width={w} height={h} fill={INK.blue} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <line x1={x + 30} y1={y + 44} x2={x + 30} y2={y + h - 10} stroke={INK.orange} strokeOpacity={0.55} strokeWidth={1} />
      <BookIcon x={x + 14} y={y + 13} />
      <Mono x={x + 42} y={y + 27} size={9.5} track={0.13}>
        CADERNO DE EXTRAÇÃO
      </Mono>
      <FlaskIcon x={x + w - 30} y={y + 12} />
      <line x1={x + 12} y1={y + 42} x2={x + w - 12} y2={y + 42} stroke={INK.black} strokeOpacity={0.3} />

      <Mono x={x + 40} y={y + 64} size={9.5} track={0.13} fill={SOFT}>
        {data.score.unit.toUpperCase()} COLHIDAS
      </Mono>
      <Display x={x + 38} y={y + 110} size={58} track={-0.04}>
        {data.score.value}
      </Display>
      <Hand x={x + w - 18} y={y + 106} size={34} fill={INK.pencil} textAnchor="end">
        de {total}
      </Hand>

      {Array.from({ length: total }, (_, i) => {
        const col = i % GRID.cols;
        const row = Math.floor(i / GRID.cols);
        return <Leaf key={i} x={x + 44 + col * GRID.cell} y={gridTop + row * GRID.cell} size={GRID.cell * 0.82} filled={i < data.score.value} />;
      })}

      {rows.map((row, i) => {
        const top = y + h - 84 + i * 40;
        return (
          <g key={row.label}>
            <line x1={x + 12} y1={top} x2={x + w - 12} y2={top} stroke={INK.black} strokeOpacity={0.3} />
            <Mono x={x + 40} y={top + 25} size={9.5} track={0.13} fill={SOFT}>
              {row.label}
            </Mono>
            <Hand x={x + 150} y={top + 28} size={30} fill={INK.pencil}>
              {row.value}
            </Hand>
            {i === 0 ? (
              <g transform={`translate(${x + w - 34} ${top + 20})`}>
                <path d="M 9 0 L 4.5 7.8 L -4.5 7.8 L -9 0 L -4.5 -7.8 L 4.5 -7.8 Z" fill="none" stroke={INK.orange} strokeWidth={2.2} />
                <circle cx={7.8} cy={-4.5} r={2.6} fill={INK.orange} />
                <circle cx={7.8} cy={4.5} r={2.6} fill={INK.orange} />
              </g>
            ) : (
              <g>
                {[0, 1, 2].map((k) => (
                  <circle key={k} cx={x + w - 58 + k * 16} cy={top + 20} r={5.5} fill={k < lives ? INK.orange : "none"} stroke={INK.black} strokeWidth={1.2} />
                ))}
              </g>
            )}
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

function tangents(a: Point & { r: number }, b: Point & { r: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const beta = Math.acos((a.r - b.r) / d);
  const round = (v: number) => Math.round(v * 10) / 10;
  return [phi + beta, phi - beta].map((angle) => ({
    from: { x: round(a.x + a.r * Math.cos(angle)), y: round(a.y + a.r * Math.sin(angle)) },
    to: { x: round(b.x + b.r * Math.cos(angle)), y: round(b.y + b.r * Math.sin(angle)) },
  }));
}

function TuArt({ data, uid }: PlateArtProps) {
  const date = formatDate(data.achievedAt);
  const callout = { x: VIAL.x, y: VIAL.y - 30, r: 40 };
  const lines = tangents(callout, INSET);
  const { fronds, panicles } = useSprig();
  const leafLabel = fronds[6].lobes[10];
  const flowerLabel = panicles[2].heads[1];

  return (
    <g>
      <Mono x={652} y={206} size={11} track={0.16}>
        PESQUISA DA ARTEMISININA · PEQUIM, 1972
      </Mono>
      <Mono x={652} y={224} size={11} track={0.16} fill={SOFT}>
        DA RECEITA ANTIGA À MOLÉCULA · ESQUEMA ILUSTRATIVO
      </Mono>

      <RecipeBook />
      <Hand x={BOOK.x + BOOK.w / 2 - 4} y={BOOK.y + BOOK.h + 36} size={19} textAnchor="middle">
        receita de Ge Hong, ano 340
      </Hand>
      <path
        d={`M ${BOOK.x + BOOK.w + 8} ${BOOK.y + BOOK.h - 18} C ${BOOK.x + BOOK.w + 60} ${BOOK.y + BOOK.h + 40} ${FLASK.cx - 120} ${LEVEL - 70} ${FLASK.cx - 92} ${LEVEL - 8}`}
        fill="none"
        stroke={INK.blue}
        strokeWidth={1.4}
        strokeDasharray="4 4"
      />
      <path d={`M ${FLASK.cx - 100} ${LEVEL - 20} L ${FLASK.cx - 92} ${LEVEL - 8} L ${FLASK.cx - 106} ${LEVEL - 12}`} fill="none" stroke={INK.blue} strokeWidth={1.4} strokeLinejoin="round" />
      <Hand x={BOOK.x + 2} y={BOOK.y + BOOK.h + 64} size={18} fill={INK.blue}>
        planta em água fria, sem ferver
      </Hand>

      <Thermometer />
      <Flask uid={uid} />

      <line x1={leafLabel.x + 4} y1={leafLabel.y + 3} x2={leafLabel.x + 46} y2={leafLabel.y + 30} stroke={INK.black} strokeWidth={0.8} />
      <Mono x={leafLabel.x + 50} y={leafLabel.y + 34} size={10} track={0.12}>
        FOLHA
      </Mono>
      <line x1={flowerLabel.x + 4} y1={flowerLabel.y + 2} x2={flowerLabel.x + 40} y2={flowerLabel.y + 26} stroke={INK.black} strokeWidth={0.8} />
      <Mono x={flowerLabel.x + 44} y={flowerLabel.y + 30} size={10} track={0.12}>
        FLORES
      </Mono>
      <Hand x={FLASK.cx - FLASK.half + 40} y={FLASK.base + 30} size={19} textAnchor="start">
        extração a frio
      </Hand>

      <path
        d={`M ${FLASK.cx + FLASK.neck + 30} ${FLASK.lip + 58} C ${FLASK.cx + 180} ${FLASK.lip + 70} ${VIAL.x + 2} ${FLASK.lip + 110} ${VIAL.x} ${VIAL.y - 112}`}
        fill="none"
        stroke={INK.black}
        strokeWidth={1.3}
        strokeDasharray="3 3"
      />
      <Vial data={data} />
      <circle cx={callout.x} cy={callout.y} r={callout.r} fill="none" stroke={INK.black} strokeWidth={1} strokeDasharray="3 3" />
      {lines.map((line, i) => (
        <line key={i} x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke={INK.black} strokeWidth={0.8} strokeOpacity={0.7} />
      ))}
      <Molecule uid={uid} />
      <Mono x={INSET.x + INSET.r + 2} y={INSET.y + INSET.r + 28} size={10} track={0.16} textAnchor="end">
        DETALHE · A MOLÉCULA
      </Mono>

      <RecordCard data={data} />
      <Stamp text="EXTRAÍDO" date={`${date.day} ${date.month} ${date.year}`} x={CARD.x + CARD.w - 96} y={CARD.y + CARD.h + 30} />
    </g>
  );
}

const bench = BENCHES.find((b) => b.id === "tu");
if (!bench?.reveal.photo) throw new Error("tu bench is missing");

export const tuPlate: Plate = {
  scientist: {
    name: "Tu Youyou",
    line: "Química farmacêutica. Em 1972, chegou à artemisinina, contra a malária.",
    photo: { ...bench.reveal.photo, focus: [0.42, 0.4], zoom: 1.45 },
    credit: "FOTO: BENGT NYMAN, 2015, CC BY 2.0, ADAPTADA",
  },
  game: { name: bench.task, room: bench.room, unit: "folhas" },
  stamp: "EXTRAÍDO",
  demo: {
    bench: "tu",
    name: "João Pedro Nogueira",
    position: 1,
    score: { value: 91, of: 99, unit: "folhas" },
    stats: [
      { label: "PARASITAS", value: "3" },
      { label: "VIDAS", value: "2" },
    ],
    achievedAt: "2026-10-26T15:42:00",
    serial: 0,
    demo: true,
  },
  describe: (data) => `${data.position}º lugar no ranking do dia de ${bench.task}. ${data.score.value}${data.score.of ? ` de ${data.score.of}` : ""} ${data.score.unit}.`,
  Art: TuArt,
};
