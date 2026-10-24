import { CHANCES, exitTime, progress, SICK_COUNT, type Crossing, type KidPlan } from "./kidPlan.ts";

export type KidStatus = "waiting" | "out" | "cured" | "scared" | "missed" | "passed" | "skipped";
export type EndReason = "done" | "complete" | "chances";

export type RoundKid = {
  plan: Crossing;
  status: KidStatus;
  hurryAt: number | null;
  resolvedAt: number;
  curedAt: number;
  scaredAt: number;
};

export type KidEvent =
  | { type: "appear"; kid: RoundKid }
  | { type: "cured"; kid: RoundKid; complete: boolean }
  | { type: "healthy"; kid: RoundKid }
  | { type: "missed"; kid: RoundKid }
  | { type: "passed"; kid: RoundKid }
  | { type: "end"; reason: EndReason };

export class KidRound {
  readonly plan: KidPlan;
  time = 0;
  kids: RoundKid[];
  chances = CHANCES;
  cured = 0;
  wrong = 0;
  missed = 0;
  passed = 0;
  streak = 0;
  bestStreak = 0;
  ended: EndReason | null = null;
  endedAt = 0;

  constructor(plan: KidPlan) {
    this.plan = plan;
    this.kids = plan.crossings.map((c) => ({ plan: c, status: "waiting", hurryAt: null, resolvedAt: 0, curedAt: 0, scaredAt: 0 }));
  }

  get complete() {
    return this.cured >= SICK_COUNT;
  }

  get settled() {
    return this.ended !== null && this.kids.every((k) => !this.visible(k) && k.status !== "waiting");
  }

  u(kid: RoundKid, t = this.time) {
    return t < kid.plan.at ? 0 : progress(kid.plan, t, kid.hurryAt);
  }

  tappable(kid: RoundKid) {
    if (this.ended || kid.status !== "out") return false;
    const u = this.u(kid);
    return u > 0.01 && u < 0.99;
  }

  visible(kid: RoundKid) {
    return kid.status === "out" || kid.status === "cured" || kid.status === "scared";
  }

  step(dt: number): KidEvent[] {
    const events: KidEvent[] = [];
    this.time += dt;
    for (const kid of this.kids) {
      if (kid.status === "waiting" && !this.ended && this.time >= kid.plan.at) {
        kid.status = "out";
        events.push({ type: "appear", kid });
      }
      if (this.visible(kid) && this.time >= exitTime(kid.plan, kid.hurryAt)) {
        const was = kid.status;
        kid.resolvedAt = this.time;
        if (was === "out") {
          if (kid.plan.sick) {
            kid.status = "missed";
            this.missed += 1;
            this.streak = 0;
            events.push({ type: "missed", kid });
          } else {
            kid.status = "passed";
            this.passed += 1;
            events.push({ type: "passed", kid });
          }
        } else {
          kid.status = "skipped";
        }
      }
    }
    if (!this.ended && this.kids.every((k) => !this.visible(k) && k.status !== "waiting")) {
      events.push(this.finish("done"));
    }
    return events;
  }

  tap(index: number): KidEvent | null {
    const kid = this.kids[index];
    if (!kid || !this.tappable(kid)) return null;
    if (kid.plan.sick) {
      kid.status = "cured";
      kid.curedAt = this.time;
      this.cured += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const complete = this.complete;
      if (complete) this.finish("complete");
      return { type: "cured", kid, complete };
    }
    kid.status = "scared";
    kid.scaredAt = this.time;
    this.wrong += 1;
    this.chances = Math.max(0, this.chances - 1);
    this.streak = 0;
    if (this.chances === 0) this.finish("chances");
    return { type: "healthy", kid };
  }

  private finish(reason: EndReason): KidEvent {
    this.ended = reason;
    this.endedAt = this.time;
    for (const kid of this.kids) {
      if (kid.status === "waiting") kid.status = "skipped";
      if (kid.status === "out" || kid.status === "cured" || kid.status === "scared") kid.hurryAt ??= this.time;
    }
    return { type: "end", reason };
  }
}
