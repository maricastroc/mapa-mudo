import { createRandom, type Random } from "../random.ts";
import { HAIRS, SHIRTS, SHORTS, SKINS, SYMPTOMS, type HairStyle, type Look, type Prop, type Symptom } from "./kidArt.ts";

export type StageName = "warmup" | "build" | "finale";

export type Crossing = {
  id: number;
  look: Look;
  sick: boolean;
  stage: StageName;
  at: number;
  lane: number;
  dir: 1 | -1;
  duration: number;
};

export type Gnat = { id: number; at: number; duration: number; dir: 1 | -1; y: number; freq: number; phase: number };

export type KidPlan = { seed: number; crossings: Crossing[]; gnats: Gnat[] };

export const GNAT_COUNT = 12;
export const GNAT_FIRST_AT = 6;

type Stage = { name: StageName; sick: number; healthy: number; gap: readonly [number, number]; duration: readonly [number, number]; maxOut: number };

export const LANES = 3;
export const CHANCES = 3;
export const FIRST_AT = 0.6;
export const VISIBLE: readonly [number, number] = [0.06, 0.94];
export const HURRY = 2.4;
export const MIN_SEPARATION = 0.2;

export const STAGES: readonly Stage[] = [
  { name: "warmup", sick: 3, healthy: 4, gap: [2.3, 2.6], duration: [8, 8.4], maxOut: 3 },
  { name: "build", sick: 4, healthy: 7, gap: [1.35, 1.55], duration: [6.6, 7], maxOut: 4 },
  { name: "finale", sick: 3, healthy: 6, gap: [1, 1.15], duration: [5.8, 6], maxOut: 4 },
];

export const SICK_COUNT = STAGES.reduce((n, s) => n + s.sick, 0);
export const CROSSING_COUNT = STAGES.reduce((n, s) => n + s.sick + s.healthy, 0);

export function progress(c: Pick<Crossing, "at" | "duration">, t: number, hurryAt: number | null = null) {
  let local = t - c.at;
  if (hurryAt !== null && t > hurryAt) local = hurryAt - c.at + (t - hurryAt) * HURRY;
  return Math.max(0, Math.min(1, local / c.duration));
}

export function exitTime(c: Pick<Crossing, "at" | "duration">, hurryAt: number | null = null) {
  if (hurryAt === null || hurryAt - c.at >= c.duration) return c.at + c.duration;
  return hurryAt + (c.duration - (hurryAt - c.at)) / HURRY;
}

export function onScreen(u: number) {
  return u >= VISIBLE[0] && u <= VISIBLE[1];
}

function pick<T>(rng: Random, items: readonly T[]): T {
  return items[Math.floor(rng.next() * items.length)];
}

function shuffle<T>(rng: Random, items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function baseLook(rng: Random): Omit<Look, "symptoms" | "prop"> {
  const shirt = pick(rng, SHIRTS);
  const shorts = pick(rng, SHORTS);
  return { skin: pick(rng, SKINS), hair: pick(rng, HAIRS), shirt, shorts, style: Math.floor(rng.next() * 4) as HairStyle };
}

function sickSets(rng: Random, count: number): Symptom[][] {
  const singles = shuffle(rng, [...SYMPTOMS]).map((s) => [s]);
  const sets: Symptom[][] = [...singles];
  const pairs: Symptom[][] = [];
  while (sets.length + pairs.length < count) {
    const [a, b] = shuffle(rng, [...SYMPTOMS]);
    if (pairs.some((p) => p.includes(a) && p.includes(b))) continue;
    pairs.push([a, b]);
  }
  const rest = pairs.slice(0, count - sets.length);
  const warm = sets.slice(0, 3);
  const later = shuffle(rng, [sets[3], ...rest]);
  return [...warm, ...later];
}

function slotOrder(rng: Random, stage: Stage, first: boolean): boolean[] {
  for (let attempt = 0; attempt < 80; attempt++) {
    const slots = shuffle(rng, [...Array.from({ length: stage.sick }, () => true), ...Array.from({ length: stage.healthy }, () => false)]);
    if (first && !slots[0]) continue;
    if (slots.some((s, i) => i >= 2 && s && slots[i - 1] && slots[i - 2])) continue;
    if (slots.some((s, i) => i >= 4 && !s && !slots[i - 1] && !slots[i - 2] && !slots[i - 3] && !slots[i - 4])) continue;
    return slots;
  }
  const slots: boolean[] = [];
  const groups = stage.sick + 1;
  let left = stage.healthy;
  for (let g = 0; g < groups; g++) {
    const take = Math.round(left / (groups - g));
    if (g > 0) slots.push(true);
    for (let k = 0; k < take; k++) slots.push(false);
    left -= take;
  }
  if (first && !slots[0]) {
    const at = slots.indexOf(true);
    [slots[0], slots[at]] = [slots[at], slots[0]];
  }
  return slots;
}

function separated(a: Crossing, b: Crossing) {
  const from = Math.max(a.at, b.at);
  const to = Math.min(a.at + a.duration, b.at + b.duration);
  if (to <= from) return true;
  if (a.dir !== b.dir) return false;
  for (let t = from; t <= to; t += 0.1) {
    if (Math.abs(progress(a, t) - progress(b, t)) < MIN_SEPARATION) return false;
  }
  return true;
}

function outAt(crossings: Crossing[], t: number) {
  return crossings.filter((c) => c.at <= t && t < c.at + c.duration);
}

export function generatePlan(seed: number): KidPlan {
  const rng = createRandom(seed);
  const sets = sickSets(rng, SICK_COUNT);
  const props: Prop[] = ["freckles", "icecream", "backpack", "balloon"];
  const crossings: Crossing[] = [];
  let sickIndex = 0;
  let healthyIndex = 0;
  let t = FIRST_AT;
  for (const stage of STAGES) {
    const slots = slotOrder(rng, stage, stage.name === "warmup");
    for (const sick of slots) {
      const duration = rng.range(stage.duration) * (sick ? 1.06 : 1);
      let symptoms: Symptom[] = [];
      let prop: Prop | null = null;
      if (sick) symptoms = sets[sickIndex++];
      else {
        const wants = stage.name !== "warmup" || healthyIndex > 0;
        prop = wants ? props[healthyIndex % props.length] : null;
        healthyIndex++;
      }
      const look: Look = { ...baseLook(rng), symptoms, prop: sick ? (rng.chance(0.25) ? "backpack" : null) : prop };
      let placed: Crossing | null = null;
      for (let tries = 0; tries < 80 && !placed; tries++) {
        const out = outAt(crossings, t);
        if (out.length >= stage.maxOut) {
          t = Math.min(...out.map((c) => c.at + c.duration)) + 0.05;
          continue;
        }
        const lanes = shuffle(rng, Array.from({ length: LANES }, (_, i) => i));
        const lastLane = crossings[crossings.length - 1]?.lane;
        lanes.sort((a, b) => (a === lastLane ? 1 : 0) - (b === lastLane ? 1 : 0));
        search: for (const lane of lanes) {
          for (const dir of rng.chance(0.5) ? ([1, -1] as const) : ([-1, 1] as const)) {
            const candidate: Crossing = { id: crossings.length, look, sick, stage: stage.name, at: t, lane, dir, duration };
            if (crossings.every((c) => c.lane !== lane || separated(c, candidate))) {
              placed = candidate;
              break search;
            }
          }
        }
        if (!placed) t += 0.2;
      }
      if (!placed) return generatePlan(seed + 1);
      crossings.push(placed);
      t = placed.at + rng.range(stage.gap);
    }
  }
  return { seed, crossings, gnats: scheduleGnats(seed, planEnd(crossings)) };
}

function scheduleGnats(seed: number, end: number): Gnat[] {
  const rng = createRandom((seed ^ 0x5bd1e995) >>> 0);
  const span = (end - GNAT_FIRST_AT - 4) / (GNAT_COUNT - 1);
  return Array.from({ length: GNAT_COUNT }, (_, id) => ({
    id,
    at: GNAT_FIRST_AT + id * span + (id === 0 ? 0 : rng.range([-0.7, 0.7])),
    duration: rng.range([2.4, 3.2]),
    dir: rng.sign(),
    y: rng.range([0.1, 0.5]),
    freq: rng.range([2.2, 3.6]),
    phase: rng.range([0, Math.PI * 2]),
  }));
}

export type PlanReport = { duration: number; maxOut: number; sickCount: number; firstSickAt: number; sickOverlaps: number };

export function planEnd(crossings: Crossing[]) {
  return Math.max(...crossings.map((c) => c.at + c.duration));
}

export function assessPlan(plan: KidPlan): PlanReport {
  const { crossings } = plan;
  let maxOut = 0;
  for (let t = 0; t < planEnd(crossings); t += 0.05) {
    maxOut = Math.max(maxOut, crossings.filter((c) => onScreen(progress(c, t)) && t >= c.at).length);
  }
  const sick = crossings.filter((c) => c.sick);
  let sickOverlaps = 0;
  for (const a of sick) for (const b of sick) if (a.id < b.id && Math.abs(a.at - b.at) < 0.9) sickOverlaps += 1;
  return { duration: planEnd(crossings), maxOut, sickCount: sick.length, firstSickAt: sick[0]?.at ?? Infinity, sickOverlaps };
}
