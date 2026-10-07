"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ScientistPhoto } from "@/content/scientists/types";
import { useMapView } from "@/map/MapCanvas";
import type { Step } from "./state";

export const PHOTO_ADAPTATION = "recorte circular e conversão para tons de cinza na instalação";

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
  const active = step === "humanScale";
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
