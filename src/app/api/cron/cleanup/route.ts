import { config } from "@/lib/server/config";
import { cleanupExpired } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hourly: delete files and records past expires_at. Vercel Cron calls this with the CRON_SECRET bearer. */
export async function GET(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const removed = await cleanupExpired();
  return Response.json({ removed, at: new Date().toISOString() });
}
