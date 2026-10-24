import { INK } from "../riso/inks.ts";

export type Symptom = "fever" | "spots" | "aches" | "nausea";
export type Prop = "freckles" | "icecream" | "backpack" | "balloon";
export type HairStyle = 0 | 1 | 2 | 3;

export type Look = {
  skin: string;
  hair: string;
  shirt: string;
  shorts: string;
  style: HairStyle;
  symptoms: Symptom[];
  prop: Prop | null;
};

export type Pose = {
  phase: number;
  energy: number;
  cheer: number;
  scare: number;
  patch: boolean;
  time: number;
};

export type KidDraw = { x: number; y: number; size: number; alpha?: number };

export const SKINS = ["#f2cba6", "#d9a173", "#a8704a", "#6f4529"] as const;
export const HAIRS = [INK.black, "#5b3a22", "#8a5a2b"] as const;
export const SHIRTS = [INK.blue, INK.orange, "#f3e7c9", "#4f9c86"] as const;
export const SHORTS = [INK.black, "#3b4c8f", "#7a4a2b"] as const;

export const SYMPTOMS: readonly Symptom[] = ["fever", "spots", "aches", "nausea"];

export const SYMPTOM_LABEL: Record<Symptom, string> = {
  fever: "febre forte",
  spots: "manchas na pele",
  aches: "dores no corpo",
  nausea: "enjoo",
};

const RED = "#c4261c";
const GREEN = "#9fc47a";
const REST: Pose = { phase: 0, energy: 1, cheer: 0, scare: 0, patch: false, time: 0 };

export const REST_POSE = REST;

function limb(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, width: number, color: string, ink: number) {
  ctx.lineCap = "round";
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = width + ink * 2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function has(look: Look, s: Symptom) {
  return look.symptoms.includes(s);
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flip: number) {
  const points = [[1, -7], [-3, 0.5], [0, 0.5], [-1, 7], [3.5, -1.5], [0.5, -1.5]];
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s * flip, y + py * s) : ctx.moveTo(x + px * s * flip, y + py * s)));
  ctx.closePath();
  ctx.fillStyle = INK.orange;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.3;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
}

export function drawKid(ctx: CanvasRenderingContext2D, look: Look, pose: Pose, at: KidDraw) {
  const unit = at.size / 100;
  const ink = Math.max(1.1, Math.min(3.2, at.size * 0.024)) / unit;
  const fever = has(look, "fever");
  const spots = has(look, "spots");
  const aches = has(look, "aches");
  const nausea = has(look, "nausea");
  const sick = look.symptoms.length > 0;
  const swing = Math.sin(pose.phase);
  const amp = lerp(4.5, 9, pose.energy);
  const bob = -Math.abs(Math.sin(pose.phase)) * lerp(0.8, 3.4, pose.energy);
  const droop = (sick ? 2.2 : 0) + (aches ? 3.5 : 0) + (nausea ? 1.5 : 0);
  const sway = aches ? Math.sin(pose.time * 1.6) * 0.045 : 0;

  ctx.save();
  if (at.alpha !== undefined) ctx.globalAlpha = at.alpha;
  ctx.translate(at.x, at.y);
  ctx.scale(unit, unit);
  ctx.lineJoin = "round";

  if (look.prop === "backpack") {
    ctx.fillStyle = look.shirt === INK.blue ? INK.orange : INK.blue;
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = ink;
    ctx.beginPath();
    ctx.roundRect(-19, -66 + bob, 38, 34, 8);
    ctx.fill();
    ctx.stroke();
  }

  for (const side of [-1, 1]) {
    const phase = side * swing;
    const lift = Math.max(0, Math.cos(pose.phase * side)) * lerp(1.5, 4.5, pose.energy);
    const fx = side * 6.5 + phase * amp * 0.5;
    limb(ctx, side * 6.5, -28 + bob, fx, -3 - lift, 6.4, look.skin, ink);
    ctx.fillStyle = INK.black;
    ctx.beginPath();
    ctx.ellipse(fx + side * 1.4, -1.8 - lift, 5.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, bob);
  ctx.translate(0, -30);
  ctx.rotate(sway);
  ctx.translate(0, 30);

  ctx.fillStyle = look.shorts;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = ink;
  ctx.beginPath();
  ctx.roundRect(-13, -36, 26, 11, 3);
  ctx.fill();
  ctx.stroke();

  const hunch = aches ? 3 : 0;
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.moveTo(-12.5, -60 + hunch);
  ctx.quadraticCurveTo(0, -64 + hunch, 12.5, -60 + hunch);
  ctx.lineTo(14, -31);
  ctx.quadraticCurveTo(0, -28, -14, -31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (look.shirt !== INK.orange && look.shirt !== INK.blue) {
    ctx.fillStyle = INK.orange;
    ctx.fillRect(-13.4, -46, 26.8, 4);
  }

  const shoulderY = -57 + hunch;
  for (const side of [-1, 1]) {
    const armSwing = -side * swing * lerp(1.5, 4, pose.energy);
    let hx = side * 19;
    let hy = -35 + armSwing;
    let ex = side * 17;
    let ey = -46;
    const holdsBack = aches && side === -1;
    const holdsMouth = nausea && side === 1;
    const holdsProp = (look.prop === "icecream" && side === 1) || (look.prop === "balloon" && side === -1);
    if (holdsBack) {
      hx = -10;
      hy = -33;
      ex = -22;
      ey = -44;
    }
    if (holdsMouth) {
      hx = 4;
      hy = -69;
      ex = 15;
      ey = -50;
    }
    if (holdsProp) {
      hx = side * 25;
      hy = -52;
      ex = side * 21;
      ey = -42;
    }
    if (pose.cheer > 0) {
      hx = lerp(hx, side * 25, pose.cheer);
      hy = lerp(hy, -88 - Math.sin(pose.time * 9 + side) * 3, pose.cheer);
      ex = lerp(ex, side * 22, pose.cheer);
      ey = lerp(ey, -70, pose.cheer);
    }
    if (pose.scare > 0) {
      hx = lerp(hx, side * 24, pose.scare);
      hy = lerp(hy, -62, pose.scare);
      ex = lerp(ex, side * 21, pose.scare);
      ey = lerp(ey, -56, pose.scare);
    }
    limb(ctx, side * 12.5, shoulderY, ex, ey, 6, look.skin, ink);
    limb(ctx, ex, ey, hx, hy, 5.6, look.skin, ink);
    limb(ctx, side * 12.5, shoulderY, side * 15.5 + (ex - side * 15.5) * 0.3, shoulderY + (ey - shoulderY) * 0.45, 8.4, look.shirt, ink);
    if (spots) {
      dot(ctx, lerp(ex, hx, 0.35), lerp(ey, hy, 0.35), 1.7, RED);
      dot(ctx, lerp(ex, hx, 0.7) + side, lerp(ey, hy, 0.7) - 1, 1.7, RED);
      dot(ctx, ex - side, ey + 3, 1.6, RED);
    }
    if (side === -1 && pose.patch) {
      ctx.save();
      ctx.translate(ex, ey + 1);
      ctx.rotate(0.3);
      ctx.fillStyle = "#f3e7c9";
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.8;
      ctx.beginPath();
      ctx.roundRect(-4, -2.2, 8, 4.4, 1.5);
      ctx.fill();
      ctx.stroke();
      dot(ctx, 0, 0, 0.9, INK.orange);
      ctx.restore();
    }
    if (holdsProp && look.prop === "icecream") {
      ctx.fillStyle = "#e1b374";
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.9;
      ctx.beginPath();
      ctx.moveTo(hx - 3.6, hy - 6);
      ctx.lineTo(hx + 3.6, hy - 6);
      ctx.lineTo(hx, hy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      dot(ctx, hx, hy - 10, 5.4, INK.orange);
      ctx.strokeStyle = INK.black;
      ctx.beginPath();
      ctx.arc(hx, hy - 10, 5.4, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, hx - 1.8, hy - 11.5, 1.2, INK.paper);
    }
    if (holdsProp && look.prop === "balloon") {
      const bx = hx - side * 1;
      const by = hy - 25;
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.7;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 2);
      ctx.bezierCurveTo(hx - 3, hy - 9, hx + 3, hy - 13, bx, by + 9);
      ctx.stroke();
      ctx.fillStyle = look.shirt === INK.orange ? INK.blue : INK.orange;
      ctx.lineWidth = ink * 0.9;
      ctx.beginPath();
      ctx.ellipse(bx, by, 7.4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 1.6, by + 9);
      ctx.lineTo(bx - 3, by + 12);
      ctx.lineTo(bx + 1.2, by + 11.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(247, 248, 246, 0.75)";
      ctx.beginPath();
      ctx.ellipse(bx - 2.6, by - 3.2, 1.6, 2.6, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const headY = -77 + hunch * 1.6 + droop * 0.4;
  const R = 17;
  for (const side of [-1, 1]) {
    dot(ctx, side * (R - 0.5), headY + 2, 3.4, look.skin);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = ink * 0.9;
    ctx.beginPath();
    ctx.arc(side * (R - 0.5), headY + 2, 3.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (look.style === 3) {
    for (const side of [-1, 1]) {
      limb(ctx, side * (R - 2), headY - 2, side * (R + 3), headY + 15, 6.4, look.hair, ink * 0.8);
    }
  }
  if (look.style === 1) {
    for (const side of [-1, 1]) {
      dot(ctx, side * 14, headY - 12, 8, look.hair);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.9;
      ctx.beginPath();
      ctx.arc(side * 14, headY - 12, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = look.skin;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = ink;
  ctx.beginPath();
  ctx.arc(0, headY, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (nausea) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, headY, R - ink * 0.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = GREEN;
    ctx.fillRect(-R, headY - R, R * 2, R * 2);
    ctx.restore();
  }

  ctx.fillStyle = look.hair;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = ink;
  ctx.beginPath();
  if (look.style === 2) {
    ctx.arc(0, headY, R + 0.6, Math.PI * 1.04, Math.PI * 1.96);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.12 + i * 0.19);
      ctx.moveTo(Math.cos(a) * (R + 1.5) + 4.6, Math.sin(a) * (R + 1.5) + headY);
      ctx.arc(Math.cos(a) * (R + 1.5), Math.sin(a) * (R + 1.5) + headY, 4.6, 0, Math.PI * 2);
    }
  } else {
    ctx.arc(0, headY, R + 0.6, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(R * 0.55, headY - R * 0.62, -R * 0.2, headY - R * 0.5);
    ctx.quadraticCurveTo(-R * 0.75, headY - R * 0.45, -R - 0.6, headY - 0.5);
  }
  ctx.fill();
  ctx.stroke();

  const eyeY = headY + 1;
  const scared = pose.scare > 0.3;
  for (const side of [-1, 1]) {
    const ex = side * 6.6;
    if (nausea) {
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ex - 2.6, eyeY - 1);
      ctx.quadraticCurveTo(ex, eyeY + 2.2, ex + 2.6, eyeY - 1);
      ctx.stroke();
    } else if (scared) {
      dot(ctx, ex, eyeY, 3.4, INK.paper);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.8;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 3.4, 0, Math.PI * 2);
      ctx.stroke();
      dot(ctx, ex, eyeY, 1.3, INK.black);
    } else {
      dot(ctx, ex, eyeY, 2.2, INK.black);
      dot(ctx, ex + 0.8, eyeY - 0.8, 0.7, INK.paper);
      if (sick) {
        ctx.fillStyle = look.skin;
        ctx.fillRect(ex - 3, eyeY - 3.2, 6, 3.4);
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink * 0.9;
        ctx.beginPath();
        ctx.moveTo(ex - 3, eyeY + 0.3);
        ctx.lineTo(ex + 3, eyeY + 0.3);
        ctx.stroke();
      }
    }
    if (sick || scared) {
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.9;
      ctx.beginPath();
      const lift = scared ? -1.5 : aches || fever ? 2.6 : 1.4;
      ctx.moveTo(ex - side * 3.6, eyeY - 6.4 - (scared ? 1 : 0));
      ctx.lineTo(ex + side * 3.2, eyeY - 6.4 - lift * (scared ? -0.4 : 1));
      ctx.stroke();
    }
  }
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = ink * 0.8;
  ctx.beginPath();
  ctx.moveTo(-0.6, eyeY + 3.6);
  ctx.quadraticCurveTo(1.4, eyeY + 5.2, 0.2, eyeY + 5.6);
  ctx.stroke();

  const mouthY = headY + 10;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = ink * 1.05;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (scared) {
    ctx.ellipse(0, mouthY, 2.8, 3.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK.black;
    ctx.fill();
  } else if (nausea) {
    ctx.moveTo(-4.5, mouthY);
    ctx.bezierCurveTo(-2.5, mouthY - 2.5, -1, mouthY + 2.5, 1.5, mouthY);
    ctx.bezierCurveTo(2.6, mouthY - 1.4, 3.6, mouthY - 0.5, 4.5, mouthY + 0.2);
    ctx.stroke();
  } else if (aches || fever) {
    ctx.moveTo(-3.6, mouthY + 1.6);
    ctx.quadraticCurveTo(0, mouthY - 2.4, 3.6, mouthY + 1.6);
    ctx.stroke();
  } else if (sick) {
    ctx.moveTo(-3, mouthY + 0.5);
    ctx.lineTo(3, mouthY + 0.5);
    ctx.stroke();
  } else {
    ctx.moveTo(-5, mouthY - 1.2);
    ctx.quadraticCurveTo(0, mouthY + (pose.cheer > 0 ? 7 : 4.6), 5, mouthY - 1.2);
    ctx.stroke();
  }

  if (nausea && pose.cheer === 0 && pose.scare === 0) {
    limb(ctx, 15, -50 + hunch, 5, headY + 8, 5.6, look.skin, ink);
    dot(ctx, 4.4, headY + 9.5, 4.2, look.skin);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = ink * 0.9;
    ctx.beginPath();
    ctx.arc(4.4, headY + 9.5, 4.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (fever) {
    ctx.save();
    ctx.globalAlpha = nausea ? 0.35 : 0.7;
    dot(ctx, -10.5, headY + 6, 5.2, RED);
    dot(ctx, 10.5, headY + 6, 5.2, RED);
    ctx.restore();
  } else if (!sick && !scared) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    dot(ctx, -10.5, headY + 6, 3.6, INK.orange);
    dot(ctx, 10.5, headY + 6, 3.6, INK.orange);
    ctx.restore();
  }
  if (spots) {
    for (const [sx, sy] of [[-6, -11], [3, -12], [9, -8], [-12, 4], [11, 3], [-2, 6], [6, 11], [-7, 11]]) dot(ctx, sx, headY + sy, 1.7, RED);
  }
  if (look.prop === "freckles") {
    for (const [sx, sy] of [[-4, 5], [-1.5, 7], [3, 5.6], [5, 8], [-6, 8.4], [1.6, 9.4], [-3.4, 10]]) dot(ctx, sx, headY + sy - 3, 0.95, "#8a4b2a");
  }

  if (fever) {
    const t = pose.time;
    for (const [i, side] of ([[0, -1], [1, 1]] as const)) {
      const drip = (t * 0.9 + i * 0.5) % 1;
      const x = side * 13;
      const y = headY - 12 + drip * 20;
      ctx.save();
      ctx.globalAlpha = 1 - drip * 0.7;
      ctx.fillStyle = INK.blue;
      ctx.strokeStyle = INK.paper;
      ctx.lineWidth = ink * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.quadraticCurveTo(x + 3, y + 0.5, x, y + 2.6);
      ctx.quadraticCurveTo(x - 3, y + 0.5, x, y - 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = INK.orange;
    ctx.lineWidth = ink * 1.3;
    ctx.lineCap = "round";
    for (const dx of [-9, 0, 9]) {
      const rise = (t * 0.8 + dx * 0.05 + 1) % 1;
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * rise);
      ctx.beginPath();
      const y0 = headY - R - 3 - rise * 9;
      ctx.moveTo(dx, y0);
      ctx.bezierCurveTo(dx + 3.5, y0 - 3, dx - 3.5, y0 - 6, dx, y0 - 9);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (aches) {
    const pulse = 0.85 + Math.sin(pose.time * 7) * 0.15;
    bolt(ctx, -17, -50, 1.05 * pulse, 1);
    bolt(ctx, 13, -18, 1.0 * pulse, -1);
    bolt(ctx, -12, -20, 0.9 * pulse, 1);
  }
  if (nausea) {
    ctx.strokeStyle = "#5f8c3f";
    ctx.lineWidth = ink * 1.2;
    ctx.lineCap = "round";
    for (const [i, dx] of [18, 24, 14].entries()) {
      const k = (pose.time * 0.7 + i * 0.33) % 1;
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * k);
      ctx.beginPath();
      const y = headY - 10 - k * 8 + i * 6;
      ctx.moveTo(dx - 3, y);
      ctx.bezierCurveTo(dx - 1, y - 3, dx + 1, y + 3, dx + 3, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

export function describeLook(look: Look) {
  if (look.symptoms.length === 0) return "criança saudável";
  return `criança com ${look.symptoms.map((s) => SYMPTOM_LABEL[s]).join(" e ")}`;
}

export function hitEllipse(size: number) {
  return { cx: 0, cy: -size * 0.5, rx: Math.max(size * 0.36, 32), ry: Math.max(size * 0.56, 44) };
}
