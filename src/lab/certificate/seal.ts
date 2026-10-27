import { BENCHES, type BenchId } from "../benches.ts";
import type { CertificateData } from "./certificate.ts";
import { tidyName } from "./name.ts";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapa.marianacastro.dev").replace(/\/$/, "");
export const DEMO_KEY = "elas-em-jogo-demonstracao";

const VERSION = 1;
const EPOCH = Date.UTC(2026, 0, 1);
const HEADER = 11;
const MAC_BYTES = 12;
const NAME_BYTES = 80;

export type Seal = {
  bench: BenchId;
  name: string;
  position: number;
  score: number;
  of: number | null;
  achievedAt: string;
  serial: number;
  demo: boolean;
};

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function nameBytes(name: string) {
  const encoder = new TextEncoder();
  let text = name.trim();
  while (encoder.encode(text).length > NAME_BYTES) text = [...text].slice(0, -1).join("");
  return encoder.encode(text);
}

export function sealOf(data: CertificateData): Seal {
  return {
    bench: data.bench,
    name: new TextDecoder().decode(nameBytes(tidyName(data.name))),
    position: clampByte(data.position),
    score: clampByte(data.score.value),
    of: data.score.of === undefined ? null : clampByte(data.score.of),
    achievedAt: new Date(Math.round(Date.parse(data.achievedAt) / 60000) * 60000).toISOString(),
    serial: Math.max(0, Math.min(0xffff, Math.round(data.serial))),
    demo: Boolean(data.demo),
  };
}

function pack(seal: Seal) {
  const name = nameBytes(seal.name);
  const minutes = Math.max(0, Math.min(0xffffff, Math.round((Date.parse(seal.achievedAt) - EPOCH) / 60000)));
  const bytes = new Uint8Array(HEADER + name.length);
  bytes[0] = VERSION;
  bytes[1] = seal.demo ? 1 : 0;
  bytes[2] = BENCHES.findIndex((b) => b.id === seal.bench);
  bytes[3] = clampByte(seal.position);
  bytes[4] = clampByte(seal.score);
  bytes[5] = seal.of === null ? 0 : clampByte(seal.of);
  bytes[6] = (minutes >>> 16) & 0xff;
  bytes[7] = (minutes >>> 8) & 0xff;
  bytes[8] = minutes & 0xff;
  bytes[9] = (seal.serial >>> 8) & 0xff;
  bytes[10] = seal.serial & 0xff;
  bytes.set(name, HEADER);
  return bytes;
}

function unpack(bytes: Uint8Array): Seal | null {
  if (bytes.length <= HEADER || bytes[0] !== VERSION) return null;
  const bench = BENCHES[bytes[2]];
  if (!bench) return null;
  let name: string;
  try {
    name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(HEADER));
  } catch {
    return null;
  }
  const minutes = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
  return {
    bench: bench.id,
    name,
    position: bytes[3],
    score: bytes[4],
    of: bytes[5] === 0 ? null : bytes[5],
    achievedAt: new Date(EPOCH + minutes * 60000).toISOString(),
    serial: (bytes[9] << 8) | bytes[10],
    demo: (bytes[1] & 1) === 1,
  };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function mac(key: string, bytes: Uint8Array) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, bytes as Uint8Array<ArrayBuffer>);
  return new Uint8Array(signature).subarray(0, MAC_BYTES);
}

export async function signSeal(seal: Seal, key: string) {
  const payload = pack(seal);
  const signature = await mac(key, payload);
  const token = new Uint8Array(payload.length + MAC_BYTES);
  token.set(payload);
  token.set(signature, payload.length);
  return toBase64Url(token);
}

export function readSeal(token: string) {
  const bytes = fromBase64Url(token.trim());
  if (!bytes || bytes.length <= HEADER + MAC_BYTES) return null;
  const payload = bytes.subarray(0, bytes.length - MAC_BYTES);
  const seal = unpack(payload);
  return seal && { seal, payload, signature: bytes.subarray(bytes.length - MAC_BYTES) };
}

export async function checkSeal(token: string, key: string) {
  const read = readSeal(token);
  if (!read) return null;
  const expected = await mac(read.seal.demo ? DEMO_KEY : key, read.payload);
  let diff = 0;
  for (let i = 0; i < MAC_BYTES; i++) diff |= expected[i] ^ read.signature[i];
  return diff === 0 ? read.seal : null;
}

export function verifyUrl(token: string) {
  return `${SITE_URL}/verify#${token}`;
}
