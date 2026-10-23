import { exitTime, motionAt, type Motion } from "./frogMotion.ts";
import { CHANCES, SPECIES_COUNT, type Crossing, type FrogPlan } from "./frogPlan.ts";

export type FrogStatus = "waiting" | "out" | "registered" | "fled" | "escaped" | "passed" | "skipped";
export type EndReason = "done" | "complete" | "chances";

export type RoundFrog = {
  plan: Crossing;
  status: FrogStatus;
  startledAt: number | null;
  resolvedAt: number;
};

export type FrogEvent =
  | { type: "appear"; frog: RoundFrog }
  | { type: "registered"; frog: RoundFrog; complete: boolean }
  | { type: "already"; frog: RoundFrog }
  | { type: "escaped"; frog: RoundFrog }
  | { type: "passed"; frog: RoundFrog }
  | { type: "end"; reason: EndReason };

export class FrogRound {
  readonly plan: FrogPlan;
  time = 0;
  frogs: RoundFrog[];
  catalog = new Set<number>();
  order: number[] = [];
  sightings: number[];
  chances = CHANCES;
  wrong = 0;
  escaped = 0;
  passed = 0;
  streak = 0;
  bestStreak = 0;
  ended: EndReason | null = null;
  endedAt = 0;

  constructor(plan: FrogPlan) {
    this.plan = plan;
    this.frogs = plan.crossings.map((c) => ({ plan: c, status: "waiting", startledAt: null, resolvedAt: 0 }));
    this.sightings = plan.species.map(() => 0);
  }

  get registered() {
    return this.catalog.size;
  }

  get complete() {
    return this.catalog.size >= SPECIES_COUNT;
  }

  get settled() {
    return this.ended !== null && this.frogs.every((f) => f.status !== "out" && f.status !== "fled" && f.status !== "waiting");
  }

  isNew(species: number) {
    return !this.catalog.has(species);
  }

  motion(frog: RoundFrog, t = this.time): Motion {
    return motionAt(frog.plan, t, frog.startledAt);
  }

  tappable(frog: RoundFrog) {
    if (this.ended || frog.status !== "out") return false;
    const { u } = this.motion(frog);
    return u > 0.01 && u < 0.99;
  }

  step(dt: number): FrogEvent[] {
    const events: FrogEvent[] = [];
    this.time += dt;
    for (const frog of this.frogs) {
      if (frog.status === "waiting" && !this.ended && this.time >= frog.plan.at) {
        frog.status = "out";
        events.push({ type: "appear", frog });
      }
      if ((frog.status === "out" || frog.status === "fled") && this.time >= exitTime(frog.plan, frog.startledAt)) {
        frog.resolvedAt = this.time;
        if (frog.status === "fled") {
          frog.status = "skipped";
          continue;
        }
        if (this.catalog.has(frog.plan.species)) {
          frog.status = "passed";
          this.passed += 1;
          this.sightings[frog.plan.species] += 1;
          events.push({ type: "passed", frog });
        } else {
          frog.status = "escaped";
          this.escaped += 1;
          this.streak = 0;
          events.push({ type: "escaped", frog });
        }
      }
    }
    if (!this.ended && this.frogs.every((f) => f.status !== "waiting" && f.status !== "out" && f.status !== "fled")) {
      events.push(this.finish("done"));
    }
    return events;
  }

  tap(index: number): FrogEvent | null {
    const frog = this.frogs[index];
    if (!frog || !this.tappable(frog)) return null;
    frog.resolvedAt = this.time;
    if (this.isNew(frog.plan.species)) {
      frog.status = "registered";
      this.catalog.add(frog.plan.species);
      this.order.push(frog.plan.species);
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const complete = this.complete;
      if (complete) this.finish("complete");
      return { type: "registered", frog, complete };
    }
    frog.status = "fled";
    frog.startledAt = this.time;
    this.wrong += 1;
    this.chances = Math.max(0, this.chances - 1);
    this.streak = 0;
    if (this.chances === 0) this.finish("chances");
    return { type: "already", frog };
  }

  private finish(reason: EndReason): FrogEvent {
    this.ended = reason;
    this.endedAt = this.time;
    for (const frog of this.frogs) {
      if (frog.status === "waiting") frog.status = "skipped";
      if (frog.status === "out") {
        frog.status = "fled";
        frog.startledAt = this.time;
      }
    }
    return { type: "end", reason };
  }
}
