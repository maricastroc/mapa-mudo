import { CATALOG, findScientist } from "@/content/scientists/catalog";
import { findReference } from "@/content/scientists/references";
import { appendArchive, archiveDir, parseIncoming, readArchive } from "@/participation/archiveFile";
import { participationsCsv, reviewCsv } from "@/participation/exportCsv";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

function csv(body: string, name: string) {
  return new Response(`﻿${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const archive = await readArchive(archiveDir());
  const query = new URL(request.url).searchParams;
  if (query.get("format") === "csv") {
    if (query.get("list") === "review") return csv(reviewCsv(archive.review), "diga-um-nome-conferencia.csv");
    return csv(
      participationsCsv(archive.events, (id) => findScientist(CATALOG, id)?.canonicalName, findReference),
      "diga-um-nome-participacoes.csv",
    );
  }
  return Response.json(archive, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const incoming = parseIncoming(await request.json().catch(() => null));
  if (!incoming) return Response.json({ error: "invalid" }, { status: 400 });
  const stored = await appendArchive(archiveDir(), incoming);
  return Response.json({ stored });
}
