import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURED } from "./featured.ts";
import { scientistProfile } from "./profile.ts";

test("every featured scientist builds a profile only from her own curated data", () => {
  for (const s of FEATURED) {
    const p = scientistProfile(s);
    assert.equal(p.id, s.id);
    assert.equal(p.name, s.canonicalName);
    assert.equal(p.summary, s.experience.reveal.summary);
    assert.deepEqual(
      p.facts.map((f) => f.statement),
      s.facts.map((f) => f.statement),
    );
    assert.deepEqual(
      p.sources.map((x) => x.url),
      s.sources.map((x) => x.url),
    );
    assert.ok(p.facts.length > 0 && p.sources.length > 0, s.id);
  }
});

test("lifespan only shows the years the dataset actually has", () => {
  const both = FEATURED.find((s) => s.identity?.birthYear && s.identity?.deathYear);
  const bornOnly = FEATURED.find((s) => s.identity?.birthYear && !s.identity?.deathYear);
  const none = FEATURED.find((s) => !s.identity?.birthYear && !s.identity?.deathYear);
  assert.ok(both && bornOnly && none);
  assert.deepEqual(scientistProfile(both).lifespan, { label: "Vida", value: `${both.identity?.birthYear} – ${both.identity?.deathYear}` });
  assert.deepEqual(scientistProfile(bornOnly).lifespan, { label: "Nascimento", value: String(bornOnly.identity?.birthYear) });
  assert.equal(scientistProfile(none).lifespan, null);
});

test("fact source numbers point into the profile's source list and only appear when there is a choice", () => {
  for (const s of FEATURED) {
    const p = scientistProfile(s);
    const numbers = new Set(p.sources.map((x) => x.number));
    for (const f of p.facts) {
      if (p.sources.length === 1) assert.deepEqual(f.sourceNumbers, [], s.id);
      else assert.ok(f.sourceNumbers.length > 0 && f.sourceNumbers.every((n) => numbers.has(n)), `${s.id} ${f.code}`);
    }
  }
});

test("missing optional fields leave the section out instead of an empty value", () => {
  const [first] = FEATURED;
  const bare = scientistProfile({
    ...first,
    field: undefined,
    identity: undefined,
    photo: null,
    experience: { ...first.experience, reveal: { ...first.experience.reveal, whyItMatters: undefined } },
  });
  assert.equal(bare.field, null);
  assert.equal(bare.lifespan, null);
  assert.equal(bare.origin, null);
  assert.equal(bare.whyItMatters, null);
  assert.equal(bare.portrait, null);
});
