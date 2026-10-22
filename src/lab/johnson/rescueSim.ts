import { createRandom } from "../random.ts";
import { laneToX, type RescueGeometry } from "./rescueGeometry.ts";
import { CAPSULE_COUNT, generatePlan, type RescuePlan } from "./rescuePlan.ts";
import { RescueRound } from "./rescueRound.ts";

export type PlayerProfile = { reaction: number; speed: number };

export const ATTENTIVE: PlayerProfile = { reaction: 0.4, speed: 0.8 };
export const REFERENCE: PlayerProfile = { reaction: 0.95, speed: 0.3 };
export const REFERENCE_BAND = [7, 9] as const;

const MAX_ROUNDS = 16;

export function playRound(plan: RescuePlan, geometry: RescueGeometry, player: PlayerProfile, dt = 1 / 60) {
  const round = new RescueRound(plan, geometry);
  let finger = geometry.W / 2;
  while (!round.finished && round.time < 60) {
    const next = round.drops
      .filter((d) => d.plan.kind === "capsule" && d.state === "falling" && round.time >= d.plan.spawn + player.reaction)
      .sort((a, b) => a.plan.landAt - b.plan.landAt)[0];
    if (next) {
      const goal = laneToX(next.lane, geometry);
      const step = player.speed * geometry.W * dt;
      finger += Math.max(-step, Math.min(step, goal - finger));
    }
    round.setTarget(finger);
    round.step(dt);
  }
  return { rescued: round.rescued, hits: round.hits, missed: round.missed, score: round.rescued - round.hits };
}

export type ServedPlan = RescuePlan & { referenceScore: number; verified: boolean; rounds: number };

export function serveRound(seed: number, geometry: RescueGeometry): ServedPlan {
  const rng = createRandom(seed);
  const target = (REFERENCE_BAND[0] + REFERENCE_BAND[1]) / 2;
  let fallback: { plan: RescuePlan; score: number; distance: number } | null = null;
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const plan = generatePlan(Math.floor(rng.next() * 4294967296), geometry);
    const attentive = playRound(plan, geometry, ATTENTIVE);
    if (attentive.rescued < CAPSULE_COUNT || attentive.hits > 0) continue;
    const reference = playRound(plan, geometry, REFERENCE).score;
    if (plan.accepted && reference >= REFERENCE_BAND[0] && reference <= REFERENCE_BAND[1]) {
      return { ...plan, seed, referenceScore: reference, verified: true, rounds: round };
    }
    const distance = Math.abs(reference - target) + (plan.accepted ? 0 : 1);
    if (!fallback || distance < fallback.distance) fallback = { plan, score: reference, distance };
  }
  if (fallback) return { ...fallback.plan, seed, referenceScore: fallback.score, verified: false, rounds: MAX_ROUNDS };
  const plan = generatePlan(seed, geometry);
  return { ...plan, referenceScore: playRound(plan, geometry, REFERENCE).score, verified: false, rounds: MAX_ROUNDS };
}
