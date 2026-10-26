"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { BENCHES, type BenchId } from "../benches.ts";
import { Sfx } from "../sound.ts";
import { useMuted } from "../SoundButton.tsx";
import { useReducedMotion } from "../useReducedMotion.ts";
import { LabPatterns } from "./art.tsx";
import { clampLeft, easeInOutCubic, easeOutCubic, keyStep, leftForLensCenter, lens, momentumTarget, panDuration } from "./camera.ts";
import { LabHomeContext, type LabHome } from "./labContext.tsx";
import { labMemory } from "./labMemory.ts";
import { buildingSpan, columnAt, labScale, planLab, WORLD, type Rect } from "./labPlan.ts";
import { columnName, Planta } from "./Planta.tsx";
import { LabColumn } from "./rooms/index.tsx";
import { BackShell, Cart, FrontShell, GroundProps, RAIL_Y, SkyArt, wireY } from "./shell.tsx";

type LabExplorerProps = {
  done: ReadonlySet<BenchId>;
  onOpen: (id: BenchId) => void;
};

const SKY = 0.4;
const FRONT = 1.2;
const ENTER = 560;

function stackedNow() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
}

type Anim = { from: number; to: number; t0: number; dur: number; frame: number; active: boolean; ease: (t: number) => number };

export function LabExplorer({ done, onOpen }: LabExplorerProps) {
  const reducedMotion = useReducedMotion();
  const plan = useMemo(() => planLab(BENCHES.map((b) => b.id)), []);
  const span = useMemo(() => buildingSpan(plan), [plan]);
  const memory = labMemory();
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<SVGGElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, stacked: false });
  const [edges, setEdges] = useState({ start: true, end: false });
  const [here, setHere] = useState(0);
  const [hint, setHint] = useState(memory.focusX === null);
  const [night, setNightState] = useState(memory.night);
  const [pulse, setPulse] = useState(0);
  const [toots, setToots] = useState(0);
  const [entering, setEntering] = useState<{ id: BenchId; origin: string } | null>(null);
  const [used, setUsed] = useState<ReadonlySet<string>>(() => new Set(memory.used));
  const [sfx] = useState(() => new Sfx());
  const muted = useMuted();
  const heardRef = useRef(false);
  const cart = useRef({ x: 0, v: 0, target: 0, frame: 0, ready: false });
  const anim = useRef<Anim>({ from: 0, to: 0, t0: 0, dur: 0, frame: 0, active: false, ease: easeOutCubic });
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean; samples: { t: number; x: number }[] } | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    sfx.mute(muted);
  }, [sfx, muted]);

  useEffect(() => {
    const mark = () => {
      heardRef.current = true;
      sfx.unlock();
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [sfx]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const r = box.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height), stacked: stackedNow() });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const s = size.w ? labScale(size.w, size.h, size.stacked) : 0;
  const trackW = plan.width * s;
  const trackH = WORLD.height * s;
  const viewH = size.stacked ? trackH : size.h;
  const roomPx = WORLD.column * s;

  const view = useCallback(() => {
    const el = scrollRef.current;
    return { viewW: el?.clientWidth ?? size.w, trackW: el?.scrollWidth ?? trackW };
  }, [size.w, trackW]);

  const stopAnim = useCallback(() => {
    cancelAnimationFrame(anim.current.frame);
    anim.current.active = false;
  }, []);

  const animateTo = useCallback(
    (target: number, opts?: { dur?: number; ease?: (t: number) => number }) => {
      const el = scrollRef.current;
      if (!el) return;
      const to = clampLeft(target, view());
      setHint(false);
      if (reducedMotion) {
        stopAnim();
        el.scrollLeft = to;
        return;
      }
      const a = anim.current;
      cancelAnimationFrame(a.frame);
      a.from = el.scrollLeft;
      a.to = to;
      a.t0 = performance.now();
      a.dur = (opts?.dur ?? panDuration(to - a.from)) * 1000;
      a.ease = opts?.ease ?? easeInOutCubic;
      a.active = true;
      const step = (now: number) => {
        const k = Math.min(1, (now - a.t0) / a.dur);
        el.scrollLeft = a.from + (a.to - a.from) * a.ease(k);
        if (k < 1) a.frame = requestAnimationFrame(step);
        else a.active = false;
      };
      a.frame = requestAnimationFrame(step);
    },
    [reducedMotion, stopAnim, view],
  );

  const base = () => (anim.current.active ? anim.current.to : (scrollRef.current?.scrollLeft ?? 0));

  const moveCart = useCallback(() => {
    const c = cart.current;
    const g = cartRef.current;
    if (!g) return;
    cancelAnimationFrame(c.frame);
    const paint = () => {
      g.setAttribute("transform", `translate(${c.x.toFixed(1)} 0)`);
      const turn = ((c.x / 6) * 180) / Math.PI;
      g.querySelectorAll<SVGGElement>(".lab-cart-wheel").forEach((w) => w.setAttribute("transform", `rotate(${turn.toFixed(1)})`));
      const tilt = Math.max(-6, Math.min(6, -c.v * 0.03));
      g.querySelector<SVGGElement>(".lab-cart-body")?.setAttribute("transform", `rotate(${tilt.toFixed(2)} 0 54)`);
      if (cartButtonRef.current) cartButtonRef.current.style.transform = `translate3d(${(c.x * s).toFixed(1)}px,0,0)`;
    };
    if (reducedMotion || !c.ready) {
      c.x = c.target;
      c.v = 0;
      c.ready = true;
      paint();
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      c.v += ((c.target - c.x) * 22 - c.v * 7.5) * dt;
      c.x += c.v * dt;
      paint();
      if (Math.abs(c.target - c.x) > 0.3 || Math.abs(c.v) > 0.5) c.frame = requestAnimationFrame(step);
    };
    c.frame = requestAnimationFrame(step);
  }, [reducedMotion, s]);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !s) return;
    const x = el.scrollLeft;
    const vw = el.clientWidth;
    const max = el.scrollWidth - vw;
    if (skyRef.current) skyRef.current.style.transform = `translate3d(${(-x * (reducedMotion ? 1 : SKY)).toFixed(1)}px,0,0)`;
    if (fgRef.current) fgRef.current.style.transform = `translate3d(${(-x * (reducedMotion ? 1 : FRONT)).toFixed(1)}px,0,0)`;
    const l = lens({ left: x, viewW: vw, trackW: el.scrollWidth });
    if (lensRef.current) {
      lensRef.current.style.left = `${l.x * 100}%`;
      lensRef.current.style.width = `${l.w * 100}%`;
      lensRef.current.setAttribute("aria-valuenow", String(Math.round((x / Math.max(1, max)) * 100)));
    }
    const center = (x + vw / 2) / s;
    cart.current.target = Math.min(span.end + 60, Math.max(span.start - 10, center));
    moveCart();
    const start = x < 4;
    const end = x > max - 4;
    setEdges((e) => (e.start === start && e.end === end ? e : { start, end }));
    if (x > 24) setHint(false);
    setHere(columnAt(plan, center).index);
    labMemory().focusX = center;
  }, [s, plan, span, moveCart, reducedMotion]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !s) return;
    if (!restored.current) {
      restored.current = true;
      const focus = labMemory().focusX;
      if (focus !== null) el.scrollLeft = clampLeft(focus * s - el.clientWidth / 2, view());
    }
    update();
  }, [update, size, s, view]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => requestAnimationFrame(update);
    const interrupt = () => {
      if (anim.current.active) stopAnim();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("touchstart", interrupt, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchstart", interrupt);
    };
  }, [update, stopAnim]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
        if (anim.current.active) stopAnim();
        return;
      }
      if (size.stacked) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY > 0 && el.scrollLeft >= max - 1) || (e.deltaY < 0 && el.scrollLeft <= 0)) return;
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 32 : 1);
      animateTo(base() + delta, { dur: 0.22, ease: easeOutCubic });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [animateTo, stopAnim, size.stacked]);

  const panRooms = useCallback(
    (dir: 1 | -1, amount?: number) => {
      const step = amount ?? keyStep(view().viewW, roomPx);
      animateTo(base() + dir * step);
    },
    [animateTo, view, roomPx],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const el = scrollRef.current;
    if (!el) return;
    if (e.target !== e.currentTarget && e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.key === "ArrowRight") panRooms(1);
    else if (e.key === "ArrowLeft") panRooms(-1);
    else if (e.key === "PageDown") panRooms(1, el.clientWidth * 0.9);
    else if (e.key === "PageUp") panRooms(-1, el.clientWidth * 0.9);
    else if (e.key === "Home") animateTo(0);
    else if (e.key === "End") animateTo(el.scrollWidth);
    else return;
    e.preventDefault();
  };

  const onLensKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") panRooms(1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") panRooms(-1);
    else if (e.key === "Home") animateTo(0);
    else if (e.key === "End") animateTo(trackW);
    else return;
    e.preventDefault();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    stopAnim();
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, moved: false, samples: [{ t: performance.now(), x: e.clientX }] };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.dragging = "true";
      window.getSelection()?.removeAllRanges();
      setHint(false);
    }
    if (!d.moved) return;
    e.currentTarget.scrollLeft = d.left - dx;
    d.samples.push({ t: performance.now(), x: e.clientX });
    if (d.samples.length > 5) d.samples.shift();
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    const el = e.currentTarget;
    delete el.dataset.dragging;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const v = (last.x - first.x) / Math.max(16, last.t - first.t);
    if (!reducedMotion && Math.abs(v) > 0.15) animateTo(momentumTarget(el.scrollLeft, v, view()), { dur: 0.45, ease: easeOutCubic });
    const block = (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    el.addEventListener("click", block, { capture: true, once: true });
    window.setTimeout(() => el.removeEventListener("click", block, { capture: true }), 0);
  };

  const ride = () => {
    sfx.toot();
    setUsed((u) => {
      if (u.has("obj:cart")) return u;
      const next = new Set(u);
      next.add("obj:cart");
      labMemory().used = next;
      return next;
    });
    setToots((t) => t + 1);
    const el = scrollRef.current;
    if (!el) return;
    const at = edges.end ? 0 : base() + roomPx * (size.stacked ? 1 : 1.2);
    animateTo(at, { dur: edges.end ? 1.4 : 0.9, ease: easeInOutCubic });
  };

  const setNight = useCallback(
    (on: boolean) => {
      labMemory().night = on;
      setNightState(on);
      setPulse((p) => p + 1);
      sfx.zap(on);
      if (!reducedMotion) for (let i = 0; i < 4; i++) sfx.tink(0.25 + i * 0.32, i);
    },
    [sfx, reducedMotion],
  );

  const enter = useCallback(
    (id: BenchId, rect: Rect) => {
      labMemory().focusX = rect.x + rect.w / 2;
      if (reducedMotion) {
        onOpen(id);
        return;
      }
      setEntering({ id, origin: `${(rect.x + rect.w / 2) * s}px ${(rect.y + rect.h * 0.45) * s}px` });
      sfx.drawer(true);
      window.setTimeout(() => onOpen(id), ENTER);
    },
    [onOpen, reducedMotion, s, sfx],
  );

  const lab: LabHome = useMemo(
    () => ({
      sfx,
      reducedMotion,
      night,
      setNight,
      heard: () => heardRef.current,
      used,
      use: (key: string) =>
        setUsed((u) => {
          if (u.has(key)) return u;
          const next = new Set(u);
          next.add(key);
          labMemory().used = next;
          return next;
        }),
      span,
      enter,
      panBy: (dx: number) => animateTo(base() + dx * s),
    }),
    [sfx, reducedMotion, night, setNight, used, span, enter, animateTo, s],
  );

  const hereName = columnName(plan.columns[here] ?? plan.columns[0]);
  const trackStyle: CSSProperties = { width: trackW, height: trackH };
  if (entering) {
    trackStyle.transformOrigin = entering.origin;
    trackStyle.transform = "scale(1.9)";
  }

  return (
    <LabHomeContext.Provider value={lab}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <LabPatterns />
        <div ref={boxRef} className={`relative ${size.stacked ? "shrink-0" : "min-h-0 flex-1"}`} style={size.stacked ? { height: viewH || 420 } : undefined}>
          <div className="lab-window absolute inset-0" data-night={night ? "on" : "off"} data-start={edges.start} data-end={edges.end} data-entering={!!entering} style={{ ["--lab-s" as string]: s || 1 }}>
            <div className="lab-view absolute inset-0 overflow-hidden">
              <div ref={skyRef} className="lab-sky pointer-events-none absolute top-0 left-0 will-change-transform" style={{ height: Math.max(0, viewH - (WORLD.height - WORLD.roof) * s + 30 * s) }}>
                {s > 0 && <SkyArt width={size.w + trackW * SKY + 200} height={Math.max(1, viewH - (WORLD.height - WORLD.roof) * s + 30 * s)} />}
                <div className="lab-sky-night pointer-events-none absolute inset-0" />
              </div>

              <div
                ref={scrollRef}
                role="region"
                aria-label="Laboratório. Arraste, deslize ou use as setas do teclado para andar entre as salas."
                aria-roledescription="laboratório explorável"
                tabIndex={0}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                className="lab-scroller absolute inset-0 overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-iris-orange"
              >
                {s > 0 && (
                  <div ref={trackRef} className="lab-track absolute bottom-0 left-0" style={trackStyle}>
                    <svg viewBox={`0 0 ${plan.width} ${WORLD.height}`} width={trackW} height={trackH} className="lab-art absolute inset-0 z-0 overflow-visible" aria-hidden="true" preserveAspectRatio="none">
                      <BackShell plan={plan} />
                    </svg>
                    {plan.columns.map((column) => (
                      <LabColumn key={column.index} column={column} s={s} done={done} compact={size.w / s < 620} />
                    ))}
                    <svg viewBox={`0 0 ${plan.width} ${WORLD.height}`} width={trackW} height={trackH} className="lab-art pointer-events-none absolute inset-0 z-[2] overflow-visible" aria-hidden="true" preserveAspectRatio="none">
                      <FrontShell plan={plan}>
                        <Cart ref={cartRef} />
                      </FrontShell>
                    </svg>
                    <div className="lab-night-shade pointer-events-none absolute inset-0 z-[3]" />
                    {pulse > 0 &&
                      ([0, 1] as const).map((f) => (
                        <span
                          key={`${pulse}-${f}`}
                          aria-hidden="true"
                          className="lab-power pointer-events-none absolute z-[5]"
                          style={{ left: (span.start + 8) * s, top: (wireY(f) - 5) * s, ["--run" as string]: `${(span.end - span.start - 8) * s}px` }}
                        />
                      ))}
                    <button
                      ref={cartButtonRef}
                      type="button"
                      data-no-drag
                      aria-label={edges.end ? "Pegar o carrinho de volta para a entrada" : "Pegar carona no carrinho até a próxima sala"}
                      onClick={ride}
                      className="lab-cart-button absolute top-0 left-0 z-[5] cursor-pointer rounded-[10px] outline-none focus-visible:outline-[2.5px] focus-visible:outline-dashed focus-visible:outline-iris-orange"
                      style={{ marginLeft: -32 * s, top: (RAIL_Y - 46) * s, width: 64 * s, height: 50 * s }}
                    >
                      {toots > 0 && (
                        <span key={toots} aria-hidden="true" className="lab-toot lab-hand absolute -top-[1.1em] left-1/2 text-[clamp(14px,calc(var(--lab-s)*17px),20px)] leading-none text-ink">
                          piuí!
                        </span>
                      )}
                      {!used.has("obj:cart") && <span aria-hidden="true" className="lab-spark pointer-events-none absolute -top-2 -right-1 size-[clamp(14px,calc(var(--lab-s)*20px),22px)] rounded-full border-[2px] border-iris-orange" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute right-0 bottom-0 left-0 overflow-hidden" style={{ height: WORLD.ground * s }}>
                <div ref={fgRef} className="absolute top-0 left-0 will-change-transform">
                  {s > 0 && <GroundProps width={size.w + trackW * FRONT + 200} scale={s} />}
                </div>
                <div className="lab-fg-night pointer-events-none absolute inset-0" />
              </div>
              <div className="lab-enter-veil pointer-events-none absolute inset-0 z-20" />
            </div>

            <button
              type="button"
              aria-label="Andar para a esquerda"
              onClick={() => {
                sfx.press();
                panRooms(-1, size.w * 0.7);
              }}
              className={`lab-edge absolute top-1/2 left-[clamp(8px,1.4vw,18px)] z-10 -translate-y-1/2 ${edges.start ? "pointer-events-none opacity-0" : "opacity-100"}`}
              tabIndex={edges.start ? -1 : 0}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M20 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Andar para a direita"
              onClick={() => {
                sfx.press();
                panRooms(1, size.w * 0.7);
              }}
              className={`lab-edge absolute top-1/2 right-[clamp(8px,1.4vw,18px)] z-10 -translate-y-1/2 ${edges.end ? "pointer-events-none opacity-0" : "opacity-100"}`}
              tabIndex={edges.end ? -1 : 0}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>

            {hint && s > 0 && (
              <p className="lab-hint lab-hand pointer-events-none absolute right-[clamp(64px,8vw,96px)] z-10 text-[clamp(18px,2.6vmin,26px)] leading-none text-ink" style={{ bottom: (WORLD.ground + 14) * s }}>
                <span className="pointer-coarse:hidden">arraste para explorar</span>
                <span className="hidden pointer-coarse:inline">deslize para explorar</span>
                <svg viewBox="0 0 60 20" aria-hidden="true" className="ml-1 inline-block h-[0.8em] w-[2.2em] align-middle" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M2 12 Q 28 2 54 10 M46 4 L 55 10 L 46 16" />
                </svg>
              </p>
            )}
          </div>
        </div>
        <Planta
          plan={plan}
          done={done}
          lensRef={lensRef}
          here={hereName}
          edges={edges}
          onCenter={(f, animated) => {
            const v = view();
            const target = leftForLensCenter(f, v);
            if (animated) animateTo(target);
            else {
              stopAnim();
              if (scrollRef.current) scrollRef.current.scrollLeft = target;
            }
          }}
          onStep={(dir) => panRooms(dir)}
          onLensKey={onLensKey}
        />
      </div>
    </LabHomeContext.Provider>
  );
}
