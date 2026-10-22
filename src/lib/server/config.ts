import "server-only";

export const RETENTION_MS = 48 * 60 * 60 * 1000;
export const SIGNED_URL_TTL_S = 10 * 60;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const config = {
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  eventSlug: process.env.EVENT_SLUG || "default",
  signingSecret: process.env.SIGNING_SECRET || "dev-only-secret-do-not-use-in-production",
  cronSecret: process.env.CRON_SECRET || "",
  storageDriver: (process.env.STORAGE_DRIVER || "local") as "local" | "s3",
  s3: {
    bucket: process.env.S3_BUCKET || "",
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
};

/** Origin used for QR links: PUBLIC_BASE_URL if set, otherwise the request's own origin. */
export function baseUrlFor(req: Request): string {
  if (config.publicBaseUrl) return config.publicBaseUrl;
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}
