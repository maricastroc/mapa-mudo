"use client";

import { forwardRef, type ReactNode } from "react";
import { INK } from "../riso/inks.ts";
import { buildingSpan, floorTop, groundY, WORLD, type LabPlan } from "./labPlan.ts";

export const RAIL_Y = 54;
const TOOTH = 110;

export function wireY(floor: 0 | 1) {
  return floorTop(floor) + 44;
}

function StreetLamp({ x }: { x: number }) {
  const y = groundY();
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 190} stroke={INK.black} strokeWidth="2" />
      <path d={`M ${x} ${y - 190} q 0 -18 22 -18`} fill="none" stroke={INK.black} strokeWidth="2" />
      <path d={`M ${x + 14} ${y - 206} h 18 l -4 10 h -10 Z`} fill={INK.black} />
      <ellipse className="lab-bulb lab-street-bulb" cx={x + 23} cy={y - 195} rx="5" ry="3" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      <polygon className="lab-street-cone" points={`${x + 14},${y - 194} ${x + 32},${y - 194} ${x + 70},${y} ${x - 24},${y}`} fill={INK.paper} opacity="0" />
      <rect x={x - 5} y={y - 8} width="10" height="8" fill={INK.black} />
    </g>
  );
}

function Shrub({ x }: { x: number }) {
  const y = groundY();
  return (
    <g>
      <path d={`M ${x} ${y} V ${y - 60}`} stroke={INK.black} strokeWidth="1.4" />
      {[
        [0, -78, 22],
        [-16, -60, 17],
        [15, -58, 16],
        [0, -44, 15],
      ].map(([dx, dy, r], i) => (
        <circle key={i} cx={x + dx} cy={y + dy} r={r} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      ))}
      {[
        [0, -78, 22],
        [-16, -60, 17],
        [15, -58, 16],
        [0, -44, 15],
      ].map(([dx, dy, r], i) => (
        <circle key={`d${i}`} cx={x + dx} cy={y + dy} r={r - 1} fill="url(#lab-dots-blue)" opacity="0.55" />
      ))}
    </g>
  );
}

export function BackShell({ plan }: { plan: LabPlan }) {
  const span = buildingSpan(plan);
  const teeth = Math.ceil((span.end - span.start - 12) / TOOTH);
  const g = groundY();
  return (
    <g>
      {Array.from({ length: Math.ceil((span.end + 120 - span.start - 30) / 55) }, (_, i) => {
        const x = span.start + 30 + i * 55;
        return <line key={i} x1={x} y1={RAIL_Y + 2} x2={x} y2={WORLD.roof} stroke={INK.black} strokeWidth="1" strokeOpacity="0.8" />;
      })}
      {Array.from({ length: teeth }, (_, i) => {
        const x = span.start + 12 + i * TOOTH;
        const w = Math.min(TOOTH, span.end - x);
        const top = 66;
        return (
          <g key={i}>
            <path d={`M ${x} ${WORLD.roof} V ${top} L ${x + w} ${WORLD.roof} Z`} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" strokeLinejoin="round" />
            <path d={`M ${x + 2} ${top + 4} L ${x + 16} ${top + 11} V ${WORLD.roof} H ${x + 2} Z`} fill="url(#lab-dots-blue)" opacity="0.45" />
          </g>
        );
      })}
      <rect x="0" y={g} width={plan.width + 400} height={WORLD.ground} fill={INK.paper} />
      <rect x="0" y={g + 10} width={plan.width + 400} height={WORLD.ground - 10} fill="url(#lab-dots-orange-light)" opacity="0.7" />
      <line x1="0" y1={g + 10} x2={plan.width + 400} y2={g + 10} stroke={INK.black} strokeWidth="1" />
      {Array.from({ length: Math.ceil((plan.width + 400) / 70) }, (_, i) => (
        <line key={i} x1={i * 70} y1={g + 10} x2={i * 70 - 14} y2={WORLD.height} stroke={INK.black} strokeOpacity="0.14" />
      ))}
      <StreetLamp x={span.start - 86} />
      <Shrub x={span.start - 34} />
    </g>
  );
}

function Wall({ x, from, to }: { x: number; from: number; to: number }) {
  return (
    <g>
      <rect x={x - 6} y={from} width="12" height={to - from} fill={INK.paper} />
      <rect x={x - 6} y={from} width="12" height={to - from} fill="url(#lab-hatch)" opacity="0.55" />
      <line x1={x - 6} y1={from} x2={x - 6} y2={to} stroke={INK.black} strokeWidth="1.4" />
      <line x1={x + 6} y1={from} x2={x + 6} y2={to} stroke={INK.black} strokeWidth="1.4" />
    </g>
  );
}

function Pipe({ x1, x2, y, thick, color, flanges, opacity = 1 }: { x1: number; x2: number; y: number; thick: number; color: string; flanges: number[]; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <rect x={x1} y={y - thick / 2} width={x2 - x1} height={thick} fill={color} stroke={INK.black} strokeWidth="1.4" />
      {color !== INK.black && <line x1={x1} y1={y - thick / 2 + 1.6} x2={x2} y2={y - thick / 2 + 1.6} stroke={INK.paper} strokeOpacity="0.6" strokeWidth="1" />}
      {flanges.map((fx) => (
        <rect key={fx} x={fx - 4} y={y - thick / 2 - 2.5} width="8" height={thick + 5} fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      ))}
    </g>
  );
}

export function wirePath(plan: LabPlan, floor: 0 | 1) {
  const span = buildingSpan(plan);
  const walls = plan.columns.slice(1).map((c) => c.x).filter((x) => x < span.end);
  const top = floorTop(floor);
  return [span.start, ...walls, span.end].reduce((d, x, i, all) => (i === 0 ? `M ${x + 8} ${top + 40}` : `${d} Q ${(all[i - 1] + x) / 2} ${top + 52} ${x} ${top + 40}`), "");
}

export function FrontShell({ plan, children }: { plan: LabPlan; children?: ReactNode }) {
  const span = buildingSpan(plan);
  const x0 = span.start;
  const end = span.end;
  const walls = plan.columns.slice(1).map((c) => c.x).filter((x) => x < end);
  return (
    <g>
      <rect x={x0} y={WORLD.roof - 6} width={end - x0 + 14} height="12" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x0} y={WORLD.roof - 6} width={end - x0 + 14} height="12" fill="url(#lab-dots-ink)" opacity="0.28" />
      {[0, 1].map((f) => {
        const top = floorTop(f as 0 | 1);
        const bottom = top + WORLD.floor;
        return (
          <g key={f}>
            {walls.map((x) => (
              <g key={x}>
                <Wall x={x} from={top + 6} to={bottom - 122} />
                <path d={`M ${x - 9} ${bottom - 122} h 18`} stroke={INK.black} strokeWidth="2" />
              </g>
            ))}
            <Pipe x1={x0 + 6} x2={end + 22} y={top + 17} thick={8} color={INK.orange} flanges={[...walls, end + 18]} />
            <Pipe x1={x0 + 6} x2={end + 10} y={top + 28} thick={4} color={INK.black} flanges={[]} opacity={0.55} />
            <path className="lab-wire" d={wirePath(plan, f as 0 | 1)} fill="none" stroke={INK.black} strokeWidth="1" strokeOpacity="0.5" />
          </g>
        );
      })}
      <rect x={x0} y={floorTop(1) - 6} width={end - x0 + 6} height="12" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x0} y={floorTop(1) - 6} width={end - x0 + 6} height="12" fill="url(#lab-hatch)" opacity="0.5" />
      <rect x={x0} y={groundY() - 6} width={span.finish - x0} height="12" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x0} y={groundY() - 6} width={span.finish - x0} height="12" fill="url(#lab-dots-ink)" opacity="0.32" />
      <rect x={x0} y={WORLD.roof - 6} width="12" height={groundY() - WORLD.roof + 6} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
      <rect x={x0} y={WORLD.roof - 6} width="12" height={groundY() - WORLD.roof + 6} fill="url(#lab-hatch)" opacity="0.55" />
      <line x1={x0 - 40} y1={RAIL_Y} x2={end + 110} y2={RAIL_Y} stroke={INK.black} strokeWidth="3" />
      <line x1={x0 - 40} y1={RAIL_Y + 4} x2={end + 110} y2={RAIL_Y + 4} stroke={INK.black} strokeWidth="1" />
      <path d={`M ${x0 - 40} ${RAIL_Y - 6} v 12 M ${end + 110} ${RAIL_Y - 6} v 12`} stroke={INK.black} strokeWidth="3" />
      {children}
    </g>
  );
}

export const Cart = forwardRef<SVGGElement>(function Cart(_, ref) {
  return (
    <g ref={ref}>
      <g className="lab-cart-body">
        <rect x="-26" y={RAIL_Y - 26} width="52" height="20" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="-26" y={RAIL_Y - 26} width="52" height="6" fill={INK.orange} />
        <rect x="-18" y={RAIL_Y - 40} width="16" height="14" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="-18" y={RAIL_Y - 40} width="16" height="14" fill="url(#lab-dots-blue)" opacity="0.8" />
        <path d={`M 6 ${RAIL_Y - 26} v -9 l 4 -6 h 6 l 4 6 v 9`} fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
        <rect x="8" y={RAIL_Y - 32} width="10" height="6" fill={INK.orange} />
        <circle className="lab-cart-lamp" cx="24" cy={RAIL_Y - 18} r="2.6" fill={INK.paper} stroke={INK.black} strokeWidth="1" />
      </g>
      {[-15, 15].map((x) => (
        <g key={x} transform={`translate(${x} ${RAIL_Y - 4})`}>
          <g className="lab-cart-wheel">
            <circle r="6" fill={INK.paper} stroke={INK.black} strokeWidth="1.4" />
            <path d="M -5 0 H 5 M 0 -5 V 5" stroke={INK.black} strokeWidth="1" />
          </g>
        </g>
      ))}
    </g>
  );
});

export function SkyArt({ width, height }: { width: number; height: number }) {
  const clouds = Array.from({ length: Math.ceil(width / 380) }, (_, i) => ({ x: 120 + i * 380 + ((i * 97) % 140), y: 18 + ((i * 53) % 46), r: 14 + ((i * 31) % 10) }));
  return (
    <svg width={width} height={height} className="block" aria-hidden="true">
      {clouds.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <path d={`M 0 ${c.r} a ${c.r} ${c.r} 0 0 1 ${c.r * 1.4} -${c.r * 0.9} a ${c.r * 1.2} ${c.r * 1.2} 0 0 1 ${c.r * 2.2} 0 a ${c.r} ${c.r} 0 0 1 ${c.r * 1.4} ${c.r * 0.9}`} fill={INK.paper} stroke={INK.black} strokeWidth="1" />
          <line x1={c.r * 0.6} y1={c.r + 4} x2={c.r * 4.4} y2={c.r + 4} stroke={INK.blue} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="1 3" />
        </g>
      ))}
    </svg>
  );
}

export function GroundProps({ width, scale }: { width: number; scale: number }) {
  const step = 170;
  const items = Array.from({ length: Math.ceil(width / (step * scale)) + 2 }, (_, i) => i);
  const h = WORLD.ground * scale;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width / scale} ${WORLD.ground}`} className="block overflow-visible" aria-hidden="true">
      {items.map((i) => {
        const x = 60 + i * step + ((i * 37) % 40);
        const kind = i % 4;
        if (kind === 0)
          return (
            <g key={i} transform={`translate(${x} 48)`}>
              <path d="M -10 0 q 2 -12 5 -14 M -3 0 q 0 -16 3 -19 M 4 0 q 2 -11 7 -13" stroke={INK.black} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>
          );
        if (kind === 1)
          return (
            <g key={i} transform={`translate(${x} 50)`}>
              <rect x="-4" y="-22" width="8" height="22" fill={INK.paper} stroke={INK.black} strokeWidth="1.2" />
              <rect x="-4" y="-18" width="8" height="4" fill={INK.orange} />
            </g>
          );
        if (kind === 2)
          return (
            <g key={i} transform={`translate(${x} 48)`}>
              <circle cx="-12" cy="-8" r="8" fill="none" stroke={INK.black} strokeWidth="1.2" />
              <circle cx="12" cy="-8" r="8" fill="none" stroke={INK.black} strokeWidth="1.2" />
              <path d="M -12 -8 L -4 -18 H 8 L 12 -8 M -4 -18 L 0 -8 L 8 -18 M -6 -21 h 5" stroke={INK.orange} strokeWidth="1.4" fill="none" />
            </g>
          );
        return (
          <g key={i} transform={`translate(${x} 50)`}>
            <path d="M -8 0 L -6 -10 H 6 L 8 0 Z" fill={INK.orange} stroke={INK.black} strokeWidth="1.2" />
            <path d="M 0 -10 q -10 -8 -6 -18 M 0 -10 q 8 -10 4 -20 M 0 -10 q 1 -10 -1 -16" stroke={INK.blue} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}
