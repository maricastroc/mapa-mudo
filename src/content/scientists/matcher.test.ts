import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURED_FIXTURES } from "./fixtures.ts";
import { createMatcher, isValidAnswer, normalizeName } from "./matcher.ts";
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

test("two plausible candidates are never chosen silently", () => {
  const result = match("Ana");
  assert.equal(result.status, "ambiguous");
  assert.ok(result.status === "ambiguous");
  assert.deepEqual(
    result.candidates.map((c) => c.id),
    ["k-ana-luisa", "k-ana-clara"],
  );
  assert.equal(isValidAnswer(result), false);
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
  const ana = match("Ana");
  assert.equal(isValidAnswer(ana), false);
  assert.ok(ana.status === "ambiguous" && !ana.candidates.some((c) => c.id === "k-juliana"));
  assert.equal(match("an").status, "unknown");
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
  assert.equal(result.status, "ambiguous");
  assert.ok(result.status === "ambiguous");
  assert.deepEqual(
    result.candidates.map((c) => c.id),
    [helena.id],
  );
});

test("a distant typo is not turned into a match", () => {
  assert.equal(match("Hylna Alnkr").status, "unknown");
  assert.equal(match("Helga Alemão").status, "unknown");
});

test("an exact longer name is not confused with a shorter registered name", () => {
  assert.equal(idOf(match("Marta Pires")), "k-marta");
  assert.equal(idOf(match("Marta Pires Neto")), "k-marta-neto");
});
