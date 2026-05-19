"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser, requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { storage } from "@/lib/storage";
import { isAdmin } from "@/lib/rbac";

export type ProfileFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad çok kısa.").max(100),
  title: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  position: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  organization: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  bio: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  expertise: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
});

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function updateProfile(
  _prev: ProfileFormState,
  fd: FormData,
): Promise<ProfileFormState> {
  const user = await requireActiveUser();
  const parsed = profileSchema.safeParse({
    name: fd.get("name"),
    title: fd.get("title"),
    position: fd.get("position"),
    organization: fd.get("organization"),
    phone: fd.get("phone"),
    bio: fd.get("bio"),
    expertise: fd.get("expertise"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    }),
    prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        title: parsed.data.title ?? null,
        position: parsed.data.position ?? null,
        organization: parsed.data.organization ?? null,
        phone: parsed.data.phone ?? null,
        bio: parsed.data.bio ?? null,
        expertise: parsed.data.expertise,
      },
      update: {
        title: parsed.data.title ?? null,
        position: parsed.data.position ?? null,
        organization: parsed.data.organization ?? null,
        phone: parsed.data.phone ?? null,
        bio: parsed.data.bio ?? null,
        expertise: parsed.data.expertise,
      },
    }),
  ]);

  revalidatePath("/profilim");
  return { ok: true, message: "Profil güncellendi." };
}

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifreyi girin."),
    newPassword: z
      .string()
      .min(10, "Yeni şifre en az 10 karakter olmalı.")
      .max(128)
      .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
      .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
      .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
      .refine((v) => /[^A-Za-z0-9]/.test(v), "En az bir özel karakter içermeli."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor.",
  });

export async function changePassword(
  _prev: ProfileFormState,
  fd: FormData,
): Promise<ProfileFormState> {
  const user = await requireActiveUser();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: fd.get("currentPassword"),
    newPassword: fd.get("newPassword"),
    confirmPassword: fd.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row?.passwordHash) {
    return {
      ok: false,
      message:
        "Bu hesap şifresiz (ör. Google ile giriş). Şifre değiştirme kullanılamaz.",
    };
  }
  const ok = await verifyPassword(row.passwordHash, parsed.data.currentPassword);
  if (!ok) return { ok: false, errors: { currentPassword: ["Mevcut şifre hatalı."] } };

  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, failedLoginCount: 0, lockedUntil: null },
  });

  await audit({
    action: "SETTINGS_CHANGED",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    metadata: { change: "password" },
  });

  revalidatePath("/profilim");
  return { ok: true, message: "Şifreniz güncellendi." };
}

/* ══════════════════════════════════════════════════════════════════
 * Profile photo + CV upload
 * ══════════════════════════════════════════════════════════════════*/

const ALLOWED_PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_CV_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Resolve the target user for an upload. Self-uploads are always allowed;
 * uploading to another user requires ADMIN. Returns the resolved user id.
 */
async function resolveUploadTarget(
  fd: FormData,
): Promise<{ actorId: string; targetUserId: string }> {
  const current = await requireActiveUser();
  const raw = fd.get("userId");
  const requested = typeof raw === "string" && raw.length > 0 ? raw : null;
  if (!requested || requested === current.id) {
    return { actorId: current.id, targetUserId: current.id };
  }
  if (!isAdmin(current)) {
    throw new Error("Yalnızca yöneticiler başka kullanıcıya yükleme yapabilir.");
  }
  return { actorId: current.id, targetUserId: requested };
}

export async function uploadProfilePhoto(
  _prev: ProfileFormState,
  fd: FormData,
): Promise<ProfileFormState> {
  let targetUserId: string;
  let actorId: string;
  try {
    const resolved = await resolveUploadTarget(fd);
    targetUserId = resolved.targetUserId;
    actorId = resolved.actorId;
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Lütfen bir görüntü dosyası seçin." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, message: "Dosya çok büyük (en fazla 5 MB)." };
  }
  if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
    return { ok: false, message: "Yalnızca JPEG, PNG veya WebP kabul edilir." };
  }

  // Magic-byte check — protect against declared-PNG but real-script uploads.
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(head);
  if (!detected || !ALLOWED_PHOTO_MIMES.has(detected.mime)) {
    return { ok: false, message: "Dosya içeriği geçersiz." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storage.put({
    bytes,
    mimeType: detected.mime,
    originalName: file.name,
  });

  // Remove previous photo if any (best-effort cleanup).
  const prev = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { image: true },
  });
  const prevKey = prev?.image?.startsWith("storage:") ? prev.image.slice("storage:".length) : null;

  await prisma.user.update({
    where: { id: targetUserId },
    data: { image: `storage:${stored.storageKey}` },
  });
  if (prevKey) {
    await storage.remove(prevKey).catch(() => undefined);
  }

  await audit({
    action: "SETTINGS_CHANGED",
    actorId,
    targetType: "User",
    targetId: targetUserId,
    metadata: { change: "photo" },
  });

  revalidatePath("/profilim");
  revalidatePath(`/yonetim/kullanicilar/${targetUserId}`);
  return { ok: true, message: "Profil fotoğrafı güncellendi." };
}

export async function uploadProfileCv(
  _prev: ProfileFormState,
  fd: FormData,
): Promise<ProfileFormState> {
  let targetUserId: string;
  let actorId: string;
  try {
    const resolved = await resolveUploadTarget(fd);
    targetUserId = resolved.targetUserId;
    actorId = resolved.actorId;
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Lütfen bir CV dosyası seçin." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { ok: false, message: "Dosya çok büyük (en fazla 10 MB)." };
  }
  if (!ALLOWED_CV_MIMES.has(file.type)) {
    return { ok: false, message: "Yalnızca PDF veya Word kabul edilir." };
  }

  // Magic-byte: accept pdf + ms-word container (ooxml → application/zip).
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(head);
  if (!detected) {
    return { ok: false, message: "Dosya içeriği tespit edilemedi." };
  }
  const detectedOk =
    detected.mime === "application/pdf" ||
    detected.mime === "application/zip" ||
    detected.mime === "application/x-cfb";
  if (!detectedOk) {
    return { ok: false, message: "Dosya içeriği geçersiz." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storage.put({
    bytes,
    mimeType: file.type,
    originalName: file.name,
  });

  const prev = await prisma.profile.findUnique({
    where: { userId: targetUserId },
    select: { cvStorageKey: true },
  });
  const prevKey = prev?.cvStorageKey ?? null;

  await prisma.profile.upsert({
    where: { userId: targetUserId },
    create: {
      userId: targetUserId,
      cvStorageKey: stored.storageKey,
      cvOriginalName: stored.originalName,
    },
    update: {
      cvStorageKey: stored.storageKey,
      cvOriginalName: stored.originalName,
    },
  });
  if (prevKey) {
    await storage.remove(prevKey).catch(() => undefined);
  }

  await audit({
    action: "SETTINGS_CHANGED",
    actorId,
    targetType: "User",
    targetId: targetUserId,
    metadata: { change: "cv" },
  });

  revalidatePath("/profilim");
  revalidatePath(`/yonetim/kullanicilar/${targetUserId}`);
  return { ok: true, message: "CV yüklendi." };
}

export async function removeProfileCv(targetUserId?: string): Promise<void> {
  const current = await requireActiveUser();
  const target = targetUserId && targetUserId !== current.id ? targetUserId : current.id;
  if (target !== current.id && !isAdmin(current)) {
    throw new Error("Yetkisiz.");
  }
  const profile = await prisma.profile.findUnique({
    where: { userId: target },
    select: { cvStorageKey: true },
  });
  if (profile?.cvStorageKey) {
    await storage.remove(profile.cvStorageKey).catch(() => undefined);
  }
  await prisma.profile.update({
    where: { userId: target },
    data: { cvStorageKey: null, cvOriginalName: null },
  });
  await audit({
    action: "SETTINGS_CHANGED",
    actorId: current.id,
    targetType: "User",
    targetId: target,
    metadata: { change: "cv_removed" },
  });
  revalidatePath("/profilim");
  revalidatePath(`/yonetim/kullanicilar/${target}`);
}

// Keep this exported symbol alive even if unused in this file — it's used
// by the upload handlers above.
void requireAdmin;
