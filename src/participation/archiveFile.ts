import { promises as fs } from "node:fs";
import path from "node:path";
import type { PendingScientistSubmission } from "../content/scientists/types.ts";
import type { CollectiveEvent } from "./collective.ts";
import type { Archive } from "./archiveShape.ts";
import { parseEvent, parseSubmission } from "./storedEvents.ts";

export { parseIncoming } from "./archiveShape.ts";

export function archiveDir() {
  return process.env.DIGA_UM_NOME_DATA_DIR ?? path.join(process.cwd(), "data");
}

function files(dir: string) {
  return { events: path.join(dir, "participations.jsonl"), review: path.join(dir, "review-queue.jsonl") };
}

async function readLines(file: string): Promise<unknown[]> {
  try {
    const text = await fs.readFile(file, "utf8");
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      });
  } catch {
    return [];
  }
}

export async function readArchive(dir: string): Promise<Archive> {
  const paths = files(dir);
  const events = (await readLines(paths.events))
    .map((v) => parseEvent(v))
    .filter((e): e is CollectiveEvent => e !== null && !e.uid.startsWith("legacy-"));
  const review = (await readLines(paths.review)).map(parseSubmission).filter((s): s is PendingScientistSubmission => s !== null);
  return { events, review };
}

let writing: Promise<unknown> = Promise.resolve();

async function append<T extends { uid: string }>(file: string, known: Set<string>, items: T[]) {
  const fresh = items.filter((item) => {
    if (known.has(item.uid)) return false;
    known.add(item.uid);
    return true;
  });
  if (fresh.length > 0) await fs.appendFile(file, fresh.map((item) => JSON.stringify(item)).join("\n") + "\n", "utf8");
  return fresh.length;
}

export function appendArchive(dir: string, incoming: Archive) {
  const task = writing.then(async () => {
    await fs.mkdir(dir, { recursive: true });
    const paths = files(dir);
    const current = await readArchive(dir);
    const events = await append(paths.events, new Set(current.events.map((e) => e.uid)), incoming.events);
    const review = await append(paths.review, new Set(current.review.map((s) => s.uid)), incoming.review);
    return { events, review };
  });
  writing = task.catch(() => undefined);
  return task;
}
