"use client";

import { createContext, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import type { TerrainField } from "./terrainField.ts";
import { MapRenderer, toScreen, type Camera, type SceneTarget, type View } from "./mapRenderer.ts";

class ViewBus {
  private listeners = new Set<(v: View) => void>();
  last: View | null = null;
  emit(v: View) {
    this.last = v;
    for (const fn of this.listeners) fn(v);
  }
  subscribe(fn: (v: View) => void) {
    this.listeners.add(fn);
    if (this.last) fn(this.last);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

const MapViewContext = createContext<ViewBus | null>(null);

export function useMapView(fn: (v: View) => void) {
  const bus = useContext(MapViewContext);
  const onFrame = useEffectEvent(fn);
  useEffect(() => {
    if (!bus) return;
    return bus.subscribe((v) => onFrame(v));
  }, [bus]);
}

type MapCanvasProps = {
  field: TerrainField;
  target: SceneTarget;
  stepKey: string;
  screenKey: string;
  reducedMotion: boolean;
  description: string;
  children: ReactNode;
};

export function MapCanvas({ field, target, stepKey, screenKey, reducedMotion, description, children }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const targetRef = useRef(target);
  const stepRef = useRef(stepKey);
  const screenRef = useRef(screenKey);
  const [bus] = useState(() => new ViewBus());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new MapRenderer(canvas, field, targetRef.current);
    rendererRef.current = renderer;
    const unsubscribe = renderer.subscribe((v) => bus.emit(v));
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      renderer.resize(r.width, r.height, window.devicePixelRatio || 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      unsubscribe();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [field, bus]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const stepChanged = stepRef.current !== stepKey;
    const screenChanged = screenRef.current !== screenKey;
    targetRef.current = target;
    stepRef.current = stepKey;
    screenRef.current = screenKey;
    if (!renderer) return;
    renderer.reducedMotion = reducedMotion;
    if (stepChanged) renderer.setTarget(target, reducedMotion);
    else if (screenChanged) renderer.setTarget(target, true);
  }, [target, stepKey, screenKey, reducedMotion]);

  return (
    <MapViewContext.Provider value={bus}>
      <div className="graph-paper fixed inset-0 overflow-clip">
        <canvas ref={canvasRef} role="img" aria-label={description} className="absolute inset-0 block h-full w-full" />
        {children}
      </div>
    </MapViewContext.Provider>
  );
}

export function MapAnchor({
  x,
  y,
  className,
  children,
}: {
  x: number;
  y: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMapView((v) => {
    const el = ref.current;
    if (!el) return;
    const [sx, sy] = toScreen(v, x, y);
    const outside = sx < -600 || sy < -600 || sx > v.W + 600 || sy > v.H + 600;
    el.style.visibility = outside ? "hidden" : "";
    if (!outside) el.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`;
  });
  return (
    <div ref={ref} className={`pointer-events-none absolute top-0 left-0 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function ZoomPlane({
  rest,
  leaving,
  current,
  children,
  label,
}: {
  rest: Camera;
  leaving: boolean;
  current: boolean;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useMapView((v) => {
    const el = ref.current;
    if (!el) return;
    const k = v.camera.z / rest.z;
    const e = v.camera.z * v.fit;
    const tx = v.camera.ax * v.W + (rest.x - v.camera.x) * e - k * rest.ax * v.W;
    const ty = v.camera.ay * v.H + (rest.y - v.camera.y) * e - k * rest.ay * v.H;
    const distance = Math.abs(Math.log2(k));
    const opacity = Math.max(0, Math.min(1, 1 - distance / 1.7));
    el.style.opacity = opacity.toFixed(3);
    el.style.visibility = opacity < 0.01 && !current ? "hidden" : "";
    el.style.transform =
      distance < 1e-4 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01
        ? ""
        : `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${k.toFixed(5)})`;
  });
  return (
    <section
      ref={ref}
      aria-label={label}
      aria-hidden={leaving || undefined}
      inert={leaving}
      data-current-plane={current || undefined}
      className="pointer-events-none absolute inset-0 origin-top-left"
    >
      <div className={`absolute inset-0 ${leaving ? "fade-out" : ""}`}>{children}</div>
    </section>
  );
}
