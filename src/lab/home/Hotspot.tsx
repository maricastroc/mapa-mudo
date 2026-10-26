"use client";

import { useRef } from "react";
import type { ObjState } from "./labContext.tsx";
import { useLabHome } from "./labContext.tsx";
import { pct } from "./art.tsx";

type HotspotProps = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cellW: number;
  cellH: number;
  onPress: () => void;
  onState?: (state: ObjState) => void;
  pressed?: boolean;
  spark?: "top-right" | "top-left" | "none";
  round?: boolean;
};

export function Hotspot({ id, label, x, y, w, h, cellW, cellH, onPress, onState, pressed, spark = "top-right", round }: HotspotProps) {
  const lab = useLabHome();
  const fresh = !lab.used.has(id) && spark !== "none";
  const state = useRef<ObjState>({ hot: false, down: false });
  const set = (next: Partial<ObjState>) => {
    state.current = { ...state.current, ...next };
    onState?.(state.current);
  };
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`lab-hotspot group absolute cursor-pointer outline-none focus-visible:outline-[2.5px] focus-visible:outline-offset-2 focus-visible:outline-dashed focus-visible:outline-iris-orange ${round ? "rounded-full" : "rounded-[14px]"}`}
      style={{ left: pct(x, cellW), top: pct(y, cellH), width: pct(w, cellW), height: pct(h, cellH) }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        set({ hot: true });
        if (lab.heard()) lab.sfx.hover();
      }}
      onPointerLeave={() => set({ hot: false, down: false })}
      onPointerDown={() => set({ down: true })}
      onPointerUp={() => set({ down: false })}
      onPointerCancel={() => set({ down: false })}
      onFocus={(e) => e.currentTarget.matches(":focus-visible") && set({ hot: true })}
      onBlur={() => set({ hot: false, down: false })}
      onClick={() => {
        lab.use(id);
        onPress();
      }}
    >
      {fresh && (
        <span
          aria-hidden="true"
          className={`lab-spark pointer-events-none absolute size-[clamp(14px,calc(var(--lab-s)*22px),24px)] ${spark === "top-right" ? "-top-2 -right-2" : "-top-2 -left-2"}`}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible">
            <path d="M12 2 V8 M20 6 L15.5 10.5 M22 14 H16" stroke="#ee704c" strokeWidth="2.6" strokeLinecap="round" fill="none" transform={spark === "top-left" ? "scale(-1 1) translate(-24 0)" : undefined} />
          </svg>
        </span>
      )}
    </button>
  );
}
