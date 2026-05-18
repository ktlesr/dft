"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { approvalNotificationEmail, sendMail } from "@/lib/mail";
import { generateUniqueUsername } from "./username";
import type { Role } from "@prisma/client";

type ActionResult = { ok: true } | { ok: false; message: string };

const idSchema = z.string().min(1);

export type CreateUserFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/* ───────── Admin creates a user directly (skips invite / approval) ─────────
 *
 * Admins get a full create-user form on the admin panel: set a temporary
 * password, pick a group + extra roles, hand the credentials to the member.
 * The resulting account is immediately `ACTIVE` with `emailVerified` set —
 * no invite acceptance or admin approval step required.
 *
 * `USER` is always included in the role set; any admin-selected elevated
 * roles (MODERATOR / RAPPORTEUR / ADMIN) are added on top.
 */

const EXTRA_ROLE = z.enum(["MODERATOR", "RAPPORTEUR", "ADMIN"]);

// Faz 7: group codes are now free-form strings kept in the DB. Accept any
// well-formed code string (validated against existence at use time) or the
// `NONE` sentinel meaning "unassigned".
const NEW_USER_GROUP = z
  .string()
  .trim()
  .max(50)
  .refine((v) => v === "NONE" || /^[A-Z0-9_-]+$/i.test(v), "Geçersiz grup kodu.");

const optionalShort = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined));

const createUserSchema = z.object({
  name: z
    .string({ required_error: "Ad soyad zorunludur." })
    .trim()
    .min(2, "Ad soyad çok kısa.")
    .max(100, "Ad soyad çok uzun."),
  email: z
    .string({ required_error: "E-posta zorunludur." })
    .trim()
    .email("Geçerli bir e-posta girin.")
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: "Şifre zorunludur." })
    .min(10, "Şifre en az 10 karakter olmalı.")
    .max(128, "Şifre çok uzun.")
    .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
    .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
    .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
    .refine((v) => /[^A-Za-z0-9]/.test(v), "En az bir özel karakter içermeli."),
  groupCode: NEW_USER_GROUP,
  extraRoles: z.array(EXTRA_ROLE).default([]),
  // Faz 9: profil alanları — CSV şablonuyla aynı sütunlar.
  organization: optionalShort,
  academicTitle: optionalShort, // Profile.title
  position: optionalShort,
  city: optionalShort,
  phone: optionalShort,
});

function fieldErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createUserByAdmin(
  _prev: CreateUserFormState,
  fd: FormData,
): Promise<CreateUserFormState> {
  const admin = await requireAdmin();

  const extraRolesRaw = fd.getAll("extraRoles").map(String).filter(Boolean);
  const parsed = createUserSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password"),
    groupCode: fd.get("groupCode") ?? "NONE",
    extraRoles: extraRolesRaw,
    organization: fd.get("organization"),
    academicTitle: fd.get("academicTitle"),
    position: fd.get("position"),
    city: fd.get("city"),
    phone: fd.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { ok: false, errors: { email: ["Bu e-posta ile zaten bir hesap mevcut."] } };
  }

  const group =
    parsed.data.groupCode === "NONE"
      ? null
      : await prisma.group.findUnique({ where: { code: parsed.data.groupCode } });
  if (parsed.data.groupCode !== "NONE" && !group) {
    return { ok: false, errors: { groupCode: ["Seçilen grup bulunamadı."] } };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // USER is implicit; admin-selected extras are layered on top (deduped).
  const roles = Array.from(new Set<Role>(["USER", ...parsed.data.extraRoles]));

  // ad.soyad biçiminde benzersiz kullanıcı adı — opsiyonel; isim çok kısa
  // veya tamamen sembol ise null kalır.
  const username = await generateUniqueUsername(parsed.data.name);

  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      username,
      name: parsed.data.name,
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
      approvedById: admin.id,
      approvedAt: new Date(),
      groupId: group?.id ?? null,
      profile: {
        create: {
          title: parsed.data.academicTitle ?? null,
          position: parsed.data.position ?? null,
          organization: parsed.data.organization ?? null,
          phone: parsed.data.phone ?? null,
          city: parsed.data.city ?? null,
        },
      },
      roles: {
        createMany: {
          data: roles.map((role) => ({ role, grantedById: admin.id })),
        },
      },
    },
  });

  await audit({
    action: "USER_APPROVED",
    actorId: admin.id,
    targetType: "User",
    targetId: created.id,
    metadata: {
      createdBy: "admin_panel",
      email: parsed.data.email,
      groupCode: group?.code ?? null,
      roles,
    },
  });

  revalidatePath("/yonetim");
  revalidatePath("/yonetim/kullanicilar");

  // Redirect must come *after* the state is safe to persist. Next's redirect()
  // throws a NEXT_REDIRECT which the form action framework propagates.
  redirect(`/yonetim/kullanicilar/${created.id}?olusturuldu=1`);
}

/** Approve a PENDING / REJECTED / SUSPENDED user → ACTIVE. */
export async function approveUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("userId"));
  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) redirect("/yonetim/kullanicilar");
  if (row.id === admin.id) return; // no-op, admins are already active

  await prisma.user.update({
    where: { id },
    data: {
      status: "ACTIVE",
      approvedById: admin.id,
      approvedAt: new Date(),
      rejectedReason: null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: id,
      kind: "approval",
      title: "Hesabınız onaylandı",
      body: "DFT Portal'a giriş yapabilirsiniz.",
      link: "/panel",
    },
  });

  const mail = approvalNotificationEmail(row.name);
  await sendMail({ to: row.email, subject: mail.subject, text: mail.text });

  await audit({ action: "USER_APPROVED", actorId: admin.id, targetType: "User", targetId: id });
  revalidatePath("/yonetim/kullanicilar");
  revalidatePath(`/yonetim/kullanicilar/${id}`);
  revalidatePath("/yonetim");
}

/** Reject a pending user with an optional reason. */
export async function rejectUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("userId"));
  const reason = (formData.get("reason") as string | null)?.trim().slice(0, 500) || null;
  if (id === admin.id) return;

  await prisma.user.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  await audit({
    action: "USER_REJECTED",
    actorId: admin.id,
    targetType: "User",
    targetId: id,
    metadata: reason ? { reason } : undefined,
  });
  revalidatePath("/yonetim/kullanicilar");
  revalidatePath(`/yonetim/kullanicilar/${id}`);
}

export async function suspendUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = idSchema.parse(formData.get("userId"));
  if (id === admin.id) return;

  await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  await audit({ action: "USER_SUSPENDED", actorId: admin.id, targetType: "User", targetId: id });
  revalidatePath("/yonetim/kullanicilar");
  revalidatePath(`/yonetim/kullanicilar/${id}`);
}

const roleValues = ["USER", "MODERATOR", "RAPPORTEUR", "ADMIN"] as const;
const roleSchema = z.enum(roleValues);

export async function addRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = idSchema.parse(formData.get("userId"));
  const role = roleSchema.parse(formData.get("role")) as Role;

  await prisma.roleAssignment.upsert({
    where: { userId_role: { userId, role } },
    update: {},
    create: { userId, role, grantedById: admin.id },
  });

  await audit({
    action: "USER_ROLE_ADDED",
    actorId: admin.id,
    targetType: "User",
    targetId: userId,
    metadata: { role },
  });
  revalidatePath(`/yonetim/kullanicilar/${userId}`);
}

export async function removeRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = idSchema.parse(formData.get("userId"));
  const role = roleSchema.parse(formData.get("role")) as Role;

  // Protect the portal from being left without any admin.
  if (role === "ADMIN") {
    const adminCount = await prisma.roleAssignment.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      // Do nothing silently — UI shows the count so admin can add a replacement first.
      return;
    }
  }

  await prisma.roleAssignment
    .delete({ where: { userId_role: { userId, role } } })
    .catch(() => undefined);

  await audit({
    action: "USER_ROLE_REMOVED",
    actorId: admin.id,
    targetType: "User",
    targetId: userId,
    metadata: { role },
  });
  revalidatePath(`/yonetim/kullanicilar/${userId}`);
}

// Faz 7: group codes are free-form now. Validation is just a shape check;
// existence is verified against the DB below.
const groupSchema = z
  .string()
  .trim()
  .max(50)
  .refine((v) => v === "" || /^[A-Z0-9_-]+$/i.test(v), "Geçersiz grup kodu.");

export async function changeUserGroup(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = idSchema.parse(formData.get("userId"));
  const code = groupSchema.parse(formData.get("groupCode"));

  const target = code === "" ? null : await prisma.group.findUnique({ where: { code } });
  if (code !== "" && !target) {
    // Silently noop — form options are sourced from DB so this path only
    // fires on a crafted client.
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { groupId: target?.id ?? null },
  });

  await audit({
    action: "USER_GROUP_CHANGED",
    actorId: admin.id,
    targetType: "User",
    targetId: userId,
    metadata: { groupCode: code || null },
  });
  revalidatePath(`/yonetim/kullanicilar/${userId}`);
}
