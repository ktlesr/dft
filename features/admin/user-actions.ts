"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { approvalNotificationEmail, sendMail } from "@/lib/mail";
import type { GroupCode, Role } from "@prisma/client";

type ActionResult = { ok: true } | { ok: false; message: string };

const idSchema = z.string().min(1);

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

const groupValues = ["UAK", "E2SC", "DFSF", "PGD", "PA", ""] as const;
const groupSchema = z.enum(groupValues);

export async function changeUserGroup(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = idSchema.parse(formData.get("userId"));
  const code = groupSchema.parse(formData.get("groupCode"));

  const target = code === "" ? null : await prisma.group.findUnique({ where: { code: code as GroupCode } });
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
