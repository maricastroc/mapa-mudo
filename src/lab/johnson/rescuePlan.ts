import { createRandom, type Random } from "../random.ts";
import { simulateFall, type FallPath, type FallSpec } from "./fall.ts";
import { DROP, type RescueGeometry } from "./rescueGeometry.ts";

export type DropKind = "capsule" | "debris";
export type StageName = "warmup" | "build" | "finale";

export type DropPlan = {
  id: number;
  kind: DropKind;
  stage: StageName;
  spawn: number;
  landAt: number;
  lane: number;
  spec: FallSpec;
  path: FallPath;
  pressure: number;
};

export type RescuePlan = {
  seed: number;
  drops: DropPlan[];
  attempts: number;
  accepted: boolean;
};

export type PlanScale = {
  laneSpeed: number;
  catchLane: number;
  hitLane: number;
  safeLane: number;
  minFrac: number;
  spanFrac: number;
  driftFrac: number;
};

type Stage = {
  name: StageName;
  capsules: number;
  lull?: readonly [number, number];
  gap?: readonly [number, number];
  terminal: readonly [number, number];
  pressure: readonly [number, number];
  distance: readonly [number, number];
  debris: number;
  debrisTerminal: readonly [number, number];
  drift: number;
};

export const PLAYER = { speed: 0.6, reaction: 0.45, settle: 0.25, slack: 0.2 };

export const STAGES: readonly Stage[] = [
  {
    name: "warmup",
    capsules: 3,
    lull: [0.3, 0.6],
    terminal: [0.205, 0.225],
    pressure: [0.14, 0.3],
    distance: [0.12, 0.5],
    debris: 0,
    debrisTerminal: [0.38, 0.4],
    drift: 0.1,
  },
  {
    name: "build",
    capsules: 3,
    gap: [2.7, 3.2],
    terminal: [0.25, 0.285],
    pressure: [0.42, 0.58],
    distance: [0.22, 0.8],
    debris: 4,
    debrisTerminal: [0.44, 0.5],
    drift: 0.18,
  },
  {
    name: "finale",
    capsules: 4,
    gap: [1.45, 1.7],
    terminal: [0.3, 0.345],
    pressure: [0.58, 0.76],
    distance: [0.25, 0.9],
    debris: 5,
    debrisTerminal: [0.5, 0.58],
    drift: 0.22,
  },
];

export const CAPSULE_COUNT = STAGES.reduce((n, s) => n + s.capsules, 0);
export const DEBRIS_COUNT = STAGES.reduce((n, s) => n + s.debris, 0);
export const REGION_COUNT = 5;

export const ACCEPT = {
  meanPressure: [0.41, 0.52] as const,
  peakPressure: 0.82,
  duration: [24, 33] as const,
  regionsUsed: 4,
  maxPerRegion: 4,
  maxRun: 2,
};

const FIRST_SPAWN = 0.5;
const MAX_ATTEMPTS = 40;
const CLEAR_OF_CATCH = 1.1;
const DEBRIS_SPACING = 0.55;
export const MAX_AIRBORNE = 4;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function planScale(geometry: RescueGeometry): PlanScale {
  const { W, span } = geometry;
  return {
    laneSpeed: (PLAYER.speed * W) / span,
    catchLane: geometry.catchHalf / span,
    hitLane: geometry.hitHalf / span,
    safeLane: geometry.hitHalf / span + Math.max(0.05, 26 / span),
    minFrac: geometry.minX / W,
    spanFrac: span / W,
    driftFrac: geometry.driftUnit / W,
  };
}

export function regionOf(lane: number) {
  return Math.min(REGION_COUNT - 1, Math.max(0, Math.floor(lane * REGION_COUNT)));
}

function withDrift(rng: Random, lane: number, base: FallSpec, drift: number, scale: PlanScale): { spec: FallSpec; path: FallPath } {
  const landFrac = scale.minFrac + lane * scale.spanFrac;
  const magnitude = rng.range([0.3, 1]) * drift;
  const sign = rng.sign();
  for (const s of [sign, -sign]) {
    const spec = { ...base, vx0: s * magnitude, wind: s * magnitude * rng.range([0.05, 0.14]) };
    const path = simulateFall(spec, DROP);
    const start = landFrac - path.landingX * scale.driftFrac;
    if (start > 0.05 && start < 0.95) return { spec, path };
  }
  const spec = { ...base, vx0: 0, wind: 0 };
  return { spec, path: simulateFall(spec, DROP) };
}

type Leg = { depart: number; leave: number; arrive: number; from: number; to: number; landAt: number };

function buildCapsules(rng: Random, scale: PlanScale) {
  const capsules: DropPlan[] = [];
  const legs: Leg[] = [];
  let terminal = 0;
  let landAt = 0;
  let lane = 0.5;
  let freeAt = 0;
  const usage = new Array(REGION_COUNT).fill(0);
  const recent: number[] = [];

  for (const stage of STAGES) {
    const gaps = stage.gap ? Array.from({ length: stage.capsules }, () => rng.range(stage.gap!)).sort((a, b) => b - a) : [];
    for (let j = 0; j < stage.capsules; j++) {
      const id = capsules.length;
      terminal = Math.max(terminal, rng.range(stage.terminal));
      const vertical: FallSpec = { vx0: 0, wind: 0, openAt: 0.3 + 0.014 * id, terminal };
      const duration = simulateFall(vertical, DROP).duration;
      if (id === 0) landAt = FIRST_SPAWN + duration;
      else if (stage.lull) landAt += duration + rng.range(stage.lull);
      else landAt += gaps[j];
      if (id >= 2 && landAt - duration < capsules[id - 2].landAt + 0.05) landAt = capsules[id - 2].landAt + 0.05 + duration;
      const spawn = landAt - duration;

      const depart = Math.max(freeAt, spawn + PLAYER.reaction);
      const available = landAt - depart - PLAYER.slack;
      const reach = Math.max(0, (available - PLAYER.settle) * scale.laneSpeed);
      const wanted = Math.min(reach, clamp((rng.range(stage.pressure) * available - PLAYER.settle) * scale.laneSpeed, stage.distance[0], stage.distance[1]));

      const options = ([-1, 1] as const).map((side) => {
        const room = side < 0 ? lane : 1 - lane;
        const distance = Math.min(room, wanted * rng.range([0.88, 1.12]));
        const to = clamp(lane + side * distance, 0, 1);
        const region = regionOf(to);
        const short = distance < wanted * 0.7 ? 0.9 : 0;
        const penalty = (recent[0] === region ? 1 : 0) + (recent[1] === region ? 0.5 : 0) + usage[region] * 0.35 + short;
        return { value: { to, distance }, weight: Math.exp(-1.6 * penalty) };
      });
      const choice = rng.weighted(options);
      const travel = choice.distance / scale.laneSpeed + PLAYER.settle;
      const pressure = available > 0 ? travel / available : 1;
      const { spec, path } = withDrift(rng, choice.to, vertical, stage.drift, scale);

      capsules.push({ id, kind: "capsule", stage: stage.name, spawn, landAt, lane: choice.to, spec, path, pressure });
      legs.push({ depart, leave: Math.max(freeAt, spawn) - 0.1, arrive: depart + travel, from: lane, to: choice.to, landAt });
      usage[regionOf(choice.to)] += 1;
      recent.unshift(regionOf(choice.to));
      lane = choice.to;
      freeAt = landAt;
    }
  }
  return { capsules, legs };
}

export function occupiedLanes(legs: Leg[], time: number): [number, number] {
  for (const leg of legs) {
    if (time > leg.landAt) continue;
    if (time < leg.leave) return [leg.from, leg.from];
    if (time < leg.arrive + 0.15) return [Math.min(leg.from, leg.to), Math.max(leg.from, leg.to)];
    return [leg.to, leg.to];
  }
  const last = legs[legs.length - 1];
  return [last.to, last.to];
}

function laneClear(lane: number, [lo, hi]: [number, number], safe: number) {
  return lane < lo - safe || lane > hi + safe;
}

function placeDebris(rng: Random, capsules: DropPlan[], legs: Leg[], scale: PlanScale) {
  const debris: DropPlan[] = [];
  const earliest = capsules[1].landAt + 0.3;
  const windows: Record<StageName, [number, number]> = {
    warmup: [0, 0],
    build: [earliest + 2.2, capsules[5].landAt],
    finale: [capsules[5].landAt + 0.2, capsules[capsules.length - 1].landAt - 0.3],
  };
  const order = STAGES.filter((s) => s.debris > 0);
  let owed = 0;

  const tryPlace = (stage: Stage, window: [number, number]) => {
    const stageLegs = legs.filter((l) => l.arrive + 0.15 >= window[0] && l.landAt <= window[1] + 0.01);
    for (let attempt = 0; attempt < 80; attempt++) {
      const trap = stageLegs.length > 0 && rng.chance(0.7);
      const target = trap ? stageLegs[Math.floor(rng.next() * stageLegs.length)] : null;
      const landAt = target ? target.arrive + 0.15 + rng.range([0, Math.max(0, Math.min(0.7, target.landAt - 0.55 - target.arrive - 0.15))]) : rng.range(window);
      if (landAt < window[0] || landAt > window[1]) continue;
      if (debris.some((d) => Math.abs(d.landAt - landAt) < DEBRIS_SPACING)) continue;
      const leg = legs.find((l) => landAt <= l.landAt);
      if (leg && landAt > leg.landAt - 0.55) continue;
      const occupied = occupiedLanes(legs, landAt);
      const nearCatches = capsules.filter((c) => Math.abs(c.landAt - landAt) < CLEAR_OF_CATCH);
      const valid = (lane: number) =>
        lane >= 0 &&
        lane <= 1 &&
        laneClear(lane, occupied, scale.safeLane) &&
        nearCatches.every((c) => Math.abs(c.lane - lane) >= scale.catchLane + scale.hitLane);
      const parked = occupied[0] === occupied[1];
      const candidates: { value: number; weight: number }[] = [];
      if (parked && leg) {
        const linger = leg.from + rng.range([-0.04, 0.04]);
        if (valid(linger)) candidates.push({ value: linger, weight: 0.5 });
        const between = (leg.from + leg.to) / 2 + rng.range([-0.05, 0.05]);
        if (valid(between)) candidates.push({ value: between, weight: 0.35 });
      }
      if (!candidates.length || rng.chance(0.15)) {
        for (let k = 0; k < 6; k++) {
          const wide = rng.next();
          if (valid(wide)) {
            candidates.push({ value: wide, weight: 0.15 });
            break;
          }
        }
      }
      if (!candidates.length) continue;
      const lane = rng.weighted(candidates);
      const terminal = rng.range(stage.debrisTerminal);
      const base: FallSpec = { vx0: 0, wind: 0, openAt: 0, terminal };
      const { spec, path } = withDrift(rng, lane, base, 0.06, scale);
      const spawn = landAt - path.duration;
      if (spawn < earliest) continue;
      const others = [...capsules, ...debris];
      const instants = [spawn, ...others.map((d) => d.spawn).filter((t) => t > spawn && t < landAt)];
      if (instants.some((t) => 1 + others.filter((d) => d.spawn <= t && d.landAt > t).length > MAX_AIRBORNE)) continue;
      debris.push({ id: 0, kind: "debris", stage: stage.name, spawn, landAt, lane, spec, path, pressure: 0 });
      return true;
    }
    return false;
  };

  for (const stage of order) {
    for (let k = 0; k < stage.debris + owed; k++) {
      if (!tryPlace(stage, windows[stage.name])) {
        owed = stage.debris + owed - k;
        break;
      }
      if (k === stage.debris + owed - 1) owed = 0;
    }
  }
  for (let k = 0; k < owed; k++) {
    if (!tryPlace(order[0], [windows.build[0], windows.finale[1]])) break;
  }
  return debris;
}

export type PlanAssessment = {
  meanPressure: number;
  peakPressure: number;
  stagePressure: Record<StageName, number>;
  duration: number;
  regionsUsed: number;
  maxPerRegion: number;
  maxRun: number;
  travel: number;
  debris: number;
};

export function assessPlan(drops: DropPlan[]): PlanAssessment {
  const capsules = drops.filter((d) => d.kind === "capsule").sort((a, b) => a.landAt - b.landAt);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const counts = new Array(REGION_COUNT).fill(0);
  let run = 1;
  let maxRun = 1;
  let travel = 0;
  capsules.forEach((c, i) => {
    counts[regionOf(c.lane)] += 1;
    if (i > 0) {
      travel += Math.abs(c.lane - capsules[i - 1].lane);
      run = regionOf(c.lane) === regionOf(capsules[i - 1].lane) ? run + 1 : 1;
      maxRun = Math.max(maxRun, run);
    }
  });
  const byStage = (name: StageName) => mean(capsules.filter((c) => c.stage === name).map((c) => c.pressure));
  return {
    meanPressure: mean(capsules.map((c) => c.pressure)),
    peakPressure: Math.max(...capsules.map((c) => c.pressure)),
    stagePressure: { warmup: byStage("warmup"), build: byStage("build"), finale: byStage("finale") },
    duration: Math.max(...drops.map((d) => d.landAt)),
    regionsUsed: counts.filter((n) => n > 0).length,
    maxPerRegion: Math.max(...counts),
    maxRun,
    travel,
    debris: drops.filter((d) => d.kind === "debris").length,
  };
}

export function isAcceptable(a: PlanAssessment) {
  return (
    a.debris === DEBRIS_COUNT &&
    a.meanPressure >= ACCEPT.meanPressure[0] &&
    a.meanPressure <= ACCEPT.meanPressure[1] &&
    a.peakPressure <= ACCEPT.peakPressure &&
    a.stagePressure.warmup < a.stagePressure.build &&
    a.stagePressure.build < a.stagePressure.finale &&
    a.duration >= ACCEPT.duration[0] &&
    a.duration <= ACCEPT.duration[1] &&
    a.regionsUsed >= ACCEPT.regionsUsed &&
    a.maxPerRegion <= ACCEPT.maxPerRegion &&
    a.maxRun <= ACCEPT.maxRun
  );
}

function distanceFromTarget(a: PlanAssessment) {
  const target = (ACCEPT.meanPressure[0] + ACCEPT.meanPressure[1]) / 2;
  return Math.abs(a.meanPressure - target) + (DEBRIS_COUNT - a.debris) + (a.regionsUsed < ACCEPT.regionsUsed ? 0.2 : 0);
}

export function generatePlan(seed: number, geometry: RescueGeometry): RescuePlan {
  const rng = createRandom(seed);
  const scale = planScale(geometry);
  let best: { drops: DropPlan[]; score: number } | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { capsules, legs } = buildCapsules(rng, scale);
    const debris = placeDebris(rng, capsules, legs, scale);
    const drops = [...capsules, ...debris].sort((a, b) => a.spawn - b.spawn).map((d, id) => ({ ...d, id }));
    const assessment = assessPlan(drops);
    if (isAcceptable(assessment)) return { seed, drops, attempts: attempt, accepted: true };
    const score = distanceFromTarget(assessment);
    if (!best || score < best.score) best = { drops, score };
  }
  return { seed, drops: best!.drops, attempts: MAX_ATTEMPTS, accepted: false };
}

export function reachableLane(planned: number, from: number, fromTime: number, landAt: number, scale: PlanScale, debris: { lane: number; landAt: number }[]) {
  const budget = Math.max(0, landAt - fromTime - PLAYER.reaction - PLAYER.settle - PLAYER.slack) * scale.laneSpeed;
  if (Math.abs(planned - from) <= budget) return planned;
  const conflicts = (lane: number) => debris.some((d) => Math.abs(d.landAt - landAt) < CLEAR_OF_CATCH && Math.abs(d.lane - lane) < scale.catchLane + scale.hitLane);
  const direction = Math.sign(planned - from);
  for (let reach = budget; reach >= 0; reach -= 0.02) {
    const lane = clamp(from + direction * reach, 0, 1);
    if (!conflicts(lane)) return lane;
  }
  return planned;
}
