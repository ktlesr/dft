"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateGroupNote } from "@/lib/rbac";
import { MAX_ATTACHMENTS_PER_REQUEST, storeAttachments, UploadError } from "@/lib/upload";
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
  if (!user.groupId) {
    return { ok: false, message: "Not eklemek için bir çalışma grubuna atanmış olmalısınız." };
  }

  const parsed = groupNoteSchema.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    body: fd.get("body"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  if (!canCreateGroupNote(user, user.groupId, parsed.data.kind)) {
    return { ok: false, message: "Bu not türünü oluşturma yetkiniz yok." };
  }

  const row = await prisma.groupNote.create({
    data: {
      groupId: user.groupId,
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

  await audit({
    action: "RECORD_CREATED",
    actorId: user.id,
    targetType: "GroupNote",
    targetId: row.id,
    metadata: { kind: parsed.data.kind },
  });

  revalidatePath("/calisma-grubum");
  revalidatePath("/not/yeni");
  redirect("/calisma-grubum?tab=notlar");
}
