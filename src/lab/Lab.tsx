"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "./useReducedMotion.ts";
import { BENCHES, benchById, type BenchId, type BenchRecord } from "./benches.ts";
import { IntroCard } from "./IntroCard.tsx";
import { Reveal } from "./Reveal.tsx";
import { TitleScreen } from "./TitleScreen.tsx";
import { CurieBench } from "./curie/CurieBench.tsx";
import { MeasureDemo } from "./curie/MeasureDemo.tsx";
import { JohnsonBench } from "./johnson/JohnsonBench.tsx";
import { TrajectoryCheck } from "./johnson/TrajectoryCheck.tsx";
import { FrogIntroArt } from "./lutz/FrogIntroArt.tsx";
import { IdentifyDemo } from "./lutz/IdentifyDemo.tsx";
import { LutzBench } from "./lutz/LutzBench.tsx";
import { CureDemo } from "./tu/CureDemo.tsx";
import { MazeIntroArt } from "./tu/MazeIntroArt.tsx";
import { TuBench } from "./tu/TuBench.tsx";

const IDLE_MS = 90_000;

type View =
  | { kind: "title" }
  | { kind: "bench"; id: BenchId; stage: "intro" | "play" | "reveal"; record: BenchRecord | null; run: number };

function stayStill() {
  return () => {};
}

function requestedBench() {
  const bench = benchById(new URLSearchParams(window.location.search).get("bench"));
  return bench?.available ? bench.id : null;
}

function useRequestedBench() {
  return useSyncExternalStore(stayStill, requestedBench, () => null);
}

export function Lab() {
  const reducedMotion = useReducedMotion();
  const requested = useRequestedBench();
  const [chosen, setView] = useState<View | null>(null);
  const [done, setDone] = useState<ReadonlySet<BenchId>>(() => new Set());
  const view: View = chosen ?? (requested ? { kind: "bench", id: requested, stage: "intro", record: null, run: 0 } : { kind: "title" });

  const open = useCallback((id: BenchId) => {
    setView({ kind: "bench", id, stage: "intro", record: null, run: Date.now() });
  }, []);

  const toTitle = useCallback(() => setView({ kind: "title" }), []);

  const pass = useCallback(() => {
    setDone(new Set());
    setView({ kind: "title" });
  }, []);

  useEffect(() => {
    let timer = window.setTimeout(pass, IDLE_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(pass, IDLE_MS);
    };
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [pass]);

  const startNext = () => {
    const next = BENCHES.find((b) => b.available && !done.has(b.id)) ?? BENCHES.find((b) => b.available);
    if (next) open(next.id);
  };

  if (view.kind === "title") {
    return <TitleScreen done={done} onStart={startNext} onOpen={open} />;
  }

  const bench = benchById(view.id);
  if (!bench) return null;

  if (view.stage === "reveal") {
    const copy = bench.reveal.demo;
    const demo = !copy ? null : bench.id === "johnson" ? (
      <TrajectoryCheck copy={copy} reducedMotion={reducedMotion} />
    ) : bench.id === "curie" ? (
      <MeasureDemo copy={copy} reducedMotion={reducedMotion} />
    ) : bench.id === "lutz" ? (
      <IdentifyDemo copy={copy} reducedMotion={reducedMotion} />
    ) : bench.id === "tu" ? (
      <CureDemo copy={copy} reducedMotion={reducedMotion} />
    ) : null;
    return <Reveal bench={bench} record={view.record} done={done} demo={demo} onNext={toTitle} onPass={pass} />;
  }

  const complete = (record: BenchRecord) => {
    setDone((d) => new Set(d).add(bench.id));
    setView({ kind: "bench", id: bench.id, stage: "reveal", record, run: view.run });
  };

  return (
    <div className="absolute inset-0" key={`${view.id}-${view.run}`}>
      {bench.id === "johnson" && <JohnsonBench active={view.stage === "play"} reducedMotion={reducedMotion} onComplete={complete} />}
      {bench.id === "curie" && <CurieBench active={view.stage === "play"} reducedMotion={reducedMotion} onComplete={complete} />}
      {bench.id === "lutz" && <LutzBench active={view.stage === "play"} reducedMotion={reducedMotion} onComplete={complete} />}
      {bench.id === "tu" && <TuBench active={view.stage === "play"} reducedMotion={reducedMotion} onComplete={complete} />}
      {view.stage === "intro" && (
        <IntroCard
          bench={bench}
          art={
            bench.intro.cues ? (
              <FrogIntroArt newLabel={bench.intro.cues.fresh} seenLabel={bench.intro.cues.seen} reducedMotion={reducedMotion} />
            ) : bench.intro.steps ? (
              <MazeIntroArt steps={bench.intro.steps} reducedMotion={reducedMotion} />
            ) : null
          }
          onStart={() => setView({ ...view, stage: "play" })}
        />
      )}
    </div>
  );
}
