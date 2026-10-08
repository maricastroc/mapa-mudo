import { test } from "node:test";
import assert from "node:assert/strict";
import { findReference } from "../content/scientists/references.ts";
import type { CollectiveEvent } from "./collective.ts";
import { isFirstAnswer, participationsCsv, reviewCsv } from "./exportCsv.ts";

const names: Record<string, string> = { a: "Cientista A", b: "Cientista B" };

test("the export marks first answers, names already on the map and names that came back", () => {
  const events: CollectiveEvent[] = [
    { uid: "1", kind: "silence", at: 0 },
    { uid: "2", kind: "discovery", id: "a", at: 1000 },
    { uid: "3", kind: "recall", id: "a", at: 2000 },
    { uid: "4", kind: "recall", id: "b", at: 3000, later: true },
    { uid: "5", kind: "foreign", ref: "marie-curie", at: 4000 },
  ];
  const lines = participationsCsv([...events].reverse(), (id) => names[id], findReference)
    .trim()
    .split("\n");
  assert.equal(
    lines[0],
    "uid,data_hora,tipo,primeira_resposta,cientista_id,cientista,referencia_id,referencia,categoria_referencia,ja_estava_no_mapa,voltou",
  );
  assert.equal(lines[1], "1,1970-01-01T00:00:00.000Z,nao_sei,sim,,,,,,,");
  assert.equal(lines[2], "2,1970-01-01T00:00:01.000Z,conhecida_aqui,nao,a,Cientista A,,,,nao,");
  assert.equal(lines[3], "3,1970-01-01T00:00:02.000Z,lembrada_sem_pista,sim,a,Cientista A,,,,sim,sim");
  assert.equal(lines[4], "4,1970-01-01T00:00:03.000Z,lembrada_sem_pista,nao,b,Cientista B,,,,nao,nao");
  assert.equal(lines[5], "5,1970-01-01T00:00:04.000Z,estrangeira,sim,,,marie-curie,Marie Curie,foreign,,");
  assert.equal(isFirstAnswer(events[3]), false);
});

test("typed names are exported as text, never as spreadsheet formulas", () => {
  const csv = reviewCsv([
    { uid: "r1", submittedName: '=HYPERLINK("x")', createdAt: 0 },
    { uid: "r2", submittedName: "Maria, da Silva", createdAt: 0 },
  ]);
  const [, first, second] = csv.trim().split("\n");
  assert.equal(first, `r1,1970-01-01T00:00:00.000Z,"'=HYPERLINK(""x"")"`);
  assert.equal(second, `r2,1970-01-01T00:00:00.000Z,"Maria, da Silva"`);
});
