"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createToken, hashToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";
import type { Role } from "@prisma/client";

export type InviteFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  tokenUrl?: string | null;
};

const OK: InviteFormState = { ok: true };

const createSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Geçerli bir e-posta girin.")
    .transform((v) => v.toLowerCase()),
  // "NONE" is a Radix-friendly sentinel (empty strings are reserved there)
  // and is normalised to `undefined` before we look up the group. Codes
  // are validated against the DB at use time — Faz 7 made them dynamic.
  groupCode: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (!v || v === "NONE" ? undefined : v))
    .refine(
      (v) => v === undefined || /^[A-Z0-9_-]+$/i.test(v),
      "Geçersiz grup kodu.",
    ),
  roles: z
    .array(z.enum(["USER", "MODERATOR", "RAPPORTEUR", "ADVISOR", "ADMIN"]))
    .optional()
    .transform((v) => v ?? []),
  daysValid: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 14))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 60, "1–60 gün arası olmalı."),
});

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createInvite(
  _prev: InviteFormState,
  fd: FormData,
): Promise<InviteFormState> {
  const admin = await requireAdmin();

  const rolesRaw = fd.getAll("roles").map(String).filter(Boolean);
  const parsed = createSchema.safeParse({
    email: fd.get("email"),
    groupCode: fd.get("groupCode") ?? "",
    roles: rolesRaw.length > 0 ? rolesRaw : undefined,
    daysValid: fd.get("daysValid") ?? "14",
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, message: "Bu e-posta ile zaten kayıtlı bir hesap var." };
  }

  const group = parsed.data.groupCode
    ? await prisma.group.findUnique({ where: { code: parsed.data.groupCode } })
    : null;
  if (parsed.data.groupCode && !group) {
    return { ok: false, errors: { groupCode: ["Seçilen grup bulunamadı."] } };
  }

  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + parsed.data.daysValid * 86_400_000);

  await prisma.invite.create({
    data: {
      email: parsed.data.email,
      tokenHash,
      roles: (parsed.data.roles.length > 0 ? parsed.data.roles : ["USER"]) as Role[],
      groupId: group?.id ?? null,
      expiresAt,
      createdById: admin.id,
    },
  });

  const link = `${process.env.APP_URL ?? ""}/davet/${token}`;
  await sendMail({
    to: parsed.data.email,
    subject: "DFT Portal — Üyelik davetiniz",
    text: [
      "Merhaba,",
      "",
      "DFT Kapalı Portalı'na davet edildiniz. Aşağıdaki bağlantı ile hesabınızı tamamlayabilirsiniz:",
      "",
      link,
      "",
      `Bağlantı ${parsed.data.daysValid} gün geçerlidir.`,
    ].join("\n"),
  });

  await audit({
    action: "INVITE_CREATED",
    actorId: admin.id,
    metadata: {
      email: parsed.data.email,
      groupCode: group?.code ?? null,
      roles: parsed.data.roles,
    },
  });

  revalidatePath("/yonetim/davetler");
  revalidatePath("/yonetim");
  return { ok: true, message: "Davet oluşturuldu ve e-posta gönderildi.", tokenUrl: link };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));

  await prisma.invite.update({
    where: { id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  await audit({
    action: "INVITE_REVOKED",
    actorId: admin.id,
    targetType: "Invite",
    targetId: id,
  });

  revalidatePath("/yonetim/davetler");
}

/* ────────── accept-invite flow (public) ────────── */

const acceptSchema = z
  .object({
    token: z.string().min(10),
    name: z.string().trim().min(2, "Ad soyad çok kısa.").max(100),
    password: z
      .string()
      .min(10, "Şifre en az 10 karakter olmalı.")
      .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
      .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
      .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
      .refine((v) => /[^A-Za-z0-9]/.test(v), "Özel karakter içermeli."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor.",
  });

export type AcceptInviteState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function acceptInvite(
  _prev: AcceptInviteState,
  fd: FormData,
): Promise<AcceptInviteState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`accept-invite:${ip}`, 10, 15 * 60_000);
  if (!rl.allowed) return { ok: false, message: "Çok fazla deneme." };

  const parsed = acceptSchema.safeParse({
    token: fd.get("token"),
    name: fd.get("name"),
    password: fd.get("password"),
    confirmPassword: fd.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const tokenHash = hashToken(parsed.data.token);
  const invite = await prisma.invite.findUnique({ where: { tokenHash } });
  if (!invite) return { ok: false, message: "Geçersiz bağlantı." };
  if (invite.status !== "PENDING") return { ok: false, message: "Bu davet artık geçerli değil." };
  if (invite.expiresAt.getTime() < Date.now())
    return { ok: false, message: "Bağlantının süresi dolmuş." };

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) return { ok: false, message: "Bu e-posta ile zaten bir hesap mevcut." };

  const passwordHash = await hashPassword(parsed.data.password);

  const [, user] = await prisma.$transaction([
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
    prisma.user.create({
      data: {
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        status: "ACTIVE", // invite bypasses the PENDING_APPROVAL gate
        emailVerified: new Date(),
        groupId: invite.groupId,
        profile: { create: {} },
        roles: {
          createMany: {
            data: (invite.roles.length > 0 ? invite.roles : (["USER"] as Role[])).map(
              (role) => ({ role }),
            ),
          },
        },
      },
    }),
  ]);

  await audit({
    action: "INVITE_ACCEPTED",
    actorId: user.id,
    targetType: "Invite",
    targetId: invite.id,
  });

  // Fall through to login. requireActiveUser is imported only to keep
  // type import graph warm for other actions; not used here.
  void requireActiveUser;
  return { ok: true, message: "Hesabınız oluşturuldu. Artık giriş yapabilirsiniz." };
}
