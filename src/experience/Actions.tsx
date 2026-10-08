"use client";

import { useEffect, useRef, type FormEvent } from "react";
import type { Response } from "./state";
import { ArrowIcon, Button } from "./ui";

export type ExtraAction = { label: string; onClick: () => void; arrow?: boolean };

export type ResponseHandlers = {
  onName: (text: string) => void;
  onConfirm: (id: string) => void;
  onReject: () => void;
  onSubmitForReview: () => void;
  onClear: () => void;
  onDiscover: () => void;
  onSeeMap: () => void;
};

type NameEntryProps = {
  extras: ExtraAction[];
  response: Response | null;
  handlers: ResponseHandlers;
  typing: boolean;
  value: string;
  completion: string | null;
  keyboard: boolean;
  again: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
};

export function NameEntry({
  extras,
  response,
  handlers,
  typing,
  value,
  completion,
  keyboard,
  again,
  onOpen,
  onCancel,
  onChange,
}: NameEntryProps) {
  return (
    <div className="pointer-events-auto flex flex-col items-start gap-3">
      {!typing && (
        <div className="flex flex-wrap items-center gap-4 bg-paper p-3 compact:gap-2.5 compact:p-2">
          <Button variant="primary" onClick={onOpen}>
            Digitar
          </Button>
          {extras.map((e) => (
            <Button key={e.label} variant="outline" arrow={e.arrow} onClick={e.onClick}>
              {e.label}
            </Button>
          ))}
        </div>
      )}
      {typing && (
        <TypeName
          value={value}
          completion={completion}
          reserve={again}
          keyboard={keyboard}
          onChange={onChange}
          onName={handlers.onName}
          onCancel={onCancel}
        />
      )}
      {response && <ResponsePanel response={response} handlers={handlers} again={again} />}
    </div>
  );
}

function ResponsePanel({ response, handlers, again }: { response: Response; handlers: ResponseHandlers; again: boolean }) {
  const sentence = "bg-paper px-3 py-1.5 text-[22px] leading-[1.3] font-medium compact:text-[17px]";
  const soft = "bg-paper px-3 py-1 text-[19px] leading-[1.35] text-ink-soft compact:text-[15px]";
  const row = "flex flex-wrap gap-3 bg-paper p-2";
  switch (response.kind) {
    case "confirm": {
      const single = response.candidates.length === 1;
      return (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className={sentence}>{single ? "Encontramos um nome parecido. É ela?" : "Encontramos nomes parecidos. É alguma delas?"}</p>
          <div className={row}>
            {response.candidates.map((c) => (
              <Button
                key={c.id}
                variant="primary"
                onClick={() => handlers.onConfirm(c.id)}
                aria-label={single ? `Sim, é ${c.name}` : c.name}
              >
                {c.name}
              </Button>
            ))}
            <Button variant="outline" onClick={handlers.onReject}>
              {single ? "Não é" : "Nenhuma delas"}
            </Button>
          </div>
        </div>
      );
    }
    case "incomplete":
      return (
        <p role="status" className={sentence}>
          {response.candidateCount > 1
            ? "Há mais de uma cientista com esse nome. Pode escrever o sobrenome também?"
            : "Pode escrever o sobrenome também?"}
        </p>
      );
    case "notFound":
      return (
        <div role="status" className="flex flex-col items-start gap-1.5">
          <p className={sentence}>“{response.text}” não está na nossa lista.</p>
          <p className={soft}>O mapa também é incompleto. Se ela é cientista e brasileira, guarde o nome para a equipe conferir.</p>
          <div className={row}>
            <Button variant="primary" onClick={handlers.onSubmitForReview}>
              Guardar para conferência
            </Button>
            <Button variant="outline" onClick={handlers.onClear}>
              Tentar outro nome
            </Button>
          </div>
        </div>
      );
    case "submitted":
      return (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className={sentence}>Guardamos “{response.text}” para conferência. Obrigada por ampliar o mapa.</p>
          <div className={row}>
            {again ? (
              <Button variant="primary" arrow onClick={handlers.onSeeMap}>
                Ver o mapa
              </Button>
            ) : (
              <Button variant="primary" arrow onClick={handlers.onDiscover}>
                Conhecer uma cientista
              </Button>
            )}
          </div>
        </div>
      );
    case "reference": {
      const lines = REFERENCE_COPY[response.category];
      const next = again ? null : lines.next;
      return (
        <div role="status" className="flex flex-col items-start gap-1.5">
          <p className={sentence}>
            {response.name} <span className="text-ink-soft">— {response.note}.</span>
          </p>
          {lines.others(response.others) && <p className={soft}>{lines.others(response.others)}</p>}
          {lines.prompt && <p className={sentence}>{lines.prompt}</p>}
          <div className={row}>
            {next && (
              <Button variant="primary" arrow onClick={handlers.onDiscover}>
                {next}
              </Button>
            )}
            {response.category === "elsewhere" || again ? (
              <Button variant={next ? "outline" : "primary"} arrow={!next} onClick={handlers.onSeeMap}>
                Ver o mapa
              </Button>
            ) : (
              <Button variant="outline" onClick={handlers.onClear}>
                Tentar outro nome
              </Button>
            )}
          </div>
        </div>
      );
    }
    case "noCuration":
      return (
        <p role="status" className={sentence}>
          Ainda não há cientistas em destaque para descobrir.
        </p>
      );
  }
}

const REFERENCE_COPY = {
  foreign: {
    others: (n: number) => (n >= 2 ? `Aqui, mais ${n} pessoas também pensaram primeiro numa cientista de fora do Brasil.` : null),
    prompt: "E uma brasileira?",
    next: "Conhecer uma brasileira",
  },
  man: {
    others: (n: number) => (n >= 2 ? `Aqui, mais ${n} pessoas também pensaram primeiro num homem.` : null),
    prompt: "E uma cientista?",
    next: "Conhecer uma cientista",
  },
  elsewhere: {
    others: () => "Ela é brasileira e ainda não está nesta folha. O nome dela entrou na contagem do mapa.",
    prompt: null,
    next: "Conhecer outra cientista",
  },
} as const;

function TypeName({
  value,
  completion,
  reserve,
  keyboard,
  onChange,
  onName,
  onCancel,
}: {
  value: string;
  completion: string | null;
  reserve: boolean;
  keyboard: boolean;
  onChange: (value: string) => void;
  onName: (text: string) => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onName(value);
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="flex flex-col items-start gap-2 bg-paper p-3 compact:p-2"
    >
      <div className="flex flex-wrap items-end gap-4 compact:gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="font-primary text-[13px] font-semibold tracking-[0.14em] text-ink-soft uppercase">Nome da cientista</span>
          <input
            ref={input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode={keyboard ? "none" : "text"}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={80}
            className="h-[64px] w-[440px] border-0 border-b-2 border-ink bg-transparent px-1 text-[34px] font-semibold tracking-[0.02em] text-ink uppercase placeholder:text-ink-soft/60 focus:border-action focus:outline-none compact:h-[52px] compact:w-[min(78vw,440px)] compact:text-[24px]"
            placeholder="______"
          />
        </label>
        <button
          type="submit"
          className={`min-h-[64px] cursor-pointer items-center gap-3 rounded-action bg-action px-6 font-primary text-[16px] font-semibold tracking-[0.08em] text-on-action uppercase compact:inline-flex compact:min-h-[52px] ${keyboard ? "hidden" : "inline-flex"}`}
        >
          Dizer
          <ArrowIcon />
        </button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {!completion && reserve && <span aria-hidden="true" className="block h-[48px]" />}
      {completion && (
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onName(completion)}
          className="pointer-events-auto inline-flex min-h-[48px] cursor-pointer items-center gap-2.5 border-[1.5px] border-dashed border-accent px-3 font-primary text-[20px] font-semibold tracking-[0.04em] text-ink uppercase hover:bg-accent/15 compact:text-[16px]"
        >
          <ArrowIcon className="size-4 shrink-0" />
          {completion}
        </button>
      )}
    </form>
  );
}
