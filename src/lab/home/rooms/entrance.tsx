"use client";

import { useEffect, useState } from "react";
import { INK } from "../../riso/inks.ts";
import { Decor, Floor, MONO, pct, ROOM, Wall } from "../art.tsx";
import { CURIOSITIES, type Curiosity } from "../curiosities.ts";
import { Hotspot } from "../Hotspot.tsx";
import { useLabHome, useObj } from "../labContext.tsx";
import { labMemory } from "../labMemory.ts";
import { cellRect, type Column } from "../labPlan.ts";
import { RoomFrame } from "../RoomFrame.tsx";

const CW = 250;
const CH = ROOM.h;
const CAB = { x: 62, y: 92, w: 126, drawer: 30 };

function Sign({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="18" fill={INK.paper} stroke={INK.black} strokeWidth="1.3" />
      <text x={x + w / 2} y={y + 12.5} textAnchor="middle" fontFamily={MONO} fontSize="9" letterSpacing="1.8" fill={INK.black}>
        {text}
      </text>
    </g>
  );
}

function Icon({ icon, x, y }: { icon: Curiosity["icon"]; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {icon === "stone" && <path d="M -7 3 Q -8 -3 -3 -5 Q 3 -7 7 -3 Q 9 2 5 4 Q -1 6 -7 3 Z" fill={INK.black} />}
      {icon === "capsule" && <path d="M -6 5 L 0 -6 L 6 5 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1.2" />}
      {icon === "frog" && (
        <g>
          <ellipse cx="0" cy="1" rx="7" ry="4" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
          <circle cx="4" cy="-3" r="2" fill={INK.paper} stroke={INK.black} strokeWidth="0.8" />
        </g>
      )}
      {icon === "leaf" && <path d="M -6 5 Q -6 -6 6 -6 Q 6 5 -6 5 Z M -6 5 L 3 -3" fill={INK.blue} stroke={INK.black} strokeWidth="0.8" />}
      {icon === "mosquito" && (
        <g stroke={INK.black} strokeWidth="1">
          <ellipse cx="0" cy="0" rx="6" ry="2.4" fill={INK.black} />
          <path d="M -2 -2 l -3 -5 M 2 -2 l 3 -5 M -3 2 l -4 4 M 3 2 l 4 4" />
        </g>
      )}
    </g>
  );
}

function Archive({ column, s }: { column: Column; s: number }) {
  const lab = useLabHome();
  const [open, setOpen] = useState<number | null>(null);
  const [hot, setHot] = useState<number | null>(null);
  const [read, setRead] = useState<ReadonlySet<number>>(() => new Set(labMemory().read));
  const [plane, setPlane] = useState(0);
  const all = read.size === CURIOSITIES.length;

  useEffect(() => {
    if (open === null) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const pull = (i: number) => {
    if (open === i) {
      setOpen(null);
      lab.sfx.drawer(false);
      return;
    }
    setOpen(i);
    lab.sfx.drawer(true);
    window.setTimeout(() => lab.sfx.paper(), 180);
    setRead((r) => {
      if (r.has(i)) return r;
      const next = new Set(r);
      next.add(i);
      labMemory().read = next;
      if (next.size === CURIOSITIES.length) {
        window.setTimeout(() => {
          lab.sfx.chime();
          if (!lab.reducedMotion) setPlane((p) => p + 1);
        }, 700);
      }
      return next;
    });
  };

  const height = CAB.drawer * CURIOSITIES.length + 8;
  const art = (
    <g>
      <Wall tone="blue" w={CW} />
      <Sign x={74} y={56} w={102} text="ARQUIVO" />
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={height} fill={INK.paper} stroke={INK.black} strokeWidth="1.8" />
      <rect x={CAB.x} y={CAB.y} width={CAB.w} height={height} fill="url(#lab-dots-orange-light)" />
      {CURIOSITIES.map((c, i) => {
        const y = CAB.y + 4 + i * CAB.drawer;
        const out = open === i;
        const lifted = !out && hot === i;
        return (
          <g key={i}>
            <rect x={CAB.x + 4} y={y} width={CAB.w - 8} height={CAB.drawer - 3} fill={INK.black} />
            {out && (
              <g className="lab-pop" style={{ transformOrigin: `${CAB.x + 27}px ${y + 6}px` }}>
                <rect x={CAB.x + 20} y={y - 9} width="22" height="16" fill={INK.paper} stroke={INK.black} strokeWidth="1" transform={`rotate(-8 ${CAB.x + 31} ${y})`} />
                <Icon icon={c.icon} x={CAB.x + 31} y={y - 1} />
              </g>
            )}
            <g
              className="lab-drawer"
              style={{
                transform: out ? "translate(0px, 9px) scale(1.12)" : lifted ? "translate(0px, 2px) scale(1.03)" : undefined,
                transformOrigin: `${CAB.x + CAB.w / 2}px ${y + 26}px`,
              }}
            >
              <rect x={CAB.x + 4} y={y} width={CAB.w - 8} height={CAB.drawer - 3} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
              {out && <rect x={CAB.x + 4} y={y + CAB.drawer - 3} width={CAB.w - 8} height="4" fill="url(#lab-dots-ink)" opacity="0.6" />}
              <rect x={CAB.x + 14} y={y + 6} width="26" height="15" fill={read.has(i) ? INK.paper : "#fbe2d8"} stroke={INK.black} strokeWidth="1" />
              <Icon icon={c.icon} x={CAB.x + 27} y={y + 13.5} />
              <path d={`M ${CAB.x + 82} ${y + 13.5} h 26`} stroke={INK.black} strokeWidth="3" strokeLinecap="round" />
              {read.has(i) && <circle cx={CAB.x + CAB.w - 14} cy={y + 13.5} r="3" fill={INK.orange} />}
            </g>
          </g>
        );
      })}
      <rect x={CAB.x - 4} y={CAB.y + height} width={CAB.w + 8} height={ROOM.floor - CAB.y - height} fill={INK.black} />
      <Decor>
        <path d={`M ${CAB.x + 10} ${CAB.y - 2} l 6 -18 h 22 l 6 18 Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1" />
        <rect x={CAB.x + 84} y={CAB.y - 14} width="30" height="14" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
      </Decor>
      {all && (
        <g transform={`translate(${CAB.x + CAB.w / 2} ${CAB.y + height / 2}) rotate(-12)`} className="lab-pop">
          <rect x="-58" y="-13" width="116" height="26" fill={INK.paper} stroke={INK.orange} strokeWidth="2.4" />
          <text y="4.5" textAnchor="middle" fontFamily={MONO} fontSize="9.5" letterSpacing="1.2" fill={INK.orange}>
            FICHAS LIDAS!
          </text>
        </g>
      )}
      <Floor w={CW} tone="ink" />
    </g>
  );
  const card = open === null ? null : CURIOSITIES[open];
  return (
    <RoomFrame rect={cellRect(column, 0)} s={s} label="Arquivo de curiosidades" art={art} raised={open !== null || plane > 0}>
      {CURIOSITIES.map((c, i) => (
        <Hotspot
          key={i}
          id="obj:archive"
          label={`${open === i ? "Fechar" : "Abrir"} a gaveta ${i + 1} do arquivo`}
          pressed={open === i}
          x={CAB.x + 2}
          y={CAB.y + 2 + i * CAB.drawer}
          w={CAB.w - 4}
          h={CAB.drawer}
          cellW={CW}
          cellH={CH}
          onPress={() => pull(i)}
          onState={(st) => setHot((h) => (st.hot ? i : h === i ? null : h))}
          spark={i === 0 ? "top-right" : "none"}
        />
      ))}
      {card && open !== null && (
        <div
          role="note"
          key={`card-${open}`}
          className="lab-card absolute border-[1.5px] border-ink bg-paper p-[clamp(9px,calc(var(--lab-s)*12px),14px)] shadow-[5px_5px_0_0_var(--frame)]"
          style={{ left: pct(16, CW), width: pct(CW - 30, CW), top: pct(CAB.y + (open + 1) * CAB.drawer + 6, CH) }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-notation text-[11px] tracking-[0.14em] text-ink-soft">
              FICHA {open + 1} DE {CURIOSITIES.length}
            </span>
            <button
              type="button"
              aria-label="Fechar a ficha"
              onClick={() => {
                setOpen(null);
                lab.sfx.drawer(false);
              }}
              className="flex size-6 cursor-pointer items-center justify-center border-[1.2px] border-ink text-[13px] leading-none hover:bg-ink hover:text-paper"
            >
              ×
            </button>
          </div>
          <p className="mt-1.5 text-[clamp(12px,calc(var(--lab-s)*14px),15px)] leading-snug text-ink">{card.text}</p>
        </div>
      )}
      {plane > 0 && (
        <svg key={`plane-${plane}`} viewBox="0 0 40 24" className="lab-plane pointer-events-none absolute w-[clamp(28px,calc(var(--lab-s)*44px),52px)]" style={{ left: pct(CAB.x + CAB.w - 10, CW), top: pct(CAB.y - 30, CH), ["--fly" as string]: `${1500 * s}px` }} aria-hidden="true">
          <path d="M 2 12 L 38 2 L 24 22 L 18 14 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M 18 14 L 38 2" stroke={INK.black} strokeWidth="1" />
          <path d="M 18 14 L 16 20 L 24 22" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
        </svg>
      )}
    </RoomFrame>
  );
}

function Lobby({ column, s }: { column: Column; s: number }) {
  const lab = useLabHome();
  const panel = useObj();
  const on = !lab.night;
  const flip = () => {
    lab.sfx.lever(!on);
    lab.setNight(on);
  };
  const art = (
    <g>
      <Wall tone="orange" w={CW} />
      <Decor>
        <Sign x={22} y={96} w={76} text="ENTRADA" />
        <rect x="22" y="122" width="76" height="140" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="30" y="132" width="60" height="44" fill="url(#lab-dots-blue)" opacity="0.5" />
        <path d="M 60 132 V 176 M 30 154 H 90" stroke={INK.black} strokeWidth="1" />
        <rect x="30" y="186" width="60" height="68" fill="none" stroke={INK.black} strokeWidth="1" />
        <circle cx="84" cy="206" r="3" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
        <rect x="12" y="262" width="96" height="6" fill={INK.orange} />
      </Decor>
      <Sign x={138} y={92} w={88} text="LUZ" />
      <g {...panel.art}>
      <rect x="138" y="116" width="88" height="92" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
      <rect x="144" y="122" width="76" height="80" fill="url(#lab-dots-ink)" opacity="0.25" />
      <circle cx="212" cy="128" r="4.5" fill={on ? INK.orange : INK.paper} stroke={INK.black} strokeWidth="1.2" />
      <text x="148" y="136" fontFamily={MONO} fontSize="7.5" letterSpacing="1" fill={INK.black}>
        LIGA
      </text>
      <text x="146" y="196" fontFamily={MONO} fontSize="7.5" letterSpacing="0.6" fill={INK.black}>
        DESLIGA
      </text>
      <rect x="172" y="146" width="14" height="34" rx="3" fill={INK.black} />
      <g style={{ transform: `rotate(${on ? 24 : 156}deg)`, transformOrigin: "179px 163px", transition: "transform .38s cubic-bezier(.3,1.4,.5,1)" }}>
        <line x1="179" y1="163" x2="179" y2="128" stroke={INK.black} strokeWidth="4" strokeLinecap="round" />
        <circle cx="179" cy="126" r="7" fill={INK.orange} stroke={INK.black} strokeWidth="1.4" />
      </g>
      <circle cx="179" cy="163" r="4" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      </g>
      <path d="M 226 150 H 238 V 24 H 250" fill="none" stroke={INK.black} strokeWidth="1.4" />
      <path className="lab-feed" d="M 226 150 H 238 V 24 H 250" fill="none" stroke={INK.orange} strokeWidth="2" />
      <Floor w={CW} tone="ink" />
    </g>
  );
  return (
    <RoomFrame rect={cellRect(column, 1)} s={s} label="Entrada" art={art}>
      <Hotspot id="obj:lever" label={on ? "Apagar as luzes do laboratório" : "Acender as luzes do laboratório"} pressed={!on} x={134} y={112} w={96} h={100} cellW={CW} cellH={CH} onPress={flip} onState={panel.onState} />
    </RoomFrame>
  );
}

export function EntranceColumn({ column, s }: { column: Column; s: number }) {
  return (
    <>
      <Archive column={column} s={s} />
      <Lobby column={column} s={s} />
    </>
  );
}
