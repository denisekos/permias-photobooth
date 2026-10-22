import "server-only";
import { config } from "./config";
import { localStore } from "./local-store";
import { s3Store } from "./s3-store";
import type { StripRecord } from "./types";

export const store = config.storageDriver === "s3" ? s3Store : localStore;

export const isExpired = (r: StripRecord, now = Date.now()) => Date.parse(r.expires_at) <= now;

/** The record if it exists and is still inside its 48 hours; null otherwise. */
export async function getLiveRecord(id: string): Promise<StripRecord | null> {
  const r = await store.get(id);
  return r && !isExpired(r) ? r : null;
}

/** Deletes every strip past expires_at. Returns how many were removed. */
export async function cleanupExpired(): Promise<number> {
  let removed = 0;
  for (const id of await store.ids()) {
    const r = await store.get(id);
    if (r && isExpired(r)) {
      await store.remove(r);
      removed++;
    }
  }
  return removed;
}
