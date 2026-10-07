"use client";

import { useRef } from "react";
import { CURATION_INFO, FEATURED, IMAGE_MANIFEST } from "@/content/scientists/featured";
import { PHOTO_ADAPTATION } from "./PortraitPhoto";
import { Button } from "./ui";

export function Credits({ illustrative }: { illustrative: boolean }) {
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
        className="m-auto h-[min(860px,92vh)] w-[min(1200px,94vw)] max-w-none overflow-hidden bg-paper p-0 text-ink backdrop:bg-ink/40"
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
                Uma experiência do <span className="font-semibold text-iris-blue">ÍRIS</span> — Laboratório de Inovação e Dados do Governo do
                Ceará. Conteúdo verificado na curadoria ({CURATION_INFO.status})
                {CURATION_INFO.reviewPolicy.institutionalApprovalRequired ? "; aprovação editorial institucional pendente" : ""}.
                {illustrative ? " Os demais nomes do mapa coletivo são fictícios e as cotas são ilustrativas." : ""}
              </p>
            </div>
            <Button variant="outline" onClick={() => dialog.current?.close()}>
              Fechar
            </Button>
          </header>
          <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto px-8 py-6 lg:grid-cols-[1fr_2fr]">
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
                          <span className="font-notation text-[11px] break-all text-ink-soft">{entry?.sourcePage ?? s.photo?.sourceUrl}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {pending > 0 && bundled.length > 0 && (
                <p className="text-[14px] text-ink-soft">
                  As demais {pending} cientistas aparecem como retrato topográfico genérico enquanto os direitos de imagem são documentados.
                </p>
              )}
            </section>
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
