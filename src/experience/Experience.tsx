"use client";

import { useEffect, useMemo, useReducer, useState, type CSSProperties } from "react";
import { CATALOG } from "@/content/scientists/catalog";
import type { Participations } from "@/content/scientists/types";
import { MapCanvas, ZoomPlane } from "@/map/MapCanvas";
import { TerrainField } from "@/map/terrainField";
import { chooseDiscovery } from "@/participation/participations";
import { sheetPoints } from "@/participation/sheetLayout";
import { INITIAL_PARTICIPATIONS, PARTICIPATIONS_ARE_ILLUSTRATIVE, SHEET_LAYOUT } from "@/participation/source";
import {
  LensRing,
  PlaceNames,
  PointLabel,
  PortraitMedallion,
  SaidNameLabel,
  ScaleRuler,
  SheetMarkers,
  Transect,
  lensVariantFor,
} from "./MapOverlays";
import { PLANE_LABELS, PlaneContent, mapDescription, type Commands, type PlaneContext } from "./Planes";
import { discoveryGeometry, restCameraFor, sceneFor, toFieldPoint } from "./scenes";
import { useReducedMotion, useScreen } from "./screen";
import { simulatedSpeech } from "./speechSimulation";
import { createExperience, type Step } from "./state";
import { Button } from "./ui";

const EXPERIENCE = createExperience(CATALOG, INITIAL_PARTICIPATIONS);

const STEPS_WITHOUT_SCALE_TRACK: Step[] = ["nameSaid", "collective", "opening"];

function initialFieldPoints(participations: Participations) {
  return sheetPoints(CATALOG, SHEET_LAYOUT, participations)
    .filter((p) => p.scientistId !== null && p.mentions > 0)
    .map(toFieldPoint);
}

export function Experience() {
  const screen = useScreen();
  const reducedMotion = useReducedMotion();
  const [state, dispatch] = useReducer(EXPERIENCE.reduce, undefined, EXPERIENCE.initialState);
  const [field] = useState(() => new TerrainField(initialFieldPoints(INITIAL_PARTICIPATIONS)));
  const points = useMemo(() => sheetPoints(CATALOG, SHEET_LAYOUT, state.participations), [state.participations]);
  const discovery = useMemo(
    () =>
      EXPERIENCE.discoverable.find((f) => f.id === state.discoveryId) ??
      chooseDiscovery(EXPERIENCE.discoverable, state.participations),
    [state.discoveryId, state.participations],
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
    if (!state.previous) return;
    const id = window.setTimeout(
      () => dispatch({ type: "clearPrevious", stepCount: state.stepCount }),
      reducedMotion ? 60 : 3400,
    );
    return () => window.clearTimeout(id);
  }, [state.previous, state.stepCount, reducedMotion]);

  useEffect(() => {
    if (state.stepCount === 0) return;
    const id = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("[data-current-plane] h1")?.focus({ preventScroll: true });
    });
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
  const contextFor = (step: Step): PlaneContext => ({
    discovery,
    code: geometry.code,
    points,
    illustrative: PARTICIPATIONS_ARE_ILLUSTRATIVE,
    speech: simulatedSpeech(step, discovery),
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
        <SheetMarkers step={state.step} field={field} points={points} discoveryId={discovery?.id ?? null} saidId={state.saidId} />
        <PlaceNames step={state.step} geometry={geometry} />
        <Transect step={state.step} geometry={geometry} prefix={discovery?.experience.problem.prefix ?? ""} />
        <LensRing variant={lensVariantFor(state.step)} />
        <PointLabel step={state.step} geometry={geometry} />
        <PortraitMedallion step={state.step} field={field} geometry={geometry} />
        <SaidNameLabel
          step={state.step}
          field={field}
          point={points.find((p) => p.scientistId !== null && p.scientistId === state.saidId)}
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
        <ScaleRuler showTrack={!STEPS_WITHOUT_SCALE_TRACK.includes(state.step)} baseZoom={screen.compact ? 1.7 : 1} />
      </MapCanvas>
      <footer className="pointer-events-none fixed right-2 bottom-0 z-10 flex items-center gap-4 bg-paper/80 pl-3 text-[12px] text-ink-soft">
        <p className="font-primary tracking-[0.14em] uppercase compact:hidden">
          <span className="font-bold text-iris-blue">Íris</span> · Laboratório de Inovação e Dados · Governo do Ceará
        </p>
        <nav aria-label="Controles do protótipo" className="pointer-events-auto flex items-center gap-1 font-notation tracking-[0.08em]">
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
