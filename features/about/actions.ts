"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";
import { coerceUploadMime } from "@/lib/upload-mime";
import {
  APP_SETTING_KEY,
  DEFAULT_ABOUT,
  aboutContentSchema,
  aboutEditSchema,
  type AboutContent,
  type AboutFile,
} from "./schemas";

export type AboutFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: AboutFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

async function readCurrent(): Promise<AboutContent> {
  const row = await prisma.appSetting.findUnique({ where: { key: APP_SETTING_KEY } });
  if (!row) return DEFAULT_ABOUT;
  const parsed = aboutContentSchema.safeParse(row.value);
  return parsed.success ? parsed.data : DEFAULT_ABOUT;
}

async function writeCurrent(next: AboutContent): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_KEY },
    create: { key: APP_SETTING_KEY, value: next },
    update: { value: next },
  });
}

/**
 * Magic-byte sniff for declared MIME — mirror the standard upload path
 * (lib/upload.ts) but works on unowned files (no Attachment row).
 */
const MAGIC_BYTE_EXEMPT = new Set<string>(["text/plain", "text/csv", "image/svg+xml"]);
const MIME_EQUIVALENTS: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["application/zip"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["application/zip"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["application/zip"],
  "application/msword": ["application/x-cfb"],
  "application/vnd.ms-excel": ["application/x-cfb"],
  "application/vnd.ms-powerpoint": ["application/x-cfb"],
  "image/jpeg": ["image/jpg"],
  "application/x-zip-compressed": ["application/zip"],
  "application/vnd.rar": ["application/x-rar-compressed", "application/x-rar"],
  "application/x-rar-compressed": ["application/vnd.rar", "application/x-rar"],
  "application/x-rar": ["application/x-rar-compressed", "application/vnd.rar"],
  "application/x-7z-compressed": ["application/x-7z-compressed"],
};

async function verifyMagic(file: File, declaredMime: string): Promise<boolean> {
  if (MAGIC_BYTE_EXEMPT.has(declaredMime)) return true;
  const { fileTypeFromBuffer } = await import("file-type");
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const detected = await fileTypeFromBuffer(head);
  if (!detected) return false;
  const eq = MIME_EQUIVALENTS[declaredMime] ?? [];
  return detected.mime === declaredMime || eq.includes(detected.mime);
}

/** Save text fields + add newly uploaded files + remove ticked files. */
export async function saveAboutContent(
  _prev: AboutFormState,
  fd: FormData,
): Promise<AboutFormState> {
  const user = await requireAdmin();

  const parsed = aboutEditSchema.safeParse({
    title: fd.get("title"),
    summary: fd.get("summary"),
    body: fd.get("body"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // Yeni dosyalar (varsa). attachment input adı "newAttachments".
  const newFiles = fd.getAll("newAttachments").filter((v): v is File => v instanceof File && v.size > 0);

  // Silinecek dosyaların storageKey listesi — kullanıcı formda işaretleyince
  // hidden input "removeKeys" çoklu değer olarak yollanır.
  const removeKeys = new Set(
    fd.getAll("removeKeys").map((v) => String(v)).filter((s) => s.length > 0),
  );

  // Mevcut içerik
  const current = await readCurrent();

  // Sıraya alınmış silmeler için filtre + cleanup
  const remaining = current.attachments.filter((a) => !removeKeys.has(a.storageKey));
  const removed = current.attachments.filter((a) => removeKeys.has(a.storageKey));

  // Yeni dosya doğrulaması
  if (newFiles.length + remaining.length > MAX_ATTACHMENTS_PER_REQUEST + remaining.length) {
    return { ok: false, message: "Çok fazla yeni dosya." };
  }
  if (newFiles.length > MAX_ATTACHMENTS_PER_REQUEST) {
    return { ok: false, message: `Tek seferde en fazla ${MAX_ATTACHMENTS_PER_REQUEST} dosya yükleyin.` };
  }
  // `coerceUploadMime` boş/octet-stream'i .zip/.rar/.7z uzantılarından
  // kanonik MIME'a çevirir; storage + DB hep aynı değeri görsün.
  const coercedMimes = newFiles.map((f) => coerceUploadMime(f));
  for (let i = 0; i < newFiles.length; i++) {
    const f = newFiles[i]!;
    const mime = coercedMimes[i]!;
    if (f.size > MAX_UPLOAD_BYTES) return { ok: false, message: `Dosya çok büyük: ${f.name}` };
    if (!ALLOWED_UPLOAD_MIME.has(mime)) return { ok: false, message: `Dosya türü desteklenmiyor: ${f.name}` };
    const okMagic = await verifyMagic(f, mime);
    if (!okMagic) return { ok: false, message: `Dosya içeriği başlıkla uyuşmuyor: ${f.name}` };
  }

  // Yeni dosyaları storage'a yaz
  const uploadedKeys: string[] = [];
  const addedFiles: AboutFile[] = [];
  try {
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i]!;
      const mime = coercedMimes[i]!;
      const buf = new Uint8Array(await f.arrayBuffer());
      const stored = await storage.put({
        bytes: buf,
        mimeType: mime,
        originalName: f.name,
      });
      uploadedKeys.push(stored.storageKey);
      addedFiles.push({
        storageKey: stored.storageKey,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        size: stored.size,
        uploadedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    // Best-effort cleanup
    await Promise.allSettled(uploadedKeys.map((k) => storage.remove(k)));
    return { ok: false, message: "Dosya yükleme başarısız." };
  }

  const next: AboutContent = {
    title: parsed.data.title,
    summary: parsed.data.summary,
    body: parsed.data.body,
    attachments: [...remaining, ...addedFiles],
    updatedAt: new Date().toISOString(),
  };

  await writeCurrent(next);

  // Silinen dosyaları storage'tan sil — yazı başarılı olduktan sonra
  await Promise.allSettled(removed.map((f) => storage.remove(f.storageKey)));

  await audit({
    action: "SETTINGS_CHANGED",
    actorId: user.id,
    targetType: "AppSetting",
    targetId: APP_SETTING_KEY,
    metadata: { addedFiles: addedFiles.length, removedFiles: removed.length },
  });

  revalidatePath("/dft-hakkinda");
  revalidatePath("/yonetim/dft-hakkinda");
  return OK;
}

// `_OK` referansını silinmeye karşı tutuyoruz (gelecekteki idle dönüş).
void OK;
