import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { ReadableStream as NodeReadableStream } from "node:stream/web";

import type { StorageDriver, StoredFile, StorageReadResult } from "./types";

const ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./storage/uploads");

/**
 * On-disk driver. Layout:
 *
 *   storage/uploads/
 *     ab/cdef123...  ← files stored under two-char sharded dirs,
 *                      filenames are random (never the user's) so
 *                      content is non-executable / non-guessable.
 *
 * The storage key returned is "ab/cdef..." relative to ROOT.
 */
export const localDiskDriver: StorageDriver = {
  async put({ bytes, originalName, mimeType }) {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const rand = randomBytes(8).toString("hex");
    const safeName = `${sha256.slice(0, 32)}-${rand}`;
    const shard = safeName.slice(0, 2);
    const relPath = path.posix.join(shard, safeName);
    const absDir = path.join(ROOT, shard);
    const absFile = path.join(absDir, safeName);

    await mkdir(absDir, { recursive: true });
    await writeFile(absFile, bytes, { flag: "wx" });

    const info: StoredFile = {
      storageKey: relPath,
      originalName,
      mimeType,
      size: bytes.byteLength,
      sha256,
    };
    return info;
  },

  async get(storageKey) {
    const abs = resolveSafe(storageKey);
    const st = await stat(abs);
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
    return {
      stream: webStream,
      size: st.size,
      // Driver only persists bytes — callers attach metadata from DB.
      mimeType: "application/octet-stream",
      originalName: path.basename(abs),
    };
  },

  async remove(storageKey) {
    try {
      const abs = resolveSafe(storageKey);
      await rm(abs, { force: true });
    } catch {
      /* ignore */
    }
  },
};

/**
 * Resolve a storage key against ROOT and refuse any path escape.
 */
function resolveSafe(storageKey: string): string {
  const abs = path.resolve(ROOT, storageKey);
  const rootNorm = path.resolve(ROOT) + path.sep;
  if (!abs.startsWith(rootNorm)) {
    throw new Error("invalid_storage_key");
  }
  return abs;
}

/** Helper used by tests / one-off scripts, not in hot paths. */
export async function readAllBytes(storageKey: string): Promise<Uint8Array> {
  const abs = resolveSafe(storageKey);
  const buf = await readFile(abs);
  return new Uint8Array(buf);
}

// Silence the unused import warning in environments that tree-shake conservatively.
void NodeReadableStream;
