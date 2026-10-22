"use client";

import { useSyncExternalStore } from "react";
import { grainTexture } from "./grain.ts";

function stayStill() {
  return () => {};
}

export function Grain({ className }: { className?: string }) {
  const texture = useSyncExternalStore(stayStill, grainTexture, () => "");
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 mix-blend-multiply ${className ?? ""}`}
      style={texture ? { backgroundImage: `url(${texture})`, backgroundSize: "320px 320px" } : undefined}
    />
  );
}
