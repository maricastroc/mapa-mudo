import { checkSeal, readSeal } from "@/lab/certificate/seal";

function secret() {
  const value = process.env.CERTIFICATE_SECRET;
  if (value) return value;
  return process.env.NODE_ENV === "production" ? null : "elas-em-jogo-dev";
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const token = typeof body === "object" && body !== null && "token" in body && typeof body.token === "string" ? body.token.slice(0, 400) : "";
  const read = readSeal(token);
  if (!read) return Response.json({ status: "invalid" });
  const key = secret();
  if (!key && !read.seal.demo) return Response.json({ status: "unconfigured" }, { status: 503 });
  const seal = await checkSeal(token, key ?? "");
  return Response.json(seal ? { status: "valid", seal } : { status: "invalid" }, { headers: { "cache-control": "no-store" } });
}
