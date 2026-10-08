import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import rawFeatured from "./featured.json" with { type: "json" };
import { CATALOG, shownSources } from "./catalog.ts";
import { curationProblems } from "./curatedPackage.ts";
import { FEATURED, IMAGE_MANIFEST } from "./featured.ts";
import { createMatcher } from "./matcher.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const publicDir = join(root, "public");

test("the curated package parses and has no referential problems", () => {
  assert.equal(FEATURED.length, rawFeatured.featuredScientists.length);
  assert.deepEqual(curationProblems(FEATURED, IMAGE_MANIFEST), []);
});

test("scientist ids are unique across featured and known", () => {
  const ids = [...CATALOG.featured, ...CATALOG.known].map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every featured scientist has exactly three ordered hints backed by facts", () => {
  for (const s of FEATURED) {
    assert.equal(s.experience.hints.length, 3, s.id);
    const facts = new Set(s.facts.map((f) => f.id));
    s.experience.hints.forEach((h, i) => {
      assert.equal(h.level, i + 1, `${s.id} hint ${i + 1}`);
      assert.ok(h.factIds.length > 0 && h.factIds.every((id) => facts.has(id)), `${s.id} hint ${h.level}`);
    });
    const sources = new Set(s.sources.map((x) => x.id));
    assert.ok(s.experience.reveal.sourceRefs.length > 0, `${s.id} reveal`);
    assert.ok(s.experience.reveal.sourceRefs.every((id) => sources.has(id)), `${s.id} reveal`);
  }
});

test("hint and reveal wording is carried over verbatim from the package", () => {
  const raw = rawFeatured.featuredScientists;
  for (const s of FEATURED) {
    const original = raw.find((r) => r.id === s.id);
    assert.ok(original, s.id);
    assert.deepEqual(
      s.experience.hints.map((h) => h.text),
      original.experience.hints.map((h) => h.text),
    );
    assert.equal(s.experience.reveal.summary, original.experience.reveal.summary);
    assert.equal(s.experience.reveal.headline, original.experience.reveal.headline);
    assert.deepEqual(s.facts, original.facts);
    assert.deepEqual(s.sources, original.sources);
  }
});

test("the 1:1 scale can link every featured scientist to the sources behind what was shown", () => {
  for (const s of FEATURED) {
    const sources = shownSources(s);
    assert.ok(sources.length > 0, s.id);
    for (const source of sources) assert.ok(source.url.startsWith("https://"), `${s.id} ${source.id}`);
    assert.ok(s.experience.reveal.sourceRefs.every((id) => sources.some((x) => x.id === id)), s.id);
  }
});

test("every declared photo is a local file under public/scientists", () => {
  for (const s of FEATURED) {
    if (!s.photo?.src) continue;
    assert.ok(s.photo.src.startsWith("/scientists/"), `${s.id} points outside public/scientists`);
    assert.ok(existsSync(join(publicDir, s.photo.src)), `${s.id} asset missing at ${s.photo.src}`);
  }
});

test("every file in public/scientists is used by a featured scientist", () => {
  const folder = join(publicDir, "scientists");
  const files = existsSync(folder) ? readdirSync(folder).filter((f) => !f.startsWith(".")) : [];
  const used = new Set(FEATURED.flatMap((s) => (s.photo?.src ? [s.photo.src] : [])));
  for (const file of files) assert.ok(used.has(`/scientists/${file}`), `${file} is not referenced`);
});

test("every canonical name and alias of every featured scientist resolves to her", () => {
  const match = createMatcher(CATALOG);
  for (const s of FEATURED) {
    for (const form of [s.canonicalName, ...s.aliases, s.canonicalName.toUpperCase(), `  ${s.canonicalName}  `]) {
      const result = match(form);
      assert.equal(result.status, "featured", `${s.id}: "${form}" → ${result.status}`);
      assert.equal(result.status === "featured" && result.scientist.id, s.id, form);
    }
  }
});

test("components, engine and layout never mention a featured scientist by name", () => {
  const folders = ["src/experience", "src/map", "src/participation"].map((f) => join(root, f));
  const names = FEATURED.flatMap((s) => [s.canonicalName, ...s.aliases]);
  for (const folder of folders) {
    for (const file of readdirSync(folder)) {
      if (file.includes(".test.")) continue;
      const source = readFileSync(join(folder, file), "utf8");
      for (const name of names) assert.equal(source.includes(name), false, `${file} mentions ${name}`);
    }
  }
});

test("names still pending identity review never reach the map or the discovery", () => {
  const pending = (rawFeatured as { pendingIdentityReview?: { id: string }[] }).pendingIdentityReview ?? [];
  for (const p of pending) {
    assert.equal(FEATURED.some((s) => s.id === p.id), false, p.id);
    assert.equal(CATALOG.known.some((s) => s.id === p.id), false, p.id);
  }
});

test("curated scientists are recognized by fuller versions of their names", () => {
  const match = createMatcher(CATALOG);
  for (const [text, id] of [
    ["Tatiana Coelho de Sampaio", "tatiana-sampaio"],
    ["Nise Magalhães da Silveira", "nise-da-silveira"],
    ["Lélia de Almeida Gonzalez", "lelia-gonzalez"],
  ]) {
    const result = match(text);
    assert.equal(result.status === "featured" && result.scientist.id, id, text);
  }
});
