"use client";

import { useEffect, useRef } from "react";
import { HAND, HAND_CUFF } from "../johnson/sprites.ts";
import { INK } from "../riso/inks.ts";
import { drawFrog, REST_POSE, type Look } from "./frogArt.ts";
import { motionAt } from "./frogMotion.ts";

const LOOK: Look = { build: "tree", skin: "orange", mark: "spots" };
const LOOP = 3.8;
const HOPPER = { at: 0.2, duration: 3.1, hops: 5, rest: 0.45 };

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

type Panel = "new" | "seen";

function drawPanel(ctx: CanvasRenderingContext2D, panel: Panel, w: number, h: number, t: number, hand: string) {
  ctx.clearRect(0, 0, w, h);
  const ground = h * 0.86;
  const size = h * 0.42;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(w, ground);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = INK.orange;
  ctx.fillRect(0, ground, w, h - ground);
  ctx.restore();

  const book = { x: w * 0.6, y: h * 0.06, w: w * 0.36, h: h * 0.44 };
  ctx.fillStyle = INK.blue;
  ctx.fillRect(book.x + 4, book.y + 4, book.w, book.h);
  ctx.fillStyle = "#f6f0e2";
  ctx.fillRect(book.x, book.y, book.w, book.h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(book.x, book.y, book.w, book.h);
  for (let x = book.x + 6; x < book.x + book.w - 4; x += 9) {
    ctx.beginPath();
    ctx.ellipse(x, book.y, 2, 3.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.paper;
    ctx.fill();
    ctx.stroke();
  }
  const cell = { x: book.x + 6, y: book.y + 10, w: book.w - 12, h: book.h - 16 };
  const cellFrog = Math.min(cell.w * 0.62, cell.h * 1.05);

  const tapAt = 1.0;
  const flight = 0.55;
  const inked = panel === "seen" || t >= tapAt + flight;
  if (inked) {
    const k = panel === "seen" ? 1 : clamp01((t - tapAt - flight) / 0.3);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w * k, cell.h);
    ctx.clip();
    drawFrog(ctx, LOOK, REST_POSE, { x: cell.x + cell.w / 2 - cellFrog * 0.04, y: cell.y + cell.h * 0.92, size: cellFrog, facing: 1 });
    ctx.restore();
    if (k >= 1) {
      ctx.fillStyle = INK.orange;
      ctx.beginPath();
      ctx.arc(cell.x + cell.w - 6, cell.y + cell.h - 6, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK.paper;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cell.x + cell.w - 8.5, cell.y + cell.h - 6);
      ctx.lineTo(cell.x + cell.w - 6.5, cell.y + cell.h - 4);
      ctx.lineTo(cell.x + cell.w - 3.5, cell.y + cell.h - 8.5);
      ctx.stroke();
    }
  } else {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(85, 96, 107, 0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(85, 96, 107, 0.7)";
    ctx.font = `600 ${cell.h * 0.5}px ${hand}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cell.x + cell.w / 2, cell.y + cell.h / 2);
  }

  if (panel === "new") {
    if (t < tapAt) {
      const x = w * 0.26;
      const breathe = Math.sin(t * 6) * 0.04;
      drawFrog(ctx, LOOK, { ...REST_POSE, squash: breathe }, { x, y: ground, size, facing: 1, halo: 3 });
      const press = t > tapAt - 0.3 ? 1 : 0;
      const alpha = clamp01((t - 0.15) / 0.2);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (press) {
        ctx.strokeStyle = INK.orange;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, ground - size * 0.3, size * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.translate(x + 4, ground - size * 0.25 + (6 - press * 5));
      ctx.rotate(-0.3);
      ctx.scale(0.7, 0.7);
      const path = new Path2D(HAND);
      ctx.fillStyle = INK.paper;
      ctx.fill(path);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = 1.8;
      ctx.stroke(path);
      ctx.stroke(new Path2D(HAND_CUFF));
      ctx.restore();
    } else if (t < tapAt + flight) {
      const e = ease((t - tapAt) / flight);
      const from = { x: w * 0.26, y: ground };
      const to = { x: cell.x + cell.w / 2, y: cell.y + cell.h * 0.92 };
      const cx = (from.x + to.x) / 2;
      const cy = Math.min(from.y, to.y) - h * 0.25;
      const x = (1 - e) * (1 - e) * from.x + 2 * (1 - e) * e * cx + e * e * to.x;
      const y = (1 - e) * (1 - e) * from.y + 2 * (1 - e) * e * cy + e * e * to.y;
      drawFrog(ctx, LOOK, { ...REST_POSE, stretch: Math.sin(Math.PI * e) * 0.8, tilt: -0.3 * Math.sin(Math.PI * e) }, { x, y, size: size + (cellFrog - size) * e, facing: 1, halo: 3 });
    } else if (t < tapAt + flight + 0.9) {
      const age = t - tapAt - flight;
      ctx.save();
      ctx.globalAlpha = 1 - clamp01((age - 0.6) / 0.3);
      ctx.font = `600 ${h * 0.13}px ${hand}`;
      ctx.fillStyle = INK.orange;
      ctx.textAlign = "center";
      ctx.fillText("novo!", w * 0.3, h * 0.42 - age * 8);
      ctx.restore();
    }
    return;
  }

  const m = motionAt(HOPPER, t);
  const x = -size * 0.6 + m.u * (w + size * 1.2);
  const y = ground - m.lift * h * 0.22;
  drawFrog(ctx, LOOK, { stretch: m.stretch, squash: m.squash, tilt: m.tilt, blink: 0, throat: 0 }, { x, y, size, facing: 1, halo: 3 });
  const look = clamp01((t - 0.7) / 0.3) * (1 - clamp01((t - 2.1) / 0.3));
  if (look > 0) {
    ctx.save();
    ctx.globalAlpha = look;
    ctx.strokeStyle = INK.blue;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.35);
    ctx.quadraticCurveTo((x + cell.x) / 2, Math.min(y, cell.y) - h * 0.08, cell.x + cell.w * 0.3, cell.y + cell.h * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 ${h * 0.14}px ${hand}`;
    ctx.fillStyle = INK.blue;
    ctx.textAlign = "center";
    ctx.fillText("igual!", (x + cell.x) / 2, Math.min(y, cell.y) + h * 0.04);
    ctx.restore();
  }
  if (t > 2.9) {
    ctx.strokeStyle = INK.pencil;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cell.x + 6, cell.y + 3);
    ctx.lineTo(cell.x + 5, cell.y + 3 + 10 * clamp01((t - 2.9) / 0.2));
    ctx.stroke();
  }
}

export function FrogIntroArt({ newLabel, seenLabel, reducedMotion }: { newLabel: string; seenLabel: string; reducedMotion: boolean }) {
  const newRef = useRef<HTMLCanvasElement>(null);
  const seenRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvases: [HTMLCanvasElement | null, Panel][] = [
      [newRef.current, "new"],
      [seenRef.current, "seen"],
    ];
    const caveat = getComputedStyle(newRef.current ?? document.documentElement).getPropertyValue("--font-caveat").trim();
    const hand = caveat ? `${caveat}, cursive` : "cursive";
    let frame = 0;
    const start = performance.now();
    const render = (time: number) => {
      const t = reducedMotion ? 2.0 : ((time - start) / 1000) % LOOP;
      for (const [canvas, panel] of canvases) {
        if (!canvas) continue;
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.max(1, Math.round(r.width * dpr));
        const H = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== W || canvas.height !== H) {
          canvas.width = W;
          canvas.height = H;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawPanel(ctx, panel, r.width, r.height, panel === "new" && reducedMotion ? 3 : t, hand);
      }
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div className="mt-5 grid grid-cols-2 gap-[clamp(10px,2vmin,20px)] max-[420px]:grid-cols-1" aria-hidden="true">
      {(
        [
          [newRef, newLabel, "border-accent"],
          [seenRef, seenLabel, "border-iris-blue"],
        ] as const
      ).map(([ref, label, tone]) => (
        <figure key={label} className={`border-[1.5px] ${tone} bg-paper`}>
          <canvas ref={ref} className="block aspect-[2.1/1] w-full" />
          <figcaption className={`border-t-[1.5px] ${tone} px-3 py-1.5 font-notation text-[clamp(12px,1.6vmin,16px)] tracking-[0.04em]`}>{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
