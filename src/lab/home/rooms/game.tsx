"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Bench } from "../../benches.ts";
import { CAPSULE_BODY, CAPSULE_SHIELD } from "../../johnson/sprites.ts";
import { FrogSvg } from "../../lutz/FrogSvg.tsx";
import { INK } from "../../riso/inks.ts";
import { Sprig } from "../../tu/CureDemo.tsx";
import { Decor, DISPLAY, Floor, HAND, Keep, Lamp, MONO, NightCone, NightNote, ROOM, Table, Wall } from "../art.tsx";
import { Hotspot } from "../Hotspot.tsx";
import { labMemory } from "../labMemory.ts";
import { easeInOut, useLabHome, useObj, useTween } from "../labContext.tsx";
import type { Rect } from "../labPlan.ts";
import { Plaque } from "../Plaque.tsx";
import { RoomFrame } from "../RoomFrame.tsx";

export type GameRoomProps = {
  bench: Bench;
  number: number;
  rect: Rect;
  s: number;
  done: boolean;
  compact: boolean;
};

type SceneProps = { rect: Rect; s: number; plaque: ReactNode; label: string; id: string };

const W = ROOM.w;
const H = ROOM.h;

function CurieScene({ rect, s, plaque, label, id }: SceneProps) {
  const lab = useLabHome();
  const stone = useObj();
  const [level, setLevel] = useState(0.05);
  const [pulses, setPulses] = useState(0);
  const reset = useRef(0);
  useEffect(() => () => window.clearTimeout(reset.current), []);
  const measure = () => {
    const next = 0.55 + Math.random() * 0.45;
    setLevel(next);
    setPulses((p) => p + 1);
    lab.sfx.geiger(4 + Math.round(next * 10));
    window.clearTimeout(reset.current);
    reset.current = window.setTimeout(() => setLevel(0.05), 1500);
  };
  const dial = { x: 108, y: 194, r: 26 };
  const angle = -80 + 160 * level;
  const art = (
    <g>
      <Wall tone="orange" planks />
      <Decor>
        <rect x="318" y="34" width="94" height="90" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="320" y="36" width="90" height="86" fill="url(#lab-dots-blue-light)" opacity="0.6" />
        <path d="M320 122 V100 l10 -6 l6 4 v-12 h8 v10 l10 -8 l12 8 v-6 h8 v8 l14 -10 l12 8 V122 Z" fill={INK.black} opacity="0.7" />
        <path d="M365 34 V124 M318 80 H412" stroke={INK.black} strokeWidth="1" />
        <path d="M296 150 H424" stroke={INK.black} strokeWidth="2" />
        {[312, 338, 372, 398].map((x, i) => (
          <g key={x}>
            <path d={`M ${x - 7} 150 v -18 l 4 -6 v -6 h 6 v 6 l 4 6 v 18 Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1" />
            <rect x={x - 6} y="140" width="12" height="9" fill={i % 2 ? INK.orange : INK.blue} opacity="0.5" />
          </g>
        ))}
        <path d="M 384 200 l 8 -24 v -14 h 10 v 14 l 8 24 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <path d="M 388 200 l 5 -14 h 14 l 5 14 Z" fill={INK.orange} opacity="0.6" />
      </Decor>
      <Lamp x={250} drop={52} spread={130} />
      <Table x1={28} x2={428} top={200} />
      <rect x="40" y="152" width="112" height="48" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x="54" y="132" width="30" height="20" fill={INK.black} />
      <rect x="60" y="126" width="18" height="6" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
      <path d={`M ${dial.x - dial.r} ${dial.y} A ${dial.r} ${dial.r} 0 0 1 ${dial.x + dial.r} ${dial.y} Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <path d={`M ${dial.x + dial.r * Math.cos(Math.PI * 1.25)} ${dial.y + dial.r * Math.sin(Math.PI * 1.25)} A ${dial.r} ${dial.r} 0 0 1 ${dial.x + dial.r} ${dial.y}`} fill="none" stroke={INK.orange} strokeWidth="4" opacity="0.8" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI + (Math.PI * i) / 8;
        return <line key={i} x1={dial.x + Math.cos(a) * (dial.r - 6)} y1={dial.y + Math.sin(a) * (dial.r - 6)} x2={dial.x + Math.cos(a) * dial.r} y2={dial.y + Math.sin(a) * dial.r} stroke={INK.black} strokeWidth="1" />;
      })}
      <g className="lab-needle" style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${dial.x}px ${dial.y}px` }}>
        <g className="lab-call-twitch" style={{ transformOrigin: `${dial.x}px ${dial.y}px` }}>
          <line x1={dial.x} y1={dial.y} x2={dial.x} y2={dial.y - dial.r + 4} stroke={INK.black} strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
      <circle cx={dial.x} cy={dial.y} r="3.5" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
      <text x="92" y="164" fontFamily={MONO} fontSize="8" letterSpacing="1.2" fill={INK.black}>
        MEDIDOR
      </text>
      <path d="M 84 140 C 130 124 180 150 206 182" fill="none" stroke={INK.black} strokeWidth="1" />
      <ellipse cx="215" cy="198" rx="32" ry="7" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <g {...stone.art}>
        <path d="M 196 194 Q 192 182 204 177 Q 216 172 228 178 Q 236 186 230 194 Q 214 198 196 194 Z" fill="#4b4a47" stroke={INK.black} strokeWidth="1.4" />
        <path d="M 206 182 l 6 -2 M 218 181 l 4 2" stroke={INK.paper} strokeOpacity="0.7" strokeWidth="1" />
      </g>
      <g key={`pulse-${pulses}`}>
        {pulses > 0 &&
          [0, 1, 2].map((i) => <circle key={i} className="lab-ring" cx="214" cy="186" r="14" fill="none" stroke={INK.orange} strokeWidth="2" style={{ animationDelay: `${i * 160}ms` }} />)}
      </g>
      <rect x="296" y="188" width="62" height="12" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      {[306, 322, 338].map((x) => (
        <rect key={x} x={x} y="158" width="9" height="34" rx="4.5" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      ))}
      <Floor tone="ink" />
    </g>
  );
  const glow = (
    <g>
      <NightCone x={250} drop={52} spread={130} />
      <g className="lab-night-only">
        {[310.5, 326.5, 342.5].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="175" r="16" fill={INK.paper} opacity="0.22" />
            <circle cx={x} cy="175" r="9" fill={INK.paper} opacity="0.35" />
            <rect x={x - 4.5} y="158" width="9" height="34" rx="4.5" fill={INK.paper} style={{ animation: `lab-flicker ${2.6 + i * 0.7}s ease-in-out infinite` }} />
          </g>
        ))}
      </g>
      <NightNote x={322} y={38} width={92}>
        No escuro, o rádio brilha de verdade.
      </NightNote>
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={glow}>
      {plaque}
      <Hotspot id={id} label="Medir a pedra" x={178} y={164} w={76} h={46} cellW={W} cellH={H} onPress={measure} onState={stone.onState} />
    </RoomFrame>
  );
}

const ORBIT = { cx: 330, cy: 86, rx: 74, ry: 32, tilt: -10 };

function orbitPoint(t: number) {
  const a = -Math.PI / 2 + t * Math.PI * 2;
  const x = Math.cos(a) * ORBIT.rx;
  const y = Math.sin(a) * ORBIT.ry;
  const r = (ORBIT.tilt * Math.PI) / 180;
  return { x: ORBIT.cx + x * Math.cos(r) - y * Math.sin(r), y: ORBIT.cy + x * Math.sin(r) + y * Math.cos(r), a: a + r };
}

function JohnsonScene({ rect, s, plaque, label, id }: SceneProps) {
  const lab = useLabHome();
  const board = useObj();
  const [runs, setRuns] = useState(0);
  const laps = runs > 0 && runs % 3 === 0 ? 3 : 1;
  const tween = useTween(laps === 3 ? 4.4 : 2.2, lab.reducedMotion);
  const fly = () => {
    if (tween.running) return;
    setRuns((r) => r + 1);
    lab.sfx.chalk();
    tween.start();
  };
  const orbitK = Math.min(1, tween.k / 0.82);
  const down = Math.max(0, (tween.k - 0.82) / 0.18);
  const p = orbitPoint(easeInOut(orbitK) * laps);
  const splash = { x: 404, y: 132 };
  const exit = orbitPoint(laps);
  const pos = down > 0 ? { x: exit.x + (splash.x - exit.x) * down, y: exit.y + (splash.y - exit.y) * down * down, a: 1.2 } : p;
  const showCapsule = runs > 0 && tween.k < 1;
  const art = (
    <g>
      <Wall tone="blue" />
      <g {...board.art}>
        <rect x="232" y="26" width="194" height="128" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="238" y="32" width="182" height="116" fill={INK.black} />
        <circle cx={ORBIT.cx} cy={ORBIT.cy} r="20" fill="none" stroke={INK.paper} strokeWidth="1.4" />
        <path d={`M ${ORBIT.cx - 16} ${ORBIT.cy - 6} q 8 4 14 -2 q 6 6 12 2`} fill="none" stroke={INK.paper} strokeWidth="1" strokeOpacity="0.7" />
        <ellipse className="lab-call-dash" cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} transform={`rotate(${ORBIT.tilt} ${ORBIT.cx} ${ORBIT.cy})`} fill="none" stroke={INK.paper} strokeWidth="1.4" strokeDasharray="5 4" />
        <path d={`M ${exit.x} ${exit.y} Q 400 92 ${splash.x} ${splash.y}`} fill="none" stroke={INK.orange} strokeWidth="2" />
        <text x="246" y="140" fontFamily={MONO} fontSize="9" fill={INK.paper} opacity="0.75">
          4 527,1 · 86,32
        </text>
        <text x="246" y="50" fontFamily={HAND} fontSize="13" fill={INK.paper} opacity="0.75">
          t = ?
        </text>
        {runs > 0 &&
          Array.from({ length: Math.min(runs, 6) }, (_, i) => <line key={i} x1={410 - i * 5} y1="40" x2={408 - i * 5} y2="52" stroke={INK.paper} strokeWidth="1.4" />)}
        {runs >= 3 && (
          <text x="352" y="146" fontFamily={HAND} fontSize="13" fill={INK.orange}>
            3 voltas
          </text>
        )}
        {showCapsule && (
          <g transform={`translate(${pos.x} ${pos.y}) rotate(${(pos.a * 180) / Math.PI + 90}) scale(0.28)`}>
            <path d={CAPSULE_BODY} fill={INK.paper} stroke={INK.paper} strokeWidth="2" />
            <path d={CAPSULE_SHIELD} fill={INK.orange} />
          </g>
        )}
        {runs > 0 && tween.k >= 1 && <path d={`M ${splash.x - 7} ${splash.y - 7} l 14 14 M ${splash.x + 7} ${splash.y - 7} l -14 14`} stroke={INK.orange} strokeWidth="2.6" strokeLinecap="round" />}
      </g>
      <rect x="234" y="154" width="190" height="6" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      <Lamp x={196} drop={20} spread={118} />
      <Table x1={214} x2={428} top={206} />
      <Decor>
        <rect x="236" y="182" width="58" height="24" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={240 + (i % 5) * 10} y={186 + Math.floor(i / 5) * 9} width="7" height="6" fill={i % 4 === 0 ? INK.orange : INK.black} />
        ))}
        <path d="M 306 206 l 4 -14 h 44 l 4 14 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
        <path d="M 314 198 h 36 M 316 202 h 32" stroke={INK.black} strokeWidth="1" />
        <rect x="380" y="186" width="16" height="20" fill={INK.blue} stroke={INK.black} strokeWidth="1" />
        <path d="M 384 186 l -3 -16 M 390 186 l 2 -18" stroke={INK.black} strokeWidth="1.4" />
        <g transform="translate(150 262)">
          <path d="M -12 0 h 24 l -4 -6 h -16 Z" fill={INK.black} />
          <line x1="0" y1="-6" x2="0" y2="-28" stroke={INK.black} strokeWidth="2" />
          <circle cx="0" cy="-52" r="24" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
          <circle cx="0" cy="-52" r="24" fill="url(#lab-dots-blue)" opacity="0.5" />
          <path d="M -18 -60 q 10 -8 18 0 q 6 8 14 2 M -20 -44 q 12 6 22 -2" fill="none" stroke={INK.black} strokeWidth="1" />
          <path d="M -30 -52 a 30 30 0 0 1 60 0" fill="none" stroke={INK.black} strokeWidth="1.4" />
        </g>
        <g transform="translate(52 262)">
          <rect x="-18" y="-6" width="36" height="6" fill={INK.black} />
          <path d="M -7 -6 V -78 Q 0 -100 7 -78 V -6 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
          <path d="M -7 -24 l -9 18 h 9 M 7 -24 l 9 18 h -9" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
          <rect x="-7" y="-60" width="14" height="6" fill={INK.black} />
        </g>
      </Decor>
      <Floor tone="ink" />
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={<NightCone x={196} drop={20} spread={118} />}>
      {plaque}
      <Hotspot id={id} label="Traçar a órbita no quadro" x={236} y={30} w={190} h={124} cellW={W} cellH={H} onPress={fly} onState={board.onState} spark="top-left" />
    </RoomFrame>
  );
}

const FROG = { build: "tree", skin: "orange", mark: "spots" } as const;

function LutzScene({ rect, s, plaque, label, id }: SceneProps) {
  const lab = useLabHome();
  const terrarium = useObj();
  const [pokes, setPokes] = useState(0);
  const big = pokes > 0 && pokes % 5 === 0;
  const tween = useTween(big ? 1.4 : 0.62, lab.reducedMotion);
  const night = useRef(lab.night);
  useEffect(() => {
    if (lab.night && !night.current && lab.heard()) {
      window.setTimeout(() => lab.sfx.croak(1.25, 0.03), 700);
      window.setTimeout(() => lab.sfx.croak(0.8, 0.026), 1100);
      window.setTimeout(() => lab.sfx.croak(1.1, 0.022), 1600);
    }
    night.current = lab.night;
  }, [lab]);
  const poke = () => {
    if (tween.running) return;
    const next = pokes + 1;
    setPokes(next);
    lab.sfx.croak(1.3, 0.04);
    if (next % 5 === 0) window.setTimeout(() => lab.sfx.croak(1.1, 0.04), 600);
    tween.start();
  };
  const hops = big ? 2 : 1;
  const local = (tween.k * hops) % 1;
  const lift = tween.k < 1 ? Math.sin(Math.PI * local) * (big ? 44 : 30) : 0;
  const pose = {
    stretch: tween.k < 1 ? Math.sin(Math.PI * local) : 0,
    squash: tween.k < 1 ? -0.2 * Math.sin(Math.PI * local) : 0,
    tilt: tween.k < 1 ? -0.3 * Math.cos(Math.PI * local) : 0,
    blink: 0,
    throat: tween.k >= 1 && pokes > 0 ? 0.6 : 0,
  };
  const art = (
    <g>
      <Wall tone="blue" />
      <Decor>
        <rect x="292" y="24" width="134" height="174" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        {[70, 120, 170].map((y) => (
          <line key={y} x1="292" y1={y} x2="426" y2={y} stroke={INK.black} strokeWidth="1.4" />
        ))}
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((col) => {
            const x = 306 + col * 40;
            const y = 70 + row * 50;
            return (
              <g key={`${row}-${col}`}>
                <path d={`M ${x} ${y} v -30 q 0 -4 4 -4 h 18 q 4 0 4 4 v 30 Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1" />
                <rect x={x} y={y - 20} width="26" height="20" fill="url(#lab-dots-blue-light)" opacity="0.7" />
                <rect x={x + 2} y={y - 40} width="22" height="5" fill={(row + col) % 2 ? INK.orange : INK.black} />
                <ellipse cx={x + 13} cy={y - 12} rx="7" ry="4.5" fill={(row * 3 + col) % 3 === 0 ? INK.orange : (row * 3 + col) % 3 === 1 ? INK.black : INK.blue} opacity="0.8" />
              </g>
            );
          }),
        )}
        <path d="M 36 206 l 8 -8 h 54 l -6 8 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
        <path d="M 50 202 h 18 M 72 202 h 14" stroke={INK.black} strokeWidth="1" />
        <path d="M 96 197 l 16 -6" stroke={INK.orange} strokeWidth="2.4" strokeLinecap="round" />
        <g transform="translate(256 200)">
          <circle cx="0" cy="-6" r="11" fill={INK.paper} fillOpacity="0.6" stroke={INK.black} strokeWidth="2" />
          <path d="M 8 2 l 10 6" stroke={INK.black} strokeWidth="3.4" strokeLinecap="round" />
        </g>
      </Decor>
      <Lamp x={262} drop={28} spread={120} />
      <Table x1={24} x2={284} top={206} />
      <g {...terrarium.art}>
        <rect x="108" y="152" width="124" height="54" fill={INK.paper} fillOpacity="0.4" stroke={INK.black} strokeWidth="1.4" />
        <rect x="108" y="192" width="124" height="14" fill="url(#lab-dots-orange)" opacity="0.7" />
        <path d="M 114 192 q 6 -22 12 -8 M 120 192 q 14 -26 6 -34 M 214 192 q -8 -20 4 -28 M 222 192 q 2 -14 6 -18" fill="none" stroke={INK.blue} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="200" cy="191" rx="12" ry="3" fill={INK.blue} opacity="0.6" />
        <path d="M 114 160 l 8 -4 M 226 160 l -6 -4" stroke={INK.paper} strokeWidth="1.4" opacity="0.8" />
        <Keep>
          <FrogSvg look={FROG} x={160} y={192 - lift} size={46} pose={pose} />
        </Keep>
        <g className="lab-call-croak">
          <circle cx="182" cy="176" r="6" fill="#f8d3c4" stroke={INK.black} strokeWidth="1" />
        </g>
      </g>
      {big && tween.k > 0.1 && tween.k < 1 && (
        <text x="170" y={130} fontFamily={HAND} fontSize="16" fill={INK.orange}>
          croac!
        </text>
      )}
      <Floor tone="ink" />
    </g>
  );
  const glow = (
    <g>
      <NightCone x={262} drop={28} spread={120} />
      <NightNote x={298} y={30} width={124}>
        Muitos sapos cantam mais à noite.
      </NightNote>
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={glow}>
      {plaque}
      <Hotspot id={id} label="Cutucar o sapo" x={104} y={146} w={132} h={64} cellW={W} cellH={H} onPress={poke} onState={terrarium.onState} />
    </RoomFrame>
  );
}

const COIL = [
  { x: 232, y: 140 },
  { x: 232, y: 126 },
  { x: 280, y: 126 },
  { x: 290, y: 138 },
  { x: 304, y: 132 },
  { x: 316, y: 146 },
  { x: 328, y: 140 },
  { x: 340, y: 154 },
  { x: 352, y: 152 },
  { x: 352, y: 172 },
];

function along(points: { x: number; y: number }[], k: number) {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, k)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i]) {
      const t = d / lengths[i];
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
    }
    d -= lengths[i];
  }
  return points[points.length - 1];
}

function TuScene({ rect, s, plaque, label, id }: SceneProps) {
  const lab = useLabHome();
  const still = useObj();
  const [drops, setDrops] = useState(0);
  const [bubbles, setBubbles] = useState(0);
  const tween = useTween(1.25, lab.reducedMotion);
  const full = drops >= 4;
  const distill = () => {
    if (tween.running) return;
    if (full) {
      setDrops(0);
      lab.sfx.water();
      return;
    }
    setBubbles((b) => b + 1);
    lab.sfx.bubbles();
    tween.start();
    window.setTimeout(
      () => {
        setDrops((d) => {
          const next = Math.min(4, d + 1);
          lab.sfx.drip(next);
          if (next === 4) window.setTimeout(() => lab.sfx.chime(), 160);
          return next;
        });
      },
      lab.reducedMotion ? 0 : 1250,
    );
  };
  const drop = tween.k < 1 && bubbles > 0 ? along(COIL, tween.k) : null;
  const art = (
    <g>
      <Wall tone="orange" />
      <Decor>
        <rect x="300" y="30" width="120" height="88" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="302" y="32" width="116" height="84" fill="url(#lab-dots-blue-light)" opacity="0.5" />
        <path d="M312 44 h36 M360 44 h46 M312 44 v24 M326 58 h48 M388 58 v26 M312 86 h40 M366 86 h40 M330 102 h66 M406 44 v52" stroke={INK.blue} strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="320" cy="74" r="3" fill={INK.orange} />
        <circle cx="398" cy="96" r="3" fill={INK.orange} />
        {[
          [386, 10, INK.orange],
          [388, 9, INK.paper],
          [384, 11, INK.black],
        ].map(([x, h, c], i) => (
          <rect key={i} x={x as number} y={206 - (i + 1) * 11} width="34" height={h as number} fill={c as string} stroke={INK.black} strokeWidth="1" />
        ))}
        <g transform="translate(60 206)">
          <Keep>
            <Sprig x={0} y={-28} scale={0.45} />
          </Keep>
          <path d="M -16 0 l 3 -28 h 26 l 3 28 Z" fill={INK.orange} stroke={INK.black} strokeWidth="1.4" />
        </g>
      </Decor>
      <Lamp x={300} drop={20} spread={124} />
      <Table x1={24} x2={428} top={206} />
      <g {...still.art}>
        <path d="M 192 206 v -16 q 0 -6 6 -6 h 68 q 6 0 6 6 v 16 Z" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        {[200, 214, 248, 260].map((x, i) => (
          <rect key={x} x={x} y={188 + (i % 2) * 3} width="9" height="8" fill={INK.blue} opacity="0.75" transform={`rotate(${i * 13 - 10} ${x + 4} 192)`} />
        ))}
        <circle cx="232" cy="172" r="20" fill={INK.paper} fillOpacity="0.7" stroke={INK.black} strokeWidth="1.4" />
        <path d="M 213 176 a 20 20 0 0 0 38 0 Z" fill="url(#lab-dots-blue)" opacity="0.8" />
        <rect x="227" y="132" width="10" height="22" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <path d="M 226 172 q 6 -10 12 0 M 232 166 v 10" stroke={INK.blue} strokeWidth="1.4" fill="none" />
        <g className="lab-call-bubbles">
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={225 + i * 7} cy="182" r={1.8 + (i % 2)} fill={INK.paper} stroke={INK.blue} strokeWidth="1" style={{ animationDelay: `${i * 260}ms` }} />
          ))}
        </g>
        <g key={`bubble-${bubbles}`}>
          {bubbles > 0 &&
            [0, 1, 2, 3].map((i) => <circle key={i} className="lab-bubble" cx={224 + i * 5} cy="182" r={1.8 + (i % 2)} fill={INK.paper} stroke={INK.blue} strokeWidth="1" style={{ animationDelay: `${i * 120}ms` }} />)}
        </g>
        <polyline points={COIL.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={INK.black} strokeWidth="3.6" strokeLinejoin="round" />
        <polyline points={COIL.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={INK.paper} strokeWidth="1.4" strokeLinejoin="round" />
        {drop && <circle cx={drop.x} cy={drop.y} r="3.2" fill={INK.orange} stroke={INK.black} strokeWidth="1" />}
        <rect x="342" y="174" width="20" height="32" rx="4" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="344" y={206 - 2 - 28 * (drops / 4)} width="16" height={28 * (drops / 4)} fill={INK.orange} style={{ transition: "y .4s ease, height .4s ease" }} />
        <rect x="340" y="168" width="24" height="7" fill={INK.black} />
      </g>
      {full && (
        <g className="lab-pop" style={{ transformOrigin: "352px 152px" }}>
          <path d="M 352 140 l 9 5 v 10 l -9 5 l -9 -5 v -10 Z" fill="none" stroke={INK.orange} strokeWidth="2" />
          <circle cx="361" cy="145" r="2.6" fill={INK.orange} />
        </g>
      )}
      <Floor tone="ink" />
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={<NightCone x={300} drop={20} spread={124} />}>
      {plaque}
      <Hotspot id={id} label={full ? "Esvaziar o frasco" : "Destilar uma gota"} x={188} y={124} w={186} h={86} cellW={W} cellH={H} onPress={distill} onState={still.onState} />
    </RoomFrame>
  );
}

function FrazattiScene({ rect, s, plaque, label, id }: SceneProps) {
  const lab = useLabHome();
  const fridge = useObj();
  const [open, setOpenState] = useState(labMemory().fridge);
  const [mist, setMist] = useState(0);
  const setOpen = (v: boolean) => {
    labMemory().fridge = v;
    setOpenState(v);
  };
  const toggle = () => {
    setOpen(!open);
    if (!open) {
      setMist((m) => m + 1);
      lab.sfx.thunk();
      lab.sfx.hum();
    } else lab.sfx.thunk();
  };
  const virus = (x: number, y: number, color: string, key: number) => (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={Math.cos(a) * 9} y1={Math.sin(a) * 9} x2={Math.cos(a) * 13} y2={Math.sin(a) * 13} stroke={INK.black} strokeWidth="1" />;
      })}
      <circle r="9" fill={color} stroke={INK.black} strokeWidth="1" />
      <text y="3.5" textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize="9" fill={color === INK.black || color === INK.blue ? INK.paper : INK.black}>
        {key + 1}
      </text>
    </g>
  );
  const art = (
    <g>
      <Wall tone="blue" />
      <Decor>
        <rect x="236" y="34" width="84" height="76" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        {virus(258, 56, INK.orange, 0)}
        {virus(298, 56, INK.blue, 1)}
        {virus(258, 90, INK.black, 2)}
        {virus(298, 90, INK.paper, 3)}
        <g transform="translate(70 208)">
          <path d="M -16 0 h 32 v -6 h -32 Z" fill={INK.black} />
          <path d="M 6 -6 V -38 l -14 -16" stroke={INK.black} strokeWidth="4" strokeLinecap="round" fill="none" />
          <rect x="-14" y="-62" width="12" height="20" rx="2" transform="rotate(-40 -8 -52)" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
          <path d="M -12 -22 h 18" stroke={INK.black} strokeWidth="2.4" />
        </g>
        <rect x="132" y="196" width="70" height="12" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={138 + i * 16} y="176" width="10" height="24" rx="3" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
            <rect x={138 + i * 16} y="172" width="10" height="6" fill={[INK.orange, INK.blue, INK.black, INK.orange][i]} />
          </g>
        ))}
        <path d="M 238 208 v -26 a 26 26 0 0 1 52 0 v 26 Z" fill={INK.paper} fillOpacity="0.5" stroke={INK.black} strokeWidth="1.4" />
        <g transform="translate(264 186)">
          <ellipse rx="9" ry="4" fill={INK.black} />
          <circle cx="-10" cy="-1" r="3.4" fill={INK.black} />
          {[-4, 0, 4].map((x) => (
            <line key={x} x1={x} y1="-3.5" x2={x} y2="3.5" stroke={INK.paper} strokeWidth="1" />
          ))}
          <path d="M -2 -3 l -6 -9 M 3 -3 l 6 -9 M -6 3 l -6 8 M 0 4 l 0 9 M 6 3 l 6 8" stroke={INK.black} strokeWidth="1" />
        </g>
      </Decor>
      <Lamp x={196} drop={18} spread={118} />
      <Table x1={24} x2={320} top={208} />
      <g {...fridge.art}>
        <rect x="330" y="92" width="88" height="170" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
        <rect x="334" y="96" width="80" height="162" fill="url(#lab-dots-blue)" opacity="0.3" />
        {[140, 182, 222].map((y) => (
          <line key={y} x1="334" y1={y} x2="414" y2={y} stroke={INK.black} strokeWidth="1" />
        ))}
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2, 3].map((col) => (
            <g key={`${row}-${col}`} className={open ? "lab-vial" : undefined} style={{ animationDelay: `${(row * 4 + col) * 40}ms` }}>
              <rect x={340 + col * 18} y={120 + row * 42} width="10" height="20" rx="3" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
              <rect x={340 + col * 18} y={116 + row * 42} width="10" height="5" fill={(row + col) % 2 ? INK.orange : INK.blue} />
            </g>
          )),
        )}
        <g style={{ transform: open ? "scaleX(-0.16)" : "scaleX(1)", transformOrigin: "418px 0px", transition: "transform .5s cubic-bezier(.3,1.3,.5,1)" }}>
          <rect x="330" y="92" width="88" height="170" fill={INK.paper} stroke={INK.black} strokeWidth="2" />
          <rect x="336" y="98" width="76" height="40" fill="url(#lab-dots-blue-light)" />
          <rect x="340" y="150" width="6" height="40" rx="3" fill={INK.black} />
          <path d="M 350 114 h 44" stroke={INK.black} strokeWidth="1" />
          <text x="374" y="128" textAnchor="middle" fontFamily={MONO} fontSize="8" letterSpacing="1" fill={INK.black}>
            VACINAS
          </text>
          <circle className="lab-call-led" cx="400" cy="160" r="3" fill={INK.orange} stroke={INK.black} strokeWidth="1" />
        </g>
      </g>
      <g key={`mist-${mist}`}>
        {mist > 0 && open && [0, 1, 2].map((i) => <circle key={i} className="lab-mist" cx={346 + i * 24} cy={250} r={10 + i * 2} fill={INK.paper} stroke={INK.blue} strokeWidth="1" style={{ animationDelay: `${i * 140}ms` }} />)}
      </g>
      <Floor tone="ink" />
    </g>
  );
  const glow = (
    <g>
      <NightCone x={196} drop={18} spread={118} />
      {open && <rect className="lab-night-only" x="334" y="96" width="80" height="162" fill={INK.paper} opacity="0.35" />}
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={glow}>
      {plaque}
      <Hotspot id={id} label={open ? "Fechar a geladeira de vacinas" : "Abrir a geladeira de vacinas"} pressed={open} x={326} y={88} w={96} h={176} cellW={W} cellH={H} onPress={toggle} onState={fridge.onState} spark="top-left" />
    </RoomFrame>
  );
}

function GenericScene({ rect, s, plaque, label }: SceneProps) {
  const art = (
    <g>
      <Wall tone="blue" />
      <Decor>
        <rect x="300" y="40" width="100" height="86" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <text x="350" y="100" textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize="54" fill={INK.orange}>
          ?
        </text>
        {[90, 150, 330].map((x, i) => (
          <g key={x}>
            <path d={`M ${x - 12} 206 l 6 -26 v -14 h 12 v 14 l 6 26 Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
            <path d={`M ${x - 9} 206 l 4 -16 h 10 l 4 16 Z`} fill={i % 2 ? INK.blue : INK.orange} opacity="0.7" />
          </g>
        ))}
      </Decor>
      <Lamp x={250} drop={26} spread={120} />
      <Table x1={24} x2={428} top={206} />
      <Floor tone="ink" />
    </g>
  );
  return (
    <RoomFrame rect={rect} s={s} label={label} art={art} glow={<NightCone x={250} drop={26} spread={120} />}>
      {plaque}
    </RoomFrame>
  );
}

const SCENES: Record<string, (props: SceneProps) => ReactNode> = {
  curie: CurieScene,
  johnson: JohnsonScene,
  lutz: LutzScene,
  tu: TuScene,
  frazatti: FrazattiScene,
};

export function GameRoom({ bench, number, rect, s, done, compact }: GameRoomProps) {
  const Scene = SCENES[bench.id] ?? GenericScene;
  const plaque = <Plaque bench={bench} number={number} done={done} compact={compact} />;
  return <Scene rect={rect} s={s} plaque={plaque} label={`Sala ${number}: ${bench.task}`} id={`obj:${bench.id}`} />;
}
