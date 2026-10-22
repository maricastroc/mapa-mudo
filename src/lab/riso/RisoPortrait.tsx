"use client";

import { useEffect, useRef } from "react";
import { halftone } from "./halftone.ts";
import { INK } from "./inks.ts";

type RisoPortraitProps = {
  src: string;
  alt: string;
  focus: [number, number];
  zoom?: number;
  className?: string;
};

function render(canvas: HTMLCanvasElement, image: HTMLImageElement, focus: [number, number], zoom: number) {
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(1, rect.width);
  const H = Math.max(1, rect.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const sampleW = Math.round(W / 2);
  const sampleH = Math.round(H / 2);
  const sample = document.createElement("canvas");
  sample.width = sampleW;
  sample.height = sampleH;
  const s = sample.getContext("2d", { willReadFrequently: true });
  if (!s) return;
  const scale = Math.max(sampleW / image.naturalWidth, sampleH / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = Math.min(0, Math.max(sampleW - dw, sampleW / 2 - focus[0] * dw));
  const dy = Math.min(0, Math.max(sampleH - dh, sampleH / 2 - focus[1] * dh));
  s.filter = "contrast(1.32) brightness(1.1)";
  s.drawImage(image, dx, dy, dw, dh);
  const pixels = s.getImageData(0, 0, sampleW, sampleH).data;
  const lum = (x: number, y: number) => {
    const ix = Math.max(0, Math.min(sampleW - 1, Math.round(x / 2)));
    const iy = Math.max(0, Math.min(sampleH - 1, Math.round(y / 2)));
    const o = (iy * sampleW + ix) * 4;
    return (pixels[o] * 0.3 + pixels[o + 1] * 0.59 + pixels[o + 2] * 0.11) / 255;
  };

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  const area = { x: 0, y: 0, w: W, h: H };
  const cell = Math.max(3, Math.min(W, H) / 210);
  halftone(ctx, area, cell * 1.1, 72, (x, y) => {
    const l = lum(x, y);
    return 0.26 * Math.exp(-((l - 0.66) ** 2) / 0.03);
  }, INK.orange);
  halftone(ctx, area, cell, 15, (x, y) => Math.pow(1 - lum(x, y), 1.55) * 1.08, INK.blue);
  ctx.save();
  ctx.translate(1.2, -0.8);
  halftone(ctx, area, cell * 0.85, 45, (x, y) => Math.max(0, (0.3 - lum(x, y)) / 0.3) * 0.9, INK.black);
  ctx.restore();
}

export function RisoPortrait({ src, alt, focus, zoom = 1, className }: RisoPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = new Image();
    let ready = false;
    const draw = () => ready && render(canvas, image, focus, zoom);
    image.onload = () => {
      ready = true;
      draw();
    };
    image.src = src;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [src, focus, zoom]);

  return <canvas ref={canvasRef} role="img" aria-label={alt} className={`block h-full w-full ${className ?? ""}`} />;
}
