import { simulateFall, type FallPath, type FallSpec } from "./fall.ts";

export const SPAWN_Y = -0.14;
export const WATER_Y = 0.72;
export const DROP = WATER_Y - SPAWN_Y;

export type DropKind = "capsule" | "debris";

export type DropPlan = {
  id: number;
  kind: DropKind;
  spawn: number;
  landFraction: number;
  spec: FallSpec;
  path: FallPath;
  landAt: number;
};

type ScriptEntry = { kind: DropKind; spawn: number; land: number; spec: FallSpec };

const capsule = (spawn: number, land: number, spec: FallSpec): ScriptEntry => ({ kind: "capsule", spawn, land, spec });
const debris = (spawn: number, land: number, terminal: number, vx0 = 0): ScriptEntry => ({
  kind: "debris",
  spawn,
  land,
  spec: { vx0, wind: 0, openAt: 0, terminal },
});

const SCRIPT: ScriptEntry[] = [
  capsule(0.6, 0.64, { vx0: 0, wind: 0, openAt: 0.3, terminal: 0.16 }),
  capsule(5.4, 0.3, { vx0: -0.1, wind: -0.012, openAt: 0.32, terminal: 0.175 }),
  capsule(10.0, 0.78, { vx0: 0.2, wind: 0.018, openAt: 0.34, terminal: 0.19 }),
  debris(10.2, 0.52, 0.36),
  capsule(13.6, 0.46, { vx0: -0.22, wind: -0.02, openAt: 0.36, terminal: 0.21 }),
  debris(15.8, 0.46, 0.4, 0.04),
  capsule(16.9, 0.18, { vx0: 0.12, wind: -0.028, openAt: 0.38, terminal: 0.23 }),
  debris(18.6, 0.66, 0.42, -0.05),
  capsule(19.6, 0.66, { vx0: -0.16, wind: 0.03, openAt: 0.4, terminal: 0.25 }),
  capsule(21.3, 0.36, { vx0: 0.26, wind: -0.02, openAt: 0.4, terminal: 0.265 }),
  debris(22.2, 0.82, 0.44, 0.06),
  capsule(23.1, 0.82, { vx0: -0.1, wind: 0.035, openAt: 0.42, terminal: 0.28 }),
  debris(24.6, 0.62, 0.46, -0.04),
  capsule(24.9, 0.42, { vx0: 0.18, wind: -0.03, openAt: 0.42, terminal: 0.29 }),
  debris(25.8, 0.7, 0.5, 0.05),
  capsule(26.8, 0.7, { vx0: -0.24, wind: 0.02, openAt: 0.44, terminal: 0.3 }),
];

export const CAPSULE_COUNT = SCRIPT.filter((s) => s.kind === "capsule").length;
export const DEBRIS_COUNT = SCRIPT.length - CAPSULE_COUNT;

export function buildPlan(): DropPlan[] {
  return SCRIPT.map(({ kind, spawn, land, spec }, id) => {
    const path = simulateFall(spec, DROP);
    return { id, kind, spawn, landFraction: land, spec, path, landAt: spawn + path.duration };
  });
}

export function airborneAt(plan: DropPlan[], time: number, kind?: DropKind) {
  return plan.filter((d) => (!kind || d.kind === kind) && d.spawn <= time && d.landAt > time).length;
}
