import { verifyFileUrl } from "@/lib/server/signing";
import { store } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves local-driver files behind a short-lived HMAC signature (stands in for a bucket's signed URL). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "";
  const dl = q.get("dl") || "";
  if (!verifyFileUrl(key, Number(q.get("exp")), dl, q.get("sig") || "")) {
    return new Response("Link expired", { status: 403 });
  }
  // The signature proves the URL was minted after an expiry check; re-check the record anyway.
  const id = key.match(/^(?:strips|stories)\/([A-Za-z0-9_-]{21})\.(png|jpg)$/)?.[1];
  const record = id ? await store.get(id) : null;
  if (!record || Date.parse(record.expires_at) <= Date.now()) return new Response("Gone", { status: 410 });

  const bytes = await store.read(key);
  if (!bytes) return new Response("Gone", { status: 410 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": key.endsWith(".jpg") ? "image/jpeg" : "image/png",
      "Content-Disposition": dl ? `attachment; filename="${dl}"` : "inline",
      "Cache-Control": "private, max-age=600",
    },
  });
}
