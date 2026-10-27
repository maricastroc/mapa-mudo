import assert from "node:assert/strict";
import test from "node:test";
import type { CertificateData } from "./certificate.ts";
import { qrMatrix } from "./qr.ts";
import { checkSeal, DEMO_KEY, readSeal, sealOf, signSeal, verifyUrl } from "./seal.ts";

const DATA: CertificateData = {
  bench: "johnson",
  name: "Maria Eduarda Silva",
  position: 1,
  score: { value: 9, of: 10, unit: "resgates" },
  stats: [],
  achievedAt: "2026-10-30T18:42:00.000Z",
  serial: 42,
};

test("a sealed certificate checks out with the same key and keeps its data", async () => {
  const token = await signSeal(sealOf(DATA), "segredo");
  const seal = await checkSeal(token, "segredo");
  assert.deepEqual(seal, { bench: "johnson", name: "Maria Eduarda Silva", position: 1, score: 9, of: 10, achievedAt: DATA.achievedAt, serial: 42, demo: false });
});

test("a different key or any changed character fails the check", async () => {
  const token = await signSeal(sealOf(DATA), "segredo");
  assert.equal(await checkSeal(token, "outro"), null);
  const forged = await signSeal(sealOf({ ...DATA, name: "Outra Pessoa" }), "outro");
  assert.equal(await checkSeal(forged, "segredo"), null);
  for (const i of [3, 10, 20, token.length - 2]) {
    const flipped = token.slice(0, i) + (token[i] === "A" ? "B" : "A") + token.slice(i + 1);
    assert.equal(await checkSeal(flipped, "segredo"), null);
  }
  assert.equal(await checkSeal("lixo!", "segredo"), null);
  assert.equal(readSeal(""), null);
});

test("demo seals use the public demo key and say so", async () => {
  const token = await signSeal(sealOf({ ...DATA, demo: true }), DEMO_KEY);
  const seal = await checkSeal(token, "segredo");
  assert.equal(seal?.demo, true);
  const real = await signSeal(sealOf(DATA), DEMO_KEY);
  assert.equal(await checkSeal(real, "segredo"), null);
});

test("accents and long names survive, and the link stays a small qr code", async () => {
  const name = "Maria Eduarda Albuquerque dos Santos Oliveira Conceição";
  const token = await signSeal(sealOf({ ...DATA, name }), "segredo");
  assert.equal((await checkSeal(token, "segredo"))?.name, name);
  const url = verifyUrl(token);
  assert.ok(url.startsWith("https://mapa.marianacastro.dev/verify#"));
  assert.ok(qrMatrix(url).length <= 53);
});
