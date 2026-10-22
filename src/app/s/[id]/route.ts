import { downloadPage, fadedPage } from "@/lib/server/download-page";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { getLiveRecord, store } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const html = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

/** Phone download page. Expiry is checked before anything else; expired or unknown IDs get the 410 page. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!rateLimit("lookup", clientIp(req), 60, 60_000)) return html(fadedPage(), 429);

  const record = await getLiveRecord(id);
  if (!record) return html(fadedPage(), 410);

  record.view_count++;
  await store.update(record).catch(() => {});
  return html(downloadPage(record), 200);
}
