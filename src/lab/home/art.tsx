import type { ReactNode } from "react";
import { INK } from "../riso/inks.ts";

export const HAND = "var(--font-caveat), cursive";
export const MONO = "var(--font-dm-mono), ui-monospace, monospace";
export const DISPLAY = "var(--font-bai-jamjuree), sans-serif";

export const ROOM = { w: 440, h: 300, floor: 262 } as const;

export function LabPatterns() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <pattern id="lab-dots-blue" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <circle cx="2.5" cy="2.5" r="1.2" fill={INK.blue} />
        </pattern>
        <pattern id="lab-dots-blue-light" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <circle cx="2.5" cy="2.5" r="0.7" fill={INK.blue} />
        </pattern>
        <pattern id="lab-dots-orange" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
          <circle cx="2.5" cy="2.5" r="1.15" fill={INK.orange} />
        </pattern>
        <pattern id="lab-dots-orange-light" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
          <circle cx="2.5" cy="2.5" r="0.7" fill={INK.orange} />
        </pattern>
        <pattern id="lab-dots-ink" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="2" cy="2" r="0.85" fill={INK.black} />
        </pattern>
        <pattern id="lab-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK.black} strokeWidth="1" strokeOpacity="0.45" />
        </pattern>
        <pattern id="lab-grid" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M 14 0 L 0 0 0 14" fill="none" stroke={INK.blue} strokeOpacity="0.22" strokeWidth="0.8" />
        </pattern>
      </defs>
    </svg>
  );
}

export type WallTone = "blue" | "orange";

export function Wall({ tone, w = ROOM.w, h = ROOM.h, planks = false }: { tone: WallTone; w?: number; h?: number; planks?: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width={w} height={h} fill={INK.paper} />
      <rect x="0" y="0" width={w} height={h} fill={`url(#lab-dots-${tone}-light)`} opacity={tone === "blue" ? 0.3 : 0.42} />
      {planks &&
        Array.from({ length: Math.floor(w / 36) }, (_, i) => (
          <line key={i} x1={18 + i * 36} y1="0" x2={18 + i * 36} y2={ROOM.floor} stroke={INK.black} strokeOpacity="0.08" />
        ))}
      <line x1="0" y1={ROOM.floor - 46} x2={w} y2={ROOM.floor - 46} stroke={INK.black} strokeOpacity="0.12" />
    </g>
  );
}

export function Floor({ w = ROOM.w, tone = "ink" }: { w?: number; tone?: "ink" | "orange" | "blue" }) {
  const fill = tone === "ink" ? "url(#lab-hatch)" : `url(#lab-dots-${tone})`;
  return (
    <g>
      <rect x="0" y={ROOM.floor} width={w} height={ROOM.h - ROOM.floor} fill={INK.paper} />
      <rect x="0" y={ROOM.floor} width={w} height={ROOM.h - ROOM.floor} fill={fill} opacity={tone === "ink" ? 0.4 : 0.35} />
      <line x1="0" y1={ROOM.floor} x2={w} y2={ROOM.floor} stroke={INK.black} strokeWidth="1.6" />
    </g>
  );
}

export function Table({ x1, x2, top, legs = true }: { x1: number; x2: number; top: number; legs?: boolean }) {
  return (
    <g>
      <rect x={x1} y={top} width={x2 - x1} height="9" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x1} y={top + 9} width={x2 - x1} height="4" fill="url(#lab-dots-ink)" opacity="0.5" />
      {legs && (
        <g stroke={INK.black} strokeWidth="2" strokeLinecap="round">
          <line x1={x1 + 10} y1={top + 9} x2={x1 + 10} y2={ROOM.floor} />
          <line x1={x2 - 10} y1={top + 9} x2={x2 - 10} y2={ROOM.floor} />
        </g>
      )}
    </g>
  );
}

export function Decor({ children }: { children: ReactNode }) {
  return <g className="lab-decor">{children}</g>;
}

export function Keep({ children }: { children: ReactNode }) {
  return <g className="lab-keep">{children}</g>;
}

export function Lamp({ x, drop = 46, spread = 120, floorY = ROOM.floor }: { x: number; drop?: number; spread?: number; floorY?: number }) {
  const shadeY = drop;
  return (
    <g className="lab-lamp">
      <polygon
        className="lab-lamp-day"
        points={`${x - 14},${shadeY + 12} ${x + 14},${shadeY + 12} ${x + spread},${floorY} ${x - spread},${floorY}`}
        fill="url(#lab-dots-orange)"
        opacity="0"
      />
      <line x1={x} y1="0" x2={x} y2={shadeY - 6} stroke={INK.black} strokeWidth="1.2" />
      <path d={`M ${x - 18} ${shadeY + 12} L ${x - 8} ${shadeY - 6} L ${x + 8} ${shadeY - 6} L ${x + 18} ${shadeY + 12} Z`} fill={INK.black} />
      <ellipse className="lab-bulb" cx={x} cy={shadeY + 13} rx="7" ry="4" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
    </g>
  );
}

export function NightCone({ x, drop = 46, spread = 120, floorY = ROOM.floor }: { x: number; drop?: number; spread?: number; floorY?: number }) {
  return (
    <polygon
      className="lab-lamp-night"
      points={`${x - 14},${drop + 12} ${x + 14},${drop + 12} ${x + spread},${floorY} ${x - spread},${floorY}`}
      fill={INK.paper}
      opacity="0"
    />
  );
}

export function NightNote({ x, y, children, anchor = "start", width }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; width?: number }) {
  return (
    <foreignObject x={anchor === "start" ? x : anchor === "middle" ? x - (width ?? 160) / 2 : x - (width ?? 160)} y={y} width={width ?? 160} height="80" className="lab-night-only" style={{ overflow: "visible" }}>
      <p className="lab-hand text-[clamp(13px,calc(var(--lab-s)*17px),19px)] leading-[1.05] text-paper" style={{ textAlign: anchor === "middle" ? "center" : anchor === "end" ? "right" : "left" }}>
        {children}
      </p>
    </foreignObject>
  );
}

export function pct(value: number, of: number) {
  return `${(value / of) * 100}%`;
}
