let cached: string | null = null;

export function grainTexture() {
  if (cached) return cached;
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let i = 0; i < size * size; i++) {
    const n = Math.random();
    const fleck = Math.random() < 0.0016;
    const o = i * 4;
    if (fleck) {
      const blue = Math.random() < 0.55;
      data[o] = blue ? 16 : 238;
      data[o + 1] = blue ? 1 : 112;
      data[o + 2] = blue ? 227 : 76;
      data[o + 3] = 120 + Math.random() * 90;
    } else {
      data[o] = 41;
      data[o + 1] = 41;
      data[o + 2] = 41;
      data[o + 3] = n < 0.5 ? 0 : (n - 0.5) * 34;
    }
  }
  ctx.putImageData(image, 0, 0);
  cached = canvas.toDataURL("image/png");
  return cached;
}
