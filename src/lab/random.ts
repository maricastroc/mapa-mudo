export type Random = {
  seed: number;
  next: () => number;
  range: (bounds: readonly [number, number]) => number;
  chance: (probability: number) => boolean;
  sign: () => 1 | -1;
  weighted: <T>(options: readonly { value: T; weight: number }[]) => T;
};

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed: seed >>> 0,
    next,
    range: ([lo, hi]) => lo + (hi - lo) * next(),
    chance: (probability) => next() < probability,
    sign: () => (next() < 0.5 ? -1 : 1),
    weighted: (options) => {
      const total = options.reduce((sum, o) => sum + Math.max(0, o.weight), 0);
      if (total <= 0) return options[0].value;
      let roll = next() * total;
      for (const option of options) {
        roll -= Math.max(0, option.weight);
        if (roll <= 0) return option.value;
      }
      return options[options.length - 1].value;
    },
  };
}

export function freshSeed() {
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0];
  } catch {
    return Math.floor(Math.random() * 4294967296);
  }
}
