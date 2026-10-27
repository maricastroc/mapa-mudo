"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BENCHES, type BenchId } from "../benches.ts";
import { Eyebrow } from "../LabUi.tsx";
import { Button } from "../ui.tsx";
import { Certificate, PORTRAIT } from "./Certificate.tsx";
import { exportSize, fileNameFor, type CertificateData } from "./certificate.ts";
import { certificatePng, saveBlob } from "./exportPng.ts";
import { PLATES } from "./plates.ts";
import { DEMO_KEY, sealOf, signSeal } from "./seal.ts";
import { useRisoDots } from "./useRisoDots.ts";

const size = exportSize();

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-notation text-[11px] tracking-[0.14em] text-ink-soft uppercase">{label}</span>
      {children}
    </label>
  );
}

const INPUT = "h-11 border-[1.5px] border-ink bg-paper px-3 font-notation text-[16px] tracking-[0.08em] text-ink outline-none focus-visible:border-iris-blue";

function isBench(value: string | null): value is BenchId {
  return BENCHES.some((b) => b.id === value);
}

export function CertificatePreview() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("game");
  const game: BenchId = isBench(requested) ? requested : "johnson";
  const plate = PLATES[game];
  const svgRef = useRef<SVGSVGElement>(null);
  const portrait = useRisoDots(plate.scientist.photo, PORTRAIT, 1.6);
  const [edits, setEdits] = useState<Partial<Record<BenchId, CertificateData>>>({});
  const data = edits[game] ?? plate.demo;
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [sealed, setSealed] = useState<{ data: CertificateData; token: string } | null>(null);
  const seal = sealed && sealed.data === data ? sealed.token : null;

  useEffect(() => {
    let alive = true;
    signSeal(sealOf({ ...data, demo: true }), DEMO_KEY).then((token) => {
      if (alive) setSealed({ data, token });
    });
    return () => {
      alive = false;
    };
  }, [data]);

  const update = (patch: Partial<CertificateData>) => setEdits((all) => ({ ...all, [game]: { ...data, ...patch } }));
  const setStat = (index: number, value: string) => update({ stats: data.stats.map((s, i) => (i === index ? { ...s, value } : s)) });
  const total = data.score.of ?? 999;

  const save = async () => {
    if (!svgRef.current) return;
    setStatus("saving");
    try {
      const blob = await certificatePng(svgRef.current);
      saveBlob(blob, fileNameFor(data));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="graph-paper fixed inset-0 overflow-y-auto">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-[clamp(16px,4vw,48px)] py-[clamp(20px,4vh,44px)]">
        <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <Eyebrow className="text-accent">Certificado · prévia</Eyebrow>
            <h1 className="display mt-2 text-[clamp(30px,4vw,48px)] leading-none">{plate.game.name}</h1>
            <p className="mt-2 max-w-[38em] text-[16px] leading-snug text-ink-soft">Demonstração com dados fictícios. Mude os valores para testar o layout.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button variant="primary" arrow onClick={save} disabled={status === "saving" || !portrait || !seal}>
              {status === "saving" ? "Salvando..." : "Salvar PNG"}
            </Button>
            <span className="font-notation text-[11px] tracking-[0.12em] text-ink-soft">
              {status === "error" ? "NÃO DEU PARA SALVAR. TENTE DE NOVO." : `${size.width} × ${size.height} PX · A4 A 300 DPI`}
            </span>
          </div>
        </header>

        <nav aria-label="Jogos" className="flex flex-wrap gap-2">
          {BENCHES.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.id === game}
              onClick={() => router.replace(`${pathname}?game=${b.id}`, { scroll: false })}
              className={`flex cursor-pointer items-center gap-2.5 border-[1.5px] border-ink px-3 py-2 font-primary text-[15px] font-semibold ${
                b.id === game ? "bg-ink text-paper" : "bg-paper hover:bg-ink hover:text-paper"
              }`}
            >
              <span className="grid size-6 place-items-center rounded-full border-[1.3px] border-current font-notation text-[11px]">{i + 1}</span>
              {b.task}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-[minmax(240px,2.4fr)_repeat(4,minmax(100px,1fr))] gap-4 border-y-[1.5px] border-ink py-4 max-[760px]:grid-cols-2">
          <Field label="Nome">
            <input className={INPUT} value={data.name} maxLength={60} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Posição">
            <select className={INPUT} value={data.position} onChange={(e) => update({ position: Number(e.target.value) })}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}º
                </option>
              ))}
            </select>
          </Field>
          <Field label={data.score.unit}>
            <input
              className={INPUT}
              type="number"
              min={0}
              max={total}
              value={data.score.value}
              onChange={(e) => update({ score: { ...data.score, value: Math.max(0, Math.min(total, Number(e.target.value) || 0)) } })}
            />
          </Field>
          {data.stats.map((stat, i) => (
            <Field key={stat.label} label={stat.label}>
              <input className={INPUT} type="number" min={0} max={99} value={stat.value} onChange={(e) => setStat(i, e.target.value)} />
            </Field>
          ))}
        </div>

        <div className="border-[1.5px] border-ink shadow-[10px_10px_0_0_var(--frame)]">
          <Certificate key={game} data={data} plate={plate} portrait={portrait} seal={seal} svgRef={svgRef} className="block h-auto w-full" />
        </div>
      </div>
    </main>
  );
}
