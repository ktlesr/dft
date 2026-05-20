"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateMinute, isAdmin } from "@/lib/rbac";
import { storeAttachments, UploadError } from "@/lib/upload";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";
import { minuteSchema } from "./schemas";

export type MinuteFormState = {
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

export async function createMinute(
  _prev: MinuteFormState,
  fd: FormData,
): Promise<MinuteFormState> {
  const user = await requireActiveUser();

  const parsed = minuteSchema.safeParse({
    meetingId: fd.get("meetingId"),
    date: fd.get("date"),
    attendees: fd.get("attendees"),
    topics: fd.get("topics"),
    decisions: fd.get("decisions"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const meeting = await prisma.meeting.findUnique({
    where: { id: parsed.data.meetingId },
    select: { id: true, groupId: true, deletedAt: true },
  });
  if (!meeting || meeting.deletedAt) {
    return { ok: false, errors: { meetingId: ["Toplantı bulunamadı."] } };
  }
  if (!canCreateMinute(user, meeting.groupId)) {
    return { ok: false, message: "Bu grup için tutanak yazma yetkiniz yok." };
  }

  const row = await prisma.meetingMinute.create({
    data: {
      meetingId: meeting.id,
      date: parsed.data.date,
      attendees: parsed.data.attendees,
      topics: parsed.data.topics,
      decisions: parsed.data.decisions,
      summary: parsed.data.summary ?? null,
      authorId: user.id,
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { minuteId: row.id },
    });
  } catch (e) {
    await prisma.meetingMinute.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  await audit({
    action: "MINUTE_CREATED",
    actorId: user.id,
    targetType: "MeetingMinute",
    targetId: row.id,
    metadata: { meetingId: meeting.id },
  });
  await notifyAdminsAboutNonAdminActivity({
    actorId: user.id,
    actorRoles: user.roles,
    actorName: user.name,
    actorEmail: user.email,
    kind: "minute_admin",
    title: "Yeni toplantı tutanağı eklendi",
    body: `${user.name?.trim() || user.email} · Toplantı #${meeting.id}`,
    link: `/toplanti/${meeting.id}`,
  });

  revalidatePath(`/toplanti/${meeting.id}`);
  revalidatePath("/calisma-grubum");
  redirect(`/toplanti/${meeting.id}`);
}

export async function removeMinute(id: string): Promise<void> {
  const user = await requireActiveUser();
  const minute = await prisma.meetingMinute.findUnique({
    where: { id },
    include: { meeting: { select: { groupId: true, id: true } } },
  });
  if (!minute || minute.deletedAt || !minute.meeting) redirect("/calisma-grubum");

  const canRemove =
    isAdmin(user) ||
    (minute.authorId === user.id && minute.meeting.groupId === user.groupId);
  if (!canRemove) await redirectUnauthorized();

  await prisma.meetingMinute.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: "MINUTE_UPDATED",
    actorId: user.id,
    targetType: "MeetingMinute",
    targetId: id,
    metadata: { removed: true },
  });

  revalidatePath(`/toplanti/${minute.meeting.id}`);
  redirect(`/toplanti/${minute.meeting.id}`);
}
