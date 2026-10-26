"use client";

import { useEffect, useRef } from "react";
import { HAND, HAND_CUFF } from "../johnson/sprites.ts";
import { INK } from "../riso/inks.ts";
import { drawKid, type Look, type Pose } from "./kidArt.ts";

const LOOP = 3.8;
const SICK: Look = { skin: "#d9a173", hair: INK.black, shirt: INK.blue, shorts: INK.black, style: 1, symptoms: ["fever", "spots"], prop: null };
const WELL: Look = { skin: "#f2cba6", hair: "#5b3a22", shirt: INK.orange, shorts: "#3b4c8f", style: 3, symptoms: [], prop: "icecream" };

type Panel = "sick" | "well";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function ground(ctx: CanvasRenderingContext2D, w: number, h: number, y: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = INK.orange;
  ctx.fillRect(0, y, w, h - y);
  ctx.restore();
}

function hand(ctx: CanvasRenderingContext2D, x: number, y: number, press: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (press) {
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.translate(x + 4, y + 8 - press * 6);
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
}

function drawPanel(ctx: CanvasRenderingContext2D, panel: Panel, w: number, h: number, t: number, hand_: string) {
  const y = h * 0.9;
  const size = h * 0.74;
  ground(ctx, w, h, y);
  if (panel === "well") {
    const u = clamp01((t - 0.1) / (LOOP - 0.5));
    const x = -size * 0.3 + u * (w + size * 0.6);
    const pose: Pose = { phase: t * 8, energy: 1, cheer: 0, scare: 0, patch: false, time: t };
    drawKid(ctx, WELL, pose, { x, y, size });
    const k = clamp01((t - 1.0) / 0.3) * (1 - clamp01((t - 2.4) / 0.3));
    if (k > 0) {
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = INK.blue;
      ctx.fillStyle = INK.blue;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      const cx = w * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, h * 0.2);
      ctx.lineTo(cx - 3, h * 0.32);
      ctx.lineTo(cx + 16, h * 0.1);
      ctx.stroke();
      ctx.font = `600 ${h * 0.16}px ${hand_}`;
      ctx.textAlign = "center";
      ctx.fillText("saudável!", cx, h * 0.5);
      ctx.restore();
    }
    return;
  }
  const x = w * 0.5;
  const tapAt = 1.1;
  const cured = t >= tapAt + 0.55;
  const age = t - tapAt - 0.55;
  const look: Look = cured ? { ...SICK, symptoms: [] } : SICK;
  const pose: Pose = {
    phase: t * (cured ? 7 : 4.6),
    energy: cured ? 0.15 + 0.85 * clamp01(age / 0.7) : 0.15,
    cheer: cured && age < 1.2 ? 1 : 0,
    scare: 0,
    patch: cured,
    time: t,
  };
  drawKid(ctx, look, pose, { x, y, size });
  if (t < tapAt) hand(ctx, x, y - size * 0.55, t > tapAt - 0.3 ? 1 : 0, clamp01((t - 0.15) / 0.2));
  else if (t < tapAt + 0.55) {
    const k = clamp01((t - tapAt) / 0.2);
    const out = clamp01((t - tapAt - 0.35) / 0.2);
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(x - size * 0.4 + k * size * 0.2 - out * size * 0.15, y - size * 0.44);
    ctx.fillStyle = INK.paper;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = 1.6;
    ctx.fillRect(0, -4, size * 0.26, 8);
    ctx.fillStyle = INK.orange;
    ctx.fillRect(2, -2.6, size * 0.2 * (1 - clamp01((t - tapAt - 0.15) / 0.25)), 5.2);
    ctx.strokeRect(0, -4, size * 0.26, 8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.11, 0);
    ctx.stroke();
    ctx.restore();
  } else if (age < 1.1) {
    ctx.save();
    ctx.globalAlpha = 1 - clamp01((age - 0.7) / 0.3);
    ctx.font = `600 ${h * 0.16}px ${hand_}`;
    ctx.fillStyle = INK.orange;
    ctx.textAlign = "center";
    ctx.fillText("curado!", x + size * 0.46, y - size * 0.72 - age * 8);
    ctx.restore();
  }
}

export function DengueIntroArt({ sickLabel, wellLabel, symptoms, reducedMotion }: { sickLabel: string; wellLabel: string; symptoms: string[]; reducedMotion: boolean }) {
  const sickRef = useRef<HTMLCanvasElement>(null);
  const wellRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvases: [HTMLCanvasElement | null, Panel][] = [
      [sickRef.current, "sick"],
      [wellRef.current, "well"],
    ];
    const caveat = getComputedStyle(sickRef.current ?? document.documentElement).getPropertyValue("--font-caveat").trim();
    const hand_ = caveat ? `${caveat}, cursive` : "cursive";
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
        drawPanel(ctx, panel, r.width, r.height, panel === "sick" && reducedMotion ? 0.8 : t, hand_);
      }
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div className="mt-5" aria-hidden="true">
      <div className="grid grid-cols-2 gap-[clamp(10px,2vmin,20px)] max-[420px]:grid-cols-1">
        {(
          [
            [sickRef, sickLabel, "border-iris-orange"],
            [wellRef, wellLabel, "border-iris-blue"],
          ] as const
        ).map(([ref, label, tone]) => (
          <figure key={label} className={`border-[1.5px] ${tone} bg-paper`}>
            <canvas ref={ref} className="block aspect-[2.1/1] w-full" />
            <figcaption className={`border-t-[1.5px] ${tone} px-3 py-1.5 font-notation text-[clamp(12px,1.6vmin,16px)] tracking-[0.04em]`}>{label}</figcaption>
          </figure>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1.5">
        {symptoms.map((s) => (
          <li key={s} className="border-[1.5px] border-ink bg-paper px-2 py-0.5 font-notation text-[clamp(11px,1.5vmin,15px)] tracking-[0.06em]">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
