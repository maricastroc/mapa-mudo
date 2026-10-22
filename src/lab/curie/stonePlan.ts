import { createRandom, type Random } from "../random.ts";
import { SLOT_COUNT } from "./stoneLayout.ts";

export type StoneKind = "active" | "plain" | "crystal";
export type StageName = "warmup" | "build" | "finale";

export type Pop = {
  id: number;
  kind: StoneKind;
  stage: StageName;
  slot: number;
  at: number;
  up: number;
  strength: number;
  shape: number;
};

export type StonePlan = { seed: number; pops: Pop[]; accepted: boolean; attempts: number };

type Stage = {
  name: StageName;
  actives: number;
  plains: number;
  crystals: number;
  gap: readonly [number, number];
  up: readonly [number, number];
  strength: readonly [number, number];
  maxUp: number;
};

export const STAGES: readonly Stage[] = [
  { name: "warmup", actives: 4, plains: 2, crystals: 0, gap: [1.05, 1.3], up: [2.3, 2.5], strength: [1, 0.88], maxUp: 2 },
  { name: "build", actives: 5, plains: 5, crystals: 0, gap: [0.72, 0.92], up: [1.85, 2.05], strength: [0.82, 0.66], maxUp: 3 },
  { name: "finale", actives: 5, plains: 4, crystals: 3, gap: [0.6, 0.78], up: [1.5, 1.65], strength: [0.6, 0.46], maxUp: 3 },
];

export const ACTIVE_COUNT = STAGES.reduce((n, s) => n + s.actives, 0);
export const RISE = 0.18;
export const SINK = 0.22;
export const SLOT_REST = 0.3;
export const FIRST_AT = 0.7;

export const ATTENTIVE_TAPPER = { reaction: 0.45, between: 0.3 };
export const REFERENCE_TAPPER = { reaction: 0.85, between: 0.55 };
export const SLOW_TAPPER = { reaction: 1.1, between: 0.75 };

export const ACCEPT = { duration: [24, 36] as const, slotsUsedByActives: 5, maxSameSlotRun: 1 };

function kindsFor(stage: Stage, rng: Random): StoneKind[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const kinds: StoneKind[] = [
      ...Array.from({ length: stage.actives }, () => "active" as const),
      ...Array.from({ length: stage.plains }, () => "plain" as const),
      ...Array.from({ length: stage.crystals }, () => "crystal" as const),
    ];
    for (let i = kinds.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
    }
    if (stage.name === "warmup" && (kinds[0] !== "active" || kinds[1] !== "active")) continue;
    if (stage.crystals > 0 && kinds[0] === "crystal") continue;
    let run = 1;
    let ok = true;
    for (let i = 1; i < kinds.length; i++) {
      run = kinds[i] === kinds[i - 1] ? run + 1 : 1;
      if (run > 3) ok = false;
    }
    if (ok) return kinds;
  }
  return Array.from({ length: stage.actives + stage.plains + stage.crystals }, (_, i) => (i % 2 ? "plain" : "active"));
}

export function endOf(pop: Pick<Pop, "at" | "up">) {
  return pop.at + pop.up;
}

function buildPops(rng: Random): Pop[] {
  const pops: Pop[] = [];
  const freeAt = new Array(SLOT_COUNT).fill(0);
  const usage = new Array(SLOT_COUNT).fill(0);
  const recent: number[] = [];
  let t = FIRST_AT;
  for (const stage of STAGES) {
    const kinds = kindsFor(stage, rng);
    kinds.forEach((kind, i) => {
      const k = kinds.length > 1 ? i / (kinds.length - 1) : 0;
      const up = rng.range(stage.up);
      let at = t;
      for (let guard = 0; guard < 40; guard++) {
        const visible = pops.filter((p) => p.at <= at && endOf(p) > at);
        const free = freeAt.some((f) => f <= at);
        if (visible.length < stage.maxUp && free) break;
        at += 0.1;
      }
      const options = Array.from({ length: SLOT_COUNT }, (_, slot) => slot)
        .filter((slot) => freeAt[slot] <= at)
        .map((slot) => ({
          value: slot,
          weight: Math.exp(-2.2 * ((recent[0] === slot ? 1 : 0) + (recent[1] === slot ? 0.6 : 0) + (recent[2] === slot ? 0.3 : 0) + usage[slot] * 0.18)),
        }));
      const slot = rng.weighted(options);
      const strength = stage.strength[0] + (stage.strength[1] - stage.strength[0]) * k + rng.range([-0.03, 0.03]);
      pops.push({ id: pops.length, kind, stage: stage.name, slot, at, up, strength: kind === "active" ? strength : 0, shape: Math.floor(rng.next() * 1e6) });
      freeAt[slot] = at + up + SLOT_REST;
      usage[slot] += 1;
      recent.unshift(slot);
      t = at + rng.range(stage.gap);
    });
  }
  return pops;
}

export function tapWindows(pops: Pop[], reaction: number) {
  return pops
    .filter((p) => p.kind === "active")
    .map((p) => ({ id: p.id, open: p.at + RISE + reaction, close: endOf(p) - SINK * 0.5 }))
    .sort((a, b) => a.close - b.close);
}

export function tapsPossible(pops: Pop[], tapper: { reaction: number; between: number }) {
  const windows = tapWindows(pops, tapper.reaction).sort((a, b) => a.open - b.open || a.close - b.close);
  const pending = [...windows];
  let clock = 0;
  let tapped = 0;
  const ready: { open: number; close: number }[] = [];
  while (pending.length || ready.length) {
    while (pending.length && pending[0].open <= clock) ready.push(pending.shift()!);
    ready.sort((a, b) => a.close - b.close);
    while (ready.length && ready[0].close < clock) ready.shift();
    if (!ready.length) {
      if (!pending.length) break;
      clock = Math.max(clock, pending[0].open);
      continue;
    }
    ready.shift();
    tapped += 1;
    clock += tapper.between;
  }
  return tapped;
}

export type StoneAssessment = {
  duration: number;
  actives: number;
  slotsUsedByActives: number;
  maxSameSlotRun: number;
  attentive: number;
  reference: number;
  slow: number;
  maxVisible: number;
  maxVisibleActive: number;
};

export function assessStones(pops: Pop[]): StoneAssessment {
  const actives = pops.filter((p) => p.kind === "active");
  let maxVisible = 0;
  let maxVisibleActive = 0;
  for (const p of pops) {
    const visible = pops.filter((q) => q.at <= p.at && endOf(q) > p.at);
    maxVisible = Math.max(maxVisible, visible.length);
    maxVisibleActive = Math.max(maxVisibleActive, visible.filter((q) => q.kind === "active").length);
  }
  let run = 1;
  let maxSameSlotRun = 1;
  for (let i = 1; i < pops.length; i++) {
    run = pops[i].slot === pops[i - 1].slot ? run + 1 : 1;
    maxSameSlotRun = Math.max(maxSameSlotRun, run);
  }
  return {
    duration: Math.max(...pops.map(endOf)),
    actives: actives.length,
    slotsUsedByActives: new Set(actives.map((p) => p.slot)).size,
    maxSameSlotRun,
    attentive: tapsPossible(pops, ATTENTIVE_TAPPER),
    reference: tapsPossible(pops, REFERENCE_TAPPER),
    slow: tapsPossible(pops, SLOW_TAPPER),
    maxVisible,
    maxVisibleActive,
  };
}

export function acceptable(a: StoneAssessment) {
  return (
    a.actives === ACTIVE_COUNT &&
    a.attentive === ACTIVE_COUNT &&
    a.reference === ACTIVE_COUNT &&
    a.slow >= ACTIVE_COUNT - 2 &&
    a.duration >= ACCEPT.duration[0] &&
    a.duration <= ACCEPT.duration[1] &&
    a.slotsUsedByActives >= ACCEPT.slotsUsedByActives &&
    a.maxSameSlotRun <= ACCEPT.maxSameSlotRun
  );
}

export function generateStones(seed: number): StonePlan {
  const rng = createRandom(seed);
  let fallback: Pop[] | null = null;
  for (let attempt = 1; attempt <= 40; attempt++) {
    const pops = buildPops(rng);
    const a = assessStones(pops);
    if (acceptable(a)) return { seed, pops, accepted: true, attempts: attempt };
    if (!fallback && a.attentive === ACTIVE_COUNT) fallback = pops;
  }
  return { seed, pops: fallback ?? buildPops(rng), accepted: false, attempts: 40 };
}
