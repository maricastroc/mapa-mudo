"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Tooltip } from "react-tooltip";
import type { ScientistPhoto } from "@/content/scientists/types";
import type { TerrainField } from "@/map/terrainField";
import { TRENCH_CAPTION, TRENCH_SERIES, trenchDepths, trenchRing } from "@/map/trench";
import { isAboveWater, unnamedCount, type Collective, type NameKind } from "@/participation/collective";
import { cellExtremes, traceContours } from "@/map/contours";
import { MapAnchor, useMapView } from "@/map/MapCanvas";
import { toScreen, type Camera } from "@/map/mapRenderer";
import { presenceAt, type SheetPoint } from "@/participation/sheetLayout";
import { markPhotoMissing, PHOTO_CLASS, useAvailablePhoto } from "./PortraitPhoto";
import { discoveryNameShown, isLayerActive, medallionShown, sheetMarkTone, type LensVariant, type SheetMarkTone } from "./layers";
import { FORCED_LABEL, labelFontSize, labelSize, placeLabels, type Box, type LabelPlacement } from "./mapLabels";
import { COLLECTIVE_SETTLE, NEW_CONTOUR_RADIUS, SCALE_STOPS, toFieldPoint, type DiscoveryGeometry } from "./scenes";
import type { Step } from "./state";
import { ArrowIcon, TriangleMarker } from "./ui";

const PORTRAIT_TOOLTIP = "portrait-name";

export function mapPosition(field: TerrainField, p: SheetPoint) {
  if (!p.scientistId || presenceAt(p) <= 0) return { x: p.x, y: p.y };
  return field.summit(toFieldPoint(p));
}

function visible(on: boolean) {
  return `transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`;
}

type LabelView = { W: number; H: number; fit: number; camera: Camera };

function SummitMark({ filled, unit }: { filled: boolean; unit: number }) {
  const size = 10 * Math.max(0.9, unit);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 9"
      width={size}
      height={size * 0.9}
      className={`absolute -translate-x-1/2 -translate-y-[60%] overflow-visible ${filled ? "" : "opacity-55"}`}
    >
      <path d="M5 0.8 L9.3 8.2 L0.7 8.2 Z" fill={filled ? "var(--ink)" : "none"} stroke={filled ? "var(--ink)" : "var(--ink-soft)"} strokeWidth={1.1} />
    </svg>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function describeCounts(p: SheetPoint) {
  return [
    p.recall > 0 ? `${plural(p.recall, "lembrança", "lembranças")} sem pista` : null,
    p.reef > 0 ? `conhecida aqui por ${plural(p.reef, "pessoa", "pessoas")}` : null,
  ]
    .filter((t) => t !== null)
    .join(", ");
}

export function explainedPoints(points: SheetPoint[]) {
  const named = points.filter((p) => p.name !== null);
  const rock = named.filter((p) => p.recall > 0).sort((a, b) => b.recall - a.recall || a.key.localeCompare(b.key))[0];
  const reef = named
    .filter((p) => p.reef > 0)
    .sort((a, b) => Number(a.recall > 0) - Number(b.recall > 0) || b.reef - a.reef || a.key.localeCompare(b.key))[0];
  return { rock: rock?.key ?? null, reef: reef?.key ?? null };
}

function CoralDot() {
  return <span aria-hidden="true" className="inline-block size-[0.62em] translate-y-[0.02em] self-center rounded-full bg-accent" />;
}

const POINT_MARKS: Record<SheetMarkTone, { w: number; h: number; fill: string; stroke: string; width: number }> = {
  unknown: { w: 9, h: 8, fill: "none", stroke: "var(--isobath-index)", width: 1.2 },
  revealed: { w: 9, h: 8, fill: "var(--accent)", stroke: "var(--accent)", width: 0.8 },
  waiting: { w: 12, h: 11, fill: "var(--accent)", stroke: "var(--accent)", width: 0.8 },
};

function PointMark({ tone }: { tone: SheetMarkTone }) {
  const m = POINT_MARKS[tone];
  return (
    <svg
      aria-hidden="true"
      width={m.w}
      height={m.h}
      viewBox={`0 0 ${m.w} ${m.h}`}
      className="absolute top-0 left-0 block overflow-visible"
      style={{ transform: `translate(${-m.w / 2}px, ${-m.h}px)` }}
    >
      {tone === "waiting" && <circle cx={m.w / 2} cy={m.h * 0.62} r={13} fill="none" stroke="var(--accent)" strokeWidth={1.5} />}
      <path d={`M${m.w / 2} 0.6L${m.w - 0.6} ${m.h - 0.6}L0.6 ${m.h - 0.6}Z`} fill={m.fill} stroke={m.stroke} strokeWidth={m.width} />
    </svg>
  );
}

function labelPosition(placement: LabelPlacement, x: number, y: number): CSSProperties {
  const top = placement.box.y0 - y;
  if (placement.side === "north" || placement.side === "south") return { top, left: 0, transform: "translateX(-50%)" };
  if (placement.side === "west" || placement.side === "northwest" || placement.side === "southwest") return { top, right: x - placement.box.x1 };
  return { top, left: placement.box.x0 - x };
}

function CollectiveMarkers({
  field,
  points,
  saidId,
  view,
  unit,
  obstacles,
  returning,
  onOpenProfile,
}: {
  field: TerrainField;
  points: SheetPoint[];
  saidId: string | null;
  view: LabelView;
  unit: number;
  obstacles: Box[];
  returning: boolean;
  onOpenProfile: (id: string) => void;
}) {
  const [celebrate] = useState(() => !returning);
  const layout = useMemo(() => {
    const items = points.map((p) => {
      const position = mapPosition(field, p);
      const [sx, sy] = toScreen(view, position.x, position.y);
      return { p, position, sx, sy, named: p.name !== null && presenceAt(p) > 0 };
    });
    const explained = explainedPoints(points);
    const fonts = new Map<string, number>();
    const labels = items
      .filter((i) => i.named)
      .map(({ p, sx, sy }) => {
        const said = p.scientistId !== null && p.scientistId === saidId;
        const presence = presenceAt(p);
        const font = labelFontSize(presence, unit);
        fonts.set(p.key, font);
        const words = (explained.rock === p.key ? 6 : 0) + (explained.reef === p.key ? 9.5 : 0) + (p.returned > 0 ? 4.4 : 0);
        const counts = (p.reef > 0 ? (p.recall > 0 ? 1.9 : 1.1) : 0) + words;
        return {
          key: p.key,
          x: sx,
          y: sy,
          ...labelSize(p.name ?? "", presence, font, (said ? 2 : 0) + counts),
          priority: said ? Number.POSITIVE_INFINITY : explained.rock === p.key || explained.reef === p.key ? FORCED_LABEL + presence : presence,
        };
      });
    const placements = placeLabels({
      labels,
      markers: items.map((i) => ({ key: i.p.key, x: i.sx, y: i.sy, named: i.named })),
      obstacles,
      bounds: { x0: 10, y0: 10, x1: view.W - 10, y1: view.H - 10 },
    });
    const order = new Map([...labels].sort((a, b) => b.priority - a.priority).map((l, i) => [l.key, i]));
    return { items, fonts, placements, order, explained };
  }, [field, points, saidId, view, unit, obstacles]);

  return (
    <>
      {layout.items.map(({ p, position, sx, sy, named }) => {
        const said = celebrate && p.scientistId !== null && p.scientistId === saidId;
        const placement = layout.placements.get(p.key);
        const font = layout.fonts.get(p.key) ?? 13;
        const profileId = p.featured && p.scientistId ? p.scientistId : null;
        const Label = profileId ? "button" : "span";
        return (
          <MapAnchor key={p.key} x={position.x} y={position.y} className={said ? "z-10" : undefined}>
            <span aria-hidden="true">
              <SummitMark filled={named && isAboveWater(p.recall, p.reef)} unit={unit} />
            </span>
            {named && placement && (
              <Label
                {...(profileId
                  ? {
                      type: "button" as const,
                      "data-profile-link": profileId,
                      "aria-label": `${p.name}: ${describeCounts(p)}. Ver perfil`,
                      onClick: () => onOpenProfile(profileId),
                    }
                  : { "aria-hidden": true })}
                className={`map-label fade-in group absolute flex items-baseline whitespace-nowrap leading-[1.25] ${
                  profileId
                    ? "pointer-events-auto cursor-pointer rounded-[2px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iris-blue"
                    : ""
                }`}
                style={{ ...labelPosition(placement, sx, sy), animationDelay: `${700 + (layout.order.get(p.key) ?? 0) * 45}ms` }}
              >
                <span
                  className={`tracking-[0.08em] text-ink uppercase decoration-accent decoration-2 underline-offset-[0.22em] group-hover:underline group-focus-visible:underline ${said ? "font-bold" : "font-semibold"}`}
                  style={{ fontSize: font }}
                >
                  {p.name}
                </span>
                {p.recall > 0 && (
                  <span className="ml-[0.45em] font-notation text-ink-soft" style={{ fontSize: font * 0.74 }}>
                    {layout.explained.rock === p.key ? `${p.recall} ${p.recall === 1 ? "lembrou" : "lembraram"}` : p.recall}
                  </span>
                )}
                {p.reef > 0 && (
                  <span className="ml-[0.45em] inline-flex items-baseline gap-[0.22em] font-notation text-ink-soft" style={{ fontSize: font * 0.74 }}>
                    <CoralDot />
                    {layout.explained.reef === p.key ? `${p.reef} ${p.reef === 1 ? "conheceu" : "conheceram"} aqui` : p.reef}
                  </span>
                )}
                {p.returned > 0 && (
                  <span className="ml-[0.45em] font-notation font-medium text-ink" style={{ fontSize: font * 0.74 }}>
                    voltou
                  </span>
                )}
                {said && (
                  <span
                    className="ml-[0.4em] max-w-[3em] overflow-hidden bg-accent px-[0.3em] font-notation font-medium text-ink [text-shadow:none]"
                    style={{
                      fontSize: font * 0.74,
                      animation: `settle-out ${COLLECTIVE_SETTLE.duration}ms ease ${COLLECTIVE_SETTLE.delay}ms forwards`,
                    }}
                  >
                    +1
                  </span>
                )}
              </Label>
            )}
          </MapAnchor>
        );
      })}
    </>
  );
}

export function SheetMarkers({
  step,
  field,
  points,
  discoveryId,
  saidId,
  view,
  unit,
  obstacles,
  returning,
  onOpenProfile,
}: {
  step: Step;
  field: TerrainField;
  points: SheetPoint[];
  discoveryId: string | null;
  saidId: string | null;
  view: LabelView;
  unit: number;
  obstacles: Box[];
  returning: boolean;
  onOpenProfile: (id: string) => void;
}) {
  const onSheet = isLayerActive("sheetMarkers", step);
  if (step === "collective") {
    return (
      <nav aria-label="Nomes no mapa" className={visible(onSheet)}>
        <CollectiveMarkers
          field={field}
          points={points}
          saidId={saidId}
          view={view}
          unit={unit}
          obstacles={obstacles}
          returning={returning}
          onOpenProfile={onOpenProfile}
        />
      </nav>
    );
  }
  return (
    <div aria-hidden="true" className={visible(onSheet)}>
      {points.map((p) => {
        const selected = p.scientistId !== null && p.scientistId === discoveryId;
        const tone = sheetMarkTone(presenceAt(p), selected, step);
        return (
          <MapAnchor key={p.key} x={p.x} y={p.y} className={tone === "waiting" ? "z-10" : undefined}>
            <div
              className={`transition-opacity duration-500 ${selected && step === "noName" ? "opacity-0" : step === "noName" ? "opacity-40" : "opacity-100"}`}
            >
              <PointMark tone={tone} />
            </div>
          </MapAnchor>
        );
      })}
    </div>
  );
}

export function PlaceNames({ step, geometry }: { step: Step; geometry: DiscoveryGeometry }) {
  return (
    <div aria-hidden="true" className={visible(isLayerActive("placeNames", step))}>
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
  const text = !isLayerActive("pointLabel", step)
    ? null
    : step === "noName"
      ? `PONTO ${geometry.code} · SEM NOME`
      : `PONTO ${geometry.code}`;
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
  const active = isLayerActive("transect", step);
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
  hint,
  field,
  geometry,
  name,
  photo,
  onOpen,
}: {
  step: Step;
  hint: number;
  field: TerrainField;
  geometry: DiscoveryGeometry;
  name: string;
  photo: ScientistPhoto | null;
  onOpen: () => void;
}) {
  const paths = usePortraitContourPaths(field);
  const src = useAvailablePhoto(photo?.src);
  const active = medallionShown(step);
  const named = discoveryNameShown(step, hint);
  return (
    <div aria-hidden={!named} inert={!named} className={visible(active)}>
      <MapAnchor x={geometry.summit.x} y={geometry.summit.y}>
        <button
          type="button"
          data-medallion-button
          data-tooltip-id={named ? PORTRAIT_TOOLTIP : undefined}
          data-tooltip-content={named ? name : undefined}
          onClick={onOpen}
          aria-label={named ? `Ver perfil de ${name}` : undefined}
          className={`group absolute -translate-x-1/2 -translate-y-[calc(100%+var(--u)*14px)] rounded-full outline-none ${named ? "pointer-events-auto cursor-pointer" : ""}`}
        >
          <span
            aria-hidden="true"
            className="absolute -inset-[7px] rounded-full border-[1.5px] border-dashed border-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
          {src ? (
            <span className="relative block size-[calc(var(--u)*84px)] overflow-hidden rounded-full border-2 border-accent bg-paper">
              <Image src={src} alt="" fill sizes="96px" className={PHOTO_CLASS} onError={() => markPhotoMissing(src)} />
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
      </MapAnchor>
      <Tooltip
        id={PORTRAIT_TOOLTIP}
        isOpen={named}
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

export function SummitPortrait({
  step,
  field,
  point,
  photo,
}: {
  step: Step;
  field: TerrainField;
  point: SheetPoint | undefined;
  photo: ScientistPhoto | null;
}) {
  const src = useAvailablePhoto(photo?.src);
  if (!point || !point.scientistId) return null;
  const summit = mapPosition(field, point);
  const active = isLayerActive("summitPortrait", step);
  return (
    <div aria-hidden="true" className={visible(active)}>
      <MapAnchor x={summit.x} y={summit.y}>
        {src ? (
          <span
            key={active ? point.key : "idle"}
            className="fade-in absolute block size-[calc(var(--u)*88px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-ink bg-paper"
            style={{ animationDelay: "900ms" }}
          >
            <Image src={src} alt="" fill sizes="96px" className={PHOTO_CLASS} onError={() => markPhotoMissing(src)} />
          </span>
        ) : (
          <span className="absolute top-0 left-0 -translate-x-[6px] -translate-y-[7px]">
            <TriangleMarker />
          </span>
        )}
      </MapAnchor>
    </div>
  );
}

export function SaidNameLabel({
  step,
  field,
  point,
  kind,
  illustrative,
}: {
  step: Step;
  field: TerrainField;
  point: SheetPoint | undefined;
  kind: NameKind | null;
  illustrative: boolean;
}) {
  const active = isLayerActive("saidName", step);
  const contourLabel = useRef<HTMLDivElement>(null);
  useMapView((v) => {
    const el = contourLabel.current;
    if (!el) return;
    const c = v.newContour;
    el.style.opacity = c ? c.emphasis.toFixed(3) : "0";
    if (!c || c.emphasis < 0.01) return;
    const width = el.offsetWidth;
    const fitsRight = c.x + c.r + 18 + width < v.W - 16;
    const x = fitsRight ? c.x + c.r + 18 : Math.min(v.W - 16 - width, Math.max(16, c.x - width / 2));
    const y = fitsRight ? c.y - c.r * 0.35 : Math.min(v.H - 48, c.y + c.r + 14);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });
  if (!point || !point.name || !point.scientistId) return null;
  const summit = mapPosition(field, point);
  const rock = kind === "recall";
  const tally = rock
    ? `LEMBRADA SEM PISTA ${point.recall === 1 ? "1 VEZ" : `${point.recall} VEZES`}`
    : `CONHECIDA AQUI POR ${point.reef === 1 ? "1 PESSOA" : `${point.reef} PESSOAS`}`;
  const contour = rock ? "+1 · A ROCHA SOBE" : point.reef === 1 && point.recall === 0 ? "RECIFE · VEIO À TONA" : "+1 · O RECIFE CRESCE";
  const { elongation } = field.summit(toFieldPoint(point));
  return (
    <div aria-hidden="true" className={visible(active)}>
      <MapAnchor x={summit.x} y={summit.y}>
        <div
          className="absolute left-0 flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ top: `calc(var(--u) * ${Math.round(NEW_CONTOUR_RADIUS * elongation + 30)}px)` }}
        >
          <div
            key={active ? `${point.key}-${presenceAt(point)}` : "idle"}
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
            {tally}
            {illustrative ? " · CONTAGEM ILUSTRATIVA" : ""}
          </span>
          <span
            className="fade-in bg-paper px-2 font-notation text-[calc(var(--u)*12px)] tracking-[0.08em] whitespace-nowrap text-ink-soft"
            style={{ animationDelay: "3800ms" }}
          >
            FEIRA DO CONHECIMENTO 2026 · FOLHA 01 · PONTO {point.code}
          </span>
        </div>
      </MapAnchor>
      <div ref={contourLabel} className="pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-500">
        <span className="flex items-center gap-2 bg-paper px-2 py-1 font-notation text-[calc(var(--u)*14px)] font-medium tracking-[0.06em] whitespace-nowrap text-ink">
          <span className={`block h-0 w-[calc(var(--u)*26px)] border-t-2 ${rock ? "border-ink" : "border-accent"}`} />
          {contour}
        </span>
      </div>
    </div>
  );
}

function SeaCaption({ u, large }: { u: number; large: boolean }) {
  return (
    <div className="map-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
      <span className="font-primary font-medium tracking-[0.3em] text-ink-soft italic" style={{ fontSize: (large ? 16 : 13) * u }}>
        MAR DOS NOMES NÃO DITOS
      </span>
    </div>
  );
}

export function SeaOfUnsaid({ step, collective, unit }: { step: Step; collective: Collective; unit: number }) {
  const rings = useMemo(() => TRENCH_SERIES.map((_, i) => trenchRing(i)), []);
  const reached = trenchDepths(unnamedCount(collective));
  const paths = useRef<(SVGPathElement | null)[]>([]);
  useMapView((v) => {
    reached.forEach((_, i) => {
      const pts = rings[i].map((p) => toScreen(v, p.x, p.y));
      paths.current[i]?.setAttribute("d", `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`);
    });
  });
  const active = isLayerActive("seaOfUnsaid", step);
  const u = Math.max(0.85, unit);
  return (
    <div aria-hidden="true" className={visible(active)}>
      {reached.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {reached.map((value, i) => (
            <path
              key={value}
              ref={(el) => {
                paths.current[i] = el;
              }}
              fill="none"
              stroke={value === 10 || value === 100 || value === 1000 ? "var(--isobath-index)" : "var(--isobath)"}
              strokeWidth={value === 10 || value === 100 || value === 1000 ? 1.1 : 0.8}
            />
          ))}
        </svg>
      )}
      {step === "noName" ? (
        <div className="absolute top-[calc(var(--u)*120px)] right-[calc(var(--u)*240px)]">
          <SeaCaption u={u} large />
        </div>
      ) : (
        <MapAnchor x={TRENCH_CAPTION.x} y={TRENCH_CAPTION.y}>
          <SeaCaption u={u} large={step === "collective"} />
        </MapAnchor>
      )}
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
    const zoom = v.camera.z / baseZoom;
    const scale = zoom < 1 ? Math.round(SCALE_STOPS[0].scale / zoom / 100_000) * 100_000 : Math.exp(Math.log(a.scale) + (Math.log(b.scale) - Math.log(a.scale)) * t);
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
