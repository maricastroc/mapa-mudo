import type { Gnat } from "./kidPlan.ts";

export function gnatProgress(g: Pick<Gnat, "at" | "duration">, t: number) {
  return Math.max(0, Math.min(1, (t - g.at) / g.duration));
}

export function gnatPos(g: Gnat, t: number, W: number, H: number) {
  const u = gnatProgress(g, t);
  const x = g.dir === 1 ? -0.05 * W + u * 1.1 * W : 1.05 * W - u * 1.1 * W;
  const wave = Math.sin(u * g.freq * Math.PI * 2 + g.phase) * 0.07 + Math.sin(u * g.freq * 5.3 + g.phase) * 0.02;
  return { x, y: H * (g.y + wave) };
}
