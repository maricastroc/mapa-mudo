import { createRandom, type Random } from "../random.ts";
import type { Build, Look, Mark, Skin } from "./frogArt.ts";
import { crossingLength, motionAt, onScreen, visibleWindow } from "./frogMotion.ts";

export type StageName = "warmup" | "build" | "finale";

export type Species = Look & { id: number; twin: number | null };

export type Crossing = {
  id: number;
  species: number;
  stage: StageName;
  at: number;
  lane: number;
  dir: 1 | -1;
  duration: number;
  hops: number;
  rest: number;
  first: boolean;
};

export type FrogPlan = { seed: number; species: Species[]; crossings: Crossing[]; accepted: boolean; attempts: number };

type Stage = {
  name: StageName;
  fresh: number;
  repeats: number;
  gap: readonly [number, number];
  duration: readonly [number, number];
  hops: readonly [number, number];
  rest: number;
  maxOut: number;
};

export const BUILDS: readonly Build[] = ["tree", "toad", "frog"];
export const SKINS: readonly Skin[] = ["orange", "blue", "black"];
export const MARKS: readonly Mark[] = ["plain", "spots", "bands", "stripe"];

export const LANES = 3;
export const CHANCES = 3;
export const FIRST_AT = 0.6;

export const STAGES: readonly Stage[] = [
  { name: "warmup", fresh: 3, repeats: 2, gap: [2.4, 2.6], duration: [5.2, 5.5], hops: [6, 7], rest: 0.56, maxOut: 2 },
  { name: "build", fresh: 3, repeats: 5, gap: [1.4, 1.6], duration: [4.6, 4.9], hops: [5, 6], rest: 0.5, maxOut: 3 },
  { name: "finale", fresh: 2, repeats: 7, gap: [1.08, 1.22], duration: [3.9, 4.15], hops: [4, 5], rest: 0.48, maxOut: 3 },
];

export const SPECIES_COUNT = STAGES.reduce((n, s) => n + s.fresh, 0);
export const CROSSING_COUNT = STAGES.reduce((n, s) => n + s.fresh + s.repeats, 0);

export type Player = { reaction: number; between: number };
export const ATTENTIVE_PLAYER: Player = { reaction: 0.55, between: 0.3 };
export const REFERENCE_PLAYER: Player = { reaction: 0.9, between: 0.5 };
export const SLOW_PLAYER: Player = { reaction: 1.3, between: 0.8 };

export const ACCEPT = { duration: [33, 42] as const, minSeparation: 0.2, twinLead: 1 };

export function difference(a: Look, b: Look) {
  return (a.build !== b.build ? 1 : 0) + (a.skin !== b.skin ? 1 : 0) + (a.mark !== b.mark ? 1 : 0);
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

const ALL_LOOKS: Look[] = BUILDS.flatMap((build) => SKINS.flatMap((skin) => MARKS.map((mark) => ({ build, skin, mark }))));

function chooseSpecies(rng: Random): Species[] | null {
  const chosen: Species[] = [];
  const add = (look: Look, twin: number | null) => chosen.push({ ...look, id: chosen.length, twin });
  const builds = shuffle(rng, [...BUILDS]);
  const skins = shuffle(rng, [...SKINS]);
  const marks = shuffle(rng, [...MARKS]);
  for (let i = 0; i < STAGES[0].fresh; i++) add({ build: builds[i], skin: skins[i], mark: marks[i] }, null);
  for (let i = 0; i < STAGES[1].fresh; i++) {
    const options = ALL_LOOKS.filter((look) => chosen.every((s) => difference(s, look) >= 2));
    if (!options.length) return null;
    add(pick(rng, options), null);
  }
  const twins = shuffle(rng, chosen.map((s) => s.id));
  const changes: ("mark" | "build")[] = rng.chance(0.5) ? ["mark", "build"] : ["mark", "mark"];
  for (const change of changes) {
    let placed = false;
    for (const twinId of twins) {
      if (chosen.some((s) => s.twin === twinId)) continue;
      const twin = chosen[twinId];
      const options = ALL_LOOKS.filter(
        (look) =>
          difference(look, twin) === 1 &&
          (change === "mark" ? look.mark !== twin.mark : look.build !== twin.build) &&
          chosen.every((s) => s.id === twinId || difference(s, look) >= 2),
      );
      if (!options.length) continue;
      add(pick(rng, options), twinId);
      placed = true;
      break;
    }
    if (!placed) return null;
  }
  return chosen;
}

type Slot = { kind: "new"; species: number } | { kind: "repeat"; prefer: number | null; must?: boolean };

function stageSlots(stage: Stage, rng: Random, species: Species[], introduced: number): Slot[] | null {
  const fresh = Array.from({ length: stage.fresh }, (_, i) => introduced + i);
  if (stage.name === "warmup") {
    return [
      { kind: "new", species: fresh[0] },
      { kind: "new", species: fresh[1] },
      { kind: "repeat", prefer: fresh[0] },
      { kind: "new", species: fresh[2] },
      { kind: "repeat", prefer: fresh[1] },
    ];
  }
  if (stage.name === "build") {
    for (let attempt = 0; attempt < 40; attempt++) {
      const kinds = shuffle(rng, [...fresh.map(() => "new" as const), ...Array.from({ length: stage.repeats }, () => "repeat" as const)]);
      if (kinds[0] === "new" || kinds[kinds.length - 1] === "new") continue;
      if (kinds.some((k, i) => k === "new" && kinds[i + 1] === "new")) continue;
      let next = 0;
      return kinds.map((k) => (k === "new" ? { kind: "new", species: fresh[next++] } : { kind: "repeat", prefer: null }));
    }
    return null;
  }
  const [first, second] = fresh;
  const twinOf = (id: number) => species[id].twin;
  return [
    { kind: "repeat", prefer: twinOf(first) },
    { kind: "new", species: first },
    { kind: "repeat", prefer: null },
    { kind: "repeat", prefer: twinOf(second) },
    { kind: "new", species: second },
    { kind: "repeat", prefer: rng.chance(0.5) ? twinOf(first) : null },
    { kind: "repeat", prefer: first, must: true },
    { kind: "repeat", prefer: null },
    { kind: "repeat", prefer: second, must: true },
  ];
}

function separated(a: Crossing, b: Crossing) {
  const from = Math.max(a.at, b.at);
  const to = Math.min(a.at + crossingLength(a), b.at + crossingLength(b));
  if (to <= from) return true;
  if (a.dir !== b.dir) return false;
  for (let t = from; t <= to; t += 0.05) {
    if (Math.abs(motionAt(a, t).u - motionAt(b, t).u) < ACCEPT.minSeparation) return false;
  }
  return true;
}

function outAt(crossings: Crossing[], t: number) {
  return crossings.filter((c) => c.at <= t && t < c.at + crossingLength(c));
}

function buildCrossings(rng: Random, species: Species[]): Crossing[] | null {
  const crossings: Crossing[] = [];
  const lastSeen = new Map<number, number>();
  const count = new Map<number, number>();
  let introduced = 0;
  let t = FIRST_AT;
  for (const stage of STAGES) {
    const slots = stageSlots(stage, rng, species, introduced);
    if (!slots) return null;
    introduced += stage.fresh;
    for (const slot of slots) {
      const duration = rng.range(stage.duration);
      const hops = Math.round(rng.range([stage.hops[0] - 0.49, stage.hops[1] + 0.49]));
      let placed: Crossing | null = null;
      for (let tries = 0; tries < 60 && !placed; tries++) {
        const out = outAt(crossings, t);
        if (out.length >= stage.maxOut) {
          t = Math.min(...out.map((c) => c.at + crossingLength(c))) + 0.05;
          continue;
        }
        const busy = new Set(outAt(crossings, t).map((c) => c.species));
        const end = (c: Crossing) => c.at + crossingLength(c);
        const length = crossingLength({ at: t, duration, hops, rest: stage.rest });
        const clash = (id: number) => crossings.some((c) => c.species === id && end(c) > t - 0.3 && c.at < t + length);
        let id: number;
        if (slot.kind === "new") {
          id = slot.species;
        } else {
          const candidates = Array.from({ length: introduced }, (_, i) => i).filter((i) => (count.get(i) ?? 0) > 0 && !busy.has(i) && !clash(i));
          if (slot.prefer !== null && candidates.includes(slot.prefer)) id = slot.prefer;
          else if (slot.must && slot.prefer !== null) {
            t += 0.2;
            continue;
          } else if (candidates.length) {
            id = rng.weighted(
              candidates.map((i) => ({
                value: i,
                weight: (1 + Math.min(12, t - (lastSeen.get(i) ?? 0))) * ((count.get(i) ?? 0) < 2 ? 3 : 1) * (species[i].twin !== null ? 1.4 : 1),
              })),
            );
          } else {
            t += 0.25;
            continue;
          }
        }
        if (clash(id)) {
          t += 0.25;
          continue;
        }
        const lanes = shuffle(rng, Array.from({ length: LANES }, (_, i) => i));
        const lastLane = crossings[crossings.length - 1]?.lane;
        lanes.sort((a, b) => (a === lastLane ? 1 : 0) - (b === lastLane ? 1 : 0));
        for (const lane of lanes) {
          for (const dir of rng.chance(0.5) ? ([1, -1] as const) : ([-1, 1] as const)) {
            const candidate: Crossing = { id: crossings.length, species: id, stage: stage.name, at: t, lane, dir, duration, hops, rest: stage.rest, first: !count.get(id) };
            if (crossings.every((c) => c.lane !== lane || separated(c, candidate))) {
              placed = candidate;
              break;
            }
          }
          if (placed) break;
        }
        if (!placed) t += 0.2;
      }
      if (!placed) return null;
      crossings.push(placed);
      lastSeen.set(placed.species, placed.at);
      count.set(placed.species, (count.get(placed.species) ?? 0) + 1);
      t = placed.at + rng.range(stage.gap);
    }
  }
  return crossings;
}

export type PlayResult = { registered: number; registeredFirstTime: number; wrong: number; escaped: number; order: number[] };

export function playPlan(plan: Pick<FrogPlan, "species" | "crossings">, player: Player): PlayResult {
  const windows = plan.crossings.map((c) => visibleWindow(c, 0.02));
  const catalog = new Set<number>();
  const order: number[] = [];
  const tapped = new Set<number>();
  let registeredFirstTime = 0;
  let free = 0;
  const end = Math.max(...windows.map((w) => w[1])) + 0.1;
  for (let t = 0; t <= end; t += 0.02) {
    if (t < free) continue;
    const ready = plan.crossings
      .filter((c, i) => !tapped.has(c.id) && t >= windows[i][0] + player.reaction && t <= windows[i][1] && !catalog.has(c.species))
      .sort((a, b) => windows[a.id][1] - windows[b.id][1]);
    const target = ready[0];
    if (!target) continue;
    tapped.add(target.id);
    catalog.add(target.species);
    order.push(target.species);
    if (target.first) registeredFirstTime += 1;
    free = t + player.between;
  }
  const escaped = plan.crossings.filter((c) => c.first && !tapped.has(c.id)).length;
  return { registered: catalog.size, registeredFirstTime, wrong: 0, escaped, order };
}

export type PlanReport = {
  duration: number;
  appearances: number[];
  maxOut: number;
  overlapsSameSpecies: number;
  firstAlone: number;
  attentive: PlayResult;
  reference: PlayResult;
  slow: PlayResult;
};

export function planEnd(crossings: Crossing[]) {
  return Math.max(...crossings.map((c) => c.at + crossingLength(c)));
}

export function assessPlan(plan: Pick<FrogPlan, "species" | "crossings">): PlanReport {
  const { crossings, species } = plan;
  const appearances = species.map((s) => crossings.filter((c) => c.species === s.id).length);
  let maxOut = 0;
  for (let t = 0; t < planEnd(crossings); t += 0.05) {
    const visible = crossings.filter((c) => onScreen(motionAt(c, t).u)).length;
    maxOut = Math.max(maxOut, visible);
  }
  let overlapsSameSpecies = 0;
  for (const a of crossings) {
    for (const b of crossings) {
      if (a.id < b.id && a.species === b.species && b.at < a.at + crossingLength(a)) overlapsSameSpecies += 1;
    }
  }
  const firstAlone = crossings.length > 1 ? crossings[1].at - crossings[0].at : Infinity;
  return {
    duration: planEnd(crossings),
    appearances,
    maxOut,
    overlapsSameSpecies,
    firstAlone,
    attentive: playPlan(plan, ATTENTIVE_PLAYER),
    reference: playPlan(plan, REFERENCE_PLAYER),
    slow: playPlan(plan, SLOW_PLAYER),
  };
}

export function acceptable(report: PlanReport) {
  return (
    report.duration >= ACCEPT.duration[0] &&
    report.duration <= ACCEPT.duration[1] &&
    report.appearances.every((n) => n >= 2) &&
    report.overlapsSameSpecies === 0 &&
    report.firstAlone >= 2.3 &&
    report.maxOut <= 3 &&
    report.attentive.registeredFirstTime === SPECIES_COUNT &&
    report.reference.registered === SPECIES_COUNT &&
    report.reference.registeredFirstTime >= SPECIES_COUNT - 1 &&
    report.slow.registered >= SPECIES_COUNT - 1
  );
}

export function generatePlan(seed: number): FrogPlan {
  const rng = createRandom(seed);
  let fallback: FrogPlan | null = null;
  for (let attempts = 1; attempts <= 80; attempts++) {
    const species = chooseSpecies(rng);
    if (!species) continue;
    const crossings = buildCrossings(rng, species);
    if (!crossings) continue;
    const plan = { seed, species, crossings };
    if (acceptable(assessPlan(plan))) return { ...plan, accepted: true, attempts };
    fallback ??= { ...plan, accepted: false, attempts };
  }
  if (fallback) return fallback;
  return generatePlan(seed + 1);
}

export function describe(look: Look) {
  const noun = look.build === "tree" ? "perereca" : look.build === "toad" ? "sapo" : "rã";
  const feminine = look.build !== "toad";
  const skin = look.skin === "orange" ? "laranja" : look.skin === "blue" ? "azul" : feminine ? "preta" : "preto";
  const mark = look.mark === "plain" ? (feminine ? "lisa" : "liso") : look.mark === "spots" ? "com pintas" : look.mark === "bands" ? "com listras" : "com uma faixa";
  return `${noun} ${skin} ${mark}`;
}
