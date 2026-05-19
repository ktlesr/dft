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
      | "mime_mismatch"
      | "too_many",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "UploadError";
  }
}

/**
 * MIME types for which we accept the browser-declared value without
 * running magic-byte detection — either because they have no reliable
 * magic bytes (plain text, CSV), or because `file-type` doesn't parse
 * them (SVG, which is XML).
 *
 * For these types we still enforce the allow-list; we just trust the
 * browser's Content-Type string.
 */
const MAGIC_BYTE_EXEMPT = new Set<string>([
  "text/plain",
  "text/csv",
  "image/svg+xml",
]);

/**
 * Accept declared/detected MIME pairs that are functionally equivalent.
 * Office ZIP wrappers are a common case: `file-type` reports `application/zip`
 * for .docx/.xlsx/.pptx because the container is a zip, but the browser
 * sends the more specific Office MIME.
 */
const MIME_EQUIVALENTS: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["application/zip"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["application/zip"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["application/zip"],
  // Legacy Office (binary OLE) containers
  "application/msword": ["application/x-cfb"],
  "application/vnd.ms-excel": ["application/x-cfb"],
  "application/vnd.ms-powerpoint": ["application/x-cfb"],
  // JPEG sometimes reported as `image/jpeg`, sometimes as `image/jpg`
  "image/jpeg": ["image/jpg"],
};

/**
 * Verify that the uploaded bytes actually match the declared MIME.
 * Rejects the infamous "image/png headed PHP file" attack.
 */
async function verifyMagicBytes(file: File): Promise<void> {
  if (MAGIC_BYTE_EXEMPT.has(file.type)) return;

  // Dynamic import: file-type ships as ESM and is only needed on the
  // upload path (keeps it out of the client bundle for good measure).
  const { fileTypeFromBuffer } = await import("file-type");

  // 4 KB is enough for every format in our allow-list; avoid reading
  // the full file twice.
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const detected = await fileTypeFromBuffer(head);

  if (!detected) {
    throw new UploadError("mime_mismatch", `Dosya türü tespit edilemedi: ${file.name}`);
  }

  const declared = file.type;
  const equivalents = MIME_EQUIVALENTS[declared] ?? [];
  const ok = detected.mime === declared || equivalents.includes(detected.mime);

  if (!ok) {
    throw new UploadError(
      "mime_mismatch",
      `Dosya içeriği declared türle uyuşmuyor: declared=${declared} detected=${detected.mime}`,
    );
  }
}

type AttachmentOwnerKey =
  | "boardPostId"
  | "meetingId"
  | "minuteId"
  | "reportId"
  | "groupNoteId"
  | "documentId"
  | "projectAppId"
  | "successProjectId"
  | "projectIdeaId"
  | "eventId"
  | "disseminationId"
  | "trainingId"
  | "contentId"
  | "stakeholderId"
  | "noticeId"
  | "discussionId";

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

  // Phase 1: cheap header checks — reject early before touching disk.
  for (const f of nonEmpty) {
    if (f.size > MAX_UPLOAD_BYTES) throw new UploadError("too_large", f.name);
    if (!ALLOWED_UPLOAD_MIME.has(f.type)) throw new UploadError("mime_not_allowed", f.type);
  }

  // Phase 2: magic-byte sniff — verify declared MIME matches the actual bytes.
  // Protects against "image/png headed PHP file" style uploads.
  for (const f of nonEmpty) {
    await verifyMagicBytes(f);
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
