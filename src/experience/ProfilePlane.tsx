"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import type { ScientistProfile } from "@/content/scientists/profile";
import { PHOTO_CLASS } from "./PortraitPhoto";
import { portraitPlacement } from "./scenes";
import type { Screen } from "./screen";
import { widestWordInEm } from "./typography";
import { ArrowIcon, Button, TriangleMarker } from "./ui";

type ProfilePlaneProps = {
  profile: ScientistProfile;
  code: string;
  screen: Screen;
  returnTo: "portrait" | "map";
  onBack: () => void;
  onContinue: () => void;
};

const HIDDEN_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function ScrollRule({ target, className }: { target: RefObject<HTMLDivElement | null>; className: string }) {
  const [view, setView] = useState({ start: 0, size: 1 });
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => {
      const total = Math.max(1, el.scrollHeight);
      setView({ start: el.scrollTop / total, size: Math.min(1, el.clientHeight / total) });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [target]);

  const scrollToPointer = (e: PointerEvent<HTMLDivElement>) => {
    const el = target.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    el.scrollTo({ top: ratio * el.scrollHeight - el.clientHeight / 2 });
  };

  if (view.size >= 0.995) return null;
  return (
    <div
      aria-hidden="true"
      className={`absolute w-5 cursor-pointer touch-none ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrollToPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) scrollToPointer(e);
      }}
    >
      <span className="absolute inset-y-0 left-1/2 border-l-[1.5px] border-ink/35" />
      {[0, 25, 50, 75, 100].map((tick) => (
        <span key={tick} className="absolute left-1/2 w-2 -translate-x-1/2 border-t-[1.5px] border-ink/35" style={{ top: `${tick}%` }} />
      ))}
      <span
        className="absolute left-1/2 w-[4px] -translate-x-1/2 bg-ink transition-[top] duration-75"
        style={{ top: `${view.start * 100}%`, height: `${view.size * 100}%` }}
      />
      <span
        className="absolute right-full h-0 w-0 -translate-y-1/2 border-y-[5px] border-r-[8px] border-y-transparent border-r-accent"
        style={{ top: `${(view.start + view.size / 2) * 100}%` }}
      />
    </div>
  );
}

function SectionLabel({ children, marker }: { children: ReactNode; marker?: boolean }) {
  return (
    <p className="flex items-center gap-2 font-notation text-[11px] font-medium tracking-[0.12em] text-ink-soft uppercase">
      {marker && <TriangleMarker tone="accent" className="scale-75" />}
      {children}
    </p>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto underline decoration-accent decoration-[1.5px] underline-offset-[3px] hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris-blue"
    >
      {children}
      <ArrowIcon className="ml-1 inline size-3 -rotate-45 align-[-1px]" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function BackButton({ onBack, returnTo }: { onBack: () => void; returnTo: ProfilePlaneProps["returnTo"] }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="pointer-events-auto inline-flex min-h-[40px] cursor-pointer items-center gap-2 border-[1.5px] border-ink bg-paper px-3 font-notation text-[12px] font-medium tracking-[0.1em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris-blue"
    >
      <ArrowIcon className="size-3.5 rotate-180" />
      {returnTo === "map" ? "Voltar ao mapa" : "Voltar ao retrato"}
    </button>
  );
}

function ContinueButton({ onContinue }: { onContinue: () => void }) {
  return (
    <Button variant="primary" arrow onClick={onContinue} className="compact:w-full compact:justify-between">
      Continuar
    </Button>
  );
}

function ProfileBody({ profile }: { profile: ScientistProfile }) {
  const legend = [
    profile.lifespan ? { label: profile.lifespan.label, value: profile.lifespan.value } : null,
    profile.origin ? { label: "Origem", value: profile.origin } : null,
    profile.areas.length > 0 ? { label: "Áreas", value: profile.areas.join(" · ") } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);
  return (
    <>
      <p className="mt-5 text-[19px] leading-[1.4] font-medium compact:text-[18px]">{profile.summary}</p>

      {legend.length > 0 && (
        <dl className="mt-5 grid grid-cols-[minmax(92px,auto)_1fr] gap-x-5 gap-y-2 border-t-[1.5px] border-ink pt-3.5">
          {legend.map((row) => (
            <div key={row.label} className="contents">
              <dt className="pt-[3px] font-notation text-[11px] font-medium tracking-[0.12em] text-ink-soft uppercase">{row.label}</dt>
              <dd className="text-[15px] leading-[1.45]">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {profile.whyItMatters && (
        <section aria-labelledby="profile-why" className="mt-7">
          <h2 id="profile-why">
            <SectionLabel marker>Por que conhecê-la</SectionLabel>
          </h2>
          <p className="mt-2.5 border-l-2 border-accent pl-4 text-[17px] leading-[1.5]">{profile.whyItMatters}</p>
        </section>
      )}

      <section aria-labelledby="profile-facts" className="mt-7">
        <h2 id="profile-facts">
          <SectionLabel>
            Trajetória · {profile.facts.length} {profile.facts.length === 1 ? "ponto mapeado" : "pontos mapeados"}
          </SectionLabel>
        </h2>
        <ol className="mt-3.5 flex flex-col gap-4">
          {profile.facts.map((fact) => (
            <li
              key={fact.code}
              className="relative grid grid-cols-[52px_1fr] items-start not-last:after:absolute not-last:after:top-[16px] not-last:after:bottom-[-19px] not-last:after:left-[5px] not-last:after:border-l-[1.5px] not-last:after:border-dashed not-last:after:border-accent"
            >
              <span className="flex items-center gap-2 pt-[3px]" aria-hidden="true">
                <TriangleMarker />
                <span className="font-notation text-[11px] tracking-[0.06em] text-ink-soft">{fact.code}</span>
              </span>
              <p className="text-[15.5px] leading-[1.5]">
                {fact.statement}
                {fact.sourceNumbers.length > 0 && (
                  <span className="ml-1 font-notation text-[11px] whitespace-nowrap text-ink-soft">
                    <span className="sr-only">fonte </span>[{fact.sourceNumbers.join(", ")}]
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="profile-sources" className="mt-7 border-t border-ink/25 pt-3.5">
        <h2 id="profile-sources">
          <SectionLabel>{profile.sources.length === 1 ? "Fonte" : "Fontes"}</SectionLabel>
        </h2>
        <ol className="mt-2.5 flex flex-col gap-1.5 font-notation text-[12px] leading-[1.5] tracking-[0.02em]">
          {profile.sources.map((source) => (
            <li key={source.number} className="grid grid-cols-[22px_1fr]">
              <span className="text-ink-soft">{profile.sources.length > 1 ? source.number : "—"}</span>
              <span>
                <ExternalLink href={source.url}>{source.label}</ExternalLink>
              </span>
            </li>
          ))}
        </ol>
        {profile.portrait?.src && (
          <p className="mt-3 grid grid-cols-[22px_1fr] font-notation text-[12px] leading-[1.5] text-ink-soft">
            <span aria-hidden="true" className="mt-[5px] block size-2.5 rounded-full border-[1.5px] border-ink-soft" />
            <span>
              Retrato: {profile.portrait.credit ?? "crédito a confirmar"}
              {profile.portrait.sourceUrl && (
                <>
                  {" "}
                  <ExternalLink href={profile.portrait.sourceUrl}>origem da imagem</ExternalLink>
                </>
              )}
            </span>
          </p>
        )}
      </section>
    </>
  );
}

function CompactPortrait({ portrait }: { portrait: ScientistProfile["portrait"] }) {
  return (
    <div className="relative size-[104px] shrink-0">
      <span aria-hidden="true" className="absolute -inset-[9px] rounded-full border-[1.5px] border-dashed border-accent" />
      <div className="relative size-full overflow-hidden rounded-full border-2 border-ink bg-paper">
        {portrait?.src ? (
          <Image src={portrait.src} alt={portrait.alt} fill sizes="112px" className={PHOTO_CLASS} />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 100 100" className="size-full">
            <g fill="none" stroke="var(--terrain-line-index)" strokeWidth={1.2}>
              {[12, 20, 28, 36, 44].map((r) => (
                <circle key={r} cx={50} cy={52} r={r} />
              ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}

export function ProfilePlane({ profile, code, screen, returnTo, onBack, onContinue }: ProfilePlaneProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const scroller = useRef<HTMLDivElement>(null);
  const label = `Escala 1:1 — Ficha da pessoa · Ponto ${code}`;
  const scrollable = `overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iris-blue focus-visible:outline-dashed ${HIDDEN_SCROLLBAR}`;

  if (screen.compact) {
    const compactNameSize = Math.min(30, Math.floor((screen.W - 196) / widestWordInEm(profile.name)));
    return (
      <div className="graph-paper pointer-events-auto absolute inset-0 select-text">
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={`Ficha de ${profile.name}`}
          className={`absolute inset-0 pt-4 pr-9 pb-28 pl-5 ${scrollable}`}
        >
          <div className="fade-in flex flex-col items-start gap-3 pr-28">
            <BackButton onBack={onBack} returnTo={returnTo} />
            <p className="font-notation text-[11px] tracking-[0.08em] text-iris-blue uppercase">{label}</p>
          </div>
          <div className="fade-in mt-7 flex items-center gap-5 [animation-delay:150ms]">
            <CompactPortrait portrait={profile.portrait} />
            <div className="min-w-0">
              <h1
                tabIndex={-1}
                className="leading-[1.02] font-bold tracking-[0.01em] uppercase outline-none"
                style={{ fontSize: compactNameSize }}
              >
                {profile.name}
              </h1>
              {profile.field && <p className="mt-2 text-[13px] font-semibold tracking-[0.14em] uppercase">{profile.field}</p>}
            </div>
          </div>
          <span aria-hidden="true" className="mt-5 block h-0 w-full border-b-2 border-accent" />
          <div className="fade-in [animation-delay:300ms]">
            <ProfileBody profile={profile} />
            {returnTo === "portrait" && (
              <div className="mt-8">
                <ContinueButton onContinue={onContinue} />
              </div>
            )}
          </div>
        </div>
        <ScrollRule target={scroller} className="top-32 right-1.5 bottom-24" />
      </div>
    );
  }

  const placement = portraitPlacement(screen);
  const left = screen.ox + 64 * screen.fit;
  const top = screen.oy + 40 * screen.fit;
  const width = Math.max(300, placement.x - placement.d / 2 - 72 * screen.fit - left);
  const nameSize = Math.min(58, Math.floor(width / widestWordInEm(profile.name)));

  return (
    <div className="pointer-events-auto absolute flex flex-col select-text" style={{ left, top, width, bottom: 28 }}>
      <div className="fade-in flex flex-wrap items-center gap-x-4 gap-y-2">
        <BackButton onBack={onBack} returnTo={returnTo} />
        <p className="font-notation text-[12px] font-medium tracking-[0.08em] text-iris-blue uppercase">{label}</p>
      </div>
      <div className="fade-in relative mt-5 min-h-0 flex-1 [animation-delay:150ms]">
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={`Ficha de ${profile.name}`}
          className={`absolute inset-0 pr-9 pb-8 [mask-image:linear-gradient(to_bottom,black_calc(100%-36px),transparent)] ${scrollable}`}
        >
          <h1 tabIndex={-1} className="leading-[0.98] font-bold tracking-[0.01em] uppercase outline-none" style={{ fontSize: nameSize }}>
            {profile.name}
          </h1>
          {profile.field && <p className="mt-3 text-[15px] font-semibold tracking-[0.14em] uppercase">{profile.field}</p>}
          <span aria-hidden="true" className="mt-3 block h-0 w-full border-b-2 border-accent" />
          <ProfileBody profile={profile} />
        </div>
        <ScrollRule target={scroller} className="top-1 right-0 bottom-8" />
      </div>
      {returnTo === "portrait" && (
        <div className="fade-in pt-3 [animation-delay:300ms]">
          <ContinueButton onContinue={onContinue} />
        </div>
      )}
    </div>
  );
}
