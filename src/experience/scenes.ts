import type { FeaturedScientist } from "@/content/scientists/types";
import type { TerrainField } from "@/map/terrainField";
import { SHEET, type Camera, type Channel, type Lens, type Scene, type SceneTarget, type Timing } from "../map/mapRenderer.ts";
import { trenchBounds } from "../map/trench.ts";
import { unnamedCount } from "../participation/collective.ts";
import type { SheetPoint } from "@/participation/sheetLayout";
import type { State, Step } from "./state";
import type { Screen } from "./screen";
import { clearOfCopy, collectiveCamera, overviewCamera } from "./copyClearance.ts";
import { sceneryFor } from "./scenery.ts";

export type Point = { x: number; y: number };

export type DiscoveryGeometry = {
  code: string;
  summit: Point;
  transect: Point[];
  sample: Point;
  places: { text: string; x: number; y: number; rotation: number }[];
  hasCore: boolean;
};

export const SCALE_STOPS = [
  { z: 1, scale: 2_000_000, stage: "mapa" },
  { z: 6, scale: 250_000, stage: "pergunta" },
  { z: 40, scale: 25_000, stage: "trabalho" },
  { z: 512, scale: 10, stage: "contribuição" },
  { z: 4096, scale: 1, stage: "pessoa" },
] as const;

export const LEVELS_PER_MENTION = 8;

export function toFieldPoint(p: SheetPoint) {
  return { id: p.scientistId ?? p.key, x: p.x, y: p.y, recall: p.recall, reef: p.reef };
}

export function contributionKind(state: State): "rock" | "reef" {
  return state.saidKind === "recall" ? "rock" : "reef";
}

export function discoveryGeometry(
  field: TerrainField,
  discovery: FeaturedScientist | null,
  points: SheetPoint[],
): DiscoveryGeometry {
  const point = discovery ? points.find((p) => p.scientistId === discovery.id) : undefined;
  if (!discovery || !point) {
    const center = { x: SHEET.w / 2, y: SHEET.h / 2 };
    return { code: "", summit: center, transect: [center], sample: center, places: [], hasCore: false };
  }
  const scenery = sceneryFor(discovery);
  const summit = { x: point.x, y: point.y };
  const plan = scenery.transect;
  const transect = plan
    ? Array.from({ length: plan.points }, (_, k) => ({
        x: summit.x + plan.direction.x * plan.step * k,
        y: summit.y + plan.direction.y * plan.step * k,
      }))
    : [];
  return {
    code: point.code,
    summit: { x: summit.x, y: summit.y },
    transect,
    sample: plan && transect.length > 0 ? transect[Math.min(plan.sample, transect.length - 1)] : { x: summit.x, y: summit.y },
    places: scenery.places.map((l) => ({ text: l.text, x: summit.x + l.dx, y: summit.y + l.dy, rotation: l.rotation })),
    hasCore: scenery.core !== undefined,
  };
}

const NO_TIMING: Timing = { delay: 0, duration: 0 };

function withDefaults(scene: Partial<Scene> & Pick<Scene, "camera" | "lens" | "portraitFrame">): Scene {
  return {
    strata: 0,
    portrait: 0,
    portraitMask: 0,
    lensInk: 0,
    intervalLock: 0,
    lockedInterval: 0,
    density: 28,
    highlight: null,
    newContour: null,
    newContourKind: "rock",
    sea: 1,
    features: 0,
    settle: 0,
    settleFrom: null,
    highlightSettles: false,
    minInterval: 0,
    ...scene,
  };
}

const FRAME_TICK = 30;
const RULER_GAP = 24;

function scaleRulerBottom(u: number) {
  return 36 * u + 88;
}

export function portraitPlacement(screen: Screen) {
  const { W, H, fit, ox, oy, compact } = screen;
  if (compact) {
    const u = Math.min(W, H) / 640;
    const d = Math.max(140, Math.min(460 * u, 0.38 * H - 74));
    return { x: 0.5 * W, y: 48 + d / 2, d };
  }
  const d = 560 * fit;
  const x = ox + 980 * fit;
  const y = oy + 470 * fit;
  const top = y - d / 2 - FRAME_TICK * fit;
  return { x, y: y + Math.max(0, scaleRulerBottom(fit) + RULER_GAP - top), d };
}

export const NEW_CONTOUR_RADIUS = 112;

export const CONTRIBUTION_TIMING = { growth: 2600, growthFor: 1800, settle: 5900, settleFor: 1300 };

export const COLLECTIVE_SETTLE = { delay: 4200, duration: 1600 };

const SHEET_MIN_INTERVAL = LEVELS_PER_MENTION;

const MARK_CLEARANCE = 24;

export function contributionZoom(ringRadius: number) {
  return Math.min(80, Math.max(2.5, NEW_CONTOUR_RADIUS / Math.max(ringRadius, 1e-3)));
}

export function sceneFor(
  state: State,
  screen: Screen,
  field: TerrainField,
  geometry: DiscoveryGeometry,
  points: SheetPoint[],
): { target: SceneTarget; rest: Camera } {
  const { W, H, fit, ox, oy, compact } = screen;
  const u = compact ? Math.min(W, H) / 640 : fit;
  const at = (dx: number, dy: number, cx: number, cy: number): [number, number] =>
    compact ? [cx * W, cy * H] : [ox + dx * fit, oy + dy * fit];
  const camera = (focus: Point, z: number, anchor: [number, number]): Camera => ({
    x: focus.x,
    y: focus.y,
    z: compact && z === 1 ? 1.7 : z,
    ax: anchor[0] / W,
    ay: anchor[1] / H,
  });
  const circle = (center: [number, number], d: number, o: number): Lens => ({
    x: center[0],
    y: center[1],
    w: d * u,
    h: d * u,
    r: (d * u) / 2,
    o,
  });
  const sheet = compact
    ? camera({ x: 800, y: 380 }, 1, [W * 0.5, H * 0.27])
    : camera({ x: SHEET.w / 2, y: SHEET.h / 2 }, 1, [ox + (SHEET.w / 2) * fit, oy + (SHEET.h / 2) * fit]);
  const summitOnScreen = (view: Camera = sheet): [number, number] => {
    const e = view.z * fit;
    return [view.ax * W + (geometry.summit.x - view.x) * e, view.ay * H + (geometry.summit.y - view.y) * e];
  };
  const frame = (center: [number, number], d: number) => ({ x: center[0], y: center[1], r: ((d * u) / 2) * 0.97 });
  const placement = portraitPlacement(screen);
  const humanDiameter = placement.d / u;
  const silhouetteDiameter = compact ? 300 : 380;
  const portraitAt: [number, number] = [placement.x, placement.y];
  const fixed = { portraitFrame: frame(portraitAt, humanDiameter) };
  const approaching = { portraitFrame: frame(portraitAt, silhouetteDiameter) };
  const t = (delay: number, duration: number): Timing => ({ delay, duration });
  let scene: Scene;
  let timings: Partial<Record<Channel, Timing>> = {};

  const step: Step = state.step;
  switch (step) {
    case "opening": {
      const overview = overviewCamera(screen, points.filter((p) => p.scientistId !== null), [trenchBounds()]) ?? sheet;
      scene = withDefaults({ ...fixed, camera: overview, lens: circle(summitOnScreen(overview), 900, 0), features: 1, minInterval: 2 * SHEET_MIN_INTERVAL });
      timings = { camera: t(0, 2600), lens: t(0, 500), portrait: t(0, 1400), strata: NO_TIMING, intervalLock: t(0, 1200), sea: t(0, 1800), features: t(0, 1800) };
      break;
    }
    case "noName": {
      const view = clearOfCopy("noName", screen, sheet, geometry.summit);
      scene = withDefaults({
        ...fixed,
        camera: view,
        lens: circle(summitOnScreen(view), 110, 1),
        lensInk: 0.5,
        features: 1,
        minInterval: SHEET_MIN_INTERVAL,
      });
      timings = { camera: t(0, 1300), lens: t(350, 1300), lensInk: t(900, 800), features: t(0, 1300) };
      break;
    }
    case "clue1": {
      const a = at(900, 540, 0.5, 0.3);
      scene = withDefaults({ ...approaching, camera: camera(geometry.summit, 6, a), lens: circle(a, 150, 1), lensInk: 0.9, sea: 0 });
      timings = { camera: t(0, 2700), lens: t(500, 1500), lensInk: t(900, 900), sea: t(0, 1800) };
      break;
    }
    case "clue2": {
      const a = at(900, 520, 0.5, 0.32);
      const e = 40 * fit;
      const summitAt: [number, number] = [
        a[0] + (geometry.summit.x - geometry.sample.x) * e,
        a[1] + (geometry.summit.y - geometry.sample.y) * e,
      ];
      scene = withDefaults({ ...approaching, camera: camera(geometry.sample, 40, a), lens: circle(summitAt, 92, 1), lensInk: 0.9, sea: 0 });
      timings = { camera: t(0, 2500), lens: t(400, 1600) };
      break;
    }
    case "clue3": {
      const a = portraitAt;
      if (geometry.hasCore) {
        scene = withDefaults({
          ...approaching,
          camera: camera(geometry.sample, 512, a),
          lens: { x: a[0], y: a[1], w: 150 * u, h: compact ? 0.4 * H : 640 * u, r: 75 * u, o: 1 },
          lensInk: 1,
          strata: 1,
          density: 34,
          sea: 0,
        });
        timings = { camera: t(0, 2700), strata: t(800, 2000), density: t(800, 2000), lens: t(1100, 1500) };
        break;
      }
      scene = withDefaults({
        ...approaching,
        camera: camera(geometry.sample, 512, a),
        lens: circle(a, silhouetteDiameter, 1),
        lensInk: 1,
        portrait: 1,
        portraitMask: 1,
        density: 26,
        sea: 0,
      });
      timings = {
        camera: t(0, 2700),
        portrait: t(900, 2200),
        portraitMask: NO_TIMING,
        density: t(900, 2200),
        lens: t(700, 1500),
      };
      break;
    }
    case "humanScale":
    case "profile": {
      const a = portraitAt;
      scene = withDefaults({
        ...fixed,
        camera: camera(geometry.sample, 4096, a),
        lens: circle(a, humanDiameter, 1),
        lensInk: 1,
        strata: geometry.hasCore ? 1 : 0,
        portrait: 1,
        density: 30,
        sea: 0,
      });
      timings = {
        camera: t(0, 2600),
        sea: t(0, 1800),
        features: t(0, 1800),
        portrait: t(400, 2400),
        portraitMask: t(600, 2200),
        strata: NO_TIMING,
        density: t(400, 2400),
        lens: t(300, 1900),
      };
      break;
    }
    case "askAgain": {
      const view = clearOfCopy("askAgain", screen, sheet, geometry.summit);
      scene = withDefaults({ ...fixed, camera: view, lens: circle(summitOnScreen(view), 70, 0), features: 1, minInterval: SHEET_MIN_INTERVAL });
      timings = {
        camera: t(250, 3000),
        features: t(700, 2300),
        portrait: t(0, 1500),
        strata: NO_TIMING,
        lens: t(0, 700),
        density: t(0, 1500),
        lensInk: t(0, 700),
        sea: t(700, 2300),
      };
      break;
    }
    case "nameSaid": {
      const point = points.find((p) => p.scientistId !== null && p.scientistId === state.saidId);
      const id = point?.scientistId ?? null;
      const fieldPoint = point ? toFieldPoint(point) : null;
      const kind = contributionKind(state);
      const summit = fieldPoint ? field.summit(fieldPoint) : geometry.summit;
      const ring = fieldPoint ? (kind === "rock" ? field.growthRadius(fieldPoint) : field.reefRadiusOf(fieldPoint)) : 20;
      const a = at(820, 430, 0.5, 0.3);
      const { growth, growthFor, settle, settleFor } = CONTRIBUTION_TIMING;
      scene = withDefaults({
        ...fixed,
        camera: camera(summit, contributionZoom(ring), a),
        lens: circle(a, 120, 0),
        intervalLock: 1,
        lockedInterval: Math.log2(LEVELS_PER_MENTION),
        highlight: id,
        newContour: id,
        newContourKind: kind,
        features: 1,
        settle: 1,
        settleFrom: 0,
      });
      timings = {
        camera: t(0, 2300),
        intervalLock: t(500, 1700),
        lens: t(0, 600),
        lensInk: t(0, 600),
        peaks: t(growth, growthFor),
        settle: t(settle, settleFor),
        sea: t(0, 1800),
        features: t(0, 1800),
      };
      break;
    }
    case "collective": {
      const returning = state.previous === "profile";
      const discs = points
        .filter((p) => p.scientistId !== null)
        .map((p) => {
          const fieldPoint = toFieldPoint(p);
          const named = p.recall + p.reef > 0;
          const center = named ? field.summit(fieldPoint) : p;
          return { x: center.x, y: center.y, r: Math.max(MARK_CLEARANCE, named ? field.islandRadius(fieldPoint) : 0) };
        });
      const view = collectiveCamera(screen, discs, unnamedCount(state.collective) > 0 ? [trenchBounds()] : []) ?? sheet;
      scene = withDefaults({
        ...fixed,
        camera: view,
        lens: circle(summitOnScreen(view), 70, 0),
        highlight: state.saidId,
        newContour: state.saidId,
        newContourKind: contributionKind(state),
        features: 1,
        settle: 1,
        settleFrom: returning ? 1 : 0,
        highlightSettles: true,
        minInterval: SHEET_MIN_INTERVAL,
      });
      timings = {
        camera: t(0, 2800),
        intervalLock: t(0, 1600),
        lens: t(0, 500),
        lensInk: t(0, 500),
        settle: returning ? NO_TIMING : t(COLLECTIVE_SETTLE.delay, COLLECTIVE_SETTLE.duration),
        sea: t(0, 1800),
        features: t(0, 1800),
      };
      break;
    }
  }

  const relief = points.filter((p) => p.scientistId !== null).map(toFieldPoint);
  return { target: { scene, timings, relief }, rest: scene.camera };
}

export function restCameraFor(
  step: Step,
  state: State,
  screen: Screen,
  field: TerrainField,
  geometry: DiscoveryGeometry,
  points: SheetPoint[],
) {
  return sceneFor({ ...state, step }, screen, field, geometry, points).rest;
}
