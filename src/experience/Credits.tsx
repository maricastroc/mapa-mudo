"use client";

import { useRef } from "react";
import { CATALOG, findScientist } from "@/content/scientists/catalog";
import { CURATION_INFO, FEATURED, IMAGE_MANIFEST } from "@/content/scientists/featured";
import { findReference } from "@/content/scientists/references";
import type { PendingScientistSubmission } from "@/content/scientists/types";
import { unnamedCount, type Collective, type CollectiveEvent } from "@/participation/collective";
import { participationsCsv, reviewCsv } from "@/participation/exportCsv";
import { PHOTO_ADAPTATION } from "./PortraitPhoto";
import { Button } from "./ui";

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function FairData({
  events,
  review,
  collective,
}: {
  events: CollectiveEvent[];
  review: PendingScientistSubmission[];
  collective: Collective;
}) {
  const rows = [
    ["Primeiras respostas", collective.answers],
    ["Não lembraram de nenhuma brasileira", unnamedCount(collective)],
    ["Disseram “não sei”", collective.firsts.silence],
    ["Pensaram numa estrangeira", collective.firsts.foreign],
    ["Pensaram num homem", collective.firsts.man],
    ["Registros no total", events.length],
    ["Nomes guardados para conferência", review.length],
  ] as const;
  return (
    <section aria-labelledby="credits-data" className="flex flex-col gap-3">
      <h3 id="credits-data" className="text-[14px] font-semibold tracking-[0.16em] uppercase">
        Dados da feira
      </h3>
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[14px]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-right font-notation">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            download(
              `diga-um-nome-participacoes-${stamp()}.csv`,
              participationsCsv(events, (id) => findScientist(CATALOG, id)?.canonicalName, findReference),
            )
          }
        >
          Baixar participações
        </Button>
        <Button variant="outline" onClick={() => download(`diga-um-nome-conferencia-${stamp()}.csv`, reviewCsv(review))}>
          Baixar lista de conferência
        </Button>
      </div>
      <p className="max-w-[520px] text-[13px] leading-relaxed text-ink-soft">
        Nada identifica quem participou. Cada registro guarda só o tipo de resposta, a cientista e a hora. Os dados ficam neste navegador e,
        com o servidor local ligado, também na pasta <span className="font-notation">data/</span> do computador.
      </p>
    </section>
  );
}

export function Credits({
  illustrative,
  events,
  review,
  collective,
}: {
  illustrative: boolean;
  events: CollectiveEvent[];
  review: PendingScientistSubmission[];
  collective: Collective;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const manifest = new Map(IMAGE_MANIFEST.map((m) => [m.id, m]));
  const bundled = FEATURED.filter((s) => s.photo?.src);
  const pending = FEATURED.length - bundled.length;

  return (
    <>
      <Button variant="subtle" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        Créditos
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="credits-title"
        className="m-auto h-[min(860px,92vh)] w-[min(1200px,94vw)] max-w-none overflow-hidden bg-paper p-0 font-primary tracking-normal text-ink normal-case backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-6 border-b-[1.5px] border-ink px-8 pt-6 pb-5">
            <div className="flex flex-col gap-1">
              <p className="font-notation text-[12px] tracking-[0.08em] text-ink-soft">FOLHA 01 · CRÉDITOS</p>
              <h2 id="credits-title" className="text-[30px] leading-tight font-semibold">
                Diga um Nome — {CURATION_INFO.theme}
              </h2>
              <p className="max-w-[720px] text-[15px] text-ink-soft">
                Uma experiência do <span className="font-semibold text-iris-blue">ÍRIS</span> — Laboratório de Inovação e Dados do Governo
                do Ceará. {FEATURED.length} cientistas com conteúdo verificado na curadoria (versão {CURATION_INFO.version})
                {CURATION_INFO.reviewPolicy.institutionalApprovalRequired ? "; aprovação editorial institucional pendente" : ""}.
                {illustrative ? " Os demais nomes do mapa coletivo são fictícios e as cotas são ilustrativas." : ""}
              </p>
            </div>
            <Button variant="outline" onClick={() => dialog.current?.close()}>
              Fechar
            </Button>
          </header>
          <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto px-8 py-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-8">
              <FairData events={events} review={review} collective={collective} />
              <section aria-labelledby="credits-images" className="flex flex-col gap-3">
                <h3 id="credits-images" className="text-[14px] font-semibold tracking-[0.16em] uppercase">
                  Imagens
                </h3>
                {bundled.length === 0 ? (
                  <p className="text-[15px] leading-relaxed">
                    Nenhum retrato fotográfico está incluído nesta versão. As cientistas aparecem como retratos topográficos genéricos
                    enquanto os direitos de imagem são documentados.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3 text-[14px] leading-snug">
                    {bundled.map((s) => {
                      const entry = manifest.get(s.id);
                      const license = entry?.license ?? null;
                      return (
                        <li key={s.id} className="flex flex-col gap-0.5">
                          <span className="font-semibold">{s.canonicalName}</span>
                          <span>
                            {entry?.creditLine ?? s.photo?.credit ?? "Crédito a confirmar."}
                            {license ? ` Licença: ${license}.` : ""}
                          </span>
                          <span className="text-ink-soft">Imagem adaptada: {PHOTO_ADAPTATION}.</span>
                          {license?.includes("BY-SA") && (
                            <span className="text-ink-soft">A versão adaptada é compartilhada sob a mesma licença ({license}).</span>
                          )}
                          {(entry?.sourcePage ?? s.photo?.sourceUrl) && (
                            <span className="font-notation text-[11px] break-all text-ink-soft">
                              {entry?.sourcePage ?? s.photo?.sourceUrl}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {pending > 0 && bundled.length > 0 && (
                  <p className="text-[14px] text-ink-soft">
                    As demais {pending} cientistas aparecem como retrato topográfico genérico enquanto os direitos de imagem são
                    documentados.
                  </p>
                )}
              </section>
            </div>
            <section aria-labelledby="credits-sources" className="flex flex-col gap-3">
              <h3 id="credits-sources" className="text-[14px] font-semibold tracking-[0.16em] uppercase">
                Fontes factuais
              </h3>
              <ul className="grid grid-cols-1 gap-x-8 gap-y-3 text-[13px] leading-snug md:grid-cols-2">
                {FEATURED.map((s) => (
                  <li key={s.id} className="flex flex-col gap-0.5">
                    <span className="font-semibold">{s.canonicalName}</span>
                    {s.sources.map((source) => (
                      <span key={source.id} className="text-ink-soft">
                        {source.label} · <span className="font-notation text-[11px] break-all">{source.url}</span>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </dialog>
    </>
  );
}
