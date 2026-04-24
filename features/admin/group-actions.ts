"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

/**
 * Admin CRUD for working groups (Faz 7). `Group.code` used to be the
 * `GroupCode` Prisma enum; now it's a free-form string — admins can add,
 * rename or retire groups entirely through the UI.
 */

export type GroupFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/**
 * Codes are short identifiers surfaced to every member (sidebar badge,
 * breadcrumbs, search results). Enforce the shape we used to guarantee
 * with the enum: letters/digits/underscore/hyphen only, 2–20 chars.
 */
const codeSchema = z
  .string({ required_error: "Kod zorunludur." })
  .trim()
  .min(2, "Kod çok kısa (en az 2 karakter).")
  .max(20, "Kod çok uzun (en fazla 20 karakter).")
  .regex(/^[A-Z0-9_-]+$/i, "Yalnızca harf, rakam, alt çizgi ve tire kullanın.")
  .transform((v) => v.toUpperCase());

const nameSchema = z
  .string({ required_error: "Ad zorunludur." })
  .trim()
  .min(2, "Ad çok kısa.")
  .max(150, "Ad çok uzun.");

const descriptionSchema = z
  .string()
  .trim()
  .max(500, "Açıklama çok uzun.")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const createSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
});

const updateSchema = z.object({
  id: z.string().min(1),
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
});

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createGroupAction(
  _prev: GroupFormState,
  fd: FormData,
): Promise<GroupFormState> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    code: fd.get("code"),
    name: fd.get("name"),
    description: fd.get("description"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const existing = await prisma.group.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return { ok: false, errors: { code: ["Bu kodla bir grup zaten var."] } };
  }

  const created = await prisma.group.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });

  await audit({
    action: "SETTINGS_CHANGED",
    actorId: admin.id,
    targetType: "Group",
    targetId: created.id,
    metadata: { change: "group_created", code: created.code, name: created.name },
  });

  revalidatePath("/yonetim/gruplar");
  redirect(`/yonetim/gruplar?olusturuldu=${encodeURIComponent(created.code)}`);
}

export async function updateGroupAction(
  _prev: GroupFormState,
  fd: FormData,
): Promise<GroupFormState> {
  const admin = await requireAdmin();

  const parsed = updateSchema.safeParse({
    id: fd.get("id"),
    code: fd.get("code"),
    name: fd.get("name"),
    description: fd.get("description"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // Guard against code collisions — a rename must not shadow another group.
  const collision = await prisma.group.findFirst({
    where: { code: parsed.data.code, NOT: { id: parsed.data.id } },
    select: { id: true },
  });
  if (collision) {
    return { ok: false, errors: { code: ["Bu kodu başka bir grup kullanıyor."] } };
  }

  const updated = await prisma.group.update({
    where: { id: parsed.data.id },
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });

  await audit({
    action: "SETTINGS_CHANGED",
    actorId: admin.id,
    targetType: "Group",
    targetId: updated.id,
    metadata: { change: "group_updated", code: updated.code, name: updated.name },
  });

  revalidatePath("/yonetim/gruplar");
  revalidatePath(`/yonetim/gruplar/${updated.id}`);
  return { ok: true, message: "Grup güncellendi." };
}

/**
 * Delete a group. Prisma's `onDelete: SetNull` on User.groupId means users
 * in the group become groupless (not deleted). Other relations are
 * `onDelete: Cascade` or `SetNull`; we intentionally do not reassign their
 * content — this lines up with the existing data lifecycle (soft-delete
 * elsewhere, but group rows themselves are admin-managed metadata).
 */
export async function deleteGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = z.string().min(1).parse(formData.get("id"));

  const row = await prisma.group.findUnique({
    where: { id },
    select: { id: true, code: true, name: true },
  });
  if (!row) redirect("/yonetim/gruplar");

  await prisma.group.delete({ where: { id } });

  await audit({
    action: "SETTINGS_CHANGED",
    actorId: admin.id,
    targetType: "Group",
    targetId: id,
    metadata: { change: "group_deleted", code: row.code, name: row.name },
  });

  revalidatePath("/yonetim/gruplar");
  revalidatePath("/yonetim/kullanicilar");
  redirect("/yonetim/gruplar?silindi=1");
}
