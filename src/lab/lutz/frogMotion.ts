export type Hopper = { at: number; duration: number; hops: number; rest: number };

export type Motion = {
  u: number;
  lift: number;
  air: boolean;
  stretch: number;
  squash: number;
  tilt: number;
  hop: number;
  settle: number;
};

export const VISIBLE: readonly [number, number] = [0.06, 0.94];
export const STARTLE_SPEED = 2.6;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function period(c: Hopper) {
  return c.duration / c.hops;
}

export function airTime(c: Hopper) {
  return period(c) * (1 - c.rest);
}

export function localTime(c: Hopper, t: number, startledAt: number | null = null) {
  if (startledAt === null || t <= startledAt) return t - c.at;
  return startledAt - c.at + (t - startledAt) * STARTLE_SPEED;
}

export function crossingLength(c: Hopper) {
  return (c.hops - 1) * period(c) + airTime(c);
}

export function exitTime(c: Hopper, startledAt: number | null = null) {
  const length = crossingLength(c);
  if (startledAt === null || startledAt - c.at >= length) return c.at + length;
  const done = startledAt - c.at;
  return startledAt + (length - done) / STARTLE_SPEED;
}

export function motionAt(c: Hopper, t: number, startledAt: number | null = null): Motion {
  const local = localTime(c, t, startledAt);
  const still: Motion = { u: 0, lift: 0, air: false, stretch: 0, squash: 0, tilt: 0, hop: 0, settle: 0 };
  if (local <= 0) return still;
  const P = period(c);
  const air = airTime(c);
  if (local >= crossingLength(c)) return { ...still, u: 1, hop: c.hops };
  const hop = Math.floor(local / P);
  const k = local - hop * P;
  if (k < air) {
    const kk = k / air;
    const stretch = kk < 0.18 ? kk / 0.18 : kk < 0.55 ? 1 : 1 - clamp01((kk - 0.55) / 0.38);
    return {
      u: (hop + kk) / c.hops,
      lift: 4 * kk * (1 - kk),
      air: true,
      stretch,
      squash: -0.28 * Math.sin(Math.PI * kk),
      tilt: -0.5 * (1 - 2 * kk),
      hop,
      settle: 0,
    };
  }
  const sk = (k - air) / (P - air);
  const land = sk < 0.28 ? 0.55 * (1 - sk / 0.28) : 0;
  const crouch = sk > 0.68 ? 0.42 * ((sk - 0.68) / 0.32) : 0;
  return { u: (hop + 1) / c.hops, lift: 0, air: false, stretch: 0, squash: land + crouch, tilt: 0, hop, settle: sk };
}

export function onScreen(u: number) {
  return u >= VISIBLE[0] && u <= VISIBLE[1];
}

export function visibleWindow(c: Hopper, step = 0.01): [number, number] {
  let from = Infinity;
  let to = -Infinity;
  const end = c.at + crossingLength(c);
  for (let t = c.at; t <= end + step; t += step) {
    if (onScreen(motionAt(c, t).u)) {
      from = Math.min(from, t);
      to = Math.max(to, t);
    }
  }
  return [from, to];
}
