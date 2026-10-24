import { halftone } from "../riso/halftone.ts";
import { createNoise, fbm } from "../riso/noise.ts";
import { INK } from "../riso/inks.ts";
import type { KidLayout } from "./kidLayout.ts";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function house(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, line: number, tone: string, roof: boolean) {
  ctx.fillStyle = INK.paper;
  ctx.fillRect(x, base - h, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, base - h, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x, y: base - h, w, h }, Math.max(3.6, w * 0.045), 45, (px) => 0.1 + 0.22 * clamp((px - x) / w, 0, 1), tone);
  ctx.restore();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(x, base - h, w, h);
  if (roof) {
    ctx.fillStyle = INK.orange;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.06, base - h);
    ctx.lineTo(x + w / 2, base - h - w * 0.2);
    ctx.lineTo(x + w * 1.06, base - h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  const cols = Math.max(1, Math.floor(w / (h * 0.42)));
  for (let c = 0; c < cols; c++) {
    const wx = x + ((c + 0.5) / cols) * w - w * 0.07;
    ctx.fillStyle = "#dfe3f7";
    ctx.fillRect(wx, base - h * 0.78, w * 0.14, h * 0.26);
    ctx.lineWidth = line * 0.8;
    ctx.strokeRect(wx, base - h * 0.78, w * 0.14, h * 0.26);
  }
}

function clinic(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, line: number) {
  ctx.fillStyle = INK.paper;
  ctx.fillRect(x, base - h, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, base - h, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x, y: base - h, w, h }, Math.max(3.4, w * 0.03), 15, (px, py) => 0.12 + 0.2 * clamp((py - (base - h)) / h, 0, 1), INK.blue);
  ctx.restore();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(x, base - h, w, h);
  ctx.fillStyle = INK.blue;
  ctx.fillRect(x - w * 0.03, base - h - h * 0.1, w * 1.06, h * 0.1);
  ctx.strokeRect(x - w * 0.03, base - h - h * 0.1, w * 1.06, h * 0.1);
  const cx = x + w * 0.5;
  const cy = base - h * 0.68;
  const arm = h * 0.1;
  ctx.fillStyle = INK.orange;
  ctx.fillRect(cx - arm * 0.36, cy - arm, arm * 0.72, arm * 2);
  ctx.fillRect(cx - arm, cy - arm * 0.36, arm * 2, arm * 0.72);
  ctx.lineWidth = line * 0.8;
  ctx.strokeRect(cx - arm * 0.36, cy - arm, arm * 0.72, arm * 2);
  const door = { x: cx - w * 0.09, y: base - h * 0.34, w: w * 0.18, h: h * 0.34 };
  ctx.fillStyle = INK.paper;
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.strokeRect(door.x, door.y, door.w, door.h);
  for (const side of [-1, 1]) {
    const wx = cx + side * w * 0.3 - w * 0.07;
    ctx.fillStyle = "#dfe3f7";
    ctx.fillRect(wx, base - h * 0.4, w * 0.14, h * 0.2);
    ctx.strokeRect(wx, base - h * 0.4, w * 0.14, h * 0.2);
  }
}

function tree(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, line: number) {
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + h * 0.06, base - h * 0.5, x, base - h * 0.78);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.52;
    const len = h * 0.34;
    const tx = x + Math.cos(a) * len;
    const ty = base - h * 0.78 + Math.sin(a) * len + len * 0.25 * Math.abs(i - 2.5) * 0.4;
    ctx.fillStyle = i % 2 ? INK.blue : "#5f6bd8";
    ctx.beginPath();
    ctx.moveTo(x, base - h * 0.78);
    ctx.quadraticCurveTo((x + tx) / 2, (base - h * 0.78 + ty) / 2 - len * 0.35, tx, ty);
    ctx.quadraticCurveTo((x + tx) / 2, (base - h * 0.78 + ty) / 2 + len * 0.1, x, base - h * 0.78);
    ctx.fill();
    ctx.lineWidth = line * 0.7;
    ctx.stroke();
  }
}

export function paintTown(ctx: CanvasRenderingContext2D, layout: KidLayout) {
  const { W, H, lanes } = layout;
  const rand = rngOf(1943);
  const noise = createNoise(2025);
  const line = clamp(H * 0.0019, 1.2, 2.4);
  const cell = clamp(H * 0.0062, 3.6, 7);
  const wall = lanes[0].y - lanes[0].size * 0.04;

  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x: 0, y: 0, w: W, h: wall }, cell, 15, (x, y) => 0.03 + 0.08 * Math.pow(y / wall, 1.3) + fbm(noise, x / (H * 0.5), y / (H * 0.5), 2, 0.5) * 0.05, INK.blue);
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.translate(W * (layout.portrait ? 0.78 : 0.88), H * 0.13);
  ctx.fillStyle = INK.orange;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, H * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const baseHeight = layout.portrait ? H * 0.2 : H * 0.28;
  let x = -W * 0.02;
  let i = 0;
  const clinicAt = layout.portrait ? 1 : Math.floor(W / (H * 0.52) / 2);
  while (x < W) {
    const w = H * (0.2 + rand() * 0.14);
    if (i === clinicAt) {
      const cw = H * (layout.portrait ? 0.4 : 0.52);
      clinic(ctx, x, wall, cw, baseHeight * 1.35, line);
      x += cw + H * 0.03;
    } else if (rand() < 0.28) {
      tree(ctx, x + w * 0.4, wall, baseHeight * 1.5, line);
      x += w * 0.8;
    } else {
      const h = baseHeight * (0.7 + rand() * 0.6);
      house(ctx, x, wall, w, h, line, rand() < 0.5 ? INK.blue : INK.orange, rand() < 0.5);
      x += w + H * 0.015;
    }
    i++;
  }

  const street = lanes[2].y + lanes[2].size * 0.1;
  ctx.fillStyle = INK.land;
  ctx.fillRect(0, wall, W, H - wall);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x: 0, y: wall, w: W, h: H - wall }, cell, 75, (px, py) => 0.05 + 0.2 * clamp((py - wall) / (H - wall), 0, 1) + fbm(noise, px / (H * 0.3), py / (H * 0.3), 2, 0.5) * 0.06, INK.orange);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 1.2;
  ctx.beginPath();
  ctx.moveTo(0, wall);
  ctx.lineTo(W, wall);
  ctx.stroke();

  ctx.lineWidth = line * 0.8;
  ctx.setLineDash([H * 0.03, H * 0.025]);
  ctx.strokeStyle = "rgba(41, 41, 41, 0.35)";
  for (let l = 0; l < lanes.length - 1; l++) {
    const y = (lanes[l].y + lanes[l + 1].y) / 2 - lanes[l + 1].size * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(0, Math.min(H - 2, street));
  ctx.lineTo(W, Math.min(H - 2, street));
  ctx.stroke();
}

export type Mosquito = { x: number; y: number; vx: number; vy: number; phase: number; size: number };

export function mosquitoes(layout: KidLayout, count: number): Mosquito[] {
  const rand = rngOf(77);
  return Array.from({ length: count }, () => ({
    x: rand() * layout.W,
    y: layout.H * (0.08 + rand() * 0.42),
    vx: (rand() < 0.5 ? -1 : 1) * layout.H * (0.03 + rand() * 0.04),
    vy: 0,
    phase: rand() * 10,
    size: clamp(layout.H * 0.016, 9, 20),
  }));
}

export function drawMosquito(ctx: CanvasRenderingContext2D, m: Mosquito, time: number, line: number) {
  const flap = Math.sin(time * 38 + m.phase) * 0.35;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(m.vx < 0 ? -1 : 1, 1);
  ctx.strokeStyle = INK.black;
  ctx.fillStyle = INK.black;
  ctx.lineWidth = line * 0.9;
  ctx.lineCap = "round";
  const s = m.size;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.55, s * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK.paper;
  for (const dx of [-0.2, 0.12]) ctx.fillRect(s * dx, -s * 0.15, s * 0.07, s * 0.3);
  ctx.beginPath();
  ctx.moveTo(s * 0.5, 0);
  ctx.lineTo(s * 0.95, s * 0.12);
  for (const k of [-0.2, 0, 0.2]) {
    ctx.moveTo(s * k, s * 0.12);
    ctx.lineTo(s * (k - 0.2), s * 0.52);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(247, 248, 246, 0.8)";
  ctx.beginPath();
  ctx.ellipse(-s * 0.05, -s * 0.3 - flap * s * 0.2, s * 0.3, s * 0.12, -0.5 + flap, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
