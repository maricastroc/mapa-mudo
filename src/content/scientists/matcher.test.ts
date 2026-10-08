import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURED_FIXTURES } from "./fixtures.ts";
import { completesName, createMatcher, isValidAnswer, normalizeName } from "./matcher.ts";
import { REFERENCE_NAMES } from "./references.ts";
import type { Catalog, KnownScientist, ScientistMatch } from "./types.ts";

const helena = FEATURED_FIXTURES[0];

const known = (id: string, canonicalName: string, aliases: string[] = []): KnownScientist => ({
  id,
  canonicalName,
  aliases,
  fictional: true,
});

const catalog: Catalog = {
  featured: [helena],
  known: [
    known("k-iracema", "Iracema Leitão"),
    known("k-ana-luisa", "Ana Luísa Braga"),
    known("k-ana-clara", "Ana Clara Bastos"),
    known("k-ana-luisa-prado", "Ana Luísa Prado"),
    known("k-juliana", "Juliana Rocha"),
    known("k-marta", "Marta Pires"),
    known("k-marta-neto", "Marta Pires Neto"),
  ],
};

const match = createMatcher(catalog);

function idOf(result: ScientistMatch) {
  return result.status === "featured" || result.status === "known" ? result.scientist.id : null;
}

test("exact canonical name of a featured scientist is featured", () => {
  const result = match("Helena Alencar");
  assert.equal(result.status, "featured");
  assert.equal(idOf(result), helena.id);
});

test("letter case does not matter", () => {
  assert.equal(idOf(match("helena alencar")), helena.id);
  assert.equal(idOf(match("HELENA ALENCAR")), helena.id);
});

test("surrounding and repeated spaces do not matter", () => {
  assert.equal(idOf(match("  Helena   Alencar ")), helena.id);
});

test("diacritics are normalized in both directions", () => {
  assert.equal(normalizeName("ÍRACÊMA  LEITÃO"), "iracema leitao");
  assert.equal(idOf(match("Iracema Leitao")), "k-iracema");
  assert.equal(idOf(match("IRACÊMA LEITÃO")), "k-iracema");
});

test("explicitly registered alias resolves to the right person", () => {
  const result = match("Lena Alencar");
  assert.equal(result.status, "featured");
  assert.equal(idOf(result), helena.id);
});

test("a scientist only in the known list returns status known", () => {
  const result = match("Ana Luísa Braga");
  assert.equal(result.status, "known");
  assert.equal(idOf(result), "k-ana-luisa");
});

test("names that are not in the catalog return unknown with the submitted text", () => {
  const result = match("  Marie   Curie ");
  assert.deepEqual(result, { status: "unknown", submittedName: "Marie Curie" });
});

test("a specific input with two plausible candidates is ambiguous and never chosen silently", () => {
  const result = match("Ana Luísa");
  assert.equal(result.status, "ambiguous");
  assert.ok(result.status === "ambiguous");
  assert.deepEqual(
    result.candidates.map((c) => c.id),
    ["k-ana-luisa", "k-ana-luisa-prado"],
  );
  assert.equal(isValidAnswer(result), false);
});

test("an excessively incomplete input is incomplete, not ambiguous", () => {
  assert.deepEqual(match("Ana"), { status: "incomplete", submittedName: "Ana", candidateCount: 3 });
  assert.deepEqual(match("Helena"), { status: "incomplete", submittedName: "Helena", candidateCount: 1 });
});

test("a surname that belongs to a single person is a suggestion, a first name alone is not", () => {
  const surname = match("Alencar");
  assert.ok(surname.status === "suggestion");
  assert.equal(surname.candidate.id, helena.id);
  assert.equal(match("Leitão").status, "suggestion");
  assert.equal(match("Pires").status, "incomplete");
  assert.equal(match("Helena").status, "incomplete");
});

const withReferences = createMatcher(catalog, REFERENCE_NAMES);

test("famous names outside the sheet are recognized by name, alias or a close typo, never by a loose fragment", () => {
  for (const [text, id] of [
    ["Marie Curie", "marie-curie"],
    ["madame curie", "marie-curie"],
    ["Curie", "marie-curie"],
    ["Mari Curie", "marie-curie"],
    ["Einstein", "albert-einstein"],
    ["einstien", "albert-einstein"],
    ["Santos Dumont", "santos-dumont"],
    ["Zilda Arns", "zilda-arns"],
  ]) {
    const result = withReferences(text);
    assert.ok(result.status === "reference", text);
    assert.equal(result.reference.id, id, text);
  }
  assert.equal(withReferences("Marie").status, "unknown");
  assert.equal(withReferences("Cruz").status, "unknown");
  assert.equal(withReferences("Helena Alencar").status, "featured");
});

test("every reference name is unique and none of them collides with a curated scientist", () => {
  const ids = REFERENCE_NAMES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const r of REFERENCE_NAMES) {
    assert.ok(r.note.length > 0, r.id);
    const self = withReferences(r.canonicalName);
    assert.ok(self.status === "reference" && self.reference.id === r.id, r.id);
  }
});

test("completing a name accepts any unambiguous start of her words, in order, from three letters", () => {
  const names = ["Ana Maria Primavesi"];
  assert.equal(completesName("ana", names), true);
  assert.equal(completesName("prima", names), true);
  assert.equal(completesName("Ana Prim", names), true);
  assert.equal(completesName("PRIMAVESI", names), true);
  assert.equal(completesName("primaveis", names), true);
  assert.equal(completesName("an", names), false);
  assert.equal(completesName("Primavesi Ana", names), false);
  assert.equal(completesName("Ana Souza", names), false);
  assert.equal(completesName("", names), false);
});

test("the same alias registered for two people is ambiguous", () => {
  const shared = createMatcher({
    featured: [],
    known: [known("a", "Rosa Lima Alves", ["Rosa Lima"]), known("b", "Rosa Lima Souto", ["Rosa Lima"])],
  });
  const result = shared("rosa lima");
  assert.equal(result.status, "ambiguous");
});

test("empty input is not recognized", () => {
  assert.deepEqual(match(""), { status: "empty" });
  assert.deepEqual(match("    "), { status: "empty" });
  assert.deepEqual(match(" - . "), { status: "empty" });
});

test("a short common substring is never an automatic match", () => {
  assert.equal(isValidAnswer(match("Ana")), false);
  assert.equal(match("an").status, "unknown");
  const specific = match("Ana Rocha");
  assert.equal(specific.status, "unknown");
});

test("too many partial candidates asks for the full name instead of listing everyone", () => {
  const crowded = createMatcher({
    featured: [],
    known: [known("1", "Ana Alves"), known("2", "Ana Bento"), known("3", "Ana Costa"), known("4", "Ana Dias")],
  });
  assert.deepEqual(crowded("ana"), { status: "incomplete", submittedName: "ana", candidateCount: 4 });
});

test("a close typo becomes a suggestion that needs confirmation, not a match", () => {
  const result = match("Helena Alencr");
  assert.equal(result.status, "suggestion");
  assert.ok(result.status === "suggestion");
  assert.equal(result.candidate.id, helena.id);
  assert.equal(isValidAnswer(result), false);
});

test("a specific partial name with a single candidate is a suggestion", () => {
  const result = match("Ana Clara");
  assert.ok(result.status === "suggestion");
  assert.equal(result.candidate.id, "k-ana-clara");
});

test("a distant typo is not turned into a match", () => {
  assert.equal(match("Hylna Alnkr").status, "unknown");
  assert.equal(match("Helga Alemão").status, "unknown");
});

test("an exact longer name is not confused with a shorter registered name", () => {
  assert.equal(idOf(match("Marta Pires")), "k-marta");
  assert.equal(idOf(match("Marta Pires Neto")), "k-marta-neto");
});

const fullNames = createMatcher({
  featured: [],
  known: [
    known("k-tatiana", "Tatiana Sampaio"),
    known("k-nise", "Nise da Silveira"),
    known("k-elisa", "Elisa Frota-Pessôa"),
    known("k-ana-maria", "Ana Maria Primavesi"),
    known("k-maria-silva", "Maria Silva"),
    known("k-maria-souza-silva", "Maria Souza Silva"),
  ],
});

function idFrom(result: ScientistMatch) {
  return result.status === "featured" || result.status === "known" ? result.scientist.id : null;
}

test("a fuller name that keeps the registered first name and last surname is recognized", () => {
  assert.equal(idFrom(fullNames("Tatiana Coelho de Sampaio")), "k-tatiana");
  assert.equal(idFrom(fullNames("Nise Magalhães da Silveira")), "k-nise");
  assert.equal(idFrom(fullNames("Elisa Esther Habib Frota Pessoa")), "k-elisa");
  assert.equal(idFrom(fullNames("ana maria pereira primavesi")), "k-ana-maria");
});

test("a fuller name is not recognized when the first name, the last surname or the order differ", () => {
  assert.equal(idFrom(fullNames("Tatiana Coelho")), null);
  assert.equal(idFrom(fullNames("Luana Coelho de Sampaio")), null);
  assert.equal(idFrom(fullNames("Tatiana Sampaio Coelho")), null);
  assert.equal(idFrom(fullNames("Sampaio Coelho Tatiana")), null);
  assert.equal(idFrom(fullNames("Ana Pereira Primavesi")), null);
});

test("extra names may sit anywhere between the registered ones", () => {
  assert.equal(idFrom(fullNames("Ana Pereira Maria Primavesi")), "k-ana-maria");
});

test("a fuller name with a typo in a registered word asks for confirmation", () => {
  const result = fullNames("Tatiana Coelho de Sampaoi");
  assert.equal(result.status, "suggestion");
  assert.equal(result.status === "suggestion" && result.candidate.id, "k-tatiana");
});

test("a fuller name that fits two registered people is ambiguous", () => {
  const result = fullNames("Maria Pereira Souza Silva");
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.status === "ambiguous" && result.candidates.map((c) => c.id).sort(), ["k-maria-silva", "k-maria-souza-silva"]);
});
