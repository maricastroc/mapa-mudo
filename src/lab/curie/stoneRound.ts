import { endOf, RISE, SINK, type Pop, type StonePlan } from "./stonePlan.ts";

export type StoneState = "waiting" | "up" | "found" | "wrong" | "missed" | "gone";

export type RoundStone = {
  plan: Pop;
  state: StoneState;
  height: number;
  resolvedAt: number;
};

export type StoneEvent = { type: "appear" | "found" | "wrong" | "missed" | "empty"; stone: RoundStone | null; slot: number };

export const TAPPABLE_HEIGHT = 0.35;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function heightAt(pop: Pop, t: number) {
  if (t < pop.at || t >= endOf(pop)) return 0;
  const rising = clamp01((t - pop.at) / RISE);
  const sinking = clamp01((endOf(pop) - t) / SINK);
  const ease = (k: number) => 1 - Math.pow(1 - k, 3);
  return Math.min(ease(rising), ease(sinking));
}

export class StoneRound {
  readonly plan: StonePlan;
  time = 0;
  stones: RoundStone[];
  found = 0;
  wrong = 0;
  missed = 0;
  streak = 0;
  bestStreak = 0;

  constructor(plan: StonePlan) {
    this.plan = plan;
    this.stones = plan.pops.map((p) => ({ plan: p, state: "waiting", height: 0, resolvedAt: 0 }));
  }

  get actives() {
    return this.stones.filter((s) => s.plan.kind === "active");
  }

  get finished() {
    return this.stones.every((s) => s.state !== "waiting" && s.state !== "up");
  }

  get lastResolvedAt() {
    return Math.max(0, ...this.stones.map((s) => s.resolvedAt));
  }

  stoneIn(slot: number) {
    return this.stones.find((s) => s.state === "up" && s.plan.slot === slot) ?? null;
  }

  step(dt: number): StoneEvent[] {
    const events: StoneEvent[] = [];
    this.time += dt;
    for (const stone of this.stones) {
      if (stone.state === "waiting" && this.time >= stone.plan.at) {
        stone.state = "up";
        events.push({ type: "appear", stone, slot: stone.plan.slot });
      }
      if (stone.state === "up") {
        stone.height = heightAt(stone.plan, this.time);
        if (this.time >= endOf(stone.plan)) {
          stone.height = 0;
          stone.resolvedAt = this.time;
          if (stone.plan.kind === "active") {
            stone.state = "missed";
            this.missed += 1;
            this.streak = 0;
            events.push({ type: "missed", stone, slot: stone.plan.slot });
          } else {
            stone.state = "gone";
          }
        }
      }
    }
    return events;
  }

  tap(slot: number): StoneEvent {
    const stone = this.stoneIn(slot);
    if (!stone || stone.height < TAPPABLE_HEIGHT) return { type: "empty", stone: null, slot };
    stone.resolvedAt = this.time;
    if (stone.plan.kind === "active") {
      stone.state = "found";
      this.found += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      return { type: "found", stone, slot };
    }
    stone.state = "wrong";
    this.wrong += 1;
    this.streak = 0;
    return { type: "wrong", stone, slot };
  }
}
