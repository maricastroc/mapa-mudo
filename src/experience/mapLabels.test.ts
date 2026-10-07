import { test } from "node:test";
import assert from "node:assert/strict";
import { candidateBox, labelFontSize, labelSize, overlaps, placeLabels, type LabelRequest } from "./mapLabels.ts";

const bounds = { x0: 0, y0: 0, x1: 1440, y1: 900 };

function request(key: string, x: number, y: number, mentions: number, priority = mentions): LabelRequest {
  const size = labelSize(key, mentions, labelFontSize(mentions, 1));
  return { key, x, y, ...size, priority };
}

test("type stays in a narrow band so the relief, not the name, carries the count", () => {
  const smallest = labelFontSize(1, 1);
  const largest = labelFontSize(341, 1);
  assert.ok(largest / smallest < 1.4, `${smallest} → ${largest}`);
  assert.ok(labelFontSize(1, 0.5) >= 12);
});

test("placed labels never overlap each other, markers or reserved areas", () => {
  const labels: LabelRequest[] = [];
  for (let i = 0; i < 40; i++) labels.push(request(`NOME NÚMERO ${i}`, 200 + (i % 8) * 120, 200 + Math.floor(i / 8) * 90, 1 + i * 7));
  const obstacles = [{ x0: 0, y0: 0, x1: 420, y1: 180 }];
  const placed = [...placeLabels({ labels, markers: labels.map((l) => ({ ...l, named: true })), obstacles, bounds }).values()];
  assert.ok(placed.length > 0 && placed.length < labels.length);
  for (let i = 0; i < placed.length; i++) {
    for (const o of obstacles) assert.equal(overlaps(placed[i].box, o, 0), false, placed[i].key);
    for (let j = i + 1; j < placed.length; j++) assert.equal(overlaps(placed[i].box, placed[j].box, 0), false);
    for (const m of labels) {
      const marker = { x0: m.x - 6, y0: m.y - 6, x1: m.x + 6, y1: m.y + 6 };
      assert.equal(overlaps(placed[i].box, marker, 0), false, `${placed[i].key} covers ${m.key}`);
    }
  }
});

test("each label sits right next to its own marker", () => {
  const labels = [request("RAIMUNDA NOGUEIRA", 700, 400, 341), request("CLARA MENESES", 760, 420, 2)];
  for (const p of placeLabels({ labels, markers: labels.map((l) => ({ ...l, named: true })), obstacles: [], bounds }).values()) {
    const own = labels.find((l) => l.key === p.key);
    assert.ok(own);
    const dx = Math.max(p.box.x0 - own.x, own.x - p.box.x1, 0);
    const dy = Math.max(p.box.y0 - own.y, own.y - p.box.y1, 0);
    assert.ok(Math.hypot(dx, dy) <= 14, `${p.key} is ${Math.hypot(dx, dy).toFixed(1)}px away`);
  }
});

test("the higher priority label wins a contested spot and the other one moves or hides", () => {
  const said = request("NISE DA SILVEIRA", 700, 400, 1, Number.POSITIVE_INFINITY);
  const big = request("DALVA QUEIRÓS", 760, 400, 139);
  const placed = placeLabels({ labels: [big, said], markers: [big, said].map((l) => ({ ...l, named: true })), obstacles: [], bounds });
  const saidPlaced = placed.get(said.key);
  assert.ok(saidPlaced);
  assert.equal(overlaps(saidPlaced.box, { x0: big.x - 6, y0: big.y - 6, x1: big.x + 6, y1: big.y + 6 }, 0), false);
  const other = placed.get(big.key);
  if (other) assert.equal(overlaps(other.box, saidPlaced.box, 0), false);
  assert.notDeepEqual(saidPlaced.box, candidateBox(said, "east"));
});

test("a label that cannot fit legibly is left out instead of squeezed", () => {
  const crowded = Array.from({ length: 12 }, (_, i) => request(`PONTO ${i}`, 720 + (i % 4) * 8, 450 + Math.floor(i / 4) * 8, 10));
  const placed = placeLabels({ labels: crowded, markers: crowded.map((l) => ({ ...l, named: true })), obstacles: [], bounds });
  assert.ok(placed.size < crowded.length);
});

test("a label is never closer to another point's marker than to its own", () => {
  const nise = request("NISE DA SILVEIRA", 1050, 615, 1, Number.POSITIVE_INFINITY);
  const dalva = request("DALVA QUEIRÓS", 1190, 618, 139);
  const placed = placeLabels({ labels: [nise, dalva], markers: [nise, dalva].map((l) => ({ ...l, named: true })), obstacles: [], bounds });
  const distance = (b: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) =>
    Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
  for (const p of placed.values()) {
    const own = p.key === nise.key ? nise : dalva;
    const other = p.key === nise.key ? dalva : nise;
    assert.ok(distance(p.box, other.x, other.y) >= distance(p.box, own.x, own.y) + 12, p.key);
  }
});

test("the scientist just mentioned is always labelled, even when silent points crowd her", () => {
  const said = request("NISE DA SILVEIRA", 1094, 639, 1, Number.POSITIVE_INFINITY);
  const dalva = request("DALVA QUEIRÓS", 1237, 641, 139);
  const silent = [
    { key: "s1", x: 979, y: 639, named: false },
    { key: "s2", x: 1100, y: 600, named: false },
    { key: "s3", x: 1090, y: 680, named: false },
  ];
  const markers = [...[said, dalva].map((l) => ({ ...l, named: true })), ...silent];
  const placed = placeLabels({ labels: [said, dalva], markers, obstacles: [], bounds });
  assert.ok(placed.has(said.key));
  const crowded = Array.from({ length: 30 }, (_, i) => request(`NOME ${i}`, 1060 + (i % 6) * 14, 610 + Math.floor(i / 6) * 14, 50));
  const forced = placeLabels({
    labels: [said, ...crowded],
    markers: [said, ...crowded].map((l) => ({ ...l, named: true })),
    obstacles: [],
    bounds,
  });
  assert.ok(forced.has(said.key));
});

test("the overview keeps a label budget so the relief stays ahead of the names", () => {
  const labels: LabelRequest[] = [];
  for (let i = 0; i < 80; i++) labels.push(request(`N${i}`, 60 + (i % 10) * 140, 60 + Math.floor(i / 10) * 105, 1 + i));
  const small = placeLabels({ labels, markers: labels.map((l) => ({ ...l, named: true })), obstacles: [], bounds });
  assert.ok(small.size <= Math.floor((1440 * 900) / 42000));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const kept = [...small.keys()].map((k) => Number(k.slice(1)));
  const dropped = labels.map((_, i) => i).filter((i) => !small.has(`N${i}`));
  assert.ok(small.has("N79"));
  assert.equal(small.has("N0"), false);
  assert.ok(mean(kept) > mean(dropped));
});
