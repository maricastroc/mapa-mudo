"use client";

import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Rect } from "./labPlan.ts";

type RoomFrameProps = {
  rect: Rect;
  s: number;
  label: string;
  art: ReactNode;
  glow?: ReactNode;
  raised?: boolean;
  children?: ReactNode;
};

type RoomCall = { rect: Rect; setCall: (on: boolean) => void };

const RoomContext = createContext<RoomCall | null>(null);

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomFrame({ rect, s, label, art, glow, raised, children }: RoomFrameProps) {
  const [lit, setLit] = useState(false);
  const [call, setCall] = useState(false);
  const room = useMemo(() => ({ rect, setCall }), [rect]);
  const box: CSSProperties = {
    left: rect.x * s,
    top: rect.y * s,
    width: rect.w * s,
    height: rect.h * s,
    ["--lamp-delay" as string]: `${Math.round(rect.x * 0.55)}ms`,
  };
  const view = `0 0 ${rect.w} ${rect.h}`;
  const state = { "data-lit": lit || call, "data-call": call };
  return (
    <RoomContext.Provider value={room}>
      <div className="lab-art absolute z-[1]" style={box} {...state} aria-hidden="true">
        <svg viewBox={view} className="block h-full w-full overflow-visible" preserveAspectRatio="none">
          {art}
        </svg>
      </div>
      <div
        role="group"
        aria-label={label}
        className={`lab-ui absolute ${raised ? "z-[6]" : "z-[4]"}`}
        style={box}
        {...state}
        onPointerEnter={(e) => e.pointerType === "mouse" && setLit(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setLit(false)}
        onFocus={() => setLit(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setLit(false);
        }}
      >
        {glow && (
          <svg viewBox={view} className="lab-glow pointer-events-none absolute inset-0 block h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
            {glow}
          </svg>
        )}
        {children}
      </div>
    </RoomContext.Provider>
  );
}
