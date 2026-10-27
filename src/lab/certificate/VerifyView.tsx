"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { benchById } from "../benches.ts";
import { Eyebrow, Stamp } from "../LabUi.tsx";
import { ArrowIcon } from "../ui.tsx";
import { formatDate, serialLabel, titleFor } from "./certificate.ts";
import { tidyName } from "./name.ts";
import { PLATES } from "./plates.ts";
import type { Seal } from "./seal.ts";

type Status = "valid" | "invalid" | "unconfigured" | "offline";
type Result = { token: string; status: Status; seal?: Seal };

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function readHash() {
  return window.location.hash.slice(1);
}

function isResult(value: unknown): value is { status: Status; seal?: Seal } {
  return typeof value === "object" && value !== null && "status" in value && typeof value.status === "string";
}

function PlayLink() {
  return (
    <Link
      href="/"
      className="mt-10 inline-flex min-h-[60px] items-center gap-3.5 bg-action px-6 font-primary text-[16px] font-semibold tracking-[0.08em] text-on-action uppercase hover:brightness-110"
    >
      Jogar Elas em Jogo
      <ArrowIcon />
    </Link>
  );
}

function Message({ title, children, tone = "ink" }: { title: string; children: ReactNode; tone?: "ink" | "accent" }) {
  return (
    <div className="mt-12">
      <h1 className={`display text-[clamp(36px,9vw,58px)] leading-[0.98] ${tone === "accent" ? "text-title-alt" : ""}`}>{title}</h1>
      <p className="mt-4 max-w-[30em] text-[18px] leading-[1.45] text-ink-soft">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-[3px] font-notation text-[11px] tracking-[0.14em] text-ink-soft">{label}</dt>
      <dd className="text-[17px] leading-snug">{children}</dd>
    </>
  );
}

function Valid({ seal }: { seal: Seal }) {
  const bench = benchById(seal.bench);
  const plate = PLATES[seal.bench];
  const date = formatDate(seal.achievedAt);
  const unit = plate?.game.unit ?? "pontos";
  return (
    <>
      <div className="mt-12">
        <Stamp tilt={-6} className="text-[20px]">
          Conferido
        </Stamp>
        <h1 className="display mt-6 text-[clamp(38px,9.5vw,62px)] leading-[0.96] text-title-alt">Certificado verdadeiro.</h1>
        <p className="mt-3 text-[18px] leading-[1.45] text-ink-soft">Os dados abaixo batem com o selo do certificado.</p>
        {seal.demo && <p className="mt-4 font-notation text-[12px] font-medium tracking-[0.14em] text-accent">DEMONSTRAÇÃO · DADOS FICTÍCIOS</p>}
      </div>

      <section className="mt-8 border-[1.5px] border-ink bg-paper shadow-[8px_8px_0_0_var(--frame)]">
        <div className="border-b-[1.5px] border-ink px-5 py-4">
          <Eyebrow className="text-accent">{titleFor(seal.position)}</Eyebrow>
          <p className="display mt-2 text-[clamp(30px,8vw,44px)] leading-[1.02] break-words">{tidyName(seal.name)}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-5">
          <Row label="POSIÇÃO">{seal.position}º lugar no ranking do dia</Row>
          <Row label="JOGO">
            {bench?.task ?? seal.bench}
            {bench && <span className="mt-1 block font-notation text-[12px] tracking-[0.12em] text-ink-soft">{bench.room}</span>}
          </Row>
          <Row label="PLACAR">
            {seal.score}
            {seal.of !== null && ` de ${seal.of}`} {unit}
          </Row>
          <Row label="DATA">{`${date.day} ${date.month.toLowerCase()} ${date.year}, ${date.time}`}</Row>
          <Row label="FICHA">{serialLabel(seal.serial)}</Row>
        </dl>
        {bench && (
          <p className="border-t-[1.5px] border-ink px-5 py-3 font-notation text-[11px] tracking-[0.14em] text-ink-soft">
            A CIENTISTA POR TRÁS DO JOGO · <span className="text-ink">{bench.reveal.name.toUpperCase()}</span>
          </p>
        )}
      </section>
    </>
  );
}

export function VerifyView() {
  const token = useSyncExternalStore(subscribeHash, readHash, () => null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch("/api/certificate/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (alive) setResult(isResult(body) ? { token, ...body } : { token, status: "invalid" });
      })
      .catch(() => {
        if (alive) setResult({ token, status: "offline" });
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const current = result && result.token === token ? result : null;

  return (
    <main className="graph-paper fixed inset-0 overflow-y-auto">
      <div className="mx-auto max-w-[680px] px-5 pt-8 pb-16 sm:pt-14">
        <header className="flex items-baseline justify-between gap-4 border-b-[2.5px] border-ink pb-3">
          <Link href="/" className="display text-[26px] leading-none">
            Elas em Jogo
          </Link>
          <Eyebrow className="text-ink-soft">Conferência</Eyebrow>
        </header>

        <div aria-live="polite">
          {token === "" && <Message title="Conferir certificado">Aponte a câmera do celular para o QR code no canto do certificado.</Message>}
          {token && !current && <Message title="Conferindo...">Só um instante.</Message>}
          {current?.status === "valid" && current.seal && <Valid seal={current.seal} />}
          {current?.status === "invalid" && (
            <Message title="Não reconhecemos este certificado.">
              O código não bate com nenhum certificado do Elas em Jogo. Ele pode ter sido alterado ou copiado pela metade.
            </Message>
          )}
          {current?.status === "unconfigured" && <Message title="Conferência desligada.">Este site ainda não está pronto para conferir certificados.</Message>}
          {current?.status === "offline" && <Message title="Sem conexão.">Não deu para conferir agora. Tente de novo em instantes.</Message>}
        </div>

        <PlayLink />
      </div>
    </main>
  );
}
