export const GRAVITY = 1.9;

const FREE_DRAG = 0.25;
const INFLATE_SECONDS = 0.34;
const STEP = 1 / 240;
const SAMPLE_EVERY = 1 / 60;

export type FallSpec = {
  vx0: number;
  wind: number;
  openAt: number;
  terminal: number;
};

export type FallSample = { t: number; x: number; y: number; vy: number; chute: number };

export type FallPath = { samples: FallSample[]; duration: number; landingX: number; drop: number };

export function chuteOpening(t: number, openAt: number) {
  return Math.max(0, Math.min(1, (t - openAt) / INFLATE_SECONDS));
}

export function simulateFall(spec: FallSpec, drop: number): FallPath {
  const chuteDrag = GRAVITY / (spec.terminal * spec.terminal);
  let t = 0;
  let x = 0;
  let y = 0;
  let vx = spec.vx0;
  let vy = 0;
  let nextSample = SAMPLE_EVERY;
  const samples: FallSample[] = [{ t: 0, x: 0, y: 0, vy: 0, chute: 0 }];
  while (t < 30) {
    const c = chuteOpening(t, spec.openAt);
    const drag = FREE_DRAG + (chuteDrag - FREE_DRAG) * c * c;
    const settle = 0.8 + 2.6 * c;
    vy = (vy + GRAVITY * STEP) / (1 + drag * Math.abs(vy) * STEP);
    vx = (vx + spec.wind * settle * STEP) / (1 + settle * STEP);
    const py = y;
    const px = x;
    x += vx * STEP;
    y += vy * STEP;
    t += STEP;
    if (y >= drop) {
      const k = (drop - py) / (y - py);
      const duration = t - STEP + STEP * k;
      const landingX = px + (x - px) * k;
      samples.push({ t: duration, x: landingX, y: drop, vy, chute: chuteOpening(duration, spec.openAt) });
      return { samples, duration, landingX, drop };
    }
    if (t >= nextSample) {
      samples.push({ t, x, y, vy, chute: c });
      nextSample += SAMPLE_EVERY;
    }
  }
  throw new Error("capsule never reached the sea");
}

export function sampleFall(path: FallPath, time: number): FallSample {
  const { samples } = path;
  if (time <= 0) return samples[0];
  const last = samples[samples.length - 1];
  if (time >= last.t) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= time) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const k = (time - a.t) / (b.t - a.t);
  return {
    t: time,
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    vy: a.vy + (b.vy - a.vy) * k,
    chute: a.chute + (b.chute - a.chute) * k,
  };
}

export function timeAtDepth(path: FallPath, depth: number) {
  const { samples } = path;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (b.y >= depth) return a.t + ((depth - a.y) / (b.y - a.y || 1)) * (b.t - a.t);
  }
  return path.duration;
}
