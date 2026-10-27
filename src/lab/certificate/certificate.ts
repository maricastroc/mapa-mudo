import type { BenchId } from "../benches.ts";
import { slugOf } from "./name.ts";

export const PAGE = { w: 1485, h: 1050 } as const;
export const EXPORT_WIDTH = 3508;

export type CertificateStat = { label: string; value: string };

export type CertificateData = {
  bench: BenchId;
  name: string;
  position: number;
  score: { value: number; of?: number; unit: string };
  stats: CertificateStat[];
  achievedAt: string;
  serial: number;
  demo?: boolean;
};

export type Box = { x: number; y: number; w: number; h: number };

const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  return {
    day: pad(date.getDate()),
    month: MONTHS[date.getMonth()],
    year: String(date.getFullYear()),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function titleFor(position: number) {
  if (position === 1) return "Recordista do dia";
  if (position <= 3) return "No pódio do dia";
  return "Entre os 10 do dia";
}

export function serialLabel(serial: number) {
  return `Nº ${pad(serial, 4)}`;
}

export function fileNameFor(data: CertificateData) {
  const who = slugOf(data.name) || "recordista";
  return `elas-em-jogo-${data.bench}-${data.position}-lugar-${who}.png`;
}

export function exportSize(width = EXPORT_WIDTH) {
  return { width, height: Math.round((width * PAGE.h) / PAGE.w) };
}

export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fixed(value: number) {
  return Math.round(value * 10) / 10;
}

export function dot(x: number, y: number, r: number) {
  const d = fixed(r * 2);
  const rr = fixed(r);
  return `M${fixed(x - r)} ${fixed(y)}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0`;
}

export function halftone(box: Box, cell: number, angleDeg: number, shade: (x: number, y: number) => number, gain = 0.56) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ];
  let minI = Infinity;
  let maxI = -Infinity;
  let minJ = Infinity;
  let maxJ = -Infinity;
  for (const [px, py] of corners) {
    const gi = (px * c + py * s) / cell;
    const gj = (-px * s + py * c) / cell;
    minI = Math.min(minI, gi);
    maxI = Math.max(maxI, gi);
    minJ = Math.min(minJ, gj);
    maxJ = Math.max(maxJ, gj);
  }
  const parts: string[] = [];
  for (let i = Math.floor(minI); i <= Math.ceil(maxI); i++) {
    for (let j = Math.floor(minJ); j <= Math.ceil(maxJ); j++) {
      const gx = i * cell;
      const gy = j * cell;
      const x = gx * c - gy * s;
      const y = gx * s + gy * c;
      if (x < box.x || y < box.y || x > box.x + box.w || y > box.y + box.h) continue;
      const v = shade(x, y);
      if (v <= 0.03) continue;
      parts.push(dot(x, y, cell * gain * Math.sqrt(Math.min(1, v))));
    }
  }
  return parts.join("");
}

export type Fleck = { x: number; y: number; r: number; ink: "blue" | "orange" | "black" };

export function flecks(seed: number, count: number, box: Box): Fleck[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => {
    const roll = random();
    return {
      x: box.x + random() * box.w,
      y: box.y + random() * box.h,
      r: 0.35 + random() * 0.9,
      ink: roll < 0.4 ? "blue" : roll < 0.75 ? "orange" : "black",
    };
  });
}
