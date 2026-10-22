import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOT_COUNT } from "./stoneLayout.ts";
import {
  ACCEPT,
  ACTIVE_COUNT,
  assessStones,
  endOf,
  generateStones,
  SLOT_REST,
  STAGES,
  tapsPossible,
  type Pop,
} from "./stonePlan.ts";

const seeds = Array.from({ length: 60 }, (_, i) => ((i + 3) * 2654435761) >>> 0);
const plans = seeds.map(generateStones);

test("a seed always rebuilds the same round and different seeds build different rounds", () => {
  assert.deepEqual(generateStones(4242), generateStones(4242));
  const sequences = new Set(plans.map((p) => p.pops.map((s) => `${s.kind[0]}${s.slot}`).join("")));
  assert.equal(sequences.size, plans.length);
});

test("every round is accepted and keeps the same recipe of glowing, plain and crystal stones", () => {
  for (const plan of plans) {
    assert.ok(plan.accepted);
    for (const stage of STAGES) {
      const pops = plan.pops.filter((p) => p.stage === stage.name);
      assert.equal(pops.filter((p) => p.kind === "active").length, stage.actives);
      assert.equal(pops.filter((p) => p.kind === "plain").length, stage.plains);
      assert.equal(pops.filter((p) => p.kind === "crystal").length, stage.crystals);
    }
  }
});

test("the round opens gently: two glowing stones first, crystals only at the end", () => {
  for (const plan of plans) {
    assert.equal(plan.pops[0].kind, "active");
    assert.equal(plan.pops[1].kind, "active");
    const firstCrystal = plan.pops.findIndex((p) => p.kind === "crystal");
    assert.ok(plan.pops[firstCrystal].stage === "finale");
  }
});

test("the glow fades and stones stay up for less time as the round goes on, never too short", () => {
  const byStage = (pops: Pop[], name: string) => pops.filter((p) => p.stage === name);
  for (const plan of plans) {
    const strength = (name: string) => {
      const actives = byStage(plan.pops, name).filter((p) => p.kind === "active");
      return actives.reduce((a, p) => a + p.strength, 0) / actives.length;
    };
    const up = (name: string) => Math.max(...byStage(plan.pops, name).map((p) => p.up));
    assert.ok(strength("warmup") > strength("build") && strength("build") > strength("finale"));
    assert.ok(up("warmup") > up("build") && up("build") > up("finale"));
    for (const p of plan.pops) assert.ok(p.up >= 1.45, `stone up only ${p.up}`);
  }
});

test("a slot never holds two stones at once and stones spread over the table", () => {
  for (const plan of plans) {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const pops = plan.pops.filter((p) => p.slot === slot).sort((a, b) => a.at - b.at);
      for (let i = 1; i < pops.length; i++) assert.ok(pops[i].at >= endOf(pops[i - 1]) + SLOT_REST - 1e-9);
    }
    const a = assessStones(plan.pops);
    assert.ok(a.slotsUsedByActives >= ACCEPT.slotsUsedByActives);
    assert.ok(a.maxVisible <= 3);
    assert.ok(a.duration >= ACCEPT.duration[0] && a.duration <= ACCEPT.duration[1]);
  }
  const usage = new Array(SLOT_COUNT).fill(0);
  for (const plan of plans) for (const p of plan.pops) usage[p.slot] += 1;
  for (const u of usage) assert.ok(u > (plans.length * 29) / SLOT_COUNT / 2, `${usage}`);
});

test("no fast reflexes needed: a calm player can reach every glowing stone, a slow one nearly all", () => {
  for (const plan of plans) {
    assert.equal(tapsPossible(plan.pops, { reaction: 0.85, between: 0.55 }), ACTIVE_COUNT);
    assert.ok(tapsPossible(plan.pops, { reaction: 1.1, between: 0.75 }) >= ACTIVE_COUNT - 2);
  }
});
