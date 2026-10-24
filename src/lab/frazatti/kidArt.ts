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

export type KidDraw = { x: number; y: number; size: number; alpha?: number; facing?: 1 | -1 };

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

type Pass = "shadow" | "halo" | "main";

function limb(ctx: CanvasRenderingContext2D, pts: [number, number][], width: number, color: string, outline: string | null, ink: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const trace = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = width + ink * 2;
    trace();
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  trace();
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

function bolt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const points = [[1, -7], [-3, 0.5], [0, 0.5], [-1, 7], [3.5, -1.5], [0.5, -1.5]];
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  ctx.closePath();
  ctx.fillStyle = INK.orange;
  ctx.strokeStyle = INK.black;
  ctx.lineWidth = 1.3;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
}

function circlePath(x: number, y: number, r: number) {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
}

const HALO = 3.4;

export function drawKid(ctx: CanvasRenderingContext2D, look: Look, pose: Pose, at: KidDraw) {
  const unit = at.size / 100;
  const ink = Math.max(1.1, Math.min(3.2, at.size * 0.024)) / unit;
  const heavy = ink * 1.75;
  const fever = has(look, "fever");
  const spots = has(look, "spots");
  const aches = has(look, "aches");
  const nausea = has(look, "nausea");
  const sick = look.symptoms.length > 0;
  const scared = pose.scare > 0.3;
  const cheer = pose.cheer;
  const phase = pose.phase;
  const s = Math.sin(phase);
  const amp = lerp(5, 10, pose.energy);
  const bob = -Math.abs(Math.sin(phase)) * lerp(0.6, 2.8, pose.energy);
  const lean = (aches ? 0.3 : sick ? 0.08 : 0) * (1 - cheer);
  const hip = { x: -1, y: -36 };
  const headX = aches ? 7 : 3;
  const headY = (aches ? -77 : -80) + (sick && !aches ? 1.5 : 0);

  const run = (pass: Pass) => {
    const main = pass === "main";
    const grow = pass === "halo" ? HALO : 0;
    const paint = (c: string) => (main ? c : pass === "halo" ? INK.paper : INK.blue);
    const edge = main ? INK.black : null;

    ctx.save();
    ctx.translate(0, bob);

    if (look.prop === "backpack" && main) {
      ctx.fillStyle = look.shirt === INK.blue ? INK.orange : INK.blue;
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = heavy;
      ctx.beginPath();
      ctx.roundRect(-17, -66, 12, 30, 5);
      ctx.fill();
      ctx.stroke();
    } else if (look.prop === "backpack") {
      ctx.fillStyle = paint(INK.paper);
      ctx.beginPath();
      ctx.roundRect(-17 - grow, -66 - grow, 12 + grow * 2, 30 + grow * 2, 5);
      ctx.fill();
    }

    const legs: [number, number][][] = [
      [[hip.x, hip.y], [hip.x + 2 - s * amp * 0.3, -19], [hip.x - s * amp, -2 - Math.max(0, -Math.cos(phase)) * 3]],
      [[hip.x, hip.y], [hip.x + 2 + s * amp * 0.3, -19], [hip.x + s * amp, -2 - Math.max(0, Math.cos(phase)) * 3]],
    ];
    for (const leg of legs) {
      limb(ctx, leg, 6.4 + grow, paint(look.skin), edge, heavy);
      const [fx, fy] = leg[2];
      ctx.fillStyle = paint(INK.black);
      ctx.beginPath();
      ctx.ellipse(fx + 2.4, fy + 0.8, 5.4 + grow, 2.8 + grow, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.rotate(lean);
    ctx.translate(-hip.x, -hip.y);

    let nearHand: [number, number] = [4 - s * 10, -42];
    let nearElbow: [number, number] = [1 - s * 4, -50];
    let farHand: [number, number] = [-2 + s * 10, -43];
    let farElbow: [number, number] = [-2 + s * 4, -50];
    if (aches) {
      nearHand = [-9, -43];
      nearElbow = [-13, -52];
    }
    if (nausea) {
      nearHand = [headX + 8, headY + 9];
      nearElbow = [9, -56];
    }
    if (look.prop === "icecream" || look.prop === "balloon") {
      nearHand = [14, -56];
      nearElbow = [9, -50];
    }
    if (cheer > 0) {
      const wave = Math.sin(pose.time * 9) * 3;
      nearHand = [lerp(nearHand[0], 12, cheer), lerp(nearHand[1], -94 + wave, cheer)];
      nearElbow = [lerp(nearElbow[0], 9, cheer), lerp(nearElbow[1], -72, cheer)];
      farHand = [lerp(farHand[0], -8, cheer), lerp(farHand[1], -94 - wave, cheer)];
      farElbow = [lerp(farElbow[0], -6, cheer), lerp(farElbow[1], -72, cheer)];
    }
    if (pose.scare > 0) {
      nearHand = [lerp(nearHand[0], 15, pose.scare), lerp(nearHand[1], -64, pose.scare)];
      nearElbow = [lerp(nearElbow[0], 11, pose.scare), lerp(nearElbow[1], -56, pose.scare)];
      farHand = [lerp(farHand[0], -12, pose.scare), lerp(farHand[1], -62, pose.scare)];
      farElbow = [lerp(farElbow[0], -9, pose.scare), lerp(farElbow[1], -55, pose.scare)];
    }

    limb(ctx, [[-1, -60], farElbow, farHand], 5 + grow, paint(look.skin), edge, heavy);
    if (main) limb(ctx, [[-1, -60], farElbow], 5, look.shirt, edge, heavy);

    ctx.fillStyle = paint(look.shorts);
    ctx.strokeStyle = INK.black;
    ctx.lineWidth = heavy;
    ctx.beginPath();
    ctx.roundRect(-8.5 - grow, -38 - grow, 15.5 + grow * 2, 8 + grow * 2, 2);
    ctx.fill();
    if (main) ctx.stroke();

    const torso = new Path2D();
    torso.moveTo(-8, -62);
    torso.quadraticCurveTo(0, -67, 7, -62);
    torso.lineTo(6.5, -33);
    torso.lineTo(-8, -33);
    torso.closePath();
    ctx.fillStyle = paint(look.shirt);
    ctx.fill(torso);
    if (main) {
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = heavy;
      ctx.stroke(torso);
      if (look.shirt !== INK.orange && look.shirt !== INK.blue) {
        ctx.fillStyle = INK.orange;
        ctx.fillRect(-7.6, -50, 14.2, 3.4);
      }
    } else {
      ctx.strokeStyle = paint(INK.paper);
      ctx.lineWidth = grow * 2;
      ctx.stroke(torso);
    }

    const head = circlePath(headX, headY, 11 + grow);
    if (look.style === 3) {
      ctx.fillStyle = paint(look.hair);
      ctx.beginPath();
      ctx.roundRect(headX - 13 - grow, headY - 5 - grow, 10 + grow * 2, 24 + grow * 2, 5);
      ctx.fill();
      if (main) {
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = heavy;
        ctx.stroke();
      }
    }
    if (look.style === 1) {
      ctx.fillStyle = paint(look.hair);
      ctx.beginPath();
      ctx.arc(headX - 6, headY - 12, 5 + grow, 0, Math.PI * 2);
      ctx.fill();
      if (main) {
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = heavy;
        ctx.stroke();
      }
    }
    ctx.fillStyle = paint(look.skin);
    ctx.fill(head);
    if (!main) {
      ctx.strokeStyle = paint(INK.paper);
      ctx.lineWidth = grow * 2;
      ctx.stroke(head);
    }

    if (main) {
      dot(ctx, headX - 8, headY + 1.5, 2.6, look.skin);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = heavy * 0.8;
      ctx.beginPath();
      ctx.arc(headX - 8, headY + 1.5, 2.6, 0, Math.PI * 2);
      ctx.stroke();
      if (nausea) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        dot(ctx, headX, headY, 10.4, GREEN);
        ctx.restore();
      }
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = heavy;
      ctx.stroke(head);
      ctx.beginPath();
      ctx.moveTo(headX + 10.8, headY + 0.8);
      ctx.lineTo(headX + 12.8, headY + 2.8);
      ctx.lineTo(headX + 10.4, headY + 3.8);
      ctx.stroke();

      const hair = new Path2D();
      hair.arc(headX, headY, 11.8, Math.PI * 0.8, Math.PI * 1.92);
      hair.quadraticCurveTo(headX + 7, headY - 7.5, headX - 3, headY - 3);
      hair.closePath();
      if (look.style === 2) for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.0 + i * 0.2);
        hair.moveTo(headX + Math.cos(a) * 12 + 3.6, headY + Math.sin(a) * 12);
        hair.arc(headX + Math.cos(a) * 12, headY + Math.sin(a) * 12, 3.6, 0, Math.PI * 2);
      }
      ctx.fillStyle = look.hair;
      ctx.fill(hair);
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = heavy * 0.85;
      ctx.stroke(hair);

      const ex = headX + 5.6;
      const ey = headY - 0.6;
      if (nausea) {
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ex - 2.4, ey - 0.8);
        ctx.quadraticCurveTo(ex, ey + 2, ex + 2.4, ey - 0.8);
        ctx.stroke();
      } else if (scared) {
        dot(ctx, ex, ey, 3.2, INK.paper);
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink * 0.8;
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.stroke();
        dot(ctx, ex + 0.6, ey, 1.3, INK.black);
      } else {
        dot(ctx, ex, ey, 1.8, INK.black);
        dot(ctx, ex + 0.6, ey - 0.6, 0.6, INK.paper);
        if (sick) {
          ctx.strokeStyle = INK.black;
          ctx.lineWidth = ink * 0.9;
          ctx.beginPath();
          ctx.moveTo(ex - 2.6, ey - 0.8);
          ctx.lineTo(ex + 2.6, ey - 0.8);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = INK.black;
      ctx.lineWidth = ink * 0.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(headX + 3, ey - 4.6);
      ctx.lineTo(headX + 8.6, ey - (scared ? 6.6 : sick ? 3.2 : 5.2));
      ctx.stroke();
      const my = headY + 6.2;
      ctx.beginPath();
      if (scared) {
        ctx.ellipse(headX + 7, my + 0.6, 2.2, 2.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = INK.black;
        ctx.fill();
      } else if (nausea) {
        ctx.moveTo(headX + 3.4, my + 1);
        ctx.bezierCurveTo(headX + 4.8, my - 1, headX + 6, my + 2, headX + 7.4, my);
        ctx.stroke();
      } else if (aches || fever) {
        ctx.moveTo(headX + 4, my + 1.4);
        ctx.quadraticCurveTo(headX + 6.4, my - 1.6, headX + 9, my + 1);
        ctx.stroke();
      } else if (sick) {
        ctx.moveTo(headX + 4.4, my + 0.6);
        ctx.lineTo(headX + 9, my + 0.6);
        ctx.stroke();
      } else {
        ctx.arc(headX + 6.4, my - 2.4, cheer > 0 ? 5 : 4, 0.25, 1.3);
        ctx.stroke();
      }
      if (fever) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        dot(ctx, headX + 4.6, headY + 4.6, 4.6, RED);
        ctx.restore();
      } else if (!sick && !scared) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        dot(ctx, headX + 4.6, headY + 4.6, 3.4, INK.orange);
        ctx.restore();
      }
      if (spots) {
        for (const [dx, dy] of [[-2, -7], [2, -4], [7, 1], [3, 5], [-4, 4], [8, -5], [-1, 0]]) dot(ctx, headX + dx, headY + dy, 1.5, RED);
      }
      if (look.prop === "freckles") {
        for (const [dx, dy] of [[4, 3], [6.4, 4.6], [3, 5.6], [8, 2.4], [5, 1.6]]) dot(ctx, headX + dx, headY + dy, 0.95, "#8a4b2a");
      }
    }

    limb(ctx, [[1, -60], nearElbow, nearHand], 5.4 + grow, paint(look.skin), edge, heavy);
    if (main) {
      limb(ctx, [[1, -60], nearElbow], 5.6, look.shirt, edge, heavy);
      if (spots) {
        dot(ctx, lerp(nearElbow[0], nearHand[0], 0.45), lerp(nearElbow[1], nearHand[1], 0.45), 1.5, RED);
        dot(ctx, lerp(nearElbow[0], nearHand[0], 0.8) + 1, lerp(nearElbow[1], nearHand[1], 0.8) - 1, 1.5, RED);
        dot(ctx, lerp(nearElbow[0], nearHand[0], 0.2) - 1, lerp(nearElbow[1], nearHand[1], 0.2) + 1, 1.4, RED);
      }
      if (pose.patch) {
        ctx.save();
        ctx.translate(lerp(1, nearElbow[0], 0.5), lerp(-60, nearElbow[1], 0.5));
        ctx.rotate(0.5);
        ctx.fillStyle = "#f3e7c9";
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink * 0.8;
        ctx.beginPath();
        ctx.roundRect(-3.6, -2, 7.2, 4, 1.4);
        ctx.fill();
        ctx.stroke();
        dot(ctx, 0, 0, 0.8, INK.orange);
        ctx.restore();
      }
      const [hx, hy] = nearHand;
      if (look.prop === "icecream") {
        ctx.fillStyle = "#e1b374";
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink * 0.9;
        ctx.beginPath();
        ctx.moveTo(hx - 3.4, hy - 4.6);
        ctx.lineTo(hx + 3.4, hy - 4.6);
        ctx.lineTo(hx, hy + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        dot(ctx, hx, hy - 9, 5.2, INK.orange);
        ctx.beginPath();
        ctx.arc(hx, hy - 9, 5.2, 0, Math.PI * 2);
        ctx.stroke();
        dot(ctx, hx - 1.8, hy - 10.5, 1.1, INK.paper);
      }
      if (look.prop === "balloon") {
        const bx = hx + 1;
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
      if (fever) {
        const t = pose.time;
        for (const [i, dx] of [[0, -4], [1, 12]] as const) {
          const k = (t * 0.9 + i * 0.5) % 1;
          const x = headX + dx;
          const y = headY - 10 + k * 18;
          ctx.save();
          ctx.globalAlpha = 1 - k * 0.7;
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
        for (const dx of [-6, 1, 8]) {
          const rise = (t * 0.8 + dx * 0.05 + 1) % 1;
          ctx.save();
          ctx.globalAlpha = Math.sin(Math.PI * rise);
          const y0 = headY - 14 - rise * 9;
          ctx.beginPath();
          ctx.moveTo(headX + dx, y0);
          ctx.bezierCurveTo(headX + dx + 3.5, y0 - 3, headX + dx - 3.5, y0 - 6, headX + dx, y0 - 9);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (nausea) {
        limb(ctx, [nearElbow, [headX + 5, headY + 8]], 5.6, look.skin, INK.black, heavy);
        dot(ctx, headX + 4.4, headY + 9, 4.2, look.skin);
        ctx.strokeStyle = INK.black;
        ctx.lineWidth = ink * 0.9;
        ctx.beginPath();
        ctx.arc(headX + 4.4, headY + 9, 4.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#5f8c3f";
        ctx.lineWidth = ink * 1.2;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          const k = (pose.time * 0.7 + i * 0.33) % 1;
          ctx.save();
          ctx.globalAlpha = Math.sin(Math.PI * k);
          const y = headY - 8 - k * 8 + i * 5;
          ctx.beginPath();
          ctx.moveTo(headX + 14, y);
          ctx.bezierCurveTo(headX + 16, y - 3, headX + 18, y + 3, headX + 20, y);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (aches) {
        const p = 0.85 + Math.sin(pose.time * 7) * 0.15;
        bolt(ctx, -15, -52, p);
        bolt(ctx, 13, -20, p * 0.95);
        bolt(ctx, -11, -22, p * 0.85);
      }
    }

    ctx.restore();
    ctx.restore();
  };

  ctx.save();
  if (at.alpha !== undefined) ctx.globalAlpha = at.alpha;
  ctx.translate(at.x, at.y);
  ctx.scale(unit * (at.facing ?? 1), unit);
  ctx.lineJoin = "round";
  run("main");
  ctx.restore();
}

export function describeLook(look: Look) {
  if (look.symptoms.length === 0) return "criança saudável";
  return `criança com ${look.symptoms.map((s) => SYMPTOM_LABEL[s]).join(" e ")}`;
}

export function hitEllipse(size: number) {
  return { cx: 0, cy: -size * 0.5, rx: Math.max(size * 0.36, 32), ry: Math.max(size * 0.56, 44) };
}
