"use client";

import { useSyncExternalStore } from "react";
import { readMuted, setMuted, subscribeMuted } from "./sound.ts";

export function useMuted() {
  return useSyncExternalStore(subscribeMuted, readMuted, () => false);
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 8.5c1.6 1.8 1.6 5.2 0 7M18.8 6c3 3.3 3 8.7 0 12" />}
    </svg>
  );
}

export function SoundButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={!muted}
      aria-label={muted ? "Ligar o som" : "Desligar o som"}
      className="absolute right-[clamp(14px,3vmin,40px)] bottom-[clamp(14px,3vmin,40px)] z-10 flex size-[52px] cursor-pointer items-center justify-center border-[1.5px] border-ink bg-paper text-ink hover:bg-ink hover:text-paper"
    >
      <SoundIcon muted={muted} />
    </button>
  );
}
