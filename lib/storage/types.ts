/**
 * Storage driver interface. Phase 3 ships a local-disk implementation;
 * Phase 5 can swap to S3/R2 without changing call sites.
 */

export type StoredFile = {
  storageKey: string; // opaque, driver-specific (e.g., hash path on disk, object key on S3)
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

export type StorageReadResult = {
  stream: ReadableStream<Uint8Array>;
  size: number;
  mimeType: string;
  originalName: string;
};

export interface StorageDriver {
  /** Persist raw bytes. Implementations must use hash-based filenames — never the user-supplied name. */
  put(input: {
    bytes: Uint8Array;
    mimeType: string;
    originalName: string;
  }): Promise<StoredFile>;

  /** Open a file for streaming download. */
  get(storageKey: string): Promise<StorageReadResult>;

  /** Best-effort removal — do not throw if already gone. */
  remove(storageKey: string): Promise<void>;
}
