import type { PendingScientistSubmission } from "../content/scientists/types.ts";
import type { CollectiveEvent } from "./collective.ts";
import { parseIncoming } from "./archiveShape.ts";

export const ARCHIVE_URL = "/api/participations";

export type RemoteArchive = { events: CollectiveEvent[]; review: PendingScientistSubmission[] };

export async function fetchArchive(signal?: AbortSignal): Promise<RemoteArchive | null> {
  try {
    const response = await fetch(ARCHIVE_URL, { cache: "no-store", signal });
    if (!response.ok) return null;
    return parseIncoming(await response.json());
  } catch {
    return null;
  }
}

export async function sendArchive(archive: RemoteArchive): Promise<boolean> {
  if (archive.events.length === 0 && archive.review.length === 0) return true;
  try {
    const response = await fetch(ARCHIVE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(archive),
      keepalive: archive.events.length < 200,
    });
    return response.ok;
  } catch {
    return false;
  }
}
