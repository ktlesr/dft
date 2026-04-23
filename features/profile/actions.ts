"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

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
