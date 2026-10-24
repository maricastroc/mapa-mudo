export const T = {
  viruses: 0.4,
  labels: 1.9,
  vial: 3.4,
  weaken: 3.9,
  fill: 5.6,
  dose: 6.0,
  body: 7.1,
  invade: 7.5,
  defend: 8.3,
  shield: 9.9,
  closing: 10.8,
  end: 11.8,
};

export type Act = "virus" | "vaccine" | "protect" | "closing";

export const VIRUS_COUNT = 4;
export const VIRUS = { y: 140, r: 34, xs: [105, 235, 365, 495] };
export const VIAL = { x: 170, y: 262, w: 110, h: 150 };
export const SYRINGE = { x: 350, y: 150, w: 210 };
export const BODY = { x: 300, y: 150, r: 104 };

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function ease(t: number) {
  const k = clamp01(t);
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export function easeOutBack(t: number) {
  const k = clamp01(t);
  if (k === 0) return 0;
  return 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
}

export function actAt(t: number): Act {
  if (t < T.vial) return "virus";
  if (t < T.body) return "vaccine";
  if (t < T.closing) return "protect";
  return "closing";
}

export function actOpacity(act: Exclude<Act, "closing">, t: number) {
  if (act === "virus") return 1 - ease((t - T.vial + 0.1) / 0.35);
  if (act === "vaccine") return ease((t - T.vial) / 0.35) * (1 - ease((t - T.body + 0.1) / 0.35));
  return ease((t - T.body) / 0.35);
}

export function virusIn(index: number, t: number) {
  return easeOutBack((t - T.viruses - index * 0.28) / 0.5);
}

export function weakened(t: number) {
  return ease((t - T.weaken) / 0.5);
}

export function dropIn(index: number, t: number) {
  return clamp01((t - T.weaken - 0.3 - index * 0.28) / 0.55);
}

export function fillAt(t: number) {
  return ease((t - T.fill) / 0.35);
}

export function doseAt(t: number) {
  return ease((t - T.dose) / 0.8);
}

export function invadeAt(index: number, t: number) {
  return ease((t - T.invade - index * 0.18) / 0.8);
}

export function defendAt(index: number, t: number) {
  return ease((t - T.defend - index * 0.15) / 0.6);
}

export function clearAt(index: number, t: number) {
  return ease((t - T.defend - index * 0.15 - 0.5) / 0.4);
}

export function shieldAt(t: number) {
  return easeOutBack((t - T.shield) / 0.5);
}

export function invaderStart(index: number) {
  const a = (-Math.PI / 2) * 0 + Math.PI * (0.18 + index * 0.55);
  return { x: BODY.x + Math.cos(a + 0.3) * 250 * (index % 2 ? -1 : 1), y: BODY.y + Math.sin(a) * 120 };
}

export function invaderEnd(index: number) {
  const a = (index / VIRUS_COUNT) * Math.PI * 2 + 0.6;
  return { x: BODY.x + Math.cos(a) * BODY.r * 0.62, y: BODY.y + Math.sin(a) * BODY.r * 0.62 };
}
