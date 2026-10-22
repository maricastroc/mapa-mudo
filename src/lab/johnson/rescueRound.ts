import { sampleFall } from "./fall.ts";
import { laneToX, SPAWN_Y, stepShip, xToLane, type RescueGeometry, type ShipState } from "./rescueGeometry.ts";
import { planScale, reachableLane, type DropPlan, type RescuePlan } from "./rescuePlan.ts";

export type DropState = "waiting" | "falling" | "rescued" | "missed" | "hit" | "dodged";

export type RoundDrop = {
  plan: DropPlan;
  lane: number;
  state: DropState;
  local: number;
  chute: number;
  x: number;
  y: number;
  resolvedAt: number;
  slot: number;
  cue: boolean;
};

export type RoundEvent = { type: "spawn" | "chute" | "rescue" | "miss" | "hit" | "dodge"; drop: RoundDrop; x: number; y: number };

const KNOCKBACK = 0.9;

export class RescueRound {
  time = 0;
  ship: ShipState;
  target: number;
  drops: RoundDrop[];
  rescued = 0;
  hits = 0;
  missed = 0;
  streak = 0;
  bestStreak = 0;

  readonly plan: RescuePlan;
  private geometry: RescueGeometry;

  constructor(plan: RescuePlan, geometry: RescueGeometry) {
    this.plan = plan;
    this.geometry = geometry;
    this.ship = { x: geometry.W / 2, v: 0 };
    this.target = geometry.W / 2;
    this.drops = plan.drops.map((d) => ({ plan: d, lane: d.lane, state: "waiting", local: 0, chute: 0, x: 0, y: 0, resolvedAt: 0, slot: -1, cue: false }));
  }

  resize(geometry: RescueGeometry) {
    const shipLane = xToLane(this.ship.x, this.geometry);
    const targetLane = xToLane(this.target, this.geometry);
    this.geometry = geometry;
    this.ship = { x: laneToX(shipLane, geometry), v: 0 };
    this.target = laneToX(targetLane, geometry);
  }

  setTarget(x: number) {
    this.target = Math.max(this.geometry.minX, Math.min(this.geometry.maxX, x));
  }

  landingX(drop: RoundDrop) {
    return laneToX(drop.lane, this.geometry);
  }

  get finished() {
    return this.drops.every((d) => d.state !== "waiting" && d.state !== "falling");
  }

  get lastResolvedAt() {
    return Math.max(0, ...this.drops.map((d) => d.resolvedAt));
  }

  private spawnLane(drop: RoundDrop) {
    const scale = planScale(this.geometry);
    const pending = this.drops
      .filter((d) => d !== drop && d.plan.kind === "capsule" && (d.state === "falling" || d.state === "waiting") && d.plan.landAt < drop.plan.landAt)
      .sort((a, b) => b.plan.landAt - a.plan.landAt)[0];
    const from = pending ? pending.lane : xToLane(this.ship.x, this.geometry);
    const fromTime = pending ? pending.plan.landAt : this.time;
    const debris = this.drops.filter((d) => d.plan.kind === "debris").map((d) => ({ lane: d.lane, landAt: d.plan.landAt }));
    return reachableLane(drop.plan.lane, from, fromTime, drop.plan.landAt, scale, debris);
  }

  private position(drop: RoundDrop) {
    const s = sampleFall(drop.plan.path, drop.local);
    drop.chute = s.chute;
    drop.x = this.landingX(drop) + (s.x - drop.plan.path.landingX) * this.geometry.driftUnit;
    drop.y = (SPAWN_Y + s.y) * this.geometry.H;
  }

  step(dt: number): RoundEvent[] {
    const events: RoundEvent[] = [];
    this.time += dt;
    this.ship = stepShip(this.ship, this.target, dt, this.geometry);
    const { catchHalf, hitHalf, deckY } = this.geometry;
    for (const drop of this.drops) {
      if (drop.state === "waiting" && this.time >= drop.plan.spawn) {
        if (drop.plan.kind === "capsule") drop.lane = this.spawnLane(drop);
        drop.state = "falling";
        events.push({ type: "spawn", drop, x: this.landingX(drop), y: this.geometry.waterY });
      }
      if (drop.state !== "falling") continue;
      drop.local = this.time - drop.plan.spawn;
      this.position(drop);
      const onDeck = drop.y >= deckY - 2;
      const offset = Math.abs(drop.x - this.ship.x);
      const ended = drop.local >= drop.plan.path.duration;
      const resolve = (state: DropState, type: RoundEvent["type"]) => {
        drop.state = state;
        drop.resolvedAt = this.time;
        events.push({ type, drop, x: drop.x, y: drop.y });
      };
      if (drop.plan.kind === "capsule") {
        if (!drop.cue && drop.chute > 0.05) {
          drop.cue = true;
          events.push({ type: "chute", drop, x: drop.x, y: drop.y });
        }
        if (onDeck && offset <= catchHalf) {
          drop.slot = this.rescued;
          this.rescued += 1;
          this.streak += 1;
          this.bestStreak = Math.max(this.bestStreak, this.streak);
          resolve("rescued", "rescue");
        } else if (ended) {
          this.missed += 1;
          this.streak = 0;
          resolve("missed", "miss");
        }
      } else if (onDeck && offset <= hitHalf) {
        this.hits += 1;
        this.streak = 0;
        this.ship = { x: this.ship.x, v: this.ship.v + Math.sign(this.ship.x - drop.x || 1) * this.geometry.W * KNOCKBACK };
        resolve("hit", "hit");
      } else if (ended) {
        resolve("dodged", "dodge");
      }
    }
    return events;
  }
}
