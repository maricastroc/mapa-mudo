import type { PendingScientistSubmission, ReferenceName } from "../content/scientists/types.ts";
import type { CollectiveEvent } from "./collective.ts";

const KIND_LABELS: Record<CollectiveEvent["kind"], string> = {
  silence: "nao_sei",
  recall: "lembrada_sem_pista",
  discovery: "conhecida_aqui",
  recognition: "reconhecida",
  cued: "reconhecida_com_pista",
  foreign: "estrangeira",
  man: "homem",
  elsewhere: "brasileira_fora_da_folha",
  unidentified: "nao_identificado",
};

const FIRST_KINDS = new Set<CollectiveEvent["kind"]>(["silence", "recall", "foreign", "man", "elsewhere", "unidentified"]);

function cell(value: string | number) {
  const raw = String(value);
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rows(table: (string | number)[][]) {
  return table.map((row) => row.map(cell).join(",")).join("\n") + "\n";
}

export function isFirstAnswer(event: CollectiveEvent) {
  if (!FIRST_KINDS.has(event.kind)) return false;
  return !("later" in event && event.later);
}

export function participationsCsv(
  events: CollectiveEvent[],
  scientistName: (id: string) => string | undefined,
  reference: (id: string) => ReferenceName | undefined,
) {
  const presence = new Map<string, number>();
  const reef = new Map<string, number>();
  const table: (string | number)[][] = [
    [
      "uid",
      "data_hora",
      "tipo",
      "primeira_resposta",
      "cientista_id",
      "cientista",
      "referencia_id",
      "referencia",
      "categoria_referencia",
      "ja_estava_no_mapa",
      "voltou",
    ],
  ];
  const ordered = [...events].sort((a, b) => a.at - b.at || a.uid.localeCompare(b.uid));
  for (const e of ordered) {
    const id = "id" in e ? e.id : "";
    const ref = "ref" in e ? reference(e.ref) : undefined;
    const before = id ? (presence.get(id) ?? 0) : 0;
    const returned = e.kind === "recall" && (reef.get(id) ?? 0) > 0;
    table.push([
      e.uid,
      new Date(e.at).toISOString(),
      KIND_LABELS[e.kind],
      isFirstAnswer(e) ? "sim" : "nao",
      id,
      id ? (scientistName(id) ?? "") : "",
      "ref" in e ? e.ref : "",
      ref?.canonicalName ?? "",
      ref?.category ?? "",
      id ? (before > 0 ? "sim" : "nao") : "",
      e.kind === "recall" ? (returned ? "sim" : "nao") : "",
    ]);
    if (id) {
      presence.set(id, before + 1);
      if (e.kind !== "recall") reef.set(id, (reef.get(id) ?? 0) + 1);
    }
  }
  return rows(table);
}

export function reviewCsv(submissions: PendingScientistSubmission[]) {
  return rows([
    ["uid", "data_hora", "nome_digitado"],
    ...submissions.map((s) => [s.uid, new Date(s.createdAt).toISOString(), s.submittedName]),
  ]);
}
