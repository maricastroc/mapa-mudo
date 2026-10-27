const WIDTHS: Record<string, number> = {
  A: 670, B: 681, C: 679, D: 693, E: 619, F: 595, G: 703, H: 715, I: 273, J: 596, K: 659, L: 579, M: 814, N: 709, O: 715, P: 643, Q: 719,
  R: 669, S: 646, T: 597, U: 711, V: 655, W: 866, X: 631, Y: 642, Z: 597,
  a: 575, b: 595, c: 552, d: 595, e: 569, f: 372, g: 597, h: 593, i: 279, j: 289, k: 540, l: 287, m: 844, n: 591, o: 586, p: 595, q: 595,
  r: 374, s: 539, t: 401, u: 589, v: 512, w: 740, x: 518, y: 589, z: 491,
  " ": 279, ".": 233, "-": 396, "'": 203,
};
const FALLBACK = 640;
const PARTICLES = new Set(["da", "das", "de", "do", "dos", "e", "di", "du", "del", "van", "von"]);

export type NameFit = { lines: string[]; size: number };
export type NameBox = { w: number; one: [number, number]; two: [number, number]; track: number };

export function textWidth(text: string, size: number, track: number) {
  let units = 0;
  const chars = [...text];
  for (const ch of chars) units += WIDTHS[ch] ?? WIDTHS[ch.normalize("NFD")[0]] ?? FALLBACK;
  return (units / 1000) * size + track * size * chars.length;
}

function capitalize(word: string) {
  return word
    .split("-")
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1).toLocaleLowerCase("pt-BR"))
    .join("-");
}

export function tidyName(raw: string) {
  const words = raw.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return words.map((word, i) => (i > 0 && PARTICLES.has(word.toLocaleLowerCase("pt-BR")) ? word.toLocaleLowerCase("pt-BR") : capitalize(word))).join(" ");
}

export function initialsOf(name: string) {
  return tidyName(name)
    .split(" ")
    .filter((word) => !PARTICLES.has(word))
    .map((word) => word.charAt(0))
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

export function slugOf(name: string) {
  return tidyName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortened(words: string[]) {
  if (words.length <= 2) return [];
  const first = words[0];
  const last = words[words.length - 1];
  const middle = words.slice(1, -1);
  const short = (w: string) => (PARTICLES.has(w) ? w : `${w.charAt(0)}.`);
  const keepSecond = middle.length > 1 && !PARTICLES.has(middle[0]) ? [[first, middle[0], ...middle.slice(1).map(short), last]] : [];
  const bare = middle.filter((w) => !PARTICLES.has(w)).map((w) => `${w.charAt(0)}.`);
  return [...keepSecond, [first, ...middle.map(short), last], [first, ...bare, last], [first, last]];
}

function bestSplit(words: string[], box: NameBox) {
  let best: (NameFit & { score: number }) | null = null;
  for (let k = 1; k < words.length; k++) {
    if (PARTICLES.has(words[k - 1])) continue;
    const lines = [words.slice(0, k).join(" "), words.slice(k).join(" ")];
    const [top, bottom] = lines.map((line) => textWidth(line, 1, box.track));
    const size = Math.min(box.two[1], box.w / Math.max(top, bottom));
    const score = size * (1 - 0.15 * Math.max(0, (bottom - top) / Math.max(top, bottom)));
    if (!best || score > best.score) best = { lines, size, score };
  }
  return best && { lines: best.lines, size: best.size };
}

export function fitName(raw: string, box: NameBox): NameFit {
  const words = tidyName(raw).split(" ").filter(Boolean);
  if (!words.length) return { lines: [], size: box.one[1] };
  const variants = [words, ...shortened(words)];
  for (const variant of variants) {
    const text = variant.join(" ");
    const one = Math.min(box.one[1], box.w / textWidth(text, 1, box.track));
    if (one >= box.one[0]) return { lines: [text], size: one };
    const two = bestSplit(variant, box);
    if (two && two.size >= box.two[0]) return two;
  }
  const last = variants[variants.length - 1];
  const two = bestSplit(last, box);
  if (two) return two;
  const text = last.join(" ");
  return { lines: [text], size: box.w / textWidth(text, 1, box.track) };
}
