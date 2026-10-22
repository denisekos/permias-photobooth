import { customAlphabet } from "nanoid";
import { MAX_UPLOAD_BYTES, RETENTION_MS, baseUrlFor, config } from "@/lib/server/config";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { cleanupExpired, store } from "@/lib/server/store";
import type { StoredFile, StripRecord } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// nanoid's default URL-safe alphabet, 21 chars (~126 bits).
const newId = customAlphabet("useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", 21);

function sniff(bytes: Buffer): { type: string; ext: string } | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { type: "image/png", ext: "png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  return null;
}

async function readImage(form: FormData, field: string): Promise<{ body: Buffer; type: string; ext: string } | null> {
  const f = form.get(field);
  if (!(f instanceof Blob) || f.size === 0) return null;
  if (f.size > MAX_UPLOAD_BYTES) throw new Response(`${field} is larger than 5 MB`, { status: 413 });
  const body = Buffer.from(await f.arrayBuffer());
  const kind = sniff(body);
  if (!kind) throw new Response(`${field} must be a PNG or JPEG`, { status: 415 });
  return { body, ...kind };
}

let lastLocalSweep = 0;

export async function POST(req: Request) {
  const device = req.headers.get("x-booth-device")?.slice(0, 64) || "none";
  const ip = clientIp(req);
  if (!rateLimit("upload-device", device, 12, 60_000) || !rateLimit("upload-ip", ip, 20, 60_000)) {
    return new Response("Too many uploads, slow down", { status: 429 });
  }
  if (Number(req.headers.get("content-length") || 0) > 2 * MAX_UPLOAD_BYTES + 64 * 1024) {
    return new Response("Upload too large", { status: 413 });
  }

  let strip, story;
  try {
    const form = await req.formData();
    strip = await readImage(form, "strip");
    story = await readImage(form, "story");
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response("Expected multipart form data", { status: 400 });
  }
  if (!strip) return new Response("Missing strip", { status: 400 });

  const id = newId();
  const created = Date.now();
  const files: StoredFile[] = [{ key: `strips/${id}.${strip.ext}`, type: strip.type, body: strip.body }];
  if (story) files.push({ key: `stories/${id}.${story.ext}`, type: story.type, body: story.body });

  const record: StripRecord = {
    id,
    created_at: new Date(created).toISOString(),
    expires_at: new Date(created + RETENTION_MS).toISOString(),
    strip_key: files[0].key,
    strip_type: strip.type,
    story_key: story ? files[1].key : null,
    story_type: story ? story.type : null,
    event_slug: config.eventSlug,
    download_count: 0,
    view_count: 0,
  };
  await store.create(record, files);

  // Local driver has no Vercel cron; sweep opportunistically.
  if (config.storageDriver === "local" && created - lastLocalSweep > 10 * 60_000) {
    lastLocalSweep = created;
    cleanupExpired().catch(() => {});
  }

  return Response.json(
    { id, url: `${baseUrlFor(req)}/s/${id}`, expires_at: record.expires_at },
    { status: 201 },
  );
}
