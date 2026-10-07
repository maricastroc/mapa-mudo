"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import { Tooltip } from "react-tooltip";
import type { ScientistPhoto } from "@/content/scientists/types";
import type { TerrainField } from "@/map/terrainField";
import { cellExtremes, traceContours } from "@/map/contours";
import { MapAnchor, useMapView } from "@/map/MapCanvas";
import { toScreen } from "@/map/mapRenderer";
import type { SheetPoint } from "@/participation/sheetLayout";
import { PHOTO_CLASS } from "./PortraitPhoto";
import { SCALE_STOPS, type DiscoveryGeometry } from "./scenes";
import type { Step } from "./state";
import { ArrowIcon, TriangleMarker } from "./ui";

const SHEET_STEPS: Step[] = ["opening", "noName", "askAgain", "collective"];
const PORTRAIT_TOOLTIP = "portrait-name";

export function mapPosition(field: TerrainField, p: SheetPoint) {
  if (!p.scientistId || p.mentions <= 0) return { x: p.x, y: p.y };
  return field.summit({ id: p.scientistId, x: p.x, y: p.y, mentions: p.mentions });
}

function visible(on: boolean) {
  return `transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`;
}

function nameSize(mentions: number) {
  return 10 + 1.85 * Math.sqrt(mentions);
}

export function SheetMarkers({
  step,
  field,
  points,
  discoveryId,
  saidId,
}: {
  step: Step;
  field: TerrainField;
  points: SheetPoint[];
  discoveryId: string | null;
  saidId: string | null;
}) {
  const onSheet = SHEET_STEPS.includes(step);
  const rank = new Map([...points].sort((a, b) => b.mentions - a.mentions).map((p, i) => [p.key, i]));
  return (
    <div aria-hidden="true" className={visible(onSheet)}>
      {points.map((p) => {
        const { x, y } = mapPosition(field, p);
        const named = step === "collective" && p.name !== null && p.mentions > 0;
        const reserved = p.scientistId !== null && p.scientistId === discoveryId && (step === "noName" || step === "askAgain");
        if (named) {
          const highlighted = p.scientistId === saidId;
          return (
            <MapAnchor key={p.key} x={x} y={y}>
              {highlighted &&
                [0, 800, 1600].map((delay) => (
                  <span
                    key={delay}
                    className="ripple absolute -top-[calc(var(--u)*70px)] -left-[calc(var(--u)*70px)] block size-[calc(var(--u)*140px)] rounded-full border-2 border-accent"
                    style={{ animationDelay: `${2400 + delay}ms`, animationDuration: "2600ms", animationIterationCount: 2, animationFillMode: "both" }}
                  />
                ))}
              <div
                className="fade-in relative flex -translate-x-1/2 -translate-y-1/2 flex-col items-center whitespace-nowrap"
                style={{ animationDelay: `${600 + (rank.get(p.key) ?? 0) * 70}ms` }}
              >
                <span
                  className={`px-[0.18em] leading-[1.1] font-bold tracking-[0.03em] text-ink uppercase ${highlighted ? "bg-accent" : "bg-paper"}`}
                  style={{ fontSize: `calc(var(--u) * ${nameSize(p.mentions).toFixed(1)}px)` }}
                >
                  {p.name}
                </span>
                <span
                  className={`px-1 font-notation text-[calc(var(--u)*12px)] leading-tight ${highlighted ? "bg-accent font-medium text-ink" : "bg-paper text-ink-soft"}`}
                >
                  {p.mentions}
                  {highlighted && " · +1"}
                </span>
              </div>
            </MapAnchor>
          );
        }
        return (
          <MapAnchor key={p.key} x={x} y={y}>
            <div
              className={`flex -translate-x-[6px] -translate-y-[11px] items-end gap-1.5 transition-opacity duration-500 ${reserved ? "opacity-0" : step === "noName" ? "opacity-40" : "opacity-100"}`}
            >
              <TriangleMarker />
              <span className="mb-[-1px] block h-0 w-[calc(var(--u)*70px)] border-b-[1.5px] border-ink" />
            </div>
          </MapAnchor>
        );
      })}
    </div>
  );
}

export function PlaceNames({ step, geometry }: { step: Step; geometry: DiscoveryGeometry }) {
  return (
    <div aria-hidden="true" className={visible(step === "clue1")}>
      {geometry.places.map((l) => (
        <MapAnchor key={l.text} x={l.x} y={l.y}>
          <span
            className={`block -translate-x-1/2 -translate-y-1/2 font-notation text-[calc(var(--u)*15px)] whitespace-nowrap text-ink-soft uppercase ${l.text.length > 10 ? "tracking-[0.3em]" : "tracking-[0.6em]"}`}
            style={{ rotate: `${l.rotation}deg` }}
          >
            {l.text}
          </span>
        </MapAnchor>
      ))}
    </div>
  );
}

export function PointLabel({ step, geometry }: { step: Step; geometry: DiscoveryGeometry }) {
  const text =
    step === "noName"
      ? `PONTO ${geometry.code} · SEM NOME`
      : step === "clue1" || step === "clue2"
        ? `PONTO ${geometry.code}`
        : null;
  const onRight = step === "noName";
  return (
    <div aria-hidden="true" className={visible(text !== null)}>
      <MapAnchor x={geometry.summit.x} y={geometry.summit.y}>
        <span
          className={`absolute bg-paper px-2 py-1 font-notation text-[calc(var(--u)*14px)] font-medium tracking-[0.06em] whitespace-nowrap text-ink ${
            onRight
              ? "top-0 left-[calc(var(--u)*134px)] -translate-y-1/2"
              : step === "clue1"
                ? "bottom-[calc(var(--u)*88px)] left-[calc(var(--u)*-50px)]"
                : "top-0 right-[calc(var(--u)*62px)] -translate-y-1/2"
          }`}
        >
          {text ?? ""}
        </span>
      </MapAnchor>
    </div>
  );
}

export function Transect({ step, geometry, prefix }: { step: Step; geometry: DiscoveryGeometry; prefix: string }) {
  const line = useRef<SVGPolylineElement>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  useMapView((v) => {
    const pts = geometry.transect.map((p) => toScreen(v, p.x, p.y));
    line.current?.setAttribute("points", pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    pts.forEach(([x, y], i) => groups.current[i]?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`));
  });
  const active = step === "clue2";
  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${visible(active)}`}>
      <polyline
        ref={line}
        key={active ? "active" : "inactive"}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray="5 5"
        className={active ? "fade-in" : ""}
        style={{ animationDelay: "1600ms" }}
      />
      {geometry.transect.map((_, i) =>
        i === 0 ? null : (
          <g
            key={i}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <g className={active ? "fade-in" : ""} style={{ animationDelay: `${1700 + i * 220}ms` }}>
              <rect
                x={-6}
                y={-6}
                width={12}
                height={12}
                fill={i === 2 ? "var(--ink)" : "var(--paper)"}
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <text
                x={14}
                y={-12}
                className="font-notation"
                fontSize={13}
                fontWeight={i === 2 ? 500 : 400}
                fill="var(--ink)"
                paintOrder="stroke"
                stroke="var(--paper)"
                strokeWidth={5}
              >
                {`${prefix}-${String(i + 1).padStart(2, "0")}`}
              </text>
            </g>
          </g>
        ),
      )}
    </svg>
  );
}

export type LensVariant = "none" | "crosshair" | "crosshairLong" | "dot" | "core" | "portrait";

export function lensVariantFor(step: Step): LensVariant {
  switch (step) {
    case "noName":
      return "crosshair";
    case "clue1":
      return "crosshairLong";
    case "clue2":
      return "dot";
    case "clue3":
      return "core";
    case "humanScale":
    case "profile":
      return "portrait";
    default:
      return "none";
  }
}

export function LensRing({ variant }: { variant: LensVariant }) {
  const root = useRef<SVGSVGElement>(null);
  const shape = useRef<SVGRectElement>(null);
  const ticks = useRef<SVGPathElement>(null);
  const center = useRef<SVGPathElement>(null);
  useMapView((v) => {
    const l = v.lens;
    const r = shape.current;
    const m = ticks.current;
    const c = center.current;
    const s = root.current;
    if (!r || !m || !c || !s) return;
    const opacity = variant !== "none" ? l.o : 0;
    s.style.opacity = opacity.toFixed(3);
    s.style.visibility = opacity < 0.01 ? "hidden" : "";
    const x0 = l.x - l.w / 2;
    const y0 = l.y - l.h / 2;
    r.setAttribute("x", x0.toFixed(1));
    r.setAttribute("y", y0.toFixed(1));
    r.setAttribute("width", Math.max(0, l.w).toFixed(1));
    r.setAttribute("height", Math.max(0, l.h).toFixed(1));
    const rx = Math.min(l.r, l.w / 2, l.h / 2);
    r.setAttribute("rx", rx.toFixed(1));
    r.setAttribute("ry", rx.toFixed(1));
    const inkStroke = variant === "portrait" || variant === "core";
    r.setAttribute("stroke", inkStroke ? "var(--ink)" : "var(--accent)");
    const u = v.fit;
    let d = "";
    if (variant === "crosshair") {
      const g = 15 * u;
      const t = 52 * u;
      d = `M${l.x} ${y0 - g}V${y0 - g - t}M${l.x} ${y0 + l.h + g}V${y0 + l.h + g + t}M${x0 - g} ${l.y}H${x0 - g - t}M${x0 + l.w + g} ${l.y}H${x0 + l.w + g + t}`;
    } else if (variant === "crosshairLong") {
      d = `M${x0 + l.w} ${l.y}H${v.W}M${l.x} ${y0 + l.h}V${v.H}`;
    } else if (variant === "portrait") {
      const t = 26 * u;
      const g = 4 * u;
      d = `M${l.x} ${y0 - g}V${y0 - g - t}M${l.x} ${y0 + l.h + g}V${y0 + l.h + g + t}M${x0 - g} ${l.y}H${x0 - g - t}M${x0 + l.w + g} ${l.y}H${x0 + l.w + g + t}`;
    }
    m.setAttribute("d", d);
    m.setAttribute("stroke-width", variant === "crosshairLong" ? "1" : "2");
    const dot = variant === "crosshairLong" || variant === "dot";
    const triangle = variant === "crosshair";
    c.setAttribute(
      "d",
      dot
        ? `M${l.x - 5} ${l.y}a5 5 0 1 0 10 0a5 5 0 1 0 -10 0`
        : triangle
          ? `M${l.x} ${l.y - 7}L${l.x + 6} ${l.y + 4}L${l.x - 6} ${l.y + 4}Z`
          : "",
    );
  });
  return (
    <svg ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <rect ref={shape} fill="none" strokeWidth={2} />
      <path ref={ticks} fill="none" stroke="var(--accent)" />
      <path ref={center} fill="var(--accent)" />
    </svg>
  );
}

export function usePortraitContourPaths(field: TerrainField, n = 72, levelCount = 15) {
  return useMemo(() => {
    const v = new Float64Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        v[j * n + i] = field.portrait((i / (n - 1)) * 2 - 1, (j / (n - 1)) * 2 - 1);
      }
    }
    const min = new Float32Array((n - 1) * (n - 1));
    const max = new Float32Array((n - 1) * (n - 1));
    cellExtremes(v, n, n, min, max);
    let top = 0;
    for (let k = 0; k < v.length; k++) if (v[k] > top) top = v[k];
    const scale = 100 / (n - 1);
    const paths: string[] = [];
    for (let k = 1; k <= levelCount; k++) {
      const lines = traceContours(v, n, n, (k / (levelCount + 1)) * top, min, max);
      for (const l of lines) {
        let d = "";
        for (let i = 0; i < l.pts.length; i += 2) d += `${i ? "L" : "M"}${(l.pts[i] * scale).toFixed(1)} ${(l.pts[i + 1] * scale).toFixed(1)}`;
        paths.push(l.closed ? d + "Z" : d);
      }
    }
    return paths;
  }, [field, n, levelCount]);
}

export function PortraitMedallion({
  step,
  field,
  geometry,
  name,
  photo,
  onOpen,
}: {
  step: Step;
  field: TerrainField;
  geometry: DiscoveryGeometry;
  name: string;
  photo: ScientistPhoto | null;
  onOpen: () => void;
}) {
  const paths = usePortraitContourPaths(field);
  const active = step === "askAgain";
  return (
    <div aria-hidden={!active} inert={!active} className={visible(active)}>
      <MapAnchor x={geometry.summit.x} y={geometry.summit.y}>
        <button
          type="button"
          data-medallion-button
          data-tooltip-id={PORTRAIT_TOOLTIP}
          data-tooltip-content={name}
          onClick={onOpen}
          aria-label={`Ver perfil de ${name}`}
          className={`group absolute -translate-x-1/2 -translate-y-[calc(100%+var(--u)*14px)] cursor-pointer rounded-full outline-none ${active ? "pointer-events-auto" : ""}`}
        >
          <span
            aria-hidden="true"
            className="absolute -inset-[7px] rounded-full border-[1.5px] border-dashed border-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
          {photo?.src ? (
            <span className="relative block size-[calc(var(--u)*84px)] overflow-hidden rounded-full border-2 border-accent bg-paper">
              <Image src={photo.src} alt="" fill sizes="96px" className={PHOTO_CLASS} />
            </span>
          ) : (
            <svg viewBox="0 0 100 100" className="block size-[calc(var(--u)*84px)] rounded-full border-2 border-accent bg-paper">
              <g fill="none" stroke="var(--ink)" strokeWidth={1.1}>
                {paths.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
            </svg>
          )}
        </button>
        <div aria-hidden="true" className="absolute top-0 left-0 -translate-x-[6px] -translate-y-[11px]">
          <TriangleMarker tone="accent" />
        </div>
      </MapAnchor>
      <Tooltip
        id={PORTRAIT_TOOLTIP}
        place="top"
        offset={12}
        opacity={1}
        disableStyleInjection
        className="z-20 bg-ink px-3 py-2 text-paper"
        classNameArrow="size-2 rotate-45"
        render={({ content }) => (
          <span className="flex flex-col items-start gap-1">
            <span className="font-primary text-[14px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase">{content}</span>
            <span className="flex items-center gap-1.5 font-notation text-[11px] tracking-[0.1em] whitespace-nowrap text-accent">
              VER PERFIL
              <ArrowIcon className="size-3" />
            </span>
          </span>
        )}
      />
    </div>
  );
}

export function SaidNameLabel({
  step,
  field,
  point,
  illustrative,
}: {
  step: Step;
  field: TerrainField;
  point: SheetPoint | undefined;
  illustrative: boolean;
}) {
  const active = step === "nameSaid";
  const contourLabel = useRef<HTMLDivElement>(null);
  useMapView((v) => {
    const el = contourLabel.current;
    if (!el) return;
    const c = v.newContour;
    el.style.opacity = c ? "1" : "0";
    if (!c) return;
    const width = el.offsetWidth;
    const fitsRight = c.x + c.r + 18 + width < v.W - 16;
    const x = fitsRight ? c.x + c.r + 18 : Math.min(v.W - 16 - width, Math.max(16, c.x - width / 2));
    const y = fitsRight ? c.y - c.r * 0.35 : Math.min(v.H - 48, c.y + c.r + 14);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });
  if (!point || !point.name) return null;
  const summit = mapPosition(field, point);
  const mentions = point.mentions;
  return (
    <div aria-hidden="true" className={visible(active)}>
      <MapAnchor x={summit.x} y={summit.y}>
        <div className="absolute top-[calc(var(--u)*92px)] left-0 flex -translate-x-1/2 flex-col items-center gap-1.5">
          <div
            key={active ? `${point.key}-${mentions}` : "idle"}
            className="fade-in flex items-baseline gap-[0.3em] bg-paper px-[0.3em] text-[calc(var(--u)*58px)] leading-none font-bold tracking-[0.03em] whitespace-nowrap uppercase"
            style={{ animationDelay: "1500ms" }}
          >
            <span>{point.name}</span>
            <span className="fade-in bg-accent px-[0.16em] text-ink" style={{ animationDelay: "3300ms" }}>
              +1
            </span>
          </div>
          <span
            className="fade-in bg-paper px-2 font-notation text-[calc(var(--u)*13px)] tracking-[0.06em] whitespace-nowrap text-ink-soft"
            style={{ animationDelay: "3500ms" }}
          >
            DITO {mentions} {mentions === 1 ? "VEZ" : "VEZES"} NESTA FEIRA{illustrative ? " · CONTAGEM ILUSTRATIVA" : ""}
          </span>
        </div>
      </MapAnchor>
      <div ref={contourLabel} className="pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-500">
        <span className="flex items-center gap-2 bg-paper px-2 py-1 font-notation text-[calc(var(--u)*14px)] font-medium tracking-[0.06em] whitespace-nowrap text-ink">
          <span className="block h-0 w-[calc(var(--u)*26px)] border-t-2 border-accent" />
          +1 CURVA DE NÍVEL · DITO PELA {mentions}ª VEZ
        </span>
      </div>
    </div>
  );
}

function formatScale(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function ScaleRuler({ showTrack, baseZoom }: { showTrack: boolean; baseZoom: number }) {
  const label = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stages = useRef<(HTMLSpanElement | null)[]>([]);
  useMapView((v) => {
    const lz = Math.log(Math.max(1, v.camera.z / baseZoom));
    let i = 0;
    while (i < SCALE_STOPS.length - 2 && lz > Math.log(SCALE_STOPS[i + 1].z)) i++;
    const a = SCALE_STOPS[i];
    const b = SCALE_STOPS[i + 1];
    const t = Math.max(0, Math.min(1, (lz - Math.log(a.z)) / (Math.log(b.z) - Math.log(a.z))));
    const position = i + t;
    const scale = Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t);
    if (label.current) label.current.textContent = `ESCALA 1:${formatScale(scale)}`;
    if (caret.current) caret.current.style.left = `${(position / (SCALE_STOPS.length - 1)) * 100}%`;
    if (track.current) {
      const o = showTrack ? Math.max(0, Math.min(1, position / 0.25)) : 0;
      track.current.style.opacity = o.toFixed(3);
      track.current.style.visibility = o < 0.01 ? "hidden" : "";
    }
    stages.current.forEach((el, k) => {
      if (!el) return;
      const near = Math.abs(position - k) < 0.5;
      el.style.color = near ? "var(--iris-blue)" : "";
      el.style.fontWeight = near ? "500" : "";
    });
  });
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-[calc(var(--u)*36px)] right-[calc(var(--u)*48px)] flex flex-col items-end gap-3 font-notation text-[13px] tracking-[0.06em] text-ink-soft compact:top-3 compact:right-3 compact:text-[11px]"
    >
      <div className="flex items-center gap-3.5 bg-paper px-2 py-1">
        <span ref={label}>ESCALA 1:2 000 000</span>
        <span className="block h-[6px] w-[120px] border-[1.5px] border-t-0 border-ink compact:w-[60px]" />
      </div>
      <div ref={track} className="relative w-[440px] bg-paper px-2 pt-3 pb-1 compact:hidden">
        <div className="relative mx-[28px] h-[10px] border-b-[1.5px] border-ink">
          {SCALE_STOPS.map((p, k) => (
            <span
              key={p.stage}
              className="absolute bottom-[-1.5px] h-[8px] w-[1.5px] bg-ink"
              style={{ left: `${(k / (SCALE_STOPS.length - 1)) * 100}%` }}
            />
          ))}
          <span ref={caret} className="absolute bottom-[10px] -translate-x-1/2">
            <span className="block h-0 w-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-accent" />
          </span>
        </div>
        <div className="relative mx-[28px] mt-1.5 h-[16px] text-[11px]">
          {SCALE_STOPS.map((p, k) => (
            <span
              key={p.stage}
              ref={(el) => {
                stages.current[k] = el;
              }}
              className="absolute -translate-x-1/2 whitespace-nowrap uppercase"
              style={{ left: `${(k / (SCALE_STOPS.length - 1)) * 100}%` }}
            >
              {p.stage}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
