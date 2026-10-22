import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

const mac = (payload: string) =>
  createHmac("sha256", config.signingSecret).update(payload).digest("base64url");

const payloadOf = (key: string, exp: number, dl: string) => `${key}\n${exp}\n${dl}`;

/** Relative URL for the local driver's file route, valid until `exp` (unix seconds). */
export function signFileUrl(key: string, exp: number, downloadName: string | null): string {
  const dl = downloadName ?? "";
  const params = new URLSearchParams({ key, exp: String(exp), sig: mac(payloadOf(key, exp, dl)) });
  if (dl) params.set("dl", dl);
  return `/api/files?${params}`;
}

export function verifyFileUrl(key: string, exp: number, dl: string, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(mac(payloadOf(key, exp, dl)));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
