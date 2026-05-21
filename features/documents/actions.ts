"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import { UploadError, storeAttachments } from "@/lib/upload";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";

export type DocumentFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: DocumentFormState = { ok: true };

const documentSchema = z.object({
  category: z.enum(["ORTAK", "GRUP", "UYE_YUKLEMESI"]),
  title: z.string().trim().min(2, "Başlık çok kısa.").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)),
});

function filesFrom(fd: FormData): File[] {
  return fd.getAll("attachments").filter((v): v is File => v instanceof File);
}

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createDocument(
  _prev: DocumentFormState,
  fd: FormData,
): Promise<DocumentFormState> {
  const user = await requireActiveUser();
  const parsed = documentSchema.safeParse({
    category: fd.get("category"),
    title: fd.get("title"),
    description: fd.get("description"),
    tags: fd.get("tags"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const { category } = parsed.data;

  // Authorization per category.
  if (category === "ORTAK" && !isAdmin(user)) {
    return { ok: false, message: "Ortak belge yüklemek için yönetici yetkisi gerekir." };
  }
  if (category === "GRUP") {
    if (!user.groupId) {
      return { ok: false, message: "Çalışma grubunuz atanmadığı için grup belgesi yükleyemezsiniz." };
    }
    if (!isAdmin(user) && !isModerator(user)) {
      return { ok: false, message: "Grup belgesi yüklemek için moderatör yetkisi gerekir." };
    }
  }

  const files = filesFrom(fd).filter((f) => f.size > 0);
  if (files.length === 0) return { ok: false, message: "En az bir dosya yükleyin." };

  const row = await prisma.document.create({
    data: {
      category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      tags: parsed.data.tags,
      uploadedById: user.id,
      groupId: category === "GRUP" ? user.groupId : null,
    },
  });

  try {
    await storeAttachments({
      files,
      uploadedById: user.id,
      owner: { documentId: row.id },
    });
  } catch (e) {
    await prisma.document.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  await audit({
    action: "DOCUMENT_UPLOADED",
    actorId: user.id,
    targetType: "Document",
    targetId: row.id,
    metadata: { category },
  });
  await notifyAdminsAboutNonAdminActivity({
    actorId: user.id,
    actorRoles: user.roles,
    actorName: user.name,
    actorEmail: user.email,
    kind: "document_admin",
    title: "Yeni doküman yüklendi",
    body: `${user.name?.trim() || user.email} · ${row.title}`,
    link: "/belgeler",
  });
  revalidatePath("/belgeler");
  revalidatePath("/panel");
  return OK;
}
