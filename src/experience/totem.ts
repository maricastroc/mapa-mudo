import { useSyncExternalStore } from "react";

const TOTEM_KEY = "diga-um-nome:totem";

let cached: boolean | null = null;

function readTotem() {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has("totem")) {
      const on = query.get("totem") !== "0";
      window.localStorage.setItem(TOTEM_KEY, on ? "1" : "0");
      return on;
    }
    return window.localStorage.getItem(TOTEM_KEY) === "1";
  } catch {
    return false;
  }
}

function stayStill() {
  return () => {};
}

export function useTotem() {
  return useSyncExternalStore(
    stayStill,
    () => (cached ??= readTotem()),
    () => false,
  );
}
