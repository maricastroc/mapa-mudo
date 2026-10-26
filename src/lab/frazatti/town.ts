import { halftone, type Shade } from "../riso/halftone.ts";
import { createNoise, fbm } from "../riso/noise.ts";
import { INK, type Fonts } from "../riso/inks.ts";
import type { KidLayout } from "./kidLayout.ts";

type Rng = () => number;
type Area = { x: number; y: number; w: number; h: number };

const GLASS = "#dfe3f7";
const BRICK = "rgba(41, 41, 41, 0.28)";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function rngOf(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function letterSpacing(ctx: CanvasRenderingContext2D, value: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${value.toFixed(1)}px`;
}

function shadeShape(ctx: CanvasRenderingContext2D, shape: Path2D, area: Area, cell: number, angle: number, shade: Shade | number, color: string) {
  const k = Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
  const tile = document.createElement("canvas");
  tile.width = Math.max(1, Math.ceil(area.w * k));
  tile.height = Math.max(1, Math.ceil(area.h * k));
  const t = tile.getContext("2d");
  if (!t) return;
  t.scale(k, k);
  t.translate(-area.x, -area.y);
  halftone(t, area, cell, angle, typeof shade === "number" ? () => shade : shade, color);
  t.globalCompositeOperation = "destination-in";
  t.fillStyle = "#000";
  t.fill(shape);
  ctx.drawImage(tile, area.x, area.y, area.w, area.h);
}

function rectPath(x: number, y: number, w: number, h: number) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  return p;
}

type Ctx = { ctx: CanvasRenderingContext2D; line: number; cell: number; unit: number; rand: Rng; fonts: Fonts };

function wall(c: Ctx, x: number, base: number, w: number, h: number, tone: string, strength: number) {
  const { ctx, line, cell } = c;
  const shape = rectPath(x, base - h, w, h);
  ctx.fillStyle = INK.paper;
  ctx.fill(shape);
  shadeShape(ctx, shape, { x, y: base - h, w, h }, cell * 0.9, 45, (px, py) => strength * (0.45 + 0.55 * clamp((px - x) / w, 0, 1)) * (0.7 + 0.3 * clamp((py - (base - h)) / h, 0, 1)), tone);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.stroke(shape);
}

function windowPane(c: Ctx, x: number, y: number, w: number, h: number, mood: number) {
  const { ctx, line } = c;
  ctx.fillStyle = GLASS;
  ctx.fillRect(x, y, w, h);
  if (mood > 0.8) {
    ctx.fillStyle = "rgba(238, 112, 76, 0.4)";
    ctx.fillRect(x, y, w * 0.4, h);
  }
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.8;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
}

function railing(c: Ctx, x: number, y: number, w: number, h: number) {
  const { ctx, line } = c;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  for (let px = x + w * 0.06; px < x + w; px += w / 9) {
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
  }
  ctx.stroke();
}

function airConditioner(c: Ctx, x: number, y: number, s: number) {
  const { ctx, line } = c;
  ctx.fillStyle = INK.paper;
  ctx.fillRect(x, y, s, s * 0.6);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.8;
  ctx.strokeRect(x, y, s, s * 0.6);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(x + s * 0.1, y + (s * 0.6 * i) / 4);
    ctx.lineTo(x + s * 0.9, y + (s * 0.6 * i) / 4);
  }
  ctx.stroke();
}

function waterTank(c: Ctx, x: number, y: number, r: number) {
  const { ctx, line } = c;
  ctx.fillStyle = INK.paper;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.rect(x - r, y - r * 1.5, r * 2, r * 1.5);
  ctx.fill();
  ctx.stroke();
  shadeShape(ctx, rectPath(x - r, y - r * 1.5, r * 2, r * 1.5), { x: x - r, y: y - r * 1.5, w: r * 2, h: r * 1.5 }, 3.4, 45, (px) => 0.15 + 0.4 * clamp((px - x + r) / (r * 2), 0, 1), INK.black);
  ctx.beginPath();
  ctx.moveTo(x - r * 1.08, y - r * 1.5);
  ctx.lineTo(x, y - r * 2.1);
  ctx.lineTo(x + r * 1.08, y - r * 1.5);
  ctx.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y);
  ctx.lineTo(x - r * 0.7, y + r * 0.5);
  ctx.moveTo(x + r * 0.7, y);
  ctx.lineTo(x + r * 0.7, y + r * 0.5);
  ctx.stroke();
}

function block(c: Ctx, x: number, base: number, w: number, floors: number, tone: string) {
  const { ctx, line, unit, rand } = c;
  const fh = unit * 1.05;
  const h = floors * fh + unit * 0.35;
  wall(c, x, base, w, h, tone, 0.2);
  const cols = Math.max(2, Math.floor(w / (unit * 1.6)));
  const cw = w / cols;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.7;
  for (let f = 0; f < floors; f++) {
    const fy = base - h + unit * 0.35 + f * fh;
    ctx.beginPath();
    ctx.moveTo(x, fy);
    ctx.lineTo(x + w, fy);
    ctx.stroke();
    for (let col = 0; col < cols; col++) {
      const wx = x + col * cw + cw * 0.2;
      windowPane(c, wx, fy + fh * 0.22, cw * 0.6, fh * 0.55, rand());
      if (rand() < 0.1) railing(c, x + col * cw + cw * 0.08, fy + fh * 0.62, cw * 0.84, fh * 0.3);
      else if (rand() < 0.04) airConditioner(c, wx + cw * 0.12, fy + fh * 0.82, cw * 0.36);
    }
  }
  ctx.fillStyle = INK.paper;
  ctx.fillRect(x - unit * 0.06, base - h - unit * 0.12, w + unit * 0.12, unit * 0.14);
  ctx.strokeRect(x - unit * 0.06, base - h - unit * 0.12, w + unit * 0.12, unit * 0.14);
  if (rand() < 0.35) waterTank(c, x + w * (0.25 + rand() * 0.45), base - h - unit * 0.12, unit * 0.32);
  const door = rectPath(x + w / 2 - unit * 0.3, base - unit * 0.85, unit * 0.6, unit * 0.85);
  ctx.fillStyle = GLASS;
  ctx.fill(door);
  ctx.stroke(door);
}

const SHOPS = ["PADARIA", "MERCEARIA", "PAPELARIA", "SORVETES", "BAZAR"];

function sign(c: Ctx, text: string, x: number, y: number, w: number, h: number, fill: string, ink: string) {
  const { ctx, line, fonts } = c;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(x, y, w, h);
  ctx.save();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = h * 0.56;
  ctx.font = `700 ${size}px ${fonts.display}`;
  letterSpacing(ctx, size * 0.1);
  const width = ctx.measureText(text).width;
  if (width > w * 0.9) {
    size *= (w * 0.9) / width;
    ctx.font = `700 ${size}px ${fonts.display}`;
  }
  ctx.fillText(text, x + w / 2, y + h * 0.54);
  ctx.restore();
}

function shop(c: Ctx, x: number, base: number, w: number, tone: string, name: string) {
  const { ctx, line, unit, rand } = c;
  const h = unit * 3.5;
  wall(c, x, base, w, h, tone, 0.16);
  const signH = unit * 0.62;
  sign(c, name, x + w * 0.05, base - h + unit * 0.22, w * 0.9, signH, INK.paper, INK.blue);
  const top = base - h + unit * 0.22 + signH + unit * 0.12;
  const stripe = w / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? INK.paper : INK.orange;
    ctx.beginPath();
    ctx.moveTo(x + i * stripe, top);
    ctx.lineTo(x + (i + 1) * stripe, top);
    ctx.lineTo(x + (i + 1) * stripe - 1, top + unit * 0.5);
    ctx.quadraticCurveTo(x + (i + 0.5) * stripe, top + unit * 0.74, x + i * stripe + 1, top + unit * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 0.8;
    ctx.stroke();
  }
  const glass = { x: x + w * 0.08, y: top + unit * 0.9, w: w * 0.5, h: base - top - unit * 0.9 - unit * 0.05 };
  windowPane(c, glass.x, glass.y, glass.w, glass.h, 0.2);
  const door = { x: x + w * 0.66, y: top + unit * 0.78, w: w * 0.24, h: base - top - unit * 0.78 };
  ctx.fillStyle = INK.paper;
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = GLASS;
  ctx.fillRect(door.x + door.w * 0.14, door.y + door.h * 0.1, door.w * 0.72, door.h * 0.55);
  ctx.strokeRect(door.x + door.w * 0.14, door.y + door.h * 0.1, door.w * 0.72, door.h * 0.55);
  if (rand() < 0.0) {
    ctx.fillStyle = INK.orange;
    ctx.beginPath();
    ctx.arc(glass.x + glass.w * 0.25, glass.y + glass.h * 0.72, unit * 0.14, 0, Math.PI * 2);
    ctx.arc(glass.x + glass.w * 0.55, glass.y + glass.h * 0.78, unit * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function house(c: Ctx, x: number, base: number, w: number, tone: string) {
  const { ctx, line, unit, rand } = c;
  const h = unit * 2.9;
  wall(c, x, base, w, h, tone, 0.15);
  const roofH = unit * 1.1;
  const roof = new Path2D();
  roof.moveTo(x - w * 0.07, base - h);
  roof.lineTo(x + w * 0.2, base - h - roofH);
  roof.lineTo(x + w * 0.8, base - h - roofH);
  roof.lineTo(x + w * 1.07, base - h);
  roof.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill(roof);
  shadeShape(ctx, roof, { x: x - w * 0.1, y: base - h - roofH, w: w * 1.2, h: roofH }, c.cell * 0.8, 75, 0.5, INK.orange);
  ctx.strokeStyle = "rgba(41, 41, 41, 0.55)";
  ctx.lineWidth = line * 0.6;
  ctx.beginPath();
  for (let r = 1; r < 5; r++) {
    const f = r / 5;
    const y = base - h - roofH + roofH * f;
    ctx.moveTo(x + w * (0.2 - 0.27 * f), y);
    ctx.lineTo(x + w * (0.8 + 0.27 * f), y);
  }
  ctx.stroke();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.stroke(roof);
  const ww = w * 0.24;
  for (const px of [0.12, 0.64]) {
    windowPane(c, x + w * px, base - h + unit * 0.55, ww, unit * 1.05, rand());
    ctx.fillStyle = INK.blue;
    ctx.fillRect(x + w * px - ww * 0.28, base - h + unit * 0.55, ww * 0.26, unit * 1.05);
    ctx.fillRect(x + w * px + ww * 1.02, base - h + unit * 0.55, ww * 0.26, unit * 1.05);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 0.8;
    ctx.strokeRect(x + w * px - ww * 0.28, base - h + unit * 0.55, ww * 0.26, unit * 1.05);
    ctx.strokeRect(x + w * px + ww * 1.02, base - h + unit * 0.55, ww * 0.26, unit * 1.05);
  }
  const door = { x: x + w * 0.4, y: base - unit * 1.5, w: w * 0.2, h: unit * 1.5 };
  ctx.fillStyle = INK.orange;
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(door.x, door.y, door.w, door.h);
  ctx.fillStyle = INK.paper;
  ctx.beginPath();
  ctx.arc(door.x + door.w * 0.8, door.y + door.h * 0.55, line * 1.2, 0, Math.PI * 2);
  ctx.fill();
  if (rand() < 0.0) {
    ctx.fillStyle = INK.orange;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(x + w * (0.02 + rand() * 0.2), base - unit * (0.4 + rand() * 1.8), unit * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function clinic(c: Ctx, x: number, base: number, w: number, h: number) {
  const { ctx, line, unit, fonts } = c;
  wall(c, x, base, w, h, INK.blue, 0.24);
  ctx.fillStyle = INK.paper;
  ctx.fillRect(x - w * 0.03, base - h - unit * 0.3, w * 1.06, unit * 0.34);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(x - w * 0.03, base - h - unit * 0.3, w * 1.06, unit * 0.34);
  sign(c, "UBS", x + w * 0.08, base - h + unit * 0.25, w * 0.34, unit * 0.78, INK.blue, INK.paper);
  ctx.save();
  ctx.fillStyle = INK.black;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let small = unit * 0.3;
  ctx.font = `600 ${small}px ${fonts.mono}`;
  letterSpacing(ctx, small * 0.12);
  const room = w * 0.82 - unit * 0.5 - w * 0.46;
  const need = ctx.measureText("VACINAÇÃO ABERTA").width;
  if (need > room) small *= room / need;
  ctx.font = `600 ${small}px ${fonts.mono}`;
  letterSpacing(ctx, small * 0.12);
  ctx.fillText("POSTO DE SAÚDE", x + w * 0.46, base - h + unit * 0.5);
  ctx.fillText("VACINAÇÃO ABERTA", x + w * 0.46, base - h + unit * 0.86);
  ctx.restore();
  const cx = x + w * 0.82;
  const cy = base - h + unit * 0.64;
  const arm = unit * 0.32;
  ctx.fillStyle = INK.orange;
  ctx.fillRect(cx - arm * 0.34, cy - arm, arm * 0.68, arm * 2);
  ctx.fillRect(cx - arm, cy - arm * 0.34, arm * 2, arm * 0.68);
  ctx.lineWidth = line * 0.8;
  ctx.strokeRect(cx - arm * 0.34, cy - arm, arm * 0.68, arm * 2);
  ctx.strokeRect(cx - arm, cy - arm * 0.34, arm * 2, arm * 0.68);

  const rows = 1;
  const winY = base - h + unit * 1.55;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const wx = x + w / 2 + side * (w * 0.14 + i * w * 0.2) - unit * 0.34;
      for (let r = 0; r < rows; r++) windowPane(c, wx, winY, unit * 0.68, unit * 1.0, 0.3);
    }
  }
  const dw = w * 0.2;
  const door = { x: x + w / 2 - dw / 2, y: base - unit * 1.5, w: dw, h: unit * 1.5 };
  ctx.fillStyle = GLASS;
  ctx.fillRect(door.x, door.y, door.w, door.h);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.strokeRect(door.x, door.y, door.w, door.h);
  ctx.beginPath();
  ctx.moveTo(door.x + door.w / 2, door.y);
  ctx.lineTo(door.x + door.w / 2, base);
  ctx.stroke();
  ctx.fillStyle = INK.paper;
  ctx.fillRect(door.x - unit * 0.18, door.y - unit * 0.28, door.w + unit * 0.36, unit * 0.22);
  ctx.strokeRect(door.x - unit * 0.18, door.y - unit * 0.28, door.w + unit * 0.36, unit * 0.22);
  ctx.beginPath();
  ctx.moveTo(x - unit * 0.1, base);
  ctx.lineTo(x + w * 0.3, base - unit * 0.28);
  ctx.moveTo(x - unit * 0.1, base - unit * 0.7);
  ctx.lineTo(x + w * 0.3, base - unit * 0.98);
  ctx.stroke();
  ctx.fillStyle = INK.blue;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.02, base - h - unit * 0.3);
  ctx.lineTo(x - w * 0.02, base - h - unit * 1.5);
  ctx.stroke();
  ctx.fillStyle = INK.orange;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.02, base - h - unit * 1.5);
  ctx.lineTo(x + unit * 0.7, base - h - unit * 1.28);
  ctx.lineTo(x - w * 0.02, base - h - unit * 1.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  hedge(c, x + w * 0.62, base, w * 0.38);
}

function hedge(c: Ctx, x: number, base: number, w: number) {
  const { ctx, line, unit } = c;
  ctx.fillStyle = INK.paper;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.9;
  const n = Math.max(3, Math.round(w / (unit * 0.5)));
  const path = new Path2D();
  for (let i = 0; i < n; i++) {
    const cx = x + ((i + 0.5) / n) * w;
    path.moveTo(cx + unit * 0.34, base - unit * 0.28);
    path.arc(cx, base - unit * 0.28, unit * 0.34, 0, Math.PI * 2);
  }
  ctx.fill(path);
  shadeShape(ctx, path, { x, y: base - unit, w, h: unit }, 3.4, 45, 0.55, INK.blue);
  ctx.stroke(path);
}

function palm(c: Ctx, x: number, base: number, h: number) {
  const { ctx, line, rand } = c;
  const lean = (rand() - 0.5) * h * 0.18;
  const topX = x + lean;
  const topY = base - h;
  ctx.lineCap = "round";
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = Math.max(line * 3.4, h * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * 0.2, base - h * 0.55, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = INK.paper;
  ctx.lineWidth = Math.max(line * 1.8, h * 0.03);
  ctx.stroke();
  ctx.strokeStyle = BRICK;
  ctx.lineWidth = line * 0.7;
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    const px = x + lean * (2 * k * (1 - k) * 0.2 + k * k);
    const py = base - h * k;
    ctx.beginPath();
    ctx.moveTo(px - h * 0.025, py);
    ctx.lineTo(px + h * 0.025, py - h * 0.008);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.45;
    const len = h * (0.34 + rand() * 0.06);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.8 + len * 0.22 * Math.abs(i - 4) * 0.5;
    const mx = (topX + ex) / 2;
    const my = Math.min(topY, ey) - len * 0.28;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 1.2;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? INK.blue : "#4f5fd6";
    ctx.lineWidth = line * 0.9;
    for (let k = 0.2; k < 1; k += 0.1) {
      const px = (1 - k) * (1 - k) * topX + 2 * (1 - k) * k * mx + k * k * ex;
      const py = (1 - k) * (1 - k) * topY + 2 * (1 - k) * k * my + k * k * ey;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + side * len * 0.07, py + len * 0.1 * (1 - k * 0.4));
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = INK.orange;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.7;
  for (const dx of [-0.02, 0.025]) {
    ctx.beginPath();
    ctx.arc(topX + h * dx, topY + h * 0.03, h * 0.022, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function roundTree(c: Ctx, x: number, base: number, h: number) {
  const { ctx, line, rand } = c;
  ctx.strokeStyle = INK.black;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(line * 3, h * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + (rand() - 0.5) * h * 0.1, base - h * 0.4, x, base - h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = INK.paper;
  ctx.lineWidth = Math.max(line * 1.6, h * 0.04);
  ctx.stroke();
  const canopy = new Path2D();
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const r = h * (0.17 + rand() * 0.06);
    const cx = x + Math.cos(a) * h * 0.2;
    const cy = base - h * 0.78 + Math.sin(a) * h * 0.14;
    canopy.moveTo(cx + r, cy);
    canopy.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = INK.paper;
  ctx.fill(canopy);
  shadeShape(ctx, canopy, { x: x - h * 0.5, y: base - h * 1.2, w: h, h: h * 0.8 }, c.cell * 0.85, 75, (px, py) => 0.28 + 0.4 * clamp((py - (base - h * 1.1)) / (h * 0.6), 0, 1) + (px > x ? 0.08 : 0), INK.blue);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.stroke(canopy);
}

function skyline(c: Ctx, W: number, base: number, H: number) {
  const { ctx, rand } = c;
  const cell = c.cell * 0.9;
  let x = -W * 0.02;
  while (x < W) {
    const w = H * (0.07 + rand() * 0.07);
    const h = H * (0.14 + rand() * 0.3);
    const shape = rectPath(x, base - h, w, h);
    ctx.fillStyle = "rgba(16, 1, 227, 0.07)";
    ctx.fill(shape);
    shadeShape(ctx, shape, { x, y: base - h, w, h }, cell, 15, (px) => 0.05 + 0.1 * clamp((px - x) / w, 0, 1), INK.blue);
    ctx.strokeStyle = "rgba(16, 1, 227, 0.28)";
    ctx.lineWidth = c.line * 0.7;
    ctx.stroke(shape);
    ctx.fillStyle = "rgba(247, 248, 246, 0.7)";
    const step = H * 0.022;
    for (let wy = base - h + step; wy < base - step; wy += step) {
      for (let wx = x + step * 0.5; wx < x + w - step * 0.6; wx += step * 0.9) {
        if (rand() < 0.18) ctx.fillRect(wx, wy, step * 0.4, step * 0.5);
      }
    }
    if (rand() < 0.4) {
      ctx.strokeStyle = "rgba(16, 1, 227, 0.45)";
      ctx.beginPath();
      ctx.moveTo(x + w / 2, base - h);
      ctx.lineTo(x + w / 2, base - h - H * 0.04);
      ctx.stroke();
    }
    x += w + H * (0.005 + rand() * 0.02);
  }
}

export function paintTown(ctx: CanvasRenderingContext2D, layout: KidLayout, fonts: Fonts) {
  const { W, H, lanes } = layout;
  const rand = rngOf(1943);
  const noise = createNoise(2025);
  const line = clamp(H * 0.0019, 1.2, 2.4);
  const cell = clamp(H * 0.0062, 3.6, 7);
  const unit = layout.portrait ? clamp(H * 0.036, 18, 40) : clamp(H * 0.05, 22, 56);
  const base = lanes[0].y - lanes[0].size * 0.04;
  const c: Ctx = { ctx, line, cell, unit, rand, fonts };

  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x: 0, y: 0, w: W, h: base }, cell, 15, (x, y) => 0.03 + 0.09 * Math.pow(y / base, 1.3) + fbm(noise, x / (H * 0.5), y / (H * 0.5), 2, 0.5) * 0.05, INK.blue);
  ctx.globalCompositeOperation = "source-over";

  const sunX = W * (layout.portrait ? 0.8 : 0.88);
  const sunY = H * 0.14;
  const sunR = H * 0.06;
  const disc = new Path2D();
  disc.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = INK.paper;
  ctx.fill(disc);
  shadeShape(ctx, disc, { x: sunX - sunR, y: sunY - sunR, w: sunR * 2, h: sunR * 2 }, cell * 0.8, 75, (x, y) => 0.9 - 0.4 * clamp((y - sunY + sunR) / (sunR * 2), 0, 1), INK.orange);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.stroke();

  skyline(c, W, base - unit * 0.1, H);

  const tones = [INK.blue, INK.orange, INK.black, INK.blue];
  const clinicAt = layout.portrait ? 1 : Math.max(1, Math.floor(W / (unit * 11) / 2));
  const clinicW = unit * (layout.portrait ? 7.5 : 9.5);
  let x = -unit * 0.4;
  let i = 0;
  let shops = 0;
  while (x < W) {
    const roll = rand();
    if (i === clinicAt) {
      clinic(c, x, base, clinicW, unit * 4.6);
      x += clinicW + unit * 0.5;
    } else if (roll < 0.14) {
      const h = unit * (3.4 + rand() * 1.6);
      palm(c, x + unit * 0.9, base, h);
      x += unit * 2.6;
    } else if (roll < 0.22) {
      roundTree(c, x + unit * 1.3, base, unit * (3.4 + rand() * 1.2));
      x += unit * 3.2;
    } else if (roll < 0.48) {
      const w = unit * (3.6 + rand() * 1.6);
      block(c, x, base, w, 3 + Math.floor(rand() * 4), tones[Math.floor(rand() * tones.length)]);
      x += w + unit * (0.5 + rand() * 1.1);
    } else if (roll < 0.8) {
      const w = unit * (4.2 + rand() * 1.2);
      shop(c, x, base, w, tones[Math.floor(rand() * tones.length)], SHOPS[shops++ % SHOPS.length]);
      x += w + unit * (0.5 + rand() * 1.1);
    } else {
      const w = unit * (3.6 + rand() * 1);
      house(c, x, base, w, tones[Math.floor(rand() * 2)]);
      x += w + unit * (0.6 + rand() * 1.1);
    }
    i++;
  }

  const walk = unit * 0.5;
  ctx.fillStyle = INK.land;
  ctx.fillRect(0, base, W, H - base);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x: 0, y: base, w: W, h: H - base }, cell, 75, (px, py) => 0.05 + 0.2 * clamp((py - base) / (H - base), 0, 1) + fbm(noise, px / (H * 0.3), py / (H * 0.3), 2, 0.5) * 0.07, INK.orange);
  halftone(ctx, { x: 0, y: base, w: W, h: walk }, cell * 0.9, 45, () => 0.1, INK.black);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 1.3;
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.lineTo(W, base);
  ctx.moveTo(0, base + walk);
  ctx.lineTo(W, base + walk);
  ctx.stroke();
  ctx.lineWidth = line * 0.6;
  ctx.beginPath();
  for (let jx = 0; jx < W; jx += unit * 1.8) {
    ctx.moveTo(jx, base);
    ctx.lineTo(jx - unit * 0.18, base + walk);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(41, 41, 41, 0.35)";
  const specks = Math.round((W * (H - base)) / 1800);
  for (let k = 0; k < specks; k++) {
    const sx = rand() * W;
    const sy = base + walk + rand() * (H - base - walk);
    ctx.fillRect(sx, sy, 1.2, 1.2);
  }
  ctx.lineWidth = line * 0.9;
  ctx.setLineDash([H * 0.03, H * 0.025]);
  ctx.strokeStyle = "rgba(41, 41, 41, 0.4)";
  for (let l = 0; l < lanes.length - 1; l++) {
    const y = (lanes[l].y + lanes[l + 1].y) / 2 - lanes[l + 1].size * 0.06;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const street = lanes[2].y + lanes[2].size * 0.1;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(0, Math.min(H - 2, street));
  ctx.lineTo(W, Math.min(H - 2, street));
  ctx.stroke();
}

export function drawMosquito(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1, size: number, time: number, phase: number, line: number, spin = 0) {
  const flap = Math.sin(time * 38 + phase) * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.scale(dir, 1);
  ctx.strokeStyle = INK.black;
  ctx.fillStyle = INK.black;
  ctx.lineWidth = line * 0.9;
  ctx.lineCap = "round";
  const s = size;
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
