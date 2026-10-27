"use client";

import { useEffect, useState } from "react";
import type { BenchPhoto } from "../benches.ts";
import { halftone, type Box } from "./certificate.ts";

export type RisoDots = { blue: string; orange: string; black: string };

function sampleLuminance(image: HTMLImageElement, box: Box, focus: [number, number], zoom: number) {
  const scale = 4;
  const w = Math.max(1, Math.round(box.w * scale));
  const h = Math.max(1, Math.round(box.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const fit = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * fit;
  const dh = image.naturalHeight * fit;
  const dx = Math.min(0, Math.max(w - dw, w / 2 - focus[0] * dw));
  const dy = Math.min(0, Math.max(h - dh, h / 2 - focus[1] * dh));
  ctx.filter = "contrast(1.32) brightness(1.1)";
  ctx.drawImage(image, dx, dy, dw, dh);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  return (x: number, y: number) => {
    const ix = Math.max(0, Math.min(w - 1, Math.round((x - box.x) * scale)));
    const iy = Math.max(0, Math.min(h - 1, Math.round((y - box.y) * scale)));
    const o = (iy * w + ix) * 4;
    return (pixels[o] * 0.3 + pixels[o + 1] * 0.59 + pixels[o + 2] * 0.11) / 255;
  };
}

export function risoDots(image: HTMLImageElement, box: Box, focus: [number, number], zoom: number, cell: number): RisoDots | null {
  const lum = sampleLuminance(image, box, focus, zoom);
  if (!lum) return null;
  return {
    orange: halftone(box, cell * 1.1, 72, (x, y) => 0.3 * Math.exp(-((lum(x, y) - 0.66) ** 2) / 0.03)),
    blue: halftone(box, cell, 15, (x, y) => Math.pow(1 - lum(x, y), 1.55) * 1.08),
    black: halftone(box, cell * 0.85, 45, (x, y) => Math.max(0, (0.3 - lum(x, y)) / 0.3) * 0.9),
  };
}

export function useRisoDots(photo: BenchPhoto | null, box: Box, cell: number) {
  const [dots, setDots] = useState<{ src: string; dots: RisoDots } | null>(null);
  const { x, y, w, h } = box;

  useEffect(() => {
    if (!photo) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const result = risoDots(image, { x, y, w, h }, photo.focus, photo.zoom, cell);
      if (result) setDots({ src: photo.src, dots: result });
    };
    image.src = photo.src;
    return () => {
      alive = false;
    };
  }, [photo, x, y, w, h, cell]);

  return dots && photo && dots.src === photo.src ? dots.dots : null;
}
