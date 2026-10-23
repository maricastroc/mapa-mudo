import { test } from "node:test";
import assert from "node:assert/strict";
import { frogLayout, inside, mixRect } from "./frogLayout.ts";

const SCREENS: [number, number][] = [
  [1920, 1080],
  [1366, 768],
  [1024, 768],
  [1280, 1024],
  [390, 844],
];

test("the closed notebook is a small tab in the top right corner", () => {
  for (const [W, H] of SCREENS) {
    const { tab, margin } = frogLayout(W, H);
    assert.ok(tab.x > W * 0.5 && tab.x + tab.w <= W - margin, `${W}x${H}`);
    assert.ok(tab.y >= margin && tab.y + tab.h < H * 0.2, `${W}x${H}`);
    assert.ok(tab.w * tab.h < W * H * 0.02, `${W}x${H}`);
  }
});

test("the open notebook hides part of the path but never the whole forest", () => {
  for (const [W, H] of SCREENS) {
    const layout = frogLayout(W, H);
    const { panel, lanes, portrait } = layout;
    const [back, mid, front] = lanes;
    assert.ok(inside(panel, panel.x + panel.w / 2, back.y - back.size * 0.3), `${W}x${H} covers the back lane on the right`);
    assert.ok(!inside(panel, W / 2, front.y - front.size * 0.3), `${W}x${H} leaves the front lane visible`);
    assert.ok(panel.y + panel.h < front.y - front.size * 0.6, `${W}x${H}`);
    if (!portrait) {
      assert.ok(inside(panel, panel.x + panel.w / 2, mid.y - mid.size * 0.3), `${W}x${H} covers the middle lane on the right`);
      assert.ok(panel.w <= W * 0.4, `${W}x${H} covers at most 40% of the width`);
      assert.ok(!inside(panel, W * 0.3, back.y - back.size * 0.3), `${W}x${H} leaves most of the back lane visible`);
    }
  }
});

test("the notebook unfolds from the tab and every page fits inside it", () => {
  for (const [W, H] of SCREENS) {
    const { tab, panel, cells, header } = frogLayout(W, H);
    const near = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h)) < 1e-6;
    assert.ok(near(mixRect(tab, panel, 0), tab));
    assert.ok(near(mixRect(tab, panel, 1), panel));
    assert.ok(Math.abs(tab.x + tab.w - (panel.x + panel.w)) < 1, `${W}x${H} unfolds from the tab corner`);
    assert.equal(tab.y, panel.y);
    for (const cell of cells) {
      assert.ok(cell.x >= panel.x && cell.x + cell.w <= panel.x + panel.w + 0.01, `${W}x${H}`);
      assert.ok(cell.y >= panel.y + header && cell.y + cell.h <= panel.y + panel.h + 0.01, `${W}x${H}`);
      assert.ok(cell.h > 40 && cell.w > 80, `${W}x${H} pages are big enough to compare frogs`);
    }
  }
});
