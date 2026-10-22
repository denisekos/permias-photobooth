export type ImageKind = "strip" | "story";

export interface StripRecord {
  id: string;
  created_at: string;
  expires_at: string;
  strip_key: string;
  strip_type: string;
  story_key: string | null;
  story_type: string | null;
  event_slug: string;
  download_count: number;
  view_count: number;
}

export interface StoredFile {
  key: string;
  type: string;
  body: Buffer;
}

export interface Store {
  create(record: StripRecord, files: StoredFile[]): Promise<void>;
  get(id: string): Promise<StripRecord | null>;
  update(record: StripRecord): Promise<void>;
  remove(record: StripRecord): Promise<void>;
  /** Every record id currently stored (used only by the cleanup job). */
  ids(): Promise<string[]>;
  /** A URL to the raw object that stops working after SIGNED_URL_TTL_S. */
  signedUrl(key: string, type: string, downloadName: string | null): Promise<string>;
  read(key: string): Promise<Buffer | null>;
}
