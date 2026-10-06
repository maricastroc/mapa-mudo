export type Noise = (x: number, y: number) => number;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createNoise(seed: number): Noise {
  const random = mulberry32(seed);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];

  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0:
        return x + y;
      case 1:
        return -x + y;
      case 2:
        return x - y;
      case 3:
        return -x - y;
      case 4:
        return 1.4142 * x;
      case 5:
        return -1.4142 * x;
      case 6:
        return 1.4142 * y;
      default:
        return -1.4142 * y;
    }
  };

  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 0.75;
  };
}

const OFFSETS = Array.from({ length: 24 }, (_, k) => [
  (k * 37.17) % 101.3,
  (k * 59.71) % 97.9,
]);

export function fbm(noise: Noise, x: number, y: number, octaves: number, gain: number) {
  let sum = 0;
  let amplitude = 1;
  let fx = x;
  let fy = y;
  const n = Math.min(OFFSETS.length, Math.ceil(octaves));
  for (let k = 0; k < n; k++) {
    const weight = k < n - 1 ? 1 : octaves - (n - 1);
    sum += amplitude * weight * noise(fx + OFFSETS[k][0], fy + OFFSETS[k][1]);
    const nx = fx * 1.6 - fy * 1.2;
    const ny = fx * 1.2 + fy * 1.6;
    fx = nx;
    fy = ny;
    amplitude *= gain;
  }
  return sum;
}
