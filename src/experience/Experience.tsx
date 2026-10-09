"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
} from "react";
import { CATALOG, findFeatured } from "@/content/scientists/catalog";
import { MapCanvas, ZoomPlane } from "@/map/MapCanvas";
import { TerrainField } from "@/map/terrainField";
import { REEF_SURFACES_AT, sharedSilence, type Collective, type CollectiveEvent } from "@/participation/collective";
import { chooseDiscovery } from "@/participation/participations";
import { sheetPoints } from "@/participation/sheetLayout";
import { INITIAL_COLLECTIVE, PARTICIPATIONS_ARE_ILLUSTRATIVE, SHEET_LAYOUT } from "@/participation/source";
import { adoptLegacy, browserStore, loadEvents, loadSubmissions, saveEvents, saveSubmissions } from "@/participation/storedEvents";
import { fetchArchive, sendArchive } from "@/participation/sync";
import type { PendingScientistSubmission } from "@/content/scientists/types";
import {
  LensRing,
  PlaceNames,
  PointLabel,
  PortraitMedallion,
  SaidNameLabel,
  SeaOfUnsaid,
  SummitPortrait,
  ScaleRuler,
  SheetMarkers,
  Transect,
} from "./MapOverlays";
import { lensVariantFor } from "./layers";
import { PLANE_LABELS, PlaneContent, mapDescription, type Commands, type PlaneContext } from "./Planes";
import { discoveryGeometry, LEVELS_PER_MENTION, restCameraFor, sceneFor, toFieldPoint } from "./scenes";
import { useReducedMotion, useScreen } from "./screen";
import { collectiveObstacles, trenchCaptionBox } from "./collectiveLayout";
import { Credits } from "./Credits";
import { PortraitButton, PortraitPhoto } from "./PortraitPhoto";
import { sceneryFor } from "./scenery";
import { createExperience, type Action, type Step } from "./state";
import { Button } from "./ui";

const EXPERIENCE = createExperience(CATALOG, INITIAL_COLLECTIVE);

const STEPS_WITHOUT_SCALE_TRACK: Step[] = ["nameSaid", "collective", "opening", "noName"];

const IDLE_RESET_MS = 90_000;

const DEFAULT_FOOTER_HEIGHT = 44;

const SYNC_EVERY_MS = 30_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

function initialFieldPoints(collective: Collective) {
  return sheetPoints(CATALOG, SHEET_LAYOUT, collective)
    .filter((p) => p.scientistId !== null && p.recall + p.reef > 0)
    .map(toFieldPoint);
}

function stayOnClient() {
  return () => {};
}

function freshUid(at: number) {
  return `${at.toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36).padStart(7, "0")}`;
}

function restoredState() {
  const store = browserStore();
  return EXPERIENCE.restore(adoptLegacy(loadEvents(store), freshUid), loadSubmissions(store));
}

function useArchiveSync(events: CollectiveEvent[], review: PendingScientistSubmission[], step: Step, dispatch: Dispatch<Action>) {
  const synced = useRef(new Set<string>());
  const busy = useRef(false);
  const sync = useEffectEvent(async (pull: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (pull) {
        const remote = await fetchArchive();
        if (remote) {
          for (const e of remote.events) synced.current.add(e.uid);
          for (const r of remote.review) synced.current.add(r.uid);
          if (step === "opening") dispatch({ type: "merge", events: remote.events, reviewQueue: remote.review });
        }
      }
      const pending = {
        events: events.filter((e) => !synced.current.has(e.uid)),
        review: review.filter((r) => !synced.current.has(r.uid)),
      };
      if ((pending.events.length > 0 || pending.review.length > 0) && (await sendArchive(pending))) {
        for (const e of pending.events) synced.current.add(e.uid);
        for (const r of pending.review) synced.current.add(r.uid);
      }
    } finally {
      busy.current = false;
    }
  });
  useEffect(() => {
    sync(true);
    const id = window.setInterval(() => sync(true), SYNC_EVERY_MS);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    sync(false);
  }, [events.length, review.length]);
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
      chooseDiscovery(EXPERIENCE.discoverable, state.collective, state.offered, state.discoveryOrder),
    [state.discoveryId, state.collective, state.offered, state.discoveryOrder],
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

  useEffect(() => {
    saveSubmissions(browserStore(), state.reviewQueue);
  }, [state.reviewQueue]);

  useArchiveSync(state.events, state.reviewQueue, state.step, dispatch);

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
      approach: () => dispatch({ type: "approach" }),
      nextClue: () => dispatch({ type: "nextClue" }),
      reachHumanScale: () => dispatch({ type: "reachHumanScale" }),
      continue: () => dispatch({ type: "continue" }),
      openProfile: () => dispatch({ type: "openProfile" }),
      openProfileOf: (id: string) => dispatch({ type: "openProfile", id }),
      closeProfile: () => dispatch({ type: "closeProfile" }),
      hint: () => dispatch({ type: "hint" }),
      name: (text: string) => dispatch({ type: "name", text }),
      seeMap: () => dispatch({ type: "seeMap" }),
      anotherName: () => dispatch({ type: "anotherName" }),
      discoverAnother: () => dispatch({ type: "discoverAnother" }),
      passTurn: () => dispatch({ type: "restart" }),
      confirm: (id: string) => dispatch({ type: "confirm", id }),
      reject: () => dispatch({ type: "reject" }),
      submitForReview: () => dispatch({ type: "submitForReview", at: Date.now() }),
      clearResponse: () => dispatch({ type: "clearResponse" }),
    }),
    [],
  );

  const footer = useRef<HTMLElement>(null);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_FOOTER_HEIGHT);
  useEffect(() => {
    const el = footer.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFooterHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const unit = screen.compact ? 0.72 : screen.fit;
  const labelView = useMemo(() => ({ W: screen.W, H: screen.H, fit: screen.fit, camera: rest }), [screen, rest]);
  const obstacles = useMemo(
    () => [...collectiveObstacles(screen, unit), trenchCaptionBox(labelView, unit)],
    [screen, unit, labelView],
  );
  const context: PlaneContext = {
    discovery,
    code: geometry.code,
    points,
    illustrative: PARTICIPATIONS_ARE_ILLUSTRATIVE,
    sharedSilence: sharedSilence(state.collective, state.silenceRecorded),
  };
  const planes: { step: Step; key: number; leaving: boolean }[] = [];
  if (state.previous) planes.push({ step: state.previous, key: state.stepCount - 1, leaving: true });
  planes.push({ step: state.step, key: state.stepCount, leaving: false });

  return (
    <main
      data-layout={screen.compact ? "compact" : "stage"}
      className="fixed inset-0 overflow-clip bg-paper text-ink select-none"
      style={{ "--u": unit, "--footer": `${footerHeight}px` } as CSSProperties}
    >
      <MapCanvas
        field={field}
        target={target}
        stepKey={state.step === "opening" ? `${state.stepCount}:${state.events.length}` : `${state.stepCount}`}
        screenKey={`${screen.W}x${screen.H}`}
        reducedMotion={reducedMotion}
        description={mapDescription(state, context)}
      >
        <SheetMarkers
          step={state.step}
          field={field}
          points={points}
          discoveryId={discovery?.id ?? null}
          saidId={state.saidId}
          view={labelView}
          unit={unit}
          compact={screen.compact}
          obstacles={obstacles}
          returning={state.previous === "profile"}
          onOpenProfile={commands.openProfileOf}
        />
        <SeaOfUnsaid step={state.step} collective={state.collective} unit={unit} />
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
          screen={screen}
          unit={unit}
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
              context={context}
            />
          </ZoomPlane>
        ))}
        <PortraitMedallion
          step={state.step}
          hint={state.hint}
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
      <footer ref={footer} className="pointer-events-none fixed right-2 bottom-0 z-10 flex items-center gap-4 bg-paper/80 pl-3 text-[12px] text-ink-soft">
        <p className="font-primary tracking-[0.14em] uppercase compact:hidden">
          <span className="font-bold text-iris-blue">Íris</span> · Laboratório de Inovação e Dados · Governo do Ceará
        </p>
        <nav aria-label="Controles do protótipo" className="pointer-events-auto flex items-center gap-1 font-notation tracking-[0.08em]">
          <Credits illustrative={PARTICIPATIONS_ARE_ILLUSTRATIVE} events={state.events} review={state.reviewQueue} collective={state.collective} />
          <span className="px-1 uppercase">Protótipo</span>
          {state.reviewQueue.length > 0 && <span className="px-1 uppercase">Para conferência: {state.reviewQueue.length}</span>}
          <Button variant="subtle" onClick={() => dispatch({ type: "restart" })}>
            ↺ Reiniciar
          </Button>
        </nav>
      </footer>
      {state.step !== "opening" && (
        <nav aria-label="Navegação" className="pointer-events-none fixed bottom-0 left-2 z-10 bg-paper/80 pr-3 text-[12px] text-ink-soft">
          <Button variant="subtle" onClick={commands.anotherName} aria-label="Voltar ao início">
            ← Início
          </Button>
        </nav>
      )}
    </main>
  );
}
