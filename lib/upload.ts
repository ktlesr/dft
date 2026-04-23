import "server-only";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

export { MAX_ATTACHMENTS_PER_REQUEST };

export class UploadError extends Error {
  constructor(
    public readonly code:
      | "empty_file"
      | "too_large"
      | "mime_not_allowed"
      | "too_many",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "UploadError";
  }
}

type AttachmentOwnerKey =
  | "boardPostId"
  | "meetingId"
  | "minuteId"
  | "reportId"
  | "documentId"
  | "projectAppId"
  | "successProjectId"
  | "projectIdeaId"
  | "eventId"
  | "disseminationId"
  | "trainingId"
  | "contentId";

type StoreAttachmentsInput = {
  files: File[];
  uploadedById: string;
  owner: Partial<Record<AttachmentOwnerKey, string>>;
};

/**
 * Validate, store and persist a batch of uploaded files.
 * Returns the created Attachment rows. All-or-nothing: if any file fails
 * validation, nothing is written.
 */
export async function storeAttachments(
  input: StoreAttachmentsInput,
): Promise<Array<{ id: string; originalName: string; size: number; mimeType: string }>> {
  const nonEmpty = input.files.filter((f) => f && f.size > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length > MAX_ATTACHMENTS_PER_REQUEST) throw new UploadError("too_many");

  for (const f of nonEmpty) {
    if (f.size > MAX_UPLOAD_BYTES) throw new UploadError("too_large", f.name);
    if (!ALLOWED_UPLOAD_MIME.has(f.type)) throw new UploadError("mime_not_allowed", f.type);
  }

  const created: Array<{ id: string; originalName: string; size: number; mimeType: string }> = [];
  const persistedKeys: string[] = [];

  try {
    for (const f of nonEmpty) {
      const buf = new Uint8Array(await f.arrayBuffer());
      const stored = await storage.put({
        bytes: buf,
        mimeType: f.type,
        originalName: f.name,
      });
      persistedKeys.push(stored.storageKey);

      const row = await prisma.attachment.create({
        data: {
          storageKey: stored.storageKey,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          size: stored.size,
          sha256: stored.sha256,
          uploadedById: input.uploadedById,
          ...input.owner,
        },
      });
      created.push({
        id: row.id,
        originalName: row.originalName,
        size: row.size,
        mimeType: row.mimeType,
      });
    }
    return created;
  } catch (err) {
    // Best-effort cleanup of files written before the failure so we don't
    // leave orphans on disk.
    await Promise.allSettled(persistedKeys.map((k) => storage.remove(k)));
    throw err;
  }
}
