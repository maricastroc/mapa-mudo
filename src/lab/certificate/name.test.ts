import assert from "node:assert/strict";
import test from "node:test";
import { fitName, initialsOf, slugOf, textWidth, tidyName, type NameBox } from "./name.ts";

const BOX: NameBox = { w: 520, one: [70, 104], two: [42, 72], track: -0.025 };

test("tidies typed names into proper capitals and keeps particles lowercase", () => {
  assert.equal(tidyName("  maria   EDUARDA dos santos "), "Maria Eduarda dos Santos");
  assert.equal(tidyName("ana-clara de souza"), "Ana-Clara de Souza");
});

test("short names stay on one line at the largest size", () => {
  const fit = fitName("Bia", BOX);
  assert.deepEqual(fit.lines, ["Bia"]);
  assert.equal(fit.size, 104);
});

test("medium names break in two lines and keep the given names together", () => {
  assert.deepEqual(fitName("Maria Eduarda Silva", BOX).lines, ["Maria Eduarda", "Silva"]);
});

test("long names shorten the middle names and never end a line with a particle", () => {
  const fit = fitName("maria eduarda albuquerque dos santos oliveira", BOX);
  assert.equal(fit.lines.length, 2);
  assert.ok(fit.size >= BOX.two[0]);
  assert.ok(fit.lines.join(" ").startsWith("Maria Eduarda"));
  for (const line of fit.lines) assert.ok(!/ (da|das|de|do|dos|e)$/.test(line));
});

test("every fitted line fits inside the box", () => {
  for (const name of ["Bia", "Jo", "Maria Eduarda Silva", "Wellington Washington Wanderley", "Ana Beatriz Ferreira Gomes", "Maximiliano"]) {
    const fit = fitName(name, BOX);
    for (const line of fit.lines) assert.ok(textWidth(line, fit.size, BOX.track) <= BOX.w + 0.5, `${name}: ${line}`);
  }
});

test("derives initials and file-safe slugs from the name", () => {
  assert.equal(initialsOf("Ana Beatriz dos Santos"), "ABS");
  assert.equal(slugOf("Érica Conceição"), "erica-conceicao");
});
