"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useState, useSyncExternalStore, type CSSProperties } from "react";
import { CATALOG, findFeatured, findScientist } from "@/content/scientists/catalog";
import { MapCanvas, ZoomPlane } from "@/map/MapCanvas";
import { TerrainField } from "@/map/terrainField";
import { REEF_SURFACES_AT, SILENCE_SAMPLE_MIN, sharedSilence, tally, type Collective } from "@/participation/collective";
import { chooseDiscovery } from "@/participation/participations";
import { sheetPoints } from "@/participation/sheetLayout";
import { INITIAL_COLLECTIVE, PARTICIPATIONS_ARE_ILLUSTRATIVE, SHEET_LAYOUT } from "@/participation/source";
import { browserStore, loadEvents, saveEvents } from "@/participation/storedEvents";
import {
  LensRing,
  PlaceNames,
  PointLabel,
  PortraitMedallion,
  SaidNameLabel,
  SummitPortrait,
  ScaleRuler,
  SheetMarkers,
  SilenceTrench,
  Transect,
  lensVariantFor,
} from "./MapOverlays";
import { PLANE_LABELS, PlaneContent, mapDescription, type Commands, type PlaneContext } from "./Planes";
import { discoveryGeometry, LEVELS_PER_MENTION, restCameraFor, sceneFor, toFieldPoint } from "./scenes";
import { useReducedMotion, useScreen } from "./screen";
import { collectiveObstacles, trenchCaptionBox } from "./collectiveLayout";
import { Credits } from "./Credits";
import { PortraitButton, PortraitPhoto } from "./PortraitPhoto";
import { sceneryFor } from "./scenery";
import { simulatedSpeech } from "./speechSimulation";
import { createExperience, type Step } from "./state";
import { Button } from "./ui";

const EXPERIENCE = createExperience(CATALOG, INITIAL_COLLECTIVE);

const STEPS_WITHOUT_SCALE_TRACK: Step[] = ["nameSaid", "collective", "opening"];

const IDLE_RESET_MS = 90_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

function initialFieldPoints(collective: Collective) {
  return sheetPoints(CATALOG, SHEET_LAYOUT, collective)
    .filter((p) => p.scientistId !== null && p.recall + p.reef > 0)
    .map(toFieldPoint);
}

function stayOnClient() {
  return () => {};
}

function restoredState() {
  const events = loadEvents(browserStore());
  const collective = tally(events, (id) => findScientist(CATALOG, id) !== undefined, INITIAL_COLLECTIVE);
  return { ...EXPERIENCE.initialState(), events, collective };
}

export function Experience() {
  const onClient = useSyncExternalStore(
    stayOnClient,
    () => true,
    () => false,
  );
  if (!onClient) return <main className="fixed inset-0 bg-paper" />;
  return <LiveExperience />;
}

function LiveExperience() {
  const screen = useScreen();
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(EXPERIENCE.reduce, undefined, restoredState);
  const [field] = useState(() => new TerrainField(initialFieldPoints(INITIAL_COLLECTIVE), LEVELS_PER_MENTION, REEF_SURFACES_AT));
  const points = useMemo(() => sheetPoints(CATALOG, SHEET_LAYOUT, state.collective), [state.collective]);
  const discovery = useMemo(
    () =>
      EXPERIENCE.discoverable.find((f) => f.id === state.discoveryId) ??
      chooseDiscovery(EXPERIENCE.discoverable, state.collective, state.discoveryCursor),
    [state.discoveryId, state.collective, state.discoveryCursor],
  );
  const geometry = useMemo(() => discoveryGeometry(field, discovery, points), [field, discovery, points]);
  const { target, rest } = useMemo(
    () => sceneFor(state, screen, field, geometry, points),
    [state, screen, field, geometry, points],
  );
  const previousRest = useMemo(
    () => (state.previous ? restCameraFor(state.previous, state, screen, field, geometry, points) : null),
    [state, screen, field, geometry, points],
  );

  useEffect(() => {
    saveEvents(browserStore(), state.events);
  }, [state.events]);

  const resetWhenIdle = useEffectEvent(() => {
    if (state.step === "opening" && state.fresh && !state.response) return;
    dispatch({ type: "restart" });
  });

  useEffect(() => {
    let id = window.setTimeout(resetWhenIdle, IDLE_RESET_MS);
    const wake = () => {
      window.clearTimeout(id);
      id = window.setTimeout(resetWhenIdle, IDLE_RESET_MS);
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, wake, { passive: true });
    return () => {
      window.clearTimeout(id);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, wake);
    };
  }, []);

  useEffect(() => {
    if (!state.previous) return;
    const id = window.setTimeout(
      () => dispatch({ type: "clearPrevious", stepCount: state.stepCount }),
      reducedMotion ? 60 : 3400,
    );
    return () => window.clearTimeout(id);
  }, [state.previous, state.stepCount, reducedMotion]);

  const focusCurrentPlane = useEffectEvent(() => {
    const returning = state.previous === "profile";
    const target = !returning
      ? "[data-current-plane] h1"
      : state.step === "askAgain"
        ? "[data-medallion-button]"
        : state.step === "collective"
          ? `[data-profile-link="${state.discoveryId ?? ""}"]`
          : "[data-portrait-button]";
    const element = document.querySelector<HTMLElement>(target) ?? document.querySelector<HTMLElement>("[data-current-plane] h1");
    element?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (state.stepCount === 0) return;
    const id = window.requestAnimationFrame(() => focusCurrentPlane());
    return () => window.cancelAnimationFrame(id);
  }, [state.stepCount]);

  const commands = useMemo<Commands>(
    () => ({
      dontKnow: () => dispatch({ type: "dontKnow" }),
      silence: () => dispatch({ type: "silence" }),
      approach: () => dispatch({ type: "approach" }),
      nextClue: () => dispatch({ type: "nextClue" }),
      reachHumanScale: () => dispatch({ type: "reachHumanScale" }),
      continue: () => dispatch({ type: "continue" }),
      openProfile: () => dispatch({ type: "openProfile" }),
      openProfileOf: (id: string) => dispatch({ type: "openProfile", id }),
      closeProfile: () => dispatch({ type: "closeProfile" }),
      seeAgain: () => dispatch({ type: "seeAgain" }),
      name: (text: string) => dispatch({ type: "name", text }),
      seeMap: () => dispatch({ type: "seeMap" }),
      anotherName: () => dispatch({ type: "anotherName" }),
      confirm: (id: string) => dispatch({ type: "confirm", id }),
      reject: () => dispatch({ type: "reject" }),
      submitForReview: () => dispatch({ type: "submitForReview", at: Date.now() }),
      clearResponse: () => dispatch({ type: "clearResponse" }),
    }),
    [],
  );

  const unit = screen.compact ? 0.72 : screen.fit;
  const labelView = useMemo(() => ({ W: screen.W, H: screen.H, fit: screen.fit, camera: rest }), [screen, rest]);
  const obstacles = useMemo(
    () => [...collectiveObstacles(screen, unit), ...(state.collective.silences > 0 ? [trenchCaptionBox(labelView, unit)] : [])],
    [screen, unit, labelView, state.collective.silences],
  );
  const silenceCount = state.collective.answers >= SILENCE_SAMPLE_MIN ? state.collective.silences : null;
  const contextFor = (step: Step): PlaneContext => ({
    discovery,
    code: geometry.code,
    points,
    illustrative: PARTICIPATIONS_ARE_ILLUSTRATIVE,
    speech: simulatedSpeech(step, discovery),
    sharedSilence: sharedSilence(state.collective, state.silenceRecorded),
  });
  const planes: { step: Step; key: number; leaving: boolean }[] = [];
  if (state.previous) planes.push({ step: state.previous, key: state.stepCount - 1, leaving: true });
  planes.push({ step: state.step, key: state.stepCount, leaving: false });

  return (
    <main
      data-layout={screen.compact ? "compact" : "stage"}
      className="fixed inset-0 overflow-hidden bg-paper text-ink select-none"
      style={{ "--u": unit } as CSSProperties}
    >
      <MapCanvas
        field={field}
        target={target}
        stepKey={`${state.stepCount}`}
        screenKey={`${screen.W}x${screen.H}`}
        reducedMotion={reducedMotion}
        description={mapDescription(state, contextFor(state.step))}
      >
        <SheetMarkers
          step={state.step}
          field={field}
          points={points}
          discoveryId={discovery?.id ?? null}
          saidId={state.saidId}
          view={labelView}
          unit={unit}
          obstacles={obstacles}
          returning={state.previous === "profile"}
          onOpenProfile={commands.openProfileOf}
        />
        <SilenceTrench step={state.step} silences={state.collective.silences} count={silenceCount} unit={unit} />
        <PlaceNames step={state.step} geometry={geometry} />
        <Transect step={state.step} geometry={geometry} prefix={discovery ? (sceneryFor(discovery).transect?.prefix ?? "") : ""} />
        <PortraitPhoto step={state.step} photo={discovery?.photo ?? null} />
        <LensRing variant={lensVariantFor(state.step)} />
        <PointLabel step={state.step} geometry={geometry} />
        <SummitPortrait
          step={state.step}
          field={field}
          point={points.find((p) => p.scientistId !== null && p.scientistId === state.saidId)}
          photo={state.saidId ? (findFeatured(CATALOG, state.saidId)?.photo ?? null) : null}
        />
        <SaidNameLabel
          step={state.step}
          field={field}
          point={points.find((p) => p.scientistId !== null && p.scientistId === state.saidId)}
          kind={state.saidKind}
          illustrative={PARTICIPATIONS_ARE_ILLUSTRATIVE}
        />
        {planes.map((p) => (
          <ZoomPlane
            key={p.key}
            rest={p.leaving && previousRest ? previousRest : rest}
            leaving={p.leaving}
            label={PLANE_LABELS[p.step]}
            current={!p.leaving}
          >
            <PlaneContent
              step={p.step}
              state={state}
              screen={screen}
              commands={commands}
              reducedMotion={reducedMotion}
              context={contextFor(p.step)}
            />
          </ZoomPlane>
        ))}
        <PortraitMedallion
          step={state.step}
          field={field}
          geometry={geometry}
          name={discovery?.canonicalName ?? ""}
          photo={discovery?.photo ?? null}
          onOpen={commands.openProfile}
        />
        <PortraitButton
          step={state.step}
          name={discovery?.canonicalName ?? ""}
          settled={state.previous === "profile"}
          onOpen={commands.openProfile}
        />
        <ScaleRuler showTrack={!STEPS_WITHOUT_SCALE_TRACK.includes(state.step)} baseZoom={screen.compact ? 1.7 : 1} />
      </MapCanvas>
      <footer className="pointer-events-none fixed right-2 bottom-0 z-10 flex items-center gap-4 bg-paper/80 pl-3 text-[12px] text-ink-soft">
        <p className="font-primary tracking-[0.14em] uppercase compact:hidden">
          <span className="font-bold text-iris-blue">Íris</span> · Laboratório de Inovação e Dados · Governo do Ceará
        </p>
        <nav aria-label="Controles do protótipo" className="pointer-events-auto flex items-center gap-1 font-notation tracking-[0.08em]">
          <Credits illustrative={PARTICIPATIONS_ARE_ILLUSTRATIVE} />
          <span className="px-1 uppercase">Protótipo</span>
          {state.reviewQueue.length > 0 && <span className="px-1 uppercase">Para conferência: {state.reviewQueue.length}</span>}
          <Button variant="subtle" onClick={() => dispatch({ type: "restart" })}>
            ↺ Reiniciar
          </Button>
        </nav>
      </footer>
    </main>
  );
}
