import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { getLiveRecord, store } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const gone = () =>
  new Response("This story has faded into the mist.", { status: 410, headers: { "Cache-Control": "no-store" } });

/**
 * ?kind=strip|story   which image (default strip)
 * ?dl=1               attachment download; counts toward download_count
 * ?proxy=1            stream the bytes from this origin (used by Web Share, which needs a same-origin fetch)
 * Otherwise redirects to a 10-minute signed URL.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!rateLimit("lookup", clientIp(req), 120, 60_000)) return new Response("Too many requests", { status: 429 });

  const record = await getLiveRecord(id);
  if (!record) return gone();

  const q = new URL(req.url).searchParams;
  const kind = q.get("kind") === "story" ? "story" : "strip";
  const key = kind === "story" ? record.story_key : record.strip_key;
  const type = (kind === "story" ? record.story_type : record.strip_type) || "image/png";
  if (!key) return new Response("Not found", { status: 404 });

  const download = q.get("dl") === "1";
  const ext = type === "image/jpeg" ? "jpg" : "png";
  const filename = `sebelum-uber-menjemput-${kind}-${id.slice(0, 6)}.${ext}`;

  if (download || q.get("proxy") === "1") {
    record.download_count++;
    await store.update(record).catch(() => {});
  }

  if (q.get("proxy") === "1") {
    const bytes = await store.read(key);
    if (!bytes) return gone();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const url = await store.signedUrl(key, type, download ? filename : null);
  return new Response(null, {
    status: 302,
    headers: { Location: new URL(url, req.url).toString(), "Cache-Control": "private, no-store" },
  });
}
