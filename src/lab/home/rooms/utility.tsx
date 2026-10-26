"use client";

import { useEffect, useRef, useState } from "react";
import { INK } from "../../riso/inks.ts";
import { Decor, Floor, HAND, MONO, ROOM } from "../art.tsx";
import { Hotspot } from "../Hotspot.tsx";
import { useLabHome, useObj } from "../labContext.tsx";
import { labMemory } from "../labMemory.ts";
import { floorTop, groundY, WORLD, type Column, type Rect } from "../labPlan.ts";
import { RoomFrame } from "../RoomFrame.tsx";

const BUILD_STEPS = 6;
const W = ROOM.w;
const H = ROOM.h;

function Sign({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 7.4 + 22;
  return (
    <g>
      <rect x={x} y={y} width={w} height="20" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x} y={y} width="6" height="20" fill={INK.orange} />
      <text x={x + 14} y={y + 13.5} fontFamily={MONO} fontSize="9.5" letterSpacing="1.6" fill={INK.black}>
        {text}
      </text>
    </g>
  );
}

export function SiteRoom({ rect, s }: { rect: Rect; s: number }) {
  const art = (
    <g>
      <rect x="0" y="0" width={W} height={H} fill={INK.paper} />
      <rect x="0" y="0" width={W} height={H} fill="url(#lab-grid)" />
      <rect x="40" y="200" width="360" height="12" fill="none" stroke={INK.blue} strokeWidth="1.4" strokeDasharray="6 5" />
      <rect x="300" y="50" width="100" height="80" fill="none" stroke={INK.blue} strokeWidth="1.4" strokeDasharray="6 5" />
      <rect x="40" y="50" width="150" height="66" fill="none" stroke={INK.blue} strokeWidth="1.4" strokeDasharray="6 5" />
      <text x="115" y="88" textAnchor="middle" fontFamily={HAND} fontSize="16" fill={INK.blue}>
        placa do jogo
      </text>
      <text x="350" y="96" textAnchor="middle" fontFamily={HAND} fontSize="16" fill={INK.blue}>
        quadro
      </text>
      <Sign x={60} y={150} text="SALA EM OBRAS" />
      <text x="62" y="190" fontFamily={HAND} fontSize="17" fill={INK.black}>
        a próxima cientista vem aqui
      </text>
      <path d="M 300 262 l 10 -34 h 14 l 10 34 Z" fill={INK.orange} stroke={INK.black} strokeWidth="1.4" />
      <path d="M 304 248 h 26" stroke={INK.paper} strokeWidth="3" />
      <Floor tone="orange" />
    </g>
  );
  return <RoomFrame rect={rect} s={s} label="Sala em obras" art={art} />;
}

type Piece = { x: number; y: number; w: number; h: number; kind: "col" | "beam" | "slab" | "window" | "plaque" };

const PIECES: Piece[] = [
  { x: 24, y: 112, w: 12, h: 276, kind: "col" },
  { x: 264, y: 112, w: 12, h: 276, kind: "col" },
  { x: 20, y: 102, w: 260, h: 12, kind: "beam" },
  { x: 20, y: 384, w: 260, h: 12, kind: "slab" },
  { x: 168, y: 150, w: 84, h: 66, kind: "window" },
  { x: 48, y: 150, w: 104, h: 62, kind: "plaque" },
];
const CRANE_X = 300;
const JIB_Y = 16;
const BUILD_TIME = 1.5;

function PieceView({ p, ghost }: { p: Piece; ghost?: boolean }) {
  if (ghost) return <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="none" stroke={INK.blue} strokeWidth="1.4" strokeDasharray="6 5" />;
  if (p.kind === "window")
    return (
      <g>
        <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={INK.paper} stroke={INK.black} strokeWidth="2" />
        <rect x={p.x + 4} y={p.y + 4} width={p.w - 8} height={p.h - 8} fill="url(#lab-dots-blue-light)" opacity="0.6" />
        <path d={`M ${p.x + p.w / 2} ${p.y} V ${p.y + p.h} M ${p.x} ${p.y + p.h / 2} H ${p.x + p.w}`} stroke={INK.black} strokeWidth="1" />
      </g>
    );
  if (p.kind === "plaque")
    return (
      <g>
        <rect x={p.x + 4} y={p.y + 4} width={p.w} height={p.h} fill={INK.black} opacity="0.8" />
        <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <text x={p.x + 10} y={p.y + 18} fontFamily={MONO} fontSize="8" letterSpacing="1.4" fill={INK.black}>
          SALA 6
        </text>
        <text x={p.x + 10} y={p.y + 40} fontFamily={HAND} fontSize="17" fill={INK.orange}>
          em breve!
        </text>
      </g>
    );
  return (
    <g>
      <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="url(#lab-hatch)" opacity="0.5" />
    </g>
  );
}

export function ConstructionColumn({ column, s }: { column: Column; s: number }) {
  const lab = useLabHome();
  const panel = useObj();
  const sign = useObj();
  const [built, setBuilt] = useState(labMemory().built);
  const [flipped, setFlipped] = useState(false);
  const [lift, setLift] = useState<{ piece: number; t0: number } | null>(null);
  const [now, setNow] = useState(0);
  const [cheer, setCheer] = useState(0);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const rect = { x: column.x, y: 0, w: column.w, h: groundY() };
  const top = floorTop(0);
  const low = floorTop(1);

  const operate = () => {
    if (lift) return;
    if (built >= BUILD_STEPS) {
      setCheer((c) => c + 1);
      lab.sfx.chime();
      return;
    }
    const piece = built;
    if (lab.reducedMotion) {
      setBuilt(piece + 1);
      labMemory().built = piece + 1;
      lab.sfx.thunk();
      if (piece + 1 === BUILD_STEPS) lab.sfx.chime();
      return;
    }
    const t0 = performance.now();
    setLift({ piece, t0 });
    lab.sfx.winch(true);
    window.setTimeout(() => lab.sfx.thunk(), BUILD_TIME * 1000 * 0.72);
    window.setTimeout(() => lab.sfx.winch(false), BUILD_TIME * 1000 * 0.78);
    const step = (t: number) => {
      setNow(t);
      if ((t - t0) / 1000 < BUILD_TIME) frame.current = requestAnimationFrame(step);
      else {
        setLift(null);
        setBuilt((b) => {
          const next = Math.min(BUILD_STEPS, b + 1);
          labMemory().built = next;
          if (next === BUILD_STEPS) {
            setCheer((c) => c + 1);
            lab.sfx.chime();
          }
          return next;
        });
      }
    };
    frame.current = requestAnimationFrame(step);
  };

  const k = lift ? Math.min(1, (now - lift.t0) / 1000 / BUILD_TIME) : 0;
  const target = lift ? PIECES[lift.piece] : null;
  const trolleyX = target ? (k < 0.3 ? 150 + (target.x + target.w / 2 - 150) * (k / 0.3) : target.x + target.w / 2) : 150;
  const drop = target ? (k < 0.3 ? 0 : k < 0.7 ? (k - 0.3) / 0.4 : k < 0.78 ? 1 : 1 - (k - 0.78) / 0.22) : 0;
  const hookY = JIB_Y + 30 + (target ? (top + target.y - JIB_Y - 30 - 8) * drop : 0);
  const carrying = target && k < 0.72;
  const complete = built >= BUILD_STEPS;

  const art = (
    <g>
      <rect x="0" y={top} width={column.w} height={groundY() - top} fill={INK.paper} fillOpacity="0.55" />
      <rect x="0" y={top} width={column.w} height={groundY() - top} fill="url(#lab-grid)" />
      <g transform={`translate(0 ${top})`}>
        {PIECES.map((p, i) => (
          <g key={i}>{i < built ? <PieceView p={p} /> : <PieceView p={p} ghost />}</g>
        ))}
        {complete && (
          <g key={`cheer-${cheer}`}>
            {Array.from({ length: 14 }, (_, i) => (
              <rect
                key={i}
                className="lab-confetti"
                x={40 + ((i * 53) % 220)}
                y={60 + ((i * 37) % 80)}
                width="6"
                height="9"
                fill={i % 3 === 0 ? INK.blue : i % 3 === 1 ? INK.orange : INK.black}
                style={{ animationDelay: `${(i % 7) * 60}ms` }}
              />
            ))}
          </g>
        )}
      </g>
      <g transform={`translate(0 ${low})`}>
        <Decor>
          {[40, 150].map((x) => (
            <line key={x} x1={x} y1="20" x2={x} y2={WORLD.floor} stroke={INK.black} strokeWidth="2" />
          ))}
          {[110, 230].map((y) => (
            <g key={y}>
              <rect x="30" y={y} width="130" height="8" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
              <path d={`M 40 ${y} L 150 ${y - 90}`} stroke={INK.black} strokeWidth="1" strokeOpacity="0.5" />
            </g>
          ))}
        </Decor>
        <g {...sign.art}>
          <g style={{ transform: flipped ? "scaleX(-1)" : undefined, transformOrigin: "120px 60px", transition: "transform .45s cubic-bezier(.3,1.2,.5,1)" }}>
            <line x1="40" y1="-30" x2="40" y2="10" stroke={INK.black} strokeWidth="1" />
            <line x1="200" y1="-30" x2="200" y2="10" stroke={INK.black} strokeWidth="1" />
            <rect x="8" y="10" width="224" height="96" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
            <rect x="8" y="10" width="224" height="12" fill="url(#lab-hatch)" opacity="0.6" />
          </g>
          {!flipped ? (
            <g>
              <text x="120" y="48" textAnchor="middle" fontFamily={MONO} fontSize="12" letterSpacing="2" fill={INK.black}>
                NOVA ALA
              </text>
              <text x="120" y="64" textAnchor="middle" fontFamily={MONO} fontSize="9" letterSpacing="1.6" fill={INK.black} opacity="0.7">
                EM OBRAS
              </text>
              <text x="120" y="90" textAnchor="middle" fontFamily={HAND} fontSize="17" fill={INK.orange}>
                mais cientistas chegando
              </text>
            </g>
          ) : (
            <g>
              <text x="120" y="44" textAnchor="middle" fontFamily={HAND} fontSize="16" fill={INK.black}>
                Qual cientista você
              </text>
              <text x="120" y="62" textAnchor="middle" fontFamily={HAND} fontSize="16" fill={INK.black}>
                quer ver aqui?
              </text>
              <text x="120" y="88" textAnchor="middle" fontFamily={HAND} fontSize="15" fill={INK.orange}>
                conte para a equipe do estande
              </text>
            </g>
          )}
        </g>
        {Array.from({ length: Math.ceil(column.w / 26) }, (_, i) => (
          <rect key={i} x={i * 26} y={WORLD.floor - 40} width="13" height="10" fill={i % 2 ? INK.black : INK.orange} />
        ))}
        <rect x="0" y={WORLD.floor - 40} width={column.w} height="10" fill="none" stroke={INK.black} strokeWidth="1" />
        <path d={`M 40 ${WORLD.floor} l 9 -30 h 6 l 9 30 Z`} fill={INK.orange} stroke={INK.black} strokeWidth="1" />
      </g>
      <g>
        <path d={`M ${CRANE_X - 6} ${groundY()} L ${CRANE_X - 6} 4 M ${CRANE_X + 6} ${groundY()} L ${CRANE_X + 6} 4`} stroke={INK.black} strokeWidth="1.4" />
        {Array.from({ length: Math.floor((groundY() - 10) / 14) }, (_, i) => (
          <path key={i} d={`M ${CRANE_X - 6} ${groundY() - i * 14} L ${CRANE_X + 6} ${groundY() - (i + 1) * 14}`} stroke={INK.black} strokeWidth="1" strokeOpacity="0.7" />
        ))}
        <path d={`M -150 ${JIB_Y - 6} H ${CRANE_X + 40} M -150 ${JIB_Y + 4} H ${CRANE_X + 40}`} stroke={INK.black} strokeWidth="1.4" />
        {Array.from({ length: 24 }, (_, i) => (
          <path key={i} d={`M ${-150 + i * 20} ${JIB_Y - 6} L ${-140 + i * 20} ${JIB_Y + 4}`} stroke={INK.black} strokeWidth="1" />
        ))}
        <rect x={CRANE_X + 18} y={JIB_Y + 4} width="24" height="22" fill={INK.black} />
        <rect x={CRANE_X - 16} y={JIB_Y - 18} width="32" height="12" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
        <g>
          <rect x={trolleyX - 8} y={JIB_Y + 4} width="16" height="6" fill={INK.black} />
          <line x1={trolleyX} y1={JIB_Y + 10} x2={trolleyX} y2={hookY} stroke={INK.black} strokeWidth="1" />
          <path d={`M ${trolleyX} ${hookY} v 6 a 4 4 0 1 1 -5 4`} fill="none" stroke={INK.black} strokeWidth="2" strokeLinecap="round" />
          {carrying && target && (
            <g transform={`translate(${trolleyX - target.x - target.w / 2} ${hookY + 12 - target.y})`}>
              <PieceView p={target} />
            </g>
          )}
        </g>
      </g>
      <g transform={`translate(${CRANE_X - 50} ${groundY() - 66})`}>
        <g {...panel.art}>
          <rect x="0" y="0" width="58" height="66" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
          <rect x="6" y="8" width="46" height="18" fill={INK.black} />
          <text x="29" y="21" textAnchor="middle" fontFamily={MONO} fontSize="8" letterSpacing="1" fill={INK.orange}>
            {built}/{BUILD_STEPS}
          </text>
          <circle cx="29" cy="44" r="11" fill={INK.orange} stroke={INK.black} strokeWidth="1.4" />
          <circle cx="29" cy="44" r="6" fill={INK.paper} opacity="0.4" />
        </g>
      </g>
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label="Nova ala em obras" art={art}>
      <Hotspot
        id="obj:crane"
        label={complete ? "Comemorar a sala nova" : `Usar o guindaste: ${built} de ${BUILD_STEPS} peças da próxima sala`}
        x={CRANE_X - 58}
        y={groundY() - 74}
        w={74}
        h={74}
        cellW={column.w}
        cellH={groundY()}
        onPress={operate}
        onState={panel.onState}
        spark="top-left"
      />
      <Hotspot
        id="obj:sign"
        label={flipped ? "Virar a placa de volta" : "Virar a placa da nova ala"}
        pressed={flipped}
        x={8}
        y={low + 10}
        w={224}
        h={96}
        cellW={column.w}
        cellH={groundY()}
        onPress={() => {
          setFlipped((f) => !f);
          lab.sfx.flip();
        }}
        onState={sign.onState}
        spark="none"
      />
    </RoomFrame>
  );
}
