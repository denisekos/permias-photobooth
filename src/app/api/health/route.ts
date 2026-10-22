import { config, storageProblem } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open /api/health in a browser to check the deployment's storage settings. No secrets shown. */
export function GET() {
  const problem = storageProblem();
  return Response.json(
    {
      ok: !problem,
      storage: config.storageDriver,
      bucket: config.storageDriver === "s3" ? config.s3.bucket || null : null,
      endpoint: config.storageDriver === "s3" ? config.s3.endpoint || null : null,
      publicBaseUrl: config.publicBaseUrl || "(this site's own address)",
      problem,
    },
    { status: problem ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
}
