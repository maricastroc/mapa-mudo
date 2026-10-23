import { createNoise, fbm } from "../../map/noise.ts";
import { halftone, type HalftoneArea, type Shade } from "../riso/halftone.ts";
import { INK } from "../riso/inks.ts";
import type { FrogLayout } from "./frogLayout.ts";

type Rng = () => number;

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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function texture(ctx: CanvasRenderingContext2D, shape: Path2D, area: HalftoneArea, cell: number, angle: number, shade: Shade | number, color: string) {
  ctx.save();
  ctx.clip(shape);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, area, cell, angle, typeof shade === "number" ? () => shade : shade, color);
  ctx.restore();
}

function leafPath(x: number, y: number, angle: number, length: number, width: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const at = (u: number, v: number) => [x + u * c - v * s, y + u * s + v * c] as const;
  const path = new Path2D();
  path.moveTo(x, y);
  const [c1x, c1y] = at(length * 0.38, -width);
  const [tx, ty] = at(length, 0);
  const [c2x, c2y] = at(length * 0.38, width);
  path.quadraticCurveTo(c1x, c1y, tx, ty);
  path.quadraticCurveTo(c2x, c2y, x, y);
  path.closePath();
  return { path, tip: { x: tx, y: ty } };
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, fill: string, line: number, vein = true) {
  const { path, tip } = leafPath(x, y, angle, length, width);
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (line > 0) {
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line;
    ctx.stroke(path);
    if (vein) {
      ctx.lineWidth = line * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (tip.x - x) * 0.85, y + (tip.y - y) * 0.85);
      ctx.stroke();
    }
  }
}

function fern(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, lean: number, color: string, line: number, rand: Rng) {
  const tipX = x + lean * height * 0.9;
  const tipY = y - height;
  const cx = x + lean * height * 0.1;
  const cy = y - height * 0.9;
  const point = (k: number) => ({
    x: (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * tipX,
    y: (1 - k) * (1 - k) * y + 2 * (1 - k) * k * cy + k * k * tipY,
  });
  const leaflets = 9;
  for (let i = 1; i <= leaflets; i++) {
    const k = i / (leaflets + 1);
    const p = point(k);
    const q = point(Math.min(1, k + 0.02));
    const along = Math.atan2(q.y - p.y, q.x - p.x);
    const size = height * 0.24 * (1 - k * 0.75);
    for (const side of [-1, 1]) {
      drawLeaf(ctx, p.x, p.y, along + side * (1.05 + rand() * 0.2), size, size * 0.26, color, line * 0.6, false);
    }
  }
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, tipX, tipY);
  ctx.stroke();
}

function bromeliad(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, line: number, flower: boolean) {
  const angles = [-2.75, -2.35, -2.0, -1.72, -1.42, -1.12, -0.78, -0.4];
  angles.forEach((a, i) => {
    const length = size * (0.78 + ((i * 37) % 5) * 0.06);
    drawLeaf(ctx, x, y, a, length, size * 0.1, i % 2 ? INK.blue : "#3a2fe8", line, false);
  });
  if (flower) {
    ctx.fillStyle = INK.orange;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line;
    for (let i = 0; i < 4; i++) {
      const by = y - size * (0.12 + i * 0.1);
      const bx = x + (i % 2 ? 1 : -1) * size * 0.05;
      const { path } = leafPath(bx, by, -Math.PI / 2 + (i % 2 ? 0.5 : -0.5), size * 0.16, size * 0.05);
      ctx.fill(path);
      ctx.stroke(path);
    }
  }
}

function heliconia(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, line: number) {
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + height * 0.05, y - height * 0.6, x - height * 0.02, y - height);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const k = 0.45 + i * 0.12;
    const by = y - height * k;
    const side = i % 2 ? 1 : -1;
    const path = new Path2D();
    path.moveTo(x, by);
    path.lineTo(x + side * height * 0.17, by - height * 0.04);
    path.lineTo(x + side * height * 0.03, by + height * 0.06);
    path.closePath();
    ctx.fillStyle = INK.orange;
    ctx.fill(path);
    ctx.stroke(path);
  }
  drawLeaf(ctx, x, y - height * 0.2, -2.3, height * 0.55, height * 0.1, INK.blue, line);
  drawLeaf(ctx, x, y - height * 0.32, -0.75, height * 0.5, height * 0.09, INK.blue, line);
}

function wavy(x0: number, x1: number, y: number, amplitude: number, seed: number) {
  const points: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1 + 12; x += 12) {
    points.push({ x, y: y + Math.sin(x * 0.011 + seed) * amplitude + Math.sin(x * 0.037 + seed * 2) * amplitude * 0.35 });
  }
  return points;
}

export function paintForest(ctx: CanvasRenderingContext2D, layout: FrogLayout) {
  const { W, H } = layout;
  const [back, mid, front] = layout.lanes;
  const rand = rngOf(1919);
  const noise = createNoise(1894);
  const cell = clamp(H * 0.0062, 3.6, 7);
  const line = clamp(H * 0.0019, 1.2, 2.4);
  const logH = clamp(H * 0.042, 14, 44);
  const logBottom = back.y + logH;

  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  halftone(
    ctx,
    { x: 0, y: 0, w: W, h: logBottom },
    cell,
    15,
    (x, y) => 0.03 + 0.07 * Math.pow(y / logBottom, 1.3) + fbm(noise, x / (H * 0.5), y / (H * 0.5), 2, 0.5) * 0.05,
    INK.blue,
  );
  ctx.globalCompositeOperation = "source-over";

  const farCount = Math.max(5, Math.round(W / (H * 0.2)));
  for (let i = 0; i < farCount; i++) {
    const x = ((i + 0.3 + rand() * 0.4) / farCount) * W;
    const w = H * (0.02 + rand() * 0.018);
    const lean = (rand() - 0.5) * H * 0.04;
    const trunk = new Path2D();
    trunk.moveTo(x - w / 2 + lean, -10);
    trunk.lineTo(x + w / 2 + lean, -10);
    trunk.lineTo(x + w * 0.62, back.y + 4);
    trunk.lineTo(x - w * 0.62, back.y + 4);
    trunk.closePath();
    ctx.fillStyle = "rgba(16, 1, 227, 0.07)";
    ctx.fill(trunk);
    texture(ctx, trunk, { x: x - w * 2, y: 0, w: w * 4, h: back.y + 10 }, cell * 0.85, 45, (px) => 0.06 + 0.2 * clamp((px - x + w * 0.2) / w, 0, 1), INK.blue);
    ctx.strokeStyle = "rgba(16, 1, 227, 0.32)";
    ctx.lineWidth = line * 0.7;
    ctx.stroke(trunk);
    if (rand() < 0.55) {
      const by = back.y * (0.2 + rand() * 0.35);
      const side = rand() < 0.5 ? -1 : 1;
      const tx = x + side * w * (3 + rand() * 2);
      const ty = by - H * 0.08;
      ctx.strokeStyle = "rgba(16, 1, 227, 0.3)";
      ctx.lineWidth = Math.max(2, w * 0.18);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + lean * 0.5, by);
      ctx.quadraticCurveTo(x + side * w * 1.6, by - H * 0.02, tx, ty);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        drawLeaf(ctx, tx - side * k * w * 0.6, ty + k * H * 0.008, -Math.PI / 2 + side * (0.6 + k * 0.3), H * 0.03, H * 0.01, "rgba(16, 1, 227, 0.28)", 0);
      }
    }
  }

  const canopy = new Path2D();
  for (let x = -40; x < W + 60; x += H * 0.07) {
    const r = H * (0.06 + rand() * 0.05);
    canopy.moveTo(x + r, H * 0.02 * rand() - r * 0.3);
    canopy.arc(x, H * 0.02 * rand() - r * 0.3, r, 0, Math.PI * 2);
  }
  texture(ctx, canopy, { x: 0, y: 0, w: W, h: H * 0.2 }, cell, 75, 0.22, INK.blue);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = INK.blue;
  ctx.lineWidth = line * 0.8;
  ctx.stroke(canopy);
  ctx.restore();

  const nearTrunks = layout.portrait ? [0.08, 0.86] : [0.05, 0.44, 0.93];
  for (const k of nearTrunks) {
    const x = W * k + (rand() - 0.5) * W * 0.03;
    const w = clamp(H * 0.055, 22, 70);
    const trunk = new Path2D();
    trunk.moveTo(x - w * 0.45, -10);
    trunk.bezierCurveTo(x - w * 0.5, back.y * 0.5, x - w * 0.6, back.y * 0.8, x - w * 0.85, back.y + 6);
    trunk.lineTo(x + w * 0.85, back.y + 6);
    trunk.bezierCurveTo(x + w * 0.6, back.y * 0.8, x + w * 0.5, back.y * 0.5, x + w * 0.45, -10);
    trunk.closePath();
    ctx.fillStyle = INK.paper;
    ctx.fill(trunk);
    texture(ctx, trunk, { x: x - w, y: 0, w: w * 2, h: back.y + 10 }, cell * 0.85, 45, (px) => 0.32 + 0.4 * clamp((px - (x - w * 0.5)) / w, 0, 1), INK.black);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line;
    ctx.stroke(trunk);
    ctx.lineWidth = line * 0.7;
    for (let j = 0; j < 6; j++) {
      const y0 = back.y * (0.1 + j * 0.15 + rand() * 0.05);
      const xx = x + (rand() - 0.5) * w * 0.6;
      ctx.beginPath();
      ctx.moveTo(xx, y0);
      ctx.quadraticCurveTo(xx + w * 0.08, y0 + H * 0.03, xx - w * 0.04, y0 + H * 0.07);
      ctx.stroke();
    }
    const vine = rand() < 0.6;
    if (vine) {
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = line * 0.8;
      ctx.beginPath();
      for (let y = 0; y < back.y; y += 6) {
        const xx = x + Math.sin(y * 0.05 + k * 9) * w * 0.42;
        if (y === 0) ctx.moveTo(xx, y);
        else ctx.lineTo(xx, y);
      }
      ctx.stroke();
      for (let y = H * 0.06; y < back.y - H * 0.05; y += H * 0.07) {
        const xx = x + Math.sin(y * 0.05 + k * 9) * w * 0.42;
        drawLeaf(ctx, xx, y, rand() < 0.5 ? -0.4 : Math.PI + 0.4, H * 0.035, H * 0.012, INK.blue, line * 0.6);
      }
    }
  }

  const lianas = layout.portrait ? 3 : 5;
  for (let i = 0; i < lianas; i++) {
    const x0 = W * ((i + 0.5) / lianas) + (rand() - 0.5) * W * 0.1;
    const drop = back.y * (0.35 + rand() * 0.3);
    const x1 = x0 + (rand() - 0.5) * W * 0.12;
    ctx.strokeStyle = "rgba(41, 41, 41, 0.55)";
    ctx.lineWidth = line * 0.8;
    ctx.beginPath();
    ctx.moveTo(x0, -5);
    ctx.quadraticCurveTo((x0 + x1) / 2 + W * 0.02, drop * 0.9, x1, drop);
    ctx.stroke();
    for (let k = 0.3; k <= 1; k += 0.18) {
      const px = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * ((x0 + x1) / 2 + W * 0.02) + k * k * x1;
      const py = (1 - k) * (1 - k) * -5 + 2 * (1 - k) * k * drop * 0.9 + k * k * drop;
      drawLeaf(ctx, px, py, Math.PI / 2 + (rand() - 0.5) * 1.6, H * 0.03, H * 0.011, "rgba(16, 1, 227, 0.75)", line * 0.5, false);
    }
  }

  const soil = new Path2D();
  soil.rect(0, back.y, W, H - back.y);
  ctx.fillStyle = INK.paper;
  ctx.fill(soil);
  texture(ctx, soil, { x: 0, y: back.y, w: W, h: H - back.y }, cell, 75, (x, y) => 0.08 + 0.05 * ((y - back.y) / (H - back.y)) + fbm(noise, x / (H * 0.3), y / (H * 0.3), 2, 0.5) * 0.06, INK.orange);

  for (let i = 0; i < Math.round(W / (H * 0.14)); i++) {
    const x = rand() * W;
    const y = mid.y - H * 0.004;
    const height = (mid.y - logBottom) * (0.6 + rand() * 0.45);
    fern(ctx, x, y, height, (rand() - 0.5) * 1.2, rand() < 0.5 ? INK.blue : "rgba(16, 1, 227, 0.55)", line * 0.8, rand);
  }
  const heliconias = layout.portrait ? [0.3] : [0.22, 0.68];
  for (const k of heliconias) heliconia(ctx, W * k, mid.y, (mid.y - logBottom) * 1.05, line);

  const log = new Path2D();
  const logTop = wavy(-20, W + 20, back.y + 2, 1.5, 3);
  log.moveTo(logTop[0].x, logTop[0].y);
  for (const p of logTop) log.lineTo(p.x, p.y);
  log.lineTo(W + 20, logBottom);
  log.lineTo(-20, logBottom);
  log.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill(log);
  texture(ctx, log, { x: 0, y: back.y - 4, w: W, h: logH + 8 }, cell * 0.8, 75, (_x, y) => 0.42 + 0.3 * ((y - back.y) / logH), INK.orange);
  texture(ctx, log, { x: 0, y: back.y - 4, w: W, h: logH + 8 }, cell * 0.8, 45, (_x, y) => 0.12 + 0.42 * ((y - back.y) / logH), INK.black);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 0.7;
  for (let j = 0; j < 3; j++) {
    const yy = back.y + logH * (0.3 + j * 0.22);
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 14) {
      const y = yy + Math.sin(x * 0.02 + j * 2) * 1.6;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 6; i++) {
    const kx = rand() * W;
    ctx.beginPath();
    ctx.ellipse(kx, back.y + logH * 0.55, logH * 0.18, logH * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = line * 1.2;
  ctx.stroke(log);
  for (let i = 0; i < Math.round(W / (H * 0.18)); i++) {
    const x = rand() * W;
    const moss = new Path2D();
    const r = H * (0.012 + rand() * 0.01);
    for (let j = 0; j < 4; j++) {
      moss.moveTo(x + j * r * 0.9 + r, back.y + 2);
      moss.arc(x + j * r * 0.9, back.y + 2, r, Math.PI, 0);
    }
    ctx.fillStyle = INK.paper;
    ctx.fill(moss);
    texture(ctx, moss, { x: x - r, y: back.y - r * 2, w: r * 6, h: r * 3 }, cell * 0.7, 15, 0.7, INK.blue);
  }
  for (const k of layout.portrait ? [0.62] : [0.16, 0.57, 0.84]) {
    const x = W * k;
    const r = logH * 0.28;
    ctx.fillStyle = INK.paper;
    ctx.fillRect(x - r * 0.18, back.y + logH * 0.5, r * 0.36, r * 0.9);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 0.7;
    ctx.strokeRect(x - r * 0.18, back.y + logH * 0.5, r * 0.36, r * 0.9);
    ctx.beginPath();
    ctx.ellipse(x, back.y + logH * 0.5, r, r * 0.55, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = INK.orange;
    ctx.fill();
    ctx.stroke();
  }

  const trail = new Path2D();
  const trailTop = wavy(-20, W + 20, mid.y, 2.5, 7);
  const trailH = clamp(H * 0.035, 12, 36);
  trail.moveTo(trailTop[0].x, trailTop[0].y);
  for (const p of trailTop) trail.lineTo(p.x, p.y);
  for (let i = trailTop.length - 1; i >= 0; i--) trail.lineTo(trailTop[i].x, trailTop[i].y + trailH + Math.sin(i * 0.9) * 2);
  trail.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill(trail);
  texture(ctx, trail, { x: 0, y: mid.y - 4, w: W, h: trailH + 8 }, cell * 0.8, 75, (_x, y) => 0.1 + 0.28 * ((y - mid.y) / trailH), INK.blue);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.beginPath();
  trailTop.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  for (let i = 0; i < Math.round(W / 40); i++) {
    const x = rand() * W;
    const y = mid.y + trailH * (0.3 + rand() * 0.5);
    ctx.beginPath();
    ctx.ellipse(x, y, H * (0.004 + rand() * 0.005), H * 0.003, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.paper;
    ctx.fill();
    ctx.lineWidth = line * 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < Math.round(W / (H * 0.12)); i++) {
    const x = rand() * W;
    const height = (front.y - mid.y - trailH) * (0.55 + rand() * 0.4);
    if (rand() < 0.75) fern(ctx, x, front.y - H * 0.004, height, (rand() - 0.5) * 1.3, rand() < 0.4 ? INK.blue : "rgba(16, 1, 227, 0.6)", line * 0.8, rand);
    else bromeliad(ctx, x, front.y, height * 0.9, line * 0.8, rand() < 0.5);
  }

  const ground = new Path2D();
  const groundTop = wavy(-20, W + 20, front.y, 2.5, 11);
  ground.moveTo(groundTop[0].x, groundTop[0].y);
  for (const p of groundTop) ground.lineTo(p.x, p.y);
  ground.lineTo(W + 20, H + 10);
  ground.lineTo(-20, H + 10);
  ground.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill(ground);
  texture(ctx, ground, { x: 0, y: front.y - 4, w: W, h: H - front.y + 8 }, cell, 75, (x, y) => 0.16 + 0.12 * ((y - front.y) / (H - front.y)) + fbm(noise, x / (H * 0.2), y / (H * 0.2), 2, 0.5) * 0.08, INK.orange);
  texture(ctx, ground, { x: 0, y: front.y - 4, w: W, h: H - front.y + 8 }, cell * 1.1, 15, (_x, y) => 0.06 + 0.12 * ((y - front.y) / (H - front.y)), INK.blue);
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line * 1.2;
  ctx.beginPath();
  groundTop.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  for (let i = 0; i < Math.round(W / 26); i++) {
    const x = rand() * W;
    const y = front.y + (H - front.y) * (0.2 + rand() * 0.7);
    const orange = rand() < 0.22;
    ctx.save();
    ctx.globalAlpha = orange ? 0.85 : 0.6;
    drawLeaf(ctx, x, y, rand() * Math.PI * 2, H * (0.016 + rand() * 0.012), H * 0.006, orange ? INK.orange : INK.paper, line * 0.55);
    ctx.restore();
  }
  for (let i = 0; i < Math.round(W / 60); i++) {
    const x = rand() * W;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line * 0.7;
    ctx.beginPath();
    for (let j = -2; j <= 2; j++) {
      ctx.moveTo(x + j * 3, front.y + 1);
      ctx.lineTo(x + j * 5 + (rand() - 0.5) * 3, front.y - H * (0.012 + rand() * 0.01));
    }
    ctx.stroke();
  }
}

export type FrontLeaf = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number; pivotX: number; pivotY: number; phase: number; sway: number };

function sprite(w: number, h: number, dpr: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx);
  }
  return canvas;
}

function bigLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, cell: number, line: number) {
  const { path, tip } = leafPath(x, y, angle, length, width);
  ctx.fillStyle = INK.blue;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = "multiply";
  halftone(ctx, { x: Math.min(x, tip.x) - width, y: Math.min(y, tip.y) - width, w: Math.abs(tip.x - x) + width * 2, h: Math.abs(tip.y - y) + width * 2 }, cell, 45, () => 0.5, INK.black);
  ctx.restore();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line;
  ctx.stroke(path);
  ctx.strokeStyle = INK.paper;
  ctx.lineWidth = line * 1.1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (tip.x - x) * 0.88, y + (tip.y - y) * 0.88);
  ctx.stroke();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  ctx.lineWidth = line * 0.7;
  for (let k = 0.2; k < 0.85; k += 0.13) {
    const bx = x + (tip.x - x) * k;
    const by = y + (tip.y - y) * k;
    const reach = width * 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.15));
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + c * reach * 0.6 - s * side * reach, by + s * reach * 0.6 + c * side * reach);
      ctx.stroke();
    }
  }
}

export function frontLeaves(layout: FrogLayout, dpr: number): FrontLeaf[] {
  const { W, H } = layout;
  const cell = clamp(H * 0.0062, 3.6, 7);
  const line = clamp(H * 0.0022, 1.3, 2.6);
  const size = layout.portrait ? clamp(W * 0.32, 90, 220) : clamp(H * 0.26, 110, 300);
  const leaves: FrontLeaf[] = [];
  const left = sprite(size * 1.2, size * 1.2, dpr, (ctx) => {
    bigLeaf(ctx, size * 0.08, size * 1.18, -1.2, size * 0.95, size * 0.2, cell, line);
    bigLeaf(ctx, size * 0.02, size * 1.18, -0.75, size * 0.85, size * 0.18, cell, line);
    bigLeaf(ctx, size * 0.2, size * 1.18, -1.55, size * 0.7, size * 0.15, cell, line);
  });
  leaves.push({ image: left, x: -size * 0.12, y: H - size * 1.08, w: size * 1.2, h: size * 1.2, pivotX: 0.1, pivotY: 0.98, phase: 0, sway: 0.025 });
  const right = sprite(size * 1.1, size * 1.1, dpr, (ctx) => {
    bromeliad(ctx, size * 0.66, size * 1.08, size * 0.95, line, true);
  });
  leaves.push({ image: right, x: W - size * 0.82, y: H - size * 0.98, w: size * 1.1, h: size * 1.1, pivotX: 0.6, pivotY: 0.98, phase: 1.7, sway: 0.02 });
  return leaves;
}

export type Drift = { x: number; y: number; vx: number; vy: number; angle: number; spin: number; size: number; orange: boolean };

export function drifts(layout: FrogLayout, count: number): Drift[] {
  const rand = rngOf(2020);
  return Array.from({ length: count }, () => ({
    x: rand() * layout.W,
    y: rand() * layout.H * 0.8,
    vx: (rand() - 0.5) * layout.H * 0.02,
    vy: layout.H * (0.02 + rand() * 0.02),
    angle: rand() * Math.PI * 2,
    spin: (rand() - 0.5) * 1.2,
    size: layout.H * (0.012 + rand() * 0.008),
    orange: rand() < 0.35,
  }));
}

export function drawDrift(ctx: CanvasRenderingContext2D, d: Drift, line: number) {
  drawLeaf(ctx, d.x, d.y, d.angle, d.size * 2, d.size * 0.6, d.orange ? INK.orange : "rgba(16, 1, 227, 0.8)", line * 0.6);
}
