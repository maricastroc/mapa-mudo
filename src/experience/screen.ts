import { useSyncExternalStore } from "react";
import { SHEET, sheetFit } from "@/map/mapRenderer";

export type Screen = { W: number; H: number; fit: number; ox: number; oy: number; compact: boolean };

function measure(W: number, H: number): Screen {
  const fit = sheetFit(W, H);
  return {
    W,
    H,
    fit,
    ox: (W - SHEET.w * fit) / 2,
    oy: (H - SHEET.h * fit) / 2,
    compact: W < 820 || W / H < 1.05,
  };
}

const SERVER_SCREEN = measure(SHEET.w, SHEET.h);
let cache: Screen = SERVER_SCREEN;

function read() {
  const W = Math.max(1, window.innerWidth);
  const H = Math.max(1, window.innerHeight);
  if (cache.W !== W || cache.H !== H) cache = measure(W, H);
  return cache;
}

function subscribeToResize(notify: () => void) {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
}

export function useScreen() {
  return useSyncExternalStore(subscribeToResize, read, () => SERVER_SCREEN);
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(notify: () => void) {
  const m = window.matchMedia(REDUCED_MOTION_QUERY);
  m.addEventListener("change", notify);
  return () => m.removeEventListener("change", notify);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}
