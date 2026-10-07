"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ScientistPhoto } from "@/content/scientists/types";
import { useMapView } from "@/map/MapCanvas";
import type { Step } from "./state";
import { ArrowIcon } from "./ui";

export const PHOTO_ADAPTATION = "recorte quadrado e redução do arquivo original; recorte circular e conversão para tons de cinza na instalação";

export const PHOTO_CLASS = "object-cover object-[50%_28%] grayscale";

export function PortraitPhoto({ step, photo }: { step: Step; photo: ScientistPhoto | null }) {
  const frame = useRef<HTMLDivElement>(null);
  useMapView((v) => {
    const el = frame.current;
    if (!el) return;
    const l = v.lens;
    const size = Math.max(0, Math.min(l.w, l.h));
    el.style.width = `${size.toFixed(1)}px`;
    el.style.height = `${size.toFixed(1)}px`;
    el.style.transform = `translate3d(${(l.x - size / 2).toFixed(1)}px, ${(l.y - size / 2).toFixed(1)}px, 0)`;
  });
  if (!photo?.src) return null;
  const active = step === "humanScale" || step === "profile";
  return (
    <div
      ref={frame}
      aria-hidden={!active}
      className={`pointer-events-none absolute top-0 left-0 overflow-hidden rounded-full bg-paper transition-opacity ${
        active ? "opacity-100 delay-[1500ms] duration-[1800ms]" : "opacity-0 duration-700"
      }`}
    >
      <Image src={photo.src} alt={photo.alt} fill sizes="640px" loading="eager" className={PHOTO_CLASS} />
    </div>
  );
}

export function PortraitButton({
  step,
  name,
  settled,
  onOpen,
}: {
  step: Step;
  name: string;
  settled: boolean;
  onOpen: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useMapView((v) => {
    const el = button.current;
    if (!el) return;
    const l = v.lens;
    const size = Math.max(0, Math.min(l.w, l.h));
    el.style.width = `${size.toFixed(1)}px`;
    el.style.height = `${size.toFixed(1)}px`;
    el.style.transform = `translate3d(${(l.x - size / 2).toFixed(1)}px, ${(l.y - size / 2).toFixed(1)}px, 0)`;
  });
  const active = step === "humanScale";
  return (
    <button
      ref={button}
      type="button"
      data-portrait-button
      onClick={onOpen}
      aria-label={`Ver perfil de ${name}`}
      className={`group absolute top-0 left-0 rounded-full outline-none transition-opacity duration-700 ${
        active ? `pointer-events-auto visible cursor-pointer opacity-100 ${settled ? "" : "delay-[2600ms]"}` : "pointer-events-none invisible opacity-0"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border-[3px] border-transparent transition-colors duration-300 group-hover:border-accent group-focus-visible:border-accent"
      />
      <span
        aria-hidden="true"
        className="absolute -inset-[14px] rounded-full border-[1.5px] border-dashed border-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center gap-2 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-notation text-[12px] font-medium tracking-[0.1em] whitespace-nowrap text-ink transition-colors duration-300 group-hover:bg-accent group-focus-visible:bg-accent compact:text-[11px]"
      >
        VER PERFIL
        <ArrowIcon className="size-3.5" />
      </span>
    </button>
  );
}
