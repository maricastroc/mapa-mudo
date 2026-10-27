import assert from "node:assert/strict";
import test from "node:test";
import { exportSize, fileNameFor, formatDate, halftone, PAGE, serialLabel, titleFor, type CertificateData } from "./certificate.ts";

const DATA: CertificateData = {
  bench: "johnson",
  name: "Maria Eduarda Silva",
  position: 1,
  score: { value: 9, of: 10, unit: "resgates" },
  stats: [],
  achievedAt: new Date(2026, 9, 26, 15, 42).toISOString(),
  serial: 42,
};

test("titles follow the ranking position", () => {
  assert.equal(titleFor(1), "Recordista do dia");
  assert.equal(titleFor(3), "No pódio do dia");
  assert.equal(titleFor(7), "Entre os 10 do dia");
});

test("formats the date in short Portuguese months", () => {
  assert.deepEqual(formatDate(DATA.achievedAt), { day: "26", month: "OUT", year: "2026", time: "15:42" });
  assert.equal(serialLabel(42), "Nº 0042");
});

test("exports an A4 landscape image at 300 dpi", () => {
  const size = exportSize();
  assert.equal(size.width, 3508);
  assert.equal(size.height, Math.round((3508 * PAGE.h) / PAGE.w));
  assert.equal(fileNameFor(DATA), "elas-em-jogo-johnson-1-lugar-maria-eduarda-silva.png");
});

test("halftone dots stay inside their box and are deterministic", () => {
  const box = { x: 10, y: 10, w: 60, h: 40 };
  const a = halftone(box, 5, 15, () => 0.5);
  assert.equal(a, halftone(box, 5, 15, () => 0.5));
  const xs = [...a.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(xs.length > 20);
  assert.ok(xs.every((x) => x >= box.x - 5 && x <= box.x + box.w));
});
