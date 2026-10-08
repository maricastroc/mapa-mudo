import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../content/scientists/catalog.ts";
import { sheetFit, SHEET, toScreen } from "../map/mapRenderer.ts";
import { TerrainField } from "../map/terrainField.ts";
import { EMPTY_COLLECTIVE, REEF_SURFACES_AT } from "../participation/collective.ts";
import { sheetPoints } from "../participation/sheetLayout.ts";
import { SHEET_LAYOUT } from "../participation/source.ts";
import { collidesWithCopy } from "./copyClearance.ts";
import { discoveryGeometry, LEVELS_PER_MENTION, sceneFor } from "./scenes.ts";
import type { Screen } from "./screen.ts";
import { createExperience, type Step } from "./state.ts";

function screenOf(W: number, H: number): Screen {
  const fit = sheetFit(W, H);
  return { W, H, fit, ox: (W - SHEET.w * fit) / 2, oy: (H - SHEET.h * fit) / 2, compact: W < 820 || W / H < 1.05 };
}

const SCREENS = [screenOf(1440, 900), screenOf(1470, 707), screenOf(1280, 720), screenOf(1920, 1080), screenOf(430, 900), screenOf(768, 1024)];
const experience = createExperience(CATALOG, EMPTY_COLLECTIVE, () => 1000);
const points = sheetPoints(CATALOG, SHEET_LAYOUT, EMPTY_COLLECTIVE);
const field = new TerrainField([], LEVELS_PER_MENTION, REEF_SURFACES_AT);

function sceneAt(step: Step, id: string, screen: Screen) {
  const discovery = CATALOG.featured.find((s) => s.id === id) ?? null;
  const geometry = discoveryGeometry(field, discovery, points);
  const state = { ...experience.initialState(), step, discoveryId: id };
  return { geometry, ...sceneFor(state, screen, field, geometry, points) };
}

test("for every scientist and screen, the selected point and her medallion stay clear of the copy and on screen", () => {
  for (const screen of SCREENS) {
    for (const s of CATALOG.featured) {
      for (const step of ["noName", "askAgain"] as const) {
        const { geometry, rest } = sceneAt(step, s.id, screen);
        const [x, y] = toScreen({ W: screen.W, H: screen.H, fit: screen.fit, camera: rest }, geometry.summit.x, geometry.summit.y);
        const where = `${step} ${s.id} at ${screen.W}x${screen.H}`;
        assert.ok(x > 0 && x < screen.W && y > 0 && y < screen.H, `${where} is off screen at ${x.toFixed(0)},${y.toFixed(0)}`);
        if (screen.compact) assert.ok(y < 0.4 * screen.H, `${where} sits under the copy at y ${y.toFixed(0)}`);
        else assert.equal(collidesWithCopy(step, (x - screen.ox) / screen.fit, (y - screen.oy) / screen.fit), false, where);
      }
    }
  }
});

test("a point already clear of the copy keeps the plain sheet camera", () => {
  const screen = SCREENS[0];
  const sheet = sceneAt("collective", "nise-da-silveira", screen).rest;
  assert.deepEqual(sceneAt("noName", "nise-da-silveira", screen).rest, sheet);
  assert.deepEqual(sceneAt("askAgain", "nise-da-silveira", screen).rest, sheet);
});

test("a point under the controls moves the sheet only sideways, never zooming", () => {
  const screen = SCREENS[0];
  const sheet = sceneAt("collective", "ruth-nussenzweig", screen).rest;
  const asking = sceneAt("askAgain", "ruth-nussenzweig", screen).rest;
  assert.notEqual(asking.ax, sheet.ax);
  assert.equal(asking.ay, sheet.ay);
  assert.equal(asking.z, sheet.z);
});

test("the sea of the collective map stays out of the discovery and reveal scenes", () => {
  const screen = SCREENS[0];
  const id = "ruth-nussenzweig";
  for (const step of ["clue1", "clue2", "clue3", "humanScale", "profile"] as Step[]) assert.equal(sceneAt(step, id, screen).target.scene.sea, 0, step);
  for (const step of ["opening", "noName", "askAgain", "nameSaid", "collective"] as Step[]) assert.equal(sceneAt(step, id, screen).target.scene.sea, 1, step);
});

test("rocks and reefs show only when a name is said and on the collective map", () => {
  const screen = SCREENS[0];
  const id = "ruth-nussenzweig";
  for (const step of ["opening", "noName", "clue1", "clue2", "clue3", "humanScale", "profile", "askAgain"] as Step[]) {
    assert.equal(sceneAt(step, id, screen).target.scene.features, 0, step);
  }
  for (const step of ["nameSaid", "collective"] as Step[]) assert.equal(sceneAt(step, id, screen).target.scene.features, 1, step);
});

test("the landing shows the whole sheet at a smaller scale beside the question, with every point clear of the copy", () => {
  const LANDING_COPY = [
    { x0: 40, y0: 30, x1: 480, y1: 70 },
    { x0: 64, y0: 228, x1: 820, y1: 528 },
    { x0: 64, y0: 548, x1: 700, y1: 592 },
    { x0: 52, y0: 618, x1: 560, y1: 712 },
  ];
  for (const screen of SCREENS) {
    const { rest } = sceneAt("opening", "ruth-nussenzweig", screen);
    assert.ok(rest.z < (screen.compact ? 1.7 : 1), `${screen.W}x${screen.H} zoom ${rest.z}`);
    for (const p of points.filter((q) => q.scientistId !== null)) {
      const [x, y] = toScreen({ W: screen.W, H: screen.H, fit: screen.fit, camera: rest }, p.x, p.y);
      const where = `${p.key} at ${screen.W}x${screen.H}`;
      assert.ok(x > 8 && x < screen.W - 8 && y > 8 && y < screen.H - 8, `${where} off screen`);
      if (screen.compact) {
        assert.ok(y < 0.38 * screen.H, `${where} under the copy at y ${y.toFixed(0)}`);
        continue;
      }
      const sx = (x - screen.ox) / screen.fit;
      const sy = (y - screen.oy) / screen.fit;
      assert.ok(!LANDING_COPY.some((b) => sx > b.x0 - 6 && sx < b.x1 + 6 && sy > b.y0 - 2 && sy < b.y1 + 10), `${where} under the copy at ${sx.toFixed(0)},${sy.toFixed(0)}`);
    }
  }
});
