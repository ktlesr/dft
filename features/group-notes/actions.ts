"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateGroupNote } from "@/lib/rbac";
import { MAX_ATTACHMENTS_PER_REQUEST, storeAttachments, UploadError } from "@/lib/upload";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";
import { groupNoteSchema } from "./schemas";

export type GroupNoteFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function filesFrom(fd: FormData): File[] {
  return fd.getAll("attachments").filter((v): v is File => v instanceof File);
}

export async function createGroupNote(
  _prev: GroupNoteFormState,
  fd: FormData,
): Promise<GroupNoteFormState> {
  const user = await requireActiveUser();

  const parsed = groupNoteSchema.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    body: fd.get("body"),
    scope: fd.get("scope"),
    groupId: fd.get("groupId"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const isAdvisorOrAdmin = user.roles.includes("ADMIN") || user.roles.includes("ADVISOR");

  let finalScope = parsed.data.scope;
  let finalGroupId = parsed.data.groupId;

  if (!isAdvisorOrAdmin) {
    if (!user.groupId) {
      return { ok: false, message: "Not eklemek için bir çalışma grubuna atanmış olmalısınız." };
    }
    finalScope = "GROUP";
    finalGroupId = user.groupId;
  } else {
    if (finalScope === "GENERAL") {
      finalGroupId = null;
    } else {
      finalGroupId = finalGroupId || user.groupId;
      if (!finalGroupId) {
        return { ok: false, message: "Lütfen bir çalışma grubu seçin veya not kapsamını değiştirin." };
      }
    }
  }

  if (!canCreateGroupNote(user, finalGroupId, parsed.data.kind)) {
    return { ok: false, message: "Bu not türünü oluşturma yetkiniz yok." };
  }

  const row = await prisma.groupNote.create({
    data: {
      scope: finalScope,
      groupId: finalGroupId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      authorId: user.id,
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { groupNoteId: row.id },
    });
  } catch (e) {
    await prisma.groupNote.delete({ where: { id: row.id } });
    if (e instanceof UploadError) {
      const message =
        e.code === "too_many"
          ? `En fazla ${MAX_ATTACHMENTS_PER_REQUEST} dosya yükleyebilirsiniz.`
          : "Ek dosya reddedildi.";
      return { ok: false, message };
    }
    throw e;
  }

  // Notify members
  const memberWhere =
    finalScope === "GENERAL"
      ? { groupId: { not: null }, status: "ACTIVE" as const, id: { not: user.id } }
      : { groupId: finalGroupId, status: "ACTIVE" as const, id: { not: user.id } };

  const members = await prisma.user.findMany({
    where: memberWhere,
    select: { id: true },
  });

  if (members.length > 0) {
    const kindLabel = parsed.data.kind === "ADVISOR_NOTE" ? "Danışman Notu" : "Kalite Sorumlusu Notu";
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.id,
        kind: "group_note",
        title: `Yeni ${kindLabel}`,
        body: parsed.data.title,
        link: "/calisma-grubum?tab=notlar",
      })),
    });
  }

  await audit({
    action: "RECORD_CREATED",
    actorId: user.id,
    targetType: "GroupNote",
    targetId: row.id,
    metadata: { kind: parsed.data.kind },
  });
  await notifyAdminsAboutNonAdminActivity({
    actorId: user.id,
    actorRoles: user.roles,
    actorName: user.name,
    actorEmail: user.email,
    kind: "group_note_admin",
    title: "Yeni grup notu eklendi",
    body: `${user.name?.trim() || user.email} · ${parsed.data.title}`,
    link: "/calisma-grubum?tab=notlar",
  });

  revalidatePath("/calisma-grubum");
  revalidatePath("/not/yeni");
  redirect("/calisma-grubum?tab=notlar");
}

export async function updateGroupNote(
  id: string,
  _prev: GroupNoteFormState,
  fd: FormData,
): Promise<GroupNoteFormState> {
  const user = await requireActiveUser();
  const note = await prisma.groupNote.findUnique({ where: { id } });
  if (!note || note.deletedAt) redirect("/calisma-grubum?tab=notlar");
  if (!user.roles.includes("ADMIN") && note.authorId !== user.id) await redirectUnauthorized();

  const parsed = groupNoteSchema.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    body: fd.get("body"),
    scope: fd.get("scope"),
    groupId: fd.get("groupId"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const isAdvisorOrAdmin = user.roles.includes("ADMIN") || user.roles.includes("ADVISOR");
  let finalScope = parsed.data.scope;
  let finalGroupId = parsed.data.groupId;

  if (!isAdvisorOrAdmin) {
    if (!user.groupId) return { ok: false, message: "Not düzenlemek için bir çalışma grubuna atanmış olmalısınız." };
    finalScope = "GROUP";
    finalGroupId = user.groupId;
  } else if (finalScope === "GENERAL") {
    finalGroupId = null;
  } else {
    finalGroupId = finalGroupId || user.groupId;
    if (!finalGroupId) return { ok: false, message: "Lütfen bir çalışma grubu seçin." };
  }

  if (!canCreateGroupNote(user, finalGroupId, parsed.data.kind)) {
    return { ok: false, message: "Bu not türünü düzenleme yetkiniz yok." };
  }

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { groupNoteId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  await prisma.groupNote.update({
    where: { id },
    data: {
      scope: finalScope,
      groupId: finalGroupId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });
  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "GroupNote", targetId: id });
  revalidatePath("/calisma-grubum");
  redirect("/calisma-grubum?tab=notlar");
}
