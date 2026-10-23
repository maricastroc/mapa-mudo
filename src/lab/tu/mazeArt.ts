import { INK } from "../riso/inks.ts";
import type { Dir } from "./maze.ts";
import type { Kind } from "./mazeRound.ts";

export type Look = "normal" | "scared" | "blink";

export const PARASITE_INK: Record<Kind, { body: string; mark: string; pupil: string }> = {
  chaser: { body: INK.orange, mark: INK.black, pupil: INK.black },
  interceptor: { body: INK.blue, mark: INK.paper, pupil: INK.black },
  patroller: { body: INK.black, mark: INK.orange, pupil: INK.orange },
};

const LOOK: Record<Dir, { x: number; y: number }> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

function line(s: number) {
  return Math.max(1.1, s * 0.045);
}

export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, angle: number, glow = 0) {
  const r = s * 0.17;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.strokeStyle = `rgba(238, 112, 76, ${(0.85 * glow).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.9 + glow * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = INK.blue;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line(s) * 0.7;
  const lobe = (lx: number, ly: number, la: number, ll: number) => {
    ctx.beginPath();
    ctx.ellipse(lx, ly, ll, ll * 0.42, la, 0, Math.PI * 2);
    ctx.fill();
    if (s > 34) ctx.stroke();
  };
  lobe(0, -r * 0.55, -Math.PI / 2, r * 0.62);
  lobe(-r * 0.55, -r * 0.05, -2.5, r * 0.55);
  lobe(r * 0.55, -r * 0.05, -0.64, r * 0.55);
  lobe(-r * 0.42, r * 0.55, 2.6, r * 0.42);
  lobe(r * 0.42, r * 0.55, 0.54, r * 0.42);
  ctx.strokeStyle = INK.orange;
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, r * 1.1);
  ctx.lineTo(0, -r * 0.6);
  ctx.stroke();
  ctx.restore();
}

export function drawDose(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, still = false) {
  const pulse = still ? 0.5 : (Math.sin(t * 5) + 1) / 2;
  const w = s * 0.34;
  const h = s * 0.5;
  ctx.save();
  ctx.translate(x, y + (still ? 0 : Math.sin(t * 3) * s * 0.03));
  ctx.strokeStyle = `rgba(238, 112, 76, ${(0.35 + 0.5 * pulse).toFixed(3)})`;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, s * (0.36 + pulse * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  const body = new Path2D();
  body.roundRect(-w / 2, -h * 0.3, w, h * 0.78, w * 0.32);
  ctx.fillStyle = INK.paper;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = INK.orange;
  ctx.fillRect(-w / 2, h * 0.05, w, h * 0.5);
  ctx.fillStyle = "rgba(247, 248, 246, 0.7)";
  ctx.fillRect(-w * 0.3, -h * 0.22, w * 0.14, h * 0.55);
  ctx.restore();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = line(s);
  ctx.stroke(body);
  ctx.fillStyle = INK.black;
  ctx.fillRect(-w * 0.32, -h * 0.5, w * 0.64, h * 0.2);
  ctx.fillStyle = INK.paper;
  ctx.beginPath();
  ctx.arc(w * 0.62, -h * 0.42, s * 0.05 + pulse * s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK.orange;
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.moveTo(w * 0.62 + Math.cos(a) * s * 0.05, -h * 0.42 + Math.sin(a) * s * 0.05);
    ctx.lineTo(w * 0.62 + Math.cos(a) * s * 0.11, -h * 0.42 + Math.sin(a) * s * 0.11);
  }
  ctx.stroke();
  ctx.restore();
}

export type ResearcherPose = { facing: Dir; walk: number; moving: boolean; spin?: number; shrink?: number };

export function drawResearcher(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, pose: ResearcherPose) {
  const flip = pose.facing === "left" ? -1 : 1;
  const step = pose.moving ? Math.sin(pose.walk * Math.PI * 2) : 0;
  const bob = pose.moving ? Math.abs(Math.sin(pose.walk * Math.PI * 2)) * s * 0.04 : 0;
  const k = 1 - (pose.shrink ?? 0);
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(pose.spin ?? 0);
  ctx.scale(flip * k, k);
  const lw = line(s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = lw * 1.7;
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, s * 0.2);
  ctx.lineTo(-s * 0.06 - step * s * 0.11, s * 0.41);
  ctx.moveTo(s * 0.07, s * 0.2);
  ctx.lineTo(s * 0.07 + step * s * 0.11, s * 0.41);
  ctx.stroke();
  ctx.strokeStyle = INK.blue;
  ctx.lineWidth = lw * 1.2;
  ctx.beginPath();
  ctx.moveTo(-s * 0.24, -s * 0.04);
  ctx.lineTo(-s * 0.3, -s * 0.24);
  ctx.moveTo(-s * 0.2, -s * 0.04);
  ctx.lineTo(-s * 0.16, -s * 0.2);
  ctx.stroke();
  ctx.fillStyle = INK.blue;
  for (const [lx, ly, la] of [
    [-0.3, -0.25, -2.0],
    [-0.16, -0.21, -1.1],
    [-0.27, -0.14, -2.6],
  ]) {
    ctx.beginPath();
    ctx.ellipse(lx * s, ly * s, s * 0.06, s * 0.025, la, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK.black;
  ctx.fillStyle = INK.orange;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(-s * 0.36, -s * 0.06, s * 0.2, s * 0.24, s * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, s * 0.04);
  ctx.lineTo(-s * 0.18, s * 0.04);
  ctx.stroke();
  const coat = new Path2D();
  coat.moveTo(-s * 0.15, -s * 0.08);
  coat.lineTo(s * 0.15, -s * 0.08);
  coat.lineTo(s * 0.22, s * 0.24);
  coat.lineTo(-s * 0.22, s * 0.24);
  coat.closePath();
  ctx.fillStyle = INK.paper;
  ctx.fill(coat);
  ctx.stroke(coat);
  ctx.strokeStyle = INK.blue;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(s * 0.03, -s * 0.06);
  ctx.lineTo(s * 0.05, s * 0.22);
  ctx.stroke();
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.moveTo(s * 0.08, -s * 0.02);
  ctx.lineTo(s * 0.24, s * 0.08 - step * s * 0.05);
  ctx.stroke();
  ctx.fillStyle = INK.paper;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(s * 0.03, -s * 0.27, s * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK.black;
  ctx.beginPath();
  ctx.moveTo(-s * 0.17, -s * 0.16);
  ctx.quadraticCurveTo(-s * 0.21, -s * 0.5, s * 0.06, -s * 0.48);
  ctx.quadraticCurveTo(s * 0.24, -s * 0.46, s * 0.21, -s * 0.31);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.37, -s * 0.04, -s * 0.31);
  ctx.lineTo(-s * 0.07, -s * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.12, -s * 0.25, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(238, 112, 76, 0.55)";
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.18, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wobblyPath(points: number, radius: (a: number) => number, t: number, amount: number, seed: number) {
  const path = new Path2D();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius(a) * (1 + Math.sin(a * 3 + t * 5 + seed) * amount + Math.sin(a * 5 - t * 3.4 + seed) * amount * 0.6);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}

function eyes(ctx: CanvasRenderingContext2D, s: number, cx: number, cy: number, dir: Dir | null, mood: "angry" | "worried", pupil: string, spread = 0.13) {
  const look = dir ? LOOK[dir] : { x: 0, y: 0 };
  for (const side of [-1, 1]) {
    const ex = cx + side * s * spread;
    ctx.fillStyle = INK.paper;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line(s) * 0.8;
    ctx.beginPath();
    ctx.ellipse(ex, cy, s * 0.085, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = mood === "worried" ? INK.blue : pupil;
    ctx.beginPath();
    ctx.arc(ex + look.x * s * 0.035, cy + look.y * s * 0.04, s * (mood === "worried" ? 0.03 : 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = line(s) * 1.1;
    ctx.beginPath();
    if (mood === "angry") {
      ctx.moveTo(ex - side * s * 0.09, cy - s * 0.15);
      ctx.lineTo(ex + side * s * 0.06, cy - s * 0.09);
    } else {
      ctx.moveTo(ex - side * s * 0.08, cy - s * 0.1);
      ctx.lineTo(ex + side * s * 0.06, cy - s * 0.16);
    }
    ctx.stroke();
  }
  if (mood === "worried") {
    ctx.strokeStyle = INK.blue;
    ctx.lineWidth = line(s);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = cx - s * 0.12 + (i / 6) * s * 0.24;
      const py = cy + s * 0.17 + (i % 2 ? -1 : 1) * s * 0.025;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

export function drawParasite(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, s: number, t: number, look: Look, dir: Dir | null) {
  const scared = look !== "normal";
  const blinkOn = look === "blink" && Math.floor(t * 6) % 2 === 0;
  const paint = scared && !blinkOn;
  const ink = PARASITE_INK[kind];
  const lw = line(s);
  const shake = paint ? Math.sin(t * 40) * s * 0.02 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const fill = paint ? INK.paper : ink.body;
  const edge = paint ? INK.blue : INK.black;
  const dash = paint ? [s * 0.08, s * 0.05] : [];
  if (kind === "chaser") {
    const outer = wobblyPath(28, () => s * 0.4, t, 0.05, 1);
    const inner = wobblyPath(20, () => s * 0.21, t, 0.04, 3);
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.save();
    ctx.translate(s * 0.05, s * 0.06);
    ctx.fill(outer);
    ctx.restore();
    ctx.fillStyle = fill;
    ctx.fill(outer);
    ctx.setLineDash(dash);
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke(outer);
    ctx.setLineDash([]);
    ctx.fillStyle = paint ? "#eef0fb" : INK.paper;
    ctx.fill(inner);
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 0.8;
    ctx.stroke(inner);
    ctx.fillStyle = paint ? INK.blue : ink.mark;
    ctx.beginPath();
    ctx.arc(s * 0.27, -s * 0.2, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, s, 0, -s * 0.01, dir, paint ? "worried" : "angry", ink.pupil, 0.1);
  } else if (kind === "interceptor") {
    const facing = dir ? Math.atan2(LOOK[dir].y, LOOK[dir].x) : 0;
    const body = wobblyPath(30, (a) => {
      const rel = Math.cos(a - facing);
      return s * (0.3 + 0.16 * Math.max(0, rel) ** 3);
    }, t, 0.04, 2);
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.save();
    ctx.translate(s * 0.05, s * 0.06);
    ctx.fill(body);
    ctx.restore();
    ctx.fillStyle = fill;
    ctx.fill(body);
    ctx.setLineDash(dash);
    ctx.strokeStyle = edge;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke(body);
    ctx.setLineDash([]);
    ctx.fillStyle = paint ? INK.blue : ink.mark;
    for (const [px, py] of [
      [-0.16, 0.16],
      [0.02, 0.22],
      [-0.22, -0.04],
    ]) {
      ctx.beginPath();
      ctx.arc(px * s, py * s, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = paint ? INK.blue : INK.orange;
    ctx.beginPath();
    ctx.arc(Math.cos(facing) * s * 0.42, Math.sin(facing) * s * 0.42, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    eyes(ctx, s, -Math.cos(facing) * s * 0.02, -s * 0.06, dir, paint ? "worried" : "angry", ink.pupil, 0.11);
  } else {
    const body = new Path2D();
    const wob = Math.sin(t * 4) * s * 0.03;
    body.moveTo(-s * 0.44, -s * 0.06 + wob);
    body.quadraticCurveTo(0, -s * 0.42, s * 0.44, -s * 0.06 - wob);
    body.quadraticCurveTo(s * 0.5, s * 0.08, s * 0.38, s * 0.12);
    body.quadraticCurveTo(0, -s * 0.06, -s * 0.38, s * 0.12);
    body.quadraticCurveTo(-s * 0.5, s * 0.08, -s * 0.44, -s * 0.06 + wob);
    body.closePath();
    ctx.translate(0, s * 0.12);
    ctx.fillStyle = "rgba(41, 41, 41, 0.18)";
    ctx.save();
    ctx.translate(s * 0.05, s * 0.06);
    ctx.fill(body);
    ctx.restore();
    ctx.fillStyle = fill;
    ctx.fill(body);
    ctx.setLineDash(dash);
    ctx.strokeStyle = paint ? edge : INK.black;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke(body);
    ctx.setLineDash([]);
    ctx.fillStyle = paint ? INK.blue : ink.mark;
    for (const [px, py] of [
      [-0.28, -0.02],
      [0.3, -0.04],
      [-0.06, -0.2],
    ]) {
      ctx.beginPath();
      ctx.arc(px * s, py * s, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    eyes(ctx, s, 0, -s * 0.19, dir, paint ? "worried" : "angry", ink.pupil, 0.1);
  }
  ctx.restore();
}

export function drawMolecule(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, color: string = INK.orange) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = color;
  for (const a of [-Math.PI / 6, Math.PI / 6]) {
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
