import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SIGNED_URL_TTL_S } from "./config";
import { signFileUrl } from "./signing";
import type { Store, StoredFile, StripRecord } from "./types";

const ROOT = path.join(process.cwd(), ".data");
const META = path.join(ROOT, "meta");
const FILES = path.join(ROOT, "files");

const safeId = (id: string) => /^[A-Za-z0-9_-]{21}$/.test(id);
const filePath = (key: string) => {
  const p = path.join(FILES, key);
  if (!p.startsWith(FILES + path.sep)) throw new Error("bad key");
  return p;
};

/** Files on local disk. Fine for dev or a single long-running server; not for serverless. */
export const localStore: Store = {
  async create(record: StripRecord, files: StoredFile[]) {
    for (const f of files) {
      const p = filePath(f.key);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, f.body);
    }
    await fs.mkdir(META, { recursive: true });
    await fs.writeFile(path.join(META, `${record.id}.json`), JSON.stringify(record));
  },

  async get(id) {
    if (!safeId(id)) return null;
    try {
      return JSON.parse(await fs.readFile(path.join(META, `${id}.json`), "utf8"));
    } catch {
      return null;
    }
  },

  async update(record) {
    await fs.writeFile(path.join(META, `${record.id}.json`), JSON.stringify(record));
  },

  async remove(record) {
    for (const key of [record.strip_key, record.story_key]) {
      if (key) await fs.rm(filePath(key), { force: true });
    }
    await fs.rm(path.join(META, `${record.id}.json`), { force: true });
  },

  async ids() {
    try {
      return (await fs.readdir(META)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    } catch {
      return [];
    }
  },

  async signedUrl(key, _type, downloadName) {
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_S;
    return signFileUrl(key, exp, downloadName);
  },

  async read(key) {
    try {
      return await fs.readFile(filePath(key));
    } catch {
      return null;
    }
  },
};
