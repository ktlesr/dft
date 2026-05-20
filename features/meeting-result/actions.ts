"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { storeAttachments, UploadError } from "@/lib/upload";
import { meetingResultSchema, type MeetingResultFormState } from "./schemas";

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

export async function createMeetingResult(
  _prev: MeetingResultFormState,
  fd: FormData
): Promise<MeetingResultFormState> {
  const user = await requireActiveUser();
  if (!isAdmin(user)) {
    return { ok: false, message: "Toplantı sonucu ekleme yetkiniz yok." };
  }

  // Parse fields
  const rawTargetGroupIds = fd.getAll("targetGroupIds").map((v) => String(v));
  
  const parsed = meetingResultSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description"),
    startAt: fd.get("startAt"),
    endAt: fd.get("endAt"),
    scope: fd.get("scope"),
    mrdkTarget: fd.get("mrdkTarget") || undefined,
    targetGroupIds: rawTargetGroupIds,
  });

  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error) };
  }

  const { title, description, startAt, endAt, scope, mrdkTarget, targetGroupIds } = parsed.data;

  const row = await prisma.meetingResult.create({
    data: {
      title,
      description: description ?? null,
      startAt,
      endAt,
      scope,
      mrdkTarget: mrdkTarget ?? null,
      targetGroupIds: scope === "MRDK" && mrdkTarget === "SPECIFIC" ? targetGroupIds : [],
      createdById: user.id,
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { meetingResultId: row.id },
    });
  } catch (e) {
    await prisma.meetingResult.delete({ where: { id: row.id } });
    if (e instanceof UploadError) {
      return { ok: false, message: "Dosya yüklenirken hata oluştu veya dosya türü geçersiz." };
    }
    throw e;
  }

  // Create notifications for the target users
  // Kapsam: GENEL veya MRDK-ALL ise tüm aktif kullanıcılar
  // Kapsam: MRDK-SPECIFIC ise sadece o gruptaki aktif kullanıcılar
  let targetUserIds: string[] = [];
  if (scope === "GENEL" || (scope === "MRDK" && mrdkTarget === "ALL")) {
    const allUsers = await prisma.user.findMany({
      where: { status: "ACTIVE", id: { not: user.id } },
      select: { id: true },
    });
    targetUserIds = allUsers.map((u) => u.id);
  } else if (scope === "MRDK" && mrdkTarget === "SPECIFIC" && targetGroupIds.length > 0) {
    const groupUsers = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        groupId: { in: targetGroupIds },
        id: { not: user.id },
      },
      select: { id: true },
    });
    targetUserIds = groupUsers.map((u) => u.id);
  }

  if (targetUserIds.length > 0) {
    await prisma.notification.createMany({
      data: targetUserIds.map((uid) => ({
        userId: uid,
        kind: "meeting_result",
        title: "Yeni Toplantı Sonucu Paylaşıldı",
        body: title,
        link: `/calisma-grubum?tab=toplantilar`,
      })),
    });
  }

  await audit({
    action: "MEETING_RESULT_CREATED",
    actorId: user.id,
    targetType: "MeetingResult",
    targetId: row.id,
    metadata: { scope, mrdkTarget },
  });

  revalidatePath("/calisma-grubum");
  redirect("/calisma-grubum?tab=toplantilar");
}
