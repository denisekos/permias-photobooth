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

/**
 * Why uploads can't work with the current environment, or null if storage looks configured.
 * Vercel's disk is read-only and per-instance, so the local driver can't work there.
 */
export function storageProblem(): string | null {
  if (config.storageDriver === "local") {
    return process.env.VERCEL
      ? "Storage isn't set up: on Vercel, set STORAGE_DRIVER=s3 and the S3_* variables, then redeploy."
      : null;
  }
  const missing = (
    [
      ["S3_BUCKET", config.s3.bucket],
      ["S3_ACCESS_KEY_ID", config.s3.accessKeyId],
      ["S3_SECRET_ACCESS_KEY", config.s3.secretAccessKey],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) return `Storage isn't set up: missing ${missing.join(", ")}. Add them in Vercel, then redeploy.`;
  if (config.s3.endpoint && !/^https:\/\/[^/]+\/?$/.test(config.s3.endpoint))
    return "S3_ENDPOINT should look like https://<account-id>.r2.cloudflarestorage.com (no bucket name or path).";
  return null;
}
