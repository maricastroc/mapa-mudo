import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import rawFeatured from "./featured.json" with { type: "json" };
import { CATALOG, shownSources } from "./catalog.ts";
import { curationProblems, declaredPhotoSources, isCleared, parseCuratedPackage } from "./curatedPackage.ts";
import { FEATURED, IMAGE_MANIFEST } from "./featured.ts";
import { createMatcher } from "./matcher.ts";
import { BUNDLED_PORTRAITS } from "./portraits.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const publicDir = join(root, "public");

test("the curated package parses and has no referential problems", () => {
  assert.equal(FEATURED.length, 20);
  assert.deepEqual(curationProblems(FEATURED, IMAGE_MANIFEST, declaredPhotoSources(rawFeatured)), []);
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

test("every photo src resolves to a bundled cleared asset or is null", () => {
  for (const s of FEATURED) {
    if (!s.photo?.src) continue;
    assert.ok(isCleared(s.photo.usageStatus), `${s.id} is not cleared`);
    assert.ok(existsSync(join(publicDir, s.photo.src)), `${s.id} asset missing at ${s.photo.src}`);
  }
});

test("every bundled portrait is a cleared manifest asset served from public/scientists", () => {
  for (const id of Object.keys(BUNDLED_PORTRAITS)) {
    const scientist = FEATURED.find((s) => s.id === id);
    const entry = IMAGE_MANIFEST.find((m) => m.id === id);
    assert.ok(scientist?.photo?.src, `${id} has no photo src`);
    assert.ok(entry && isCleared(entry.usageStatus), `${id} is not cleared in the manifest`);
    assert.equal(scientist.photo.src, `/scientists/${entry.fileName}`);
    assert.ok(existsSync(join(publicDir, scientist.photo.src)), `${id} file missing`);
  }
});

test("public/scientists only holds registered, cleared portraits", () => {
  const folder = join(publicDir, "scientists");
  const files = existsSync(folder) ? readdirSync(folder).filter((f) => !f.startsWith(".")) : [];
  for (const file of files) {
    const entry = IMAGE_MANIFEST.find((m) => m.fileName === file);
    assert.ok(entry, `${file} is not in the manifest`);
    assert.ok(isCleared(entry.usageStatus), `${file} is ${entry.usageStatus}`);
    assert.ok(entry.id in BUNDLED_PORTRAITS, `${file} is not registered in portraits.ts`);
  }
});

test("no rights-review image is bundled", () => {
  const folder = join(publicDir, "scientists");
  const files = existsSync(folder) ? readdirSync(folder) : [];
  const pending = IMAGE_MANIFEST.filter((m) => m.usageStatus === "rights-review").map((m) => m.fileName);
  for (const file of pending) assert.equal(files.includes(file), false, file);
  for (const s of FEATURED) if (s.photo?.usageStatus === "rights-review") assert.equal(s.photo.src, null, s.id);
});

test("a declared src is dropped when the asset is not bundled", () => {
  const parsed = parseCuratedPackage(rawFeatured, new Set());
  assert.ok(parsed.featured.every((s) => s.photo === null || s.photo.src === null));
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
