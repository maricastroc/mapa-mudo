import type { DiscoverableScientist } from "@/content/scientists/types";
import type { TerrainField } from "@/map/terrainField";
import { SHEET, type Camera, type Channel, type Lens, type Scene, type SceneTarget, type Timing } from "@/map/mapRenderer";
import type { SheetPoint } from "@/participation/sheetLayout";
import type { State, Step } from "./state";
import type { Screen } from "./screen";

export type Point = { x: number; y: number };

export type DiscoveryGeometry = {
  code: string;
  summit: Point;
  transect: Point[];
  sample: Point;
  places: { text: string; x: number; y: number; rotation: number }[];
};

export const SCALE_STOPS = [
  { z: 1, scale: 2_000_000, stage: "folha" },
  { z: 6, scale: 250_000, stage: "território" },
  { z: 40, scale: 25_000, stage: "problema" },
  { z: 512, scale: 10, stage: "pesquisa" },
  { z: 4096, scale: 1, stage: "pessoa" },
] as const;

export function toFieldPoint(p: SheetPoint) {
  return { id: p.scientistId ?? p.key, x: p.x, y: p.y, mentions: p.mentions };
}

export function discoveryGeometry(
  field: TerrainField,
  discovery: DiscoverableScientist | null,
  points: SheetPoint[],
): DiscoveryGeometry {
  const point = discovery ? points.find((p) => p.scientistId === discovery.id) : undefined;
  if (!discovery || !point) {
    const center = { x: SHEET.w / 2, y: SHEET.h / 2 };
    return { code: "", summit: center, transect: [center], sample: center, places: [] };
  }
  const { problem, territory } = discovery.experience;
  const summit = field.summit(toFieldPoint(point));
  const transect = Array.from({ length: problem.points }, (_, k) => ({
    x: summit.x + problem.direction.x * problem.step * k,
    y: summit.y + problem.direction.y * problem.step * k,
  }));
  return {
    code: point.code,
    summit: { x: summit.x, y: summit.y },
    transect,
    sample: transect[Math.min(problem.sample, transect.length - 1)],
    places: territory.places.map((l) => ({ text: l.text, x: summit.x + l.dx, y: summit.y + l.dy, rotation: l.rotation })),
  };
}

const NO_TIMING: Timing = { delay: 0, duration: 0 };

function withDefaults(scene: Partial<Scene> & Pick<Scene, "camera" | "lens" | "portraitFrame">): Scene {
  return {
    strata: 0,
    portrait: 0,
    lensInk: 0,
    intervalLock: 0,
    lockedInterval: 0,
    density: 28,
    highlight: null,
    newContour: null,
    ...scene,
  };
}

export function nameSaidZoom(sigma: number, mentions: number) {
  const radius = sigma * Math.sqrt((2 * 22) / Math.max(mentions, 23));
  return Math.min(60, Math.max(3, 640 / radius));
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
  const summitOnScreen = (): [number, number] => {
    const e = sheet.z * fit;
    return [sheet.ax * W + (geometry.summit.x - sheet.x) * e, sheet.ay * H + (geometry.summit.y - sheet.y) * e];
  };
  const portraitAt = at(980, 450, 0.5, 0.3);
  const portraitFrame = { x: portraitAt[0], y: portraitAt[1], r: (compact ? 250 : 310) * u * 0.97 };
  const fixed = { portraitFrame };
  const t = (delay: number, duration: number): Timing => ({ delay, duration });
  let scene: Scene;
  let timings: Partial<Record<Channel, Timing>> = {};

  const step: Step = state.step;
  switch (step) {
    case "opening":
      scene = withDefaults({ ...fixed, camera: sheet, lens: circle(summitOnScreen(), 900, 0) });
      timings = { camera: t(0, 2600), lens: t(0, 500), portrait: t(0, 1400), strata: NO_TIMING, intervalLock: t(0, 1200) };
      break;
    case "noName":
      scene = withDefaults({ ...fixed, camera: sheet, lens: circle(summitOnScreen(), 110, 1), lensInk: 0.5 });
      timings = { lens: t(350, 1300), lensInk: t(900, 800) };
      break;
    case "clue1": {
      const a = at(900, 540, 0.5, 0.3);
      scene = withDefaults({ ...fixed, camera: camera(geometry.summit, 6, a), lens: circle(a, 150, 1), lensInk: 0.9 });
      timings = { camera: t(0, 2700), lens: t(500, 1500), lensInk: t(900, 900) };
      break;
    }
    case "clue2": {
      const a = at(900, 520, 0.5, 0.32);
      const e = 40 * fit;
      const summitAt: [number, number] = [
        a[0] + (geometry.summit.x - geometry.sample.x) * e,
        a[1] + (geometry.summit.y - geometry.sample.y) * e,
      ];
      scene = withDefaults({ ...fixed, camera: camera(geometry.sample, 40, a), lens: circle(summitAt, 92, 1), lensInk: 0.9 });
      timings = { camera: t(0, 2500), lens: t(400, 1600) };
      break;
    }
    case "clue3": {
      const a = at(980, 450, 0.5, 0.3);
      scene = withDefaults({
        ...fixed,
        camera: camera(geometry.sample, 512, a),
        lens: { x: a[0], y: a[1], w: 150 * u, h: compact ? 0.4 * H : 640 * u, r: 75 * u, o: 1 },
        lensInk: 1,
        strata: 1,
        density: 34,
      });
      timings = { camera: t(0, 2700), strata: t(800, 2000), density: t(800, 2000), lens: t(1100, 1500) };
      break;
    }
    case "humanScale": {
      const a = at(980, 450, 0.5, 0.3);
      scene = withDefaults({
        ...fixed,
        camera: camera(geometry.sample, 4096, a),
        lens: circle(a, compact ? 500 : 620, 1),
        lensInk: 1,
        strata: 1,
        portrait: 1,
        density: 30,
      });
      timings = { camera: t(0, 2600), portrait: t(400, 2400), strata: NO_TIMING, density: t(400, 2400), lens: t(300, 1900) };
      break;
    }
    case "askAgain":
      scene = withDefaults({ ...fixed, camera: sheet, lens: circle(summitOnScreen(), 70, 0) });
      timings = {
        camera: t(250, 3000),
        portrait: t(0, 1500),
        strata: NO_TIMING,
        lens: t(0, 700),
        density: t(0, 1500),
        lensInk: t(0, 700),
      };
      break;
    case "nameSaid": {
      const point = points.find((p) => p.scientistId !== null && p.scientistId === state.saidId);
      const id = point?.scientistId ?? null;
      const summit = point ? field.summit(toFieldPoint(point)) : { ...geometry.summit, sigma: 40 };
      const a = at(880, 470, 0.5, 0.3);
      scene = withDefaults({
        ...fixed,
        camera: camera(summit, nameSaidZoom(summit.sigma, point?.mentions ?? 1), a),
        lens: circle(a, compact ? 420 : 620, 1),
        lensInk: 0.55,
        intervalLock: 1,
        lockedInterval: 0,
        newContour: id,
      });
      timings = { camera: t(0, 2300), intervalLock: t(500, 1700), lens: t(900, 1300), lensInk: t(900, 1300), peaks: t(2500, 1700) };
      break;
    }
    case "collective":
      scene = withDefaults({
        ...fixed,
        camera: sheet,
        lens: circle(summitOnScreen(), 70, 0),
        highlight: state.saidId,
      });
      timings = { camera: t(0, 2800), intervalLock: t(0, 1600), lens: t(0, 500), lensInk: t(0, 500) };
      break;
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
