import assert from "node:assert/strict";
import test from "node:test";
import { qrMatrix, qrPath } from "./qr.ts";

function finderAt(m: boolean[][], x: number, y: number) {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      if (m[y + dy][x + dx] !== (d !== 2)) return false;
    }
  }
  return true;
}

test("picks the smallest version that fits and draws the three finder patterns", () => {
  const short = qrMatrix("HELLO", "L");
  assert.equal(short.length, 21);
  const url = qrMatrix(`https://mapa.marianacastro.dev/verify#${"a".repeat(60)}`);
  assert.equal(url.length, 41);
  for (const m of [short, url]) {
    const end = m.length - 7;
    assert.ok(finderAt(m, 0, 0) && finderAt(m, end, 0) && finderAt(m, 0, end));
    assert.equal(m[m.length - 8][8], true);
  }
});

test("draws dark modules as horizontal runs", () => {
  const d = qrPath([[true, true, false, true]], 0, 0, 2);
  assert.equal(d, "M0 0h4v2.04h-4zM6 0h2v2.04h-2z");
});
