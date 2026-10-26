"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { BenchId } from "../benches.ts";
import type { Sfx } from "../sound.ts";
import type { Rect } from "./labPlan.ts";

export type LabHome = {
  sfx: Sfx;
  reducedMotion: boolean;
  night: boolean;
  setNight: (on: boolean) => void;
  heard: () => boolean;
  used: ReadonlySet<string>;
  use: (key: string) => void;
  span: { start: number; end: number };
  enter: (id: BenchId, rect: Rect) => void;
  panBy: (worldDx: number) => void;
};

export const LabHomeContext = createContext<LabHome | null>(null);

export function useLabHome() {
  const value = useContext(LabHomeContext);
  if (!value) throw new Error("useLabHome outside the lab");
  return value;
}

export type ObjState = { hot: boolean; down: boolean };

export function useObj() {
  const [state, setState] = useState<ObjState>({ hot: false, down: false });
  const art = { className: "lab-obj", "data-hot": state.hot, "data-down": state.down };
  return { state, art, onState: setState };
}

export function useTween(duration: number, reducedMotion: boolean) {
  const [state, setState] = useState({ k: 1, run: 0 });
  const frame = useRef(0);
  const start = useCallback(() => {
    cancelAnimationFrame(frame.current);
    if (reducedMotion) {
      setState((s) => ({ k: 1, run: s.run + 1 }));
      return;
    }
    const t0 = performance.now();
    setState((s) => ({ k: 0, run: s.run + 1 }));
    const loop = (now: number) => {
      const k = Math.min(1, (now - t0) / (duration * 1000));
      setState((s) => ({ ...s, k }));
      if (k < 1) frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }, [duration, reducedMotion]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { k: state.k, run: state.run, start, running: state.k < 1 };
}

export function easeInOut(t: number) {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function easeOutBack(t: number) {
  const k = Math.max(0, Math.min(1, t));
  if (k === 0) return 0;
  return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
}
