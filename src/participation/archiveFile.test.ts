import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendArchive, readArchive } from "./archiveFile.ts";

test("the local archive appends each event once, even when two saves race, and survives being read back", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "diga-um-nome-"));
  try {
    assert.deepEqual(await readArchive(dir), { events: [], review: [] });
    const batch = {
      events: [
        { uid: "a", kind: "silence" as const, at: 1 },
        { uid: "b", kind: "recall" as const, id: "x", at: 2 },
      ],
      review: [{ uid: "r", submittedName: "Nome", createdAt: 3 }],
    };
    const [first, second] = await Promise.all([appendArchive(dir, batch), appendArchive(dir, batch)]);
    assert.equal(first.events + second.events, 2);
    const stored = await readArchive(dir);
    assert.deepEqual(
      stored.events.map((e) => e.uid),
      ["a", "b"],
    );
    assert.equal(stored.review.length, 1);
    const lines = (await readFile(path.join(dir, "participations.jsonl"), "utf8")).trim().split("\n");
    assert.equal(lines.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
