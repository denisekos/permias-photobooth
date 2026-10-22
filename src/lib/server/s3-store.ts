import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_URL_TTL_S, config } from "./config";
import type { Store, StoredFile, StripRecord } from "./types";

let client: S3Client | null = null;
const s3 = () =>
  (client ??= new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: Boolean(config.s3.endpoint),
    credentials: { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey },
  }));
const Bucket = () => config.s3.bucket;
const metaKey = (id: string) => `meta/${id}.json`;

async function getBytes(Key: string): Promise<Buffer | null> {
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: Bucket(), Key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

/**
 * Any S3-compatible private bucket (S3, R2). Records live next to the files as small JSON
 * objects, so no separate database is needed. Add a bucket lifecycle rule that deletes
 * objects older than 2 days as the backstop described in the PRD.
 */
export const s3Store: Store = {
  async create(record: StripRecord, files: StoredFile[]) {
    for (const f of files) {
      await s3().send(
        new PutObjectCommand({ Bucket: Bucket(), Key: f.key, Body: f.body, ContentType: f.type }),
      );
    }
    await this.update(record);
  },

  async get(id) {
    if (!/^[A-Za-z0-9_-]{21}$/.test(id)) return null;
    const bytes = await getBytes(metaKey(id));
    return bytes ? JSON.parse(bytes.toString("utf8")) : null;
  },

  async update(record) {
    await s3().send(
      new PutObjectCommand({
        Bucket: Bucket(),
        Key: metaKey(record.id),
        Body: JSON.stringify(record),
        ContentType: "application/json",
      }),
    );
  },

  async remove(record) {
    const keys = [metaKey(record.id), record.strip_key, record.story_key].filter(Boolean) as string[];
    await s3().send(
      new DeleteObjectsCommand({ Bucket: Bucket(), Delete: { Objects: keys.map((Key) => ({ Key })) } }),
    );
  },

  async ids() {
    const out: string[] = [];
    let ContinuationToken: string | undefined;
    do {
      const res = await s3().send(
        new ListObjectsV2Command({ Bucket: Bucket(), Prefix: "meta/", ContinuationToken }),
      );
      for (const o of res.Contents ?? []) {
        const m = o.Key?.match(/^meta\/(.+)\.json$/);
        if (m) out.push(m[1]);
      }
      ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return out;
  },

  async signedUrl(Key, type, downloadName) {
    return getSignedUrl(
      s3(),
      new GetObjectCommand({
        Bucket: Bucket(),
        Key,
        ResponseContentType: type,
        ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName}"` : "inline",
        ResponseCacheControl: "private, max-age=600",
      }),
      { expiresIn: SIGNED_URL_TTL_S },
    );
  },

  read: getBytes,
};
