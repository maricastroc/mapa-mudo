import { seeded } from "../certificate.ts";

export type Point = { x: number; y: number };
export type Lobe = { x: number; y: number; rx: number; ry: number; angle: number };
export type Frond = { rachis: string; lobes: Lobe[]; tip: Point };
export type Head = { x: number; y: number; r: number };

const DEG = Math.PI / 180;

function f(v: number) {
  return Math.round(v * 10) / 10;
}

function lobe(x: number, y: number, rx: number, ry: number, angle: number): Lobe {
  return { x: f(x), y: f(y), rx: f(rx), ry: f(ry), angle: f(angle) };
}

function along(base: Point, angle: number, length: number, curl: number, k: number): Point {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  return { x: base.x + dx * length * k - dy * curl * length * k * k, y: base.y + dy * length * k + dx * curl * length * k * k };
}

export function frond(base: Point, angleDeg: number, length: number, curl: number, scale: number, seed: number): Frond {
  const random = seeded(seed);
  const angle = angleDeg * DEG;
  const lobes: Lobe[] = [];
  const points = Array.from({ length: 13 }, (_, i) => along(base, angle, length, curl, i / 12));
  const rachis = points.map((p, i) => `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`).join("");
  const stops = [0.2, 0.34, 0.47, 0.6, 0.72, 0.84, 0.94];
  stops.forEach((k, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const at = along(base, angle, length, curl, k);
    const ahead = along(base, angle, length, curl, Math.min(1, k + 0.02));
    const heading = Math.atan2(ahead.y - at.y, ahead.x - at.x);
    const pinnaAngle = heading + side * (52 + random() * 12) * DEG;
    const pinnaLength = length * (0.3 - k * 0.17) * (0.9 + random() * 0.2);
    [0.3, 0.62, 0.95].forEach((t, j) => {
      const px = at.x + Math.cos(pinnaAngle) * pinnaLength * t;
      const py = at.y + Math.sin(pinnaAngle) * pinnaLength * t;
      const size = scale * (1 - k * 0.35) * (1 - t * 0.25);
      lobes.push(lobe(px, py, 4.6 * size, 1.9 * size, (pinnaAngle + (j % 2 ? 0.55 : -0.55)) / DEG));
      if (j < 2) {
        const back = pinnaAngle - side * 0.9;
        lobes.push(lobe(px + Math.cos(back) * 3.2 * size, py + Math.sin(back) * 3.2 * size, 3.6 * size, 1.6 * size, back / DEG));
      }
    });
  });
  const end = along(base, angle, length, curl, 1);
  const tip = { x: f(end.x), y: f(end.y) };
  lobes.push(lobe(tip.x, tip.y, 4.4 * scale * 0.7, 1.8 * scale * 0.7, angleDeg));
  return { rachis, lobes, tip };
}

export function heads(base: Point, angleDeg: number, length: number, count: number, seed: number): { stalk: string; heads: Head[] } {
  const random = seeded(seed);
  const angle = angleDeg * DEG;
  const end = { x: base.x + Math.cos(angle) * length, y: base.y + Math.sin(angle) * length };
  const list: Head[] = [];
  const parts: string[] = [`M${f(base.x)} ${f(base.y)}L${f(end.x)} ${f(end.y)}`];
  for (let i = 0; i < count; i++) {
    const k = 0.35 + (i / Math.max(1, count - 1)) * 0.65;
    const at = { x: base.x + Math.cos(angle) * length * k, y: base.y + Math.sin(angle) * length * k };
    const side = i % 2 === 0 ? 1 : -1;
    const a = angle + side * (40 + random() * 30) * DEG;
    const len = 5 + random() * 6;
    const head = { x: f(at.x + Math.cos(a) * len), y: f(at.y + Math.sin(a) * len), r: f(2.7 + random() * 1.1) };
    parts.push(`M${f(at.x)} ${f(at.y)}L${f(head.x)} ${f(head.y)}`);
    list.push(head);
  }
  list.push({ x: f(end.x), y: f(end.y), r: 3.3 });
  return { stalk: parts.join(""), heads: list };
}

export function flaskPath(cx: number, lip: number, neck: number, shoulder: number, base: number, half: number) {
  const r = 16;
  return [
    `M${cx - neck} ${lip}`,
    `V${shoulder}`,
    `L${cx - half} ${base - r}`,
    `Q${cx - half} ${base} ${cx - half + r} ${base}`,
    `H${cx + half - r}`,
    `Q${cx + half} ${base} ${cx + half} ${base - r}`,
    `L${cx + neck} ${shoulder}`,
    `V${lip}`,
  ].join("");
}

export type Atom = { x: number; y: number; label?: string; peroxide?: boolean };
export type Bond = { a: number; b: number; double?: boolean; peroxide?: boolean };

export function artemisinin(cx: number, cy: number, L: number) {
  const p = (x: number, y: number): Atom => ({ x: f(cx + x * L), y: f(cy + y * L) });
  const s = Math.sqrt(3) / 2;
  const atoms: Atom[] = [
    p(-2 * s, -1),
    p(-s, -0.5),
    p(-s, 0.5),
    p(0, 1),
    p(s, 0.5),
    p(2 * s, 1),
    p(3 * s, 0.5),
    { ...p(3 * s + s, 1), label: "O" },
    { ...p(3 * s, -0.5), label: "O" },
    p(2 * s, -1),
    p(s, -0.5),
    p(0, -1),
    p(-0.15, -2.05),
    p(0.62, -2.75),
    p(1.62, -2.6),
    { ...p(2.25, -1.78), label: "O" },
    { ...p(1.32, -1.92), label: "O", peroxide: true },
    { ...p(1.0, -1.18), label: "O", peroxide: true },
    p(2.3, -3.2),
    p(2 * s, 2),
  ];
  const bonds: Bond[] = [
    { a: 0, b: 1 },
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 5 },
    { a: 5, b: 6 },
    { a: 6, b: 7, double: true },
    { a: 6, b: 8 },
    { a: 8, b: 9 },
    { a: 9, b: 10 },
    { a: 10, b: 4 },
    { a: 10, b: 11 },
    { a: 11, b: 1 },
    { a: 11, b: 12 },
    { a: 12, b: 13 },
    { a: 13, b: 14 },
    { a: 14, b: 15 },
    { a: 15, b: 9 },
    { a: 14, b: 16 },
    { a: 16, b: 17, peroxide: true },
    { a: 17, b: 10 },
    { a: 14, b: 18 },
    { a: 5, b: 19 },
  ];
  return { atoms, bonds };
}
