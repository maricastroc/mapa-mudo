"use client";

import { useEffect, useRef } from "react";
import { INK } from "../riso/inks.ts";
import { drawDose, drawLeaf, drawParasite, drawResearcher } from "./mazeArt.ts";

const LOOP = 3.2;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function corridor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const band = h * 0.5;
  const top = (h - band) / 2;
  ctx.fillStyle = "rgba(16, 1, 227, 0.16)";
  ctx.fillRect(0, 0, w, top - 3);
  ctx.fillRect(0, top + band + 3, w, h - top - band - 3);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, top - 3);
  ctx.lineTo(w, top - 3);
  ctx.moveTo(0, top + band + 3);
  ctx.lineTo(w, top + band + 3);
  ctx.stroke();
  return h / 2;
}

function panel(ctx: CanvasRenderingContext2D, index: number, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h);
  const s = h * 0.62;
  const y = corridor(ctx, w, h);
  const k = t / LOOP;
  if (index === 0) {
    const x = w * 0.15 + k * w * 0.7;
    drawResearcher(ctx, x, y, s, { facing: "right", walk: t * 2.6, moving: true });
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.4, y);
    ctx.lineTo(w * 0.95, y);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  if (index === 1) {
    const x = w * 0.08 + k * w * 0.84;
    for (let i = 0; i < 4; i++) {
      const lx = w * (0.32 + i * 0.17);
      if (lx > x + s * 0.15) drawLeaf(ctx, lx, y, s, i * 0.6 - 0.4);
    }
    drawResearcher(ctx, x, y, s, { facing: "right", walk: t * 2.6, moving: true });
    return;
  }
  if (index === 2) {
    const x = w * 0.3 + k * w * 0.62;
    drawResearcher(ctx, x, y, s, { facing: "right", walk: t * 3, moving: true });
    drawParasite(ctx, "chaser", x - w * 0.24, y, s * 0.95, t, "normal", "right");
    ctx.fillStyle = INK.black;
    ctx.font = `600 ${h * 0.22}px var(--font-caveat), cursive`;
    ctx.fillText("!", x + s * 0.2, y - s * 0.5);
    return;
  }
  const grab = 0.35;
  const px = w * 0.12 + Math.min(k, grab) * w * 0.9 + Math.max(0, k - 0.55) * w * 0.9;
  const scared = k >= grab;
  if (!scared) drawDose(ctx, w * 0.45, y, s, t);
  const gx = w * 0.82 + (scared ? (Math.min(k, 0.55) - grab) * w * 0.15 : 0);
  if (k < 0.85) drawParasite(ctx, "interceptor", gx, y, s * 0.95, t, scared ? "scared" : "normal", scared ? "right" : "left");
  else {
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - clamp01((k - 0.85) / 0.15);
    ctx.beginPath();
    ctx.arc(gx, y, s * (0.3 + (k - 0.85) * 3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (scared) {
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, y, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawResearcher(ctx, px, y, s, { facing: "right", walk: t * 2.6, moving: true });
}

export function MazeIntroArt({ steps, reducedMotion }: { steps: string[]; reducedMotion: boolean }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const render = (time: number) => {
      const t = reducedMotion ? LOOP * 0.6 : ((time - start) / 1000) % LOOP;
      refs.current.forEach((canvas, i) => {
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.max(1, Math.round(r.width * dpr));
        const H = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== W || canvas.height !== H) {
          canvas.width = W;
          canvas.height = H;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        panel(ctx, i, r.width, r.height, i === 3 && reducedMotion ? LOOP * 0.5 : t);
      });
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div className="mt-5 grid grid-cols-2 gap-[clamp(8px,1.6vmin,16px)]" aria-hidden="true">
      {steps.map((label, i) => {
        const tone = i === 3 ? "border-accent" : i === 2 ? "border-ink" : "border-iris-blue";
        return (
        <figure key={label} className={`border-[1.5px] bg-paper ${tone}`}>
          <canvas
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="block aspect-[2.6/1] w-full"
          />
          <figcaption className={`border-t-[1.5px] ${tone} px-2.5 py-1 font-notation text-[clamp(11px,1.5vmin,15px)] leading-snug tracking-[0.03em]`}>{label}</figcaption>
        </figure>
        );
      })}
    </div>
  );
}
