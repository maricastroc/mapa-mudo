"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import type { Response } from "./state";
import { ArrowIcon, Button, MicrophoneIcon } from "./ui";

export type ExtraAction = { label: string; onClick: () => void; arrow?: boolean };

export type ResponseHandlers = {
  onName: (text: string) => void;
  onSilence: () => void;
  onConfirm: (id: string) => void;
  onReject: () => void;
  onSubmitForReview: () => void;
  onClear: () => void;
};

type ActionsProps = {
  speak?: { label: string; accent?: boolean };
  type?: boolean;
  extras?: ExtraAction[];
  speech: string | null;
  response: Response | null;
  reducedMotion: boolean;
  handlers: ResponseHandlers;
  className?: string;
};

type InputMode = null | "speak" | "type";

export function Actions({ speak, type, extras = [], speech, response, reducedMotion, handlers, className }: ActionsProps) {
  const [mode, setMode] = useState<InputMode>(null);
  const effectiveMode: InputMode = mode === "speak" && response ? null : mode;

  const open = (m: InputMode) => {
    handlers.onClear();
    setMode(m);
  };

  const clear = () => {
    if (mode === "speak") setMode(null);
    handlers.onClear();
  };

  return (
    <div className={`pointer-events-auto flex flex-col items-start gap-3 ${className ?? ""}`}>
      {effectiveMode === null && (
        <div className="flex flex-wrap items-center gap-4 bg-paper p-3 compact:gap-2.5 compact:p-2">
          {speak && (
            <button
              type="button"
              onClick={() => open("speak")}
              data-speak={speak.accent ? "accent" : undefined}
              className="group inline-flex min-h-[76px] cursor-pointer items-center gap-4 rounded-action pr-3 font-primary text-[16px] font-semibold tracking-[0.06em] uppercase compact:min-h-[56px] compact:text-[14px]"
            >
              <span className="grid size-[76px] place-items-center rounded-action bg-speak text-on-speak transition-transform group-hover:scale-105 compact:size-[56px]">
                <MicrophoneIcon />
              </span>
              <span>{speak.label}</span>
            </button>
          )}
          {type && (
            <Button variant="outline" onClick={() => open("type")}>
              Digitar
            </Button>
          )}
          {extras.map((e) => (
            <Button key={e.label} variant="outline" arrow={e.arrow} onClick={e.onClick}>
              {e.label}
            </Button>
          ))}
        </div>
      )}
      {effectiveMode === "speak" && (
        <Listening
          speech={speech}
          accent={speak?.accent ?? false}
          reducedMotion={reducedMotion}
          onName={handlers.onName}
          onSilence={() => {
            setMode(null);
            handlers.onSilence();
          }}
          onCancel={() => setMode(null)}
        />
      )}
      {effectiveMode === "type" && (
        <TypeName onName={handlers.onName} onCancel={() => setMode(null)} onChange={handlers.onClear} />
      )}
      {response && <ResponsePanel response={response} handlers={{ ...handlers, onClear: clear }} />}
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
    case "silence":
      return (
        <p role="status" className={sentence}>
          Não ouvimos nenhum nome. Tente de novo.
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

function Listening({
  speech,
  accent,
  reducedMotion,
  onName,
  onSilence,
  onCancel,
}: {
  speech: string | null;
  accent: boolean;
  reducedMotion: boolean;
  onName: (text: string) => void;
  onSilence: () => void;
  onCancel: () => void;
}) {
  const [heard, setHeard] = useState("");
  const [done, setDone] = useState(false);
  const deliver = useEffectEvent((text: string) => onName(text));
  const silence = useEffectEvent(() => onSilence());

  useEffect(() => {
    const ids: number[] = [];
    const later = (ms: number, fn: () => void) => ids.push(window.setTimeout(fn, ms));
    if (speech === null) {
      later(reducedMotion ? 1800 : 3400, silence);
    } else {
      const start = reducedMotion ? 600 : 1300;
      const perLetter = reducedMotion ? 0 : 75;
      for (let i = 1; i <= speech.length; i++) later(start + i * perLetter, () => setHeard(speech.slice(0, i)));
      const total = start + speech.length * perLetter;
      later(total + 250, () => setDone(true));
      later(total + (reducedMotion ? 600 : 1100), () => deliver(speech));
    }
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [speech, reducedMotion]);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-5 bg-paper p-3 compact:gap-3 compact:p-2" data-speak={accent ? "accent" : undefined}>
        <span className="relative grid size-[76px] place-items-center compact:size-[56px]" aria-hidden="true">
          {!done &&
            [0, 600, 1200].map((delay) => (
              <span
                key={delay}
                className="ripple absolute inset-0 rounded-full border-[1.5px] border-accent"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          <span className="relative grid size-full place-items-center rounded-action bg-speak text-on-speak">
            <MicrophoneIcon />
          </span>
        </span>
        <div className="flex min-w-[340px] flex-col gap-1 compact:min-w-0">
          <p className="font-primary text-[14px] font-semibold tracking-[0.14em] text-ink-soft uppercase">{done ? "Nome ouvido" : "Ouvindo…"}</p>
          <p aria-live="polite" className="min-h-[1.15em] text-[34px] leading-[1.1] font-semibold tracking-[0.02em] uppercase compact:text-[24px]">
            {heard}
            {!done && speech !== null && (
              <span aria-hidden="true" className="caret-blink ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] bg-accent" />
            )}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <p className="bg-paper px-2 py-0.5 font-notation text-[12px] tracking-[0.06em] text-ink-soft uppercase">
        Simulação · a voz ainda não é reconhecida neste protótipo
      </p>
    </div>
  );
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
