import { SHIP_DECK_Y, SHIP_LENGTH } from "./sprites.ts";

export const HORIZON_Y = 0.62;
export const WATER_Y = 0.76;
export const SPAWN_Y = -0.14;
export const DROP = WATER_Y - SPAWN_Y;

export const SHIP_MAX_SPEED = 1.6;
const SPRING = 140;
const DAMPING = 2 * Math.sqrt(SPRING) * 0.92;

export type RescueGeometry = {
  W: number;
  H: number;
  shipLength: number;
  shipScale: number;
  catchHalf: number;
  hitHalf: number;
  minX: number;
  maxX: number;
  span: number;
  waterY: number;
  deckY: number;
  driftUnit: number;
  maxSpeed: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function rescueGeometry(width: number, height: number): RescueGeometry {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const shipLength = clamp(W * 0.23, 150, Math.min(H * 0.55, W * 0.36));
  const shipScale = shipLength / SHIP_LENGTH;
  const minX = shipLength / 2;
  const maxX = Math.max(minX + 1, W - shipLength / 2);
  return {
    W,
    H,
    shipLength,
    shipScale,
    catchHalf: shipLength * 0.37,
    hitHalf: shipLength * 0.44,
    minX,
    maxX,
    span: maxX - minX,
    waterY: H * WATER_Y,
    deckY: H * WATER_Y + SHIP_DECK_Y * shipScale,
    driftUnit: Math.min(H, W * 0.7),
    maxSpeed: SHIP_MAX_SPEED * W,
  };
}

export function laneToX(lane: number, geometry: RescueGeometry) {
  return geometry.minX + clamp(lane, 0, 1) * geometry.span;
}

export function xToLane(x: number, geometry: RescueGeometry) {
  return clamp((x - geometry.minX) / geometry.span, 0, 1);
}

export type ShipState = { x: number; v: number };

export function stepShip(ship: ShipState, target: number, dt: number, geometry: RescueGeometry): ShipState {
  const goal = clamp(target, geometry.minX, geometry.maxX);
  let { x, v } = ship;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    v += ((goal - x) * SPRING - v * DAMPING) * h;
    v = clamp(v, -geometry.maxSpeed, geometry.maxSpeed);
    x += v * h;
  }
  return { x, v };
}
