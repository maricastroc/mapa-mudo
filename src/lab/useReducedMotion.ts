import { useSyncExternalStore } from "react";

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
