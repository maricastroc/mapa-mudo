"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Response } from "./state";
import { ArrowIcon, Button } from "./ui";

export type ExtraAction = { label: string; onClick: () => void; arrow?: boolean };

export type ResponseHandlers = {
  onName: (text: string) => void;
  onConfirm: (id: string) => void;
  onReject: () => void;
  onSubmitForReview: () => void;
  onClear: () => void;
};

type ActionsProps = {
  extras?: ExtraAction[];
  response: Response | null;
  handlers: ResponseHandlers;
  className?: string;
};

export function Actions({ extras = [], response, handlers, className }: ActionsProps) {
  const [typing, setTyping] = useState(false);

  const open = () => {
    handlers.onClear();
    setTyping(true);
  };

  const cancel = () => {
    setTyping(false);
    handlers.onClear();
  };

  return (
    <div className={`pointer-events-auto flex flex-col items-start gap-3 ${className ?? ""}`}>
      {!typing && (
        <div className="flex flex-wrap items-center gap-4 bg-paper p-3 compact:gap-2.5 compact:p-2">
          <Button variant="primary" onClick={open}>
            Digitar
          </Button>
          {extras.map((e) => (
            <Button key={e.label} variant="outline" arrow={e.arrow} onClick={e.onClick}>
              {e.label}
            </Button>
          ))}
        </div>
      )}
      {typing && <TypeName onName={handlers.onName} onCancel={cancel} onChange={handlers.onClear} />}
      {response && <ResponsePanel response={response} handlers={handlers} />}
    </div>
  );
}

function ResponsePanel({ response, handlers }: { response: Response; handlers: ResponseHandlers }) {
  const sentence = "bg-paper px-3 py-1.5 text-[22px] leading-[1.3] font-medium compact:text-[17px]";
  switch (response.kind) {
    case "confirm": {
      const single = response.candidates.length === 1;
      return (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className={sentence}>{single ? "Encontramos um nome parecido. É ela?" : "Encontramos nomes parecidos. É alguma delas?"}</p>
          <div className="flex flex-wrap gap-3 bg-paper p-2">
            {response.candidates.map((c) => (
              <Button key={c.id} variant="primary" onClick={() => handlers.onConfirm(c.id)} aria-label={single ? `Sim, é ${c.name}` : c.name}>
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
            ? "Há várias cientistas com esse nome no mapa. Pode dizer o nome completo?"
            : "Pode dizer o nome completo?"}
        </p>
      );
    case "notFound":
      return (
        <div role="status" className="flex flex-col items-start gap-2">
          <p className={sentence}>
            “{response.text}” ainda não está no nosso mapa.{" "}
            <span className="text-ink-soft">O mapa também é incompleto: você pode ajudar a ampliá-lo.</span>
          </p>
          <div className="flex flex-wrap gap-3 bg-paper p-2">
            <Button variant="primary" onClick={handlers.onSubmitForReview}>
              Adicionar para conferência
            </Button>
            <Button variant="outline" onClick={handlers.onClear}>
              Tentar outro nome
            </Button>
          </div>
        </div>
      );
    case "submitted":
      return (
        <p role="status" className={sentence}>
          “{response.text}” foi guardado para conferência. Obrigada por ampliar o mapa.
        </p>
      );
    case "otherPoint":
      return (
        <p role="status" className={sentence}>
          Esse não é o nome deste ponto. Chegue mais perto.
        </p>
      );
    case "noCuration":
      return (
        <p role="status" className={sentence}>
          Ainda não há cientistas em destaque para descobrir.
        </p>
      );
  }
}

function TypeName({
  onName,
  onCancel,
  onChange,
}: {
  onName: (text: string) => void;
  onCancel: () => void;
  onChange: () => void;
}) {
  const [value, setValue] = useState("");
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
      className="flex flex-wrap items-end gap-4 bg-paper p-3 compact:gap-2.5 compact:p-2"
    >
      <label className="flex flex-col gap-1">
        <span className="font-primary text-[13px] font-semibold tracking-[0.14em] text-ink-soft uppercase">Nome da cientista</span>
        <input
          ref={input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange();
          }}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          className="h-[64px] w-[440px] border-0 border-b-2 border-ink bg-transparent px-1 text-[34px] font-semibold tracking-[0.02em] text-ink uppercase placeholder:text-ink-soft/60 focus:border-action focus:outline-none compact:h-[52px] compact:w-[min(78vw,440px)] compact:text-[24px]"
          placeholder="______"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-[64px] cursor-pointer items-center gap-3 rounded-action bg-action px-6 font-primary text-[16px] font-semibold tracking-[0.08em] text-on-action uppercase compact:min-h-[52px]"
      >
        Dizer
        <ArrowIcon />
      </button>
      <Button variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  );
}
