import { useId, useMemo, type Ref } from "react";
import { BENCHES } from "../benches.ts";
import { INK } from "../riso/inks.ts";
import { flecks, formatDate, PAGE, serialLabel, titleFor, type Box, type CertificateData } from "./certificate.ts";
import { fitName, textWidth, tidyName, type NameBox } from "./name.ts";
import { PartnerLogos } from "./PartnerLogos.tsx";
import type { Plate } from "./plate.ts";
import { qrMatrix, qrPath } from "./qr.ts";
import { verifyUrl } from "./seal.ts";
import { Body, Display, Mono, SOFT } from "./text.tsx";
import type { RisoDots } from "./useRisoDots.ts";

export const MARGIN = 72;
export const PORTRAIT: Box = { x: MARGIN, y: 924, w: 66, h: 84 };

const RIGHT = PAGE.w - MARGIN;
const GRID = 36;
const PAPER_GRID = "#e6ebed";
const NAME_BOX: NameBox = { w: 520, one: [70, 104], two: [42, 72], track: -0.025 };
const NAME_BASELINE = 868;
const CODE = { size: 92, y: 914 };
const CODE_X = RIGHT - CODE.size - 4;

function GraphPaper() {
  const lines: string[] = [];
  for (let x = GRID / 2; x < PAGE.w; x += GRID) lines.push(`M${x} 0V${PAGE.h}`);
  for (let y = GRID / 2; y < PAGE.h; y += GRID) lines.push(`M0 ${y}H${PAGE.w}`);
  return <path d={lines.join("")} stroke={PAPER_GRID} strokeWidth={1} fill="none" />;
}

function RegistrationMark({ x, y }: { x: number; y: number }) {
  const mark = (dx: number, dy: number, color: string, opacity: number) => (
    <g transform={`translate(${x + dx} ${y + dy})`} stroke={color} strokeWidth={0.9} fill="none" opacity={opacity}>
      <circle r={7} />
      <path d="M-12 0H12M0 -12V12" />
    </g>
  );
  return (
    <g>
      {mark(-0.9, 0.7, INK.orange, 0.9)}
      {mark(0.8, -0.6, INK.blue, 0.85)}
      {mark(0, 0, INK.black, 1)}
    </g>
  );
}

function Specks({ seed }: { seed: number }) {
  const specks = useMemo(
    () =>
      flecks(seed, 220, { x: 0, y: 0, w: PAGE.w, h: PAGE.h }).filter(
        (s) => s.x < CODE_X - 6 || s.x > CODE_X + CODE.size + 10 || s.y < CODE.y - 6 || s.y > CODE.y + CODE.size + 10,
      ),
    [seed],
  );
  const color = { blue: INK.blue, orange: INK.orange, black: INK.black };
  return (
    <g>
      {specks.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={color[s.ink]} opacity={0.45} />
      ))}
    </g>
  );
}

function Masthead({ data, plate }: { data: CertificateData; plate: Plate }) {
  const index = BENCHES.findIndex((b) => b.id === data.bench);
  const size = 11;
  const gap = 4;
  const squaresX = 702;
  return (
    <g>
      <Display x={MARGIN - 2} y={104} size={36} track={-0.025}>
        Elas em Jogo
      </Display>
      <Mono x={MARGIN} y={128} size={11.5} track={0.16}>
        FEIRA DO CONHECIMENTO 2026 · CIÊNCIA DELAS
      </Mono>

      <Mono x={520} y={98} size={11.5} track={0.16} fontWeight={500}>
        ARQUIVO DE RECORDES
      </Mono>
      {BENCHES.map((b, i) => (
        <rect
          key={b.id}
          x={squaresX + i * (size + gap)}
          y={88}
          width={size}
          height={size}
          fill={i === index ? INK.orange : INK.paper}
          stroke={i === index ? INK.orange : INK.black}
          strokeWidth={1.3}
        />
      ))}
      <Mono x={squaresX + BENCHES.length * (size + gap) + 6} y={98} size={11.5} track={0.16}>
        {`${index + 1} DE ${BENCHES.length}`}
      </Mono>
      <Mono x={520} y={116} size={11.5} track={0.16} fill={SOFT}>
        {`${serialLabel(data.serial)} · ${plate.game.room}`}
      </Mono>
      {data.demo && (
        <Mono x={520} y={134} size={11.5} track={0.16} fill={INK.orange} fontWeight={500}>
          DEMONSTRAÇÃO · DADOS FICTÍCIOS
        </Mono>
      )}

      <PartnerLogos right={RIGHT} middle={106} height={42} gap={24} />

      <line x1={MARGIN} y1={152} x2={RIGHT} y2={152} stroke={INK.black} strokeWidth={2.6} />
      <line x1={MARGIN} y1={158} x2={RIGHT} y2={158} stroke={INK.black} strokeWidth={0.8} />
    </g>
  );
}

function Position({ position }: { position: number }) {
  const size = position >= 10 ? 300 : 430;
  const baseline = 664;
  const number = (fill: string, dx: number, dy: number) => (
    <Display x={MARGIN - 12 + dx} y={baseline + dy} size={size} track={-0.06} fill={fill}>
      {position}
      <tspan fontSize={size * 0.42} dy={-size * 0.4}>
        º
      </tspan>
    </Display>
  );
  return (
    <g>
      {number(INK.blue, 6, 5)}
      {number(INK.orange, 0, 0)}
    </g>
  );
}

function Name({ name }: { name: string }) {
  const fit = fitName(name, NAME_BOX);
  const lead = fit.size * 0.98;
  return (
    <g>
      {fit.lines.map((line, i) => (
        <Display key={line} x={MARGIN - fit.size * 0.03} y={NAME_BASELINE - (fit.lines.length - 1 - i) * lead} size={fit.size} track={NAME_BOX.track}>
          {line}
        </Display>
      ))}
    </g>
  );
}

function SealCode({ seal }: { seal: string | null }) {
  const matrix = useMemo(() => (seal ? qrMatrix(verifyUrl(seal)) : null), [seal]);
  const { size, y } = CODE;
  const x = CODE_X;
  const quiet = 3;
  const cell = matrix ? size / (matrix.length + quiet * 2) : 0;
  return (
    <g>
      <rect x={x + 4} y={y + 4} width={size} height={size} fill={INK.orange} />
      <rect x={x} y={y} width={size} height={size} fill={INK.paper} stroke={INK.black} strokeWidth={1.2} />
      {matrix ? (
        <path d={qrPath(matrix, x + quiet * cell, y + quiet * cell, cell)} fill={INK.black} />
      ) : (
        <rect x={x + 10} y={y + 10} width={size - 20} height={size - 20} fill="none" stroke={INK.pencil} strokeDasharray="3 3" />
      )}
      <Mono x={0} y={0} size={8.5} track={0.2} fill={SOFT} textAnchor="middle" transform={`translate(${x - 9} ${y + size / 2}) rotate(-90)`}>
        CONFIRA AQUI
      </Mono>
    </g>
  );
}

function GamePlaque({ x, y, w, plate, number }: { x: number; y: number; w: number; plate: Plate; number: number }) {
  const h = 72;
  return (
    <g>
      <rect x={x + 5} y={y + 5} width={w} height={h} fill={INK.orange} />
      <rect x={x} y={y} width={w} height={h} fill={INK.paper} stroke={INK.black} strokeWidth={1.4} />
      <Mono x={x + 14} y={y + 24} size={10.5} track={0.16} fill={SOFT}>
        {plate.game.room}
      </Mono>
      <Display x={x + 13} y={y + 56} size={27} track={-0.02}>
        {plate.game.name}
      </Display>
      <circle cx={x + w} cy={y} r={13} fill={INK.paper} stroke={INK.black} strokeWidth={1.3} />
      <Mono x={x + w} y={y + 4.5} size={12} track={0} textAnchor="middle" fontWeight={500}>
        {number}
      </Mono>
    </g>
  );
}

function Footer({ data, plate, portrait, seal, uid }: { data: CertificateData; plate: Plate; portrait: RisoDots | null; seal: string | null; uid: string }) {
  const date = formatDate(data.achievedAt);
  const text = PORTRAIT.x + PORTRAIT.w + 20;
  const number = BENCHES.findIndex((b) => b.id === data.bench) + 1;
  const dateText = `${date.day} ${date.month.toLowerCase()} ${date.year}`;
  const dateRight = CODE_X - 22;
  const plaqueW = Math.max(200, textWidth(plate.game.name, 27, -0.02) + 30);
  const plaqueX = dateRight - textWidth(dateText, 30, -0.02) - 34 - plaqueW;
  return (
    <g>
      <line x1={MARGIN} y1={906} x2={RIGHT} y2={906} stroke={INK.black} strokeWidth={0.8} />
      <clipPath id={`${uid}-portrait`}>
        <rect x={PORTRAIT.x} y={PORTRAIT.y} width={PORTRAIT.w} height={PORTRAIT.h} />
      </clipPath>
      <rect x={PORTRAIT.x + 5} y={PORTRAIT.y + 5} width={PORTRAIT.w} height={PORTRAIT.h} fill={INK.orange} />
      <rect x={PORTRAIT.x} y={PORTRAIT.y} width={PORTRAIT.w} height={PORTRAIT.h} fill={INK.paper} />
      {portrait && (
        <g clipPath={`url(#${uid}-portrait)`} style={{ isolation: "isolate" }}>
          <path d={portrait.orange} fill={INK.orange} style={{ mixBlendMode: "multiply" }} />
          <path d={portrait.blue} fill={INK.blue} style={{ mixBlendMode: "multiply" }} />
          <path d={portrait.black} fill={INK.black} transform="translate(0.5 -0.35)" style={{ mixBlendMode: "multiply" }} />
        </g>
      )}
      <rect x={PORTRAIT.x} y={PORTRAIT.y} width={PORTRAIT.w} height={PORTRAIT.h} fill="none" stroke={INK.black} strokeWidth={1.2} />

      <Mono x={text} y={938} size={11} track={0.16} fill={INK.orange} fontWeight={500}>
        A CIENTISTA POR TRÁS DO JOGO
      </Mono>
      <Display x={text - 1} y={972} size={30} track={-0.02}>
        {plate.scientist.name}
      </Display>
      <Body x={text} y={998} size={15} fill={SOFT}>
        {plate.scientist.line}
      </Body>

      <GamePlaque x={plaqueX} y={924} w={plaqueW} plate={plate} number={number} />

      <Mono x={dateRight} y={938} size={11} track={0.16} fill={SOFT} textAnchor="end">
        DATA
      </Mono>
      <Display x={dateRight} y={972} size={30} track={-0.02} textAnchor="end">
        {dateText}
      </Display>
      <Mono x={dateRight} y={998} size={11} track={0.16} fill={SOFT} textAnchor="end">
        {`${date.time} · ${serialLabel(data.serial)}`}
      </Mono>
      <SealCode seal={seal} />
    </g>
  );
}

function PrintStrip({ plate }: { plate: Plate }) {
  const inks = [INK.black, INK.blue, INK.orange];
  return (
    <g>
      {inks.map((color, i) => (
        <rect key={color} x={MARGIN + i * 16} y={1022} width={12} height={8} fill={color} />
      ))}
      <Mono x={MARGIN + 56} y={1030} size={8.5} track={0.18} fill={SOFT}>
        PRETO · AZUL · LARANJA
      </Mono>
      <Mono x={RIGHT} y={1030} size={8.5} track={0.18} fill={SOFT} textAnchor="end">
        {plate.scientist.credit}
      </Mono>
    </g>
  );
}

type CertificateProps = {
  data: CertificateData;
  plate: Plate;
  portrait: RisoDots | null;
  seal: string | null;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
};

export function Certificate({ data, plate, portrait, seal, svgRef, className }: CertificateProps) {
  const uid = `cert${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Art = plate.Art;
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${PAGE.w} ${PAGE.h}`}
      className={className}
      role="img"
      aria-label={`Certificado Elas em Jogo. ${titleFor(data.position)}: ${tidyName(data.name)}. ${plate.describe(data)}`}
    >
      <rect width={PAGE.w} height={PAGE.h} fill={INK.paper} />
      <GraphPaper />

      <Masthead data={data} plate={plate} />

      <rect x={MARGIN} y={202} width={10} height={10} fill={INK.orange} />
      <Mono x={MARGIN + 20} y={212} size={13} track={0.16} fontWeight={500}>
        RANKING DO DIA
      </Mono>
      <Display x={MARGIN - 3} y={284} size={64} track={-0.03}>
        {titleFor(data.position)}
      </Display>
      <Position position={data.position} />
      <Name name={data.name} />

      <Art data={data} uid={uid} />

      <Footer data={data} plate={plate} portrait={portrait} seal={seal} uid={uid} />
      <PrintStrip plate={plate} />
      {[
        [32, 32],
        [PAGE.w - 32, 32],
        [32, PAGE.h - 32],
        [PAGE.w - 32, PAGE.h - 32],
      ].map(([x, y]) => (
        <RegistrationMark key={`${x}-${y}`} x={x} y={y} />
      ))}
      <Specks seed={data.serial * 7919 + 13} />
    </svg>
  );
}
