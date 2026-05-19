"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateMeeting, isAdmin } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { storeAttachments, UploadError } from "@/lib/upload";
import { meetingSchema } from "./schemas";

export type MeetingFormState = {
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

export async function createMeeting(
  _prev: MeetingFormState,
  fd: FormData,
): Promise<MeetingFormState> {
  const user = await requireActiveUser();
  if (!user.groupId || !canCreateMeeting(user, user.groupId)) {
    return { ok: false, message: "Toplantı bildirimi için yetkiniz yok." };
  }

  const parsed = meetingSchema.safeParse({
    title: fd.get("title"),
    startAt: fd.get("startAt"),
    endAt: fd.get("endAt"),
    location: fd.get("location"),
    onlineUrl: fd.get("onlineUrl"),
    description: fd.get("description"),
    agenda: fd.get("agenda"),
    pinToBoard: fd.get("pinToBoard"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.meeting.create({
    data: {
      groupId: user.groupId,
      title: parsed.data.title,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt ?? null,
      location: parsed.data.location ?? null,
      onlineUrl: parsed.data.onlineUrl ?? null,
      description: parsed.data.description ?? null,
      agenda: parsed.data.agenda ?? null,
      pinToBoard: parsed.data.pinToBoard,
      createdById: user.id,
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { meetingId: row.id },
    });
  } catch (e) {
    await prisma.meeting.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  // Optional: pin a summary to the group board.
  if (parsed.data.pinToBoard) {
    await prisma.boardPost.create({
      data: {
        scope: "GROUP",
        groupId: user.groupId,
        kind: "ANNOUNCEMENT",
        title: `Toplantı: ${parsed.data.title}`,
        body: [
          `📅 ${formatDateTime(parsed.data.startAt)}`,
          parsed.data.location ? `📍 ${parsed.data.location}` : null,
          parsed.data.onlineUrl ? `🔗 ${parsed.data.onlineUrl}` : null,
          parsed.data.description ?? null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        tags: ["toplanti"],
        pinned: true,
        status: "PUBLISHED",
        authorId: user.id,
      },
    });
  }

  // Notify group members (minimal in-portal notification).
  const members = await prisma.user.findMany({
    where: { groupId: user.groupId, status: "ACTIVE", id: { not: user.id } },
    select: { id: true },
  });
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.id,
        kind: "meeting",
        title: "Yeni toplantı bildirimi",
        body: `${parsed.data.title} · ${formatDateTime(parsed.data.startAt)}`,
        link: `/toplanti/${row.id}`,
      })),
    });
  }

  await audit({
    action: "MEETING_CREATED",
    actorId: user.id,
    targetType: "Meeting",
    targetId: row.id,
  });

  revalidatePath("/calisma-grubum");
  revalidatePath("/panel");
  revalidatePath("/panolar/grup");
  redirect(`/toplanti/${row.id}`);
}

export async function removeMeeting(id: string): Promise<void> {
  const user = await requireActiveUser();
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting || meeting.deletedAt) redirect("/calisma-grubum");

  const canRemove =
    isAdmin(user) ||
    (meeting.createdById === user.id && meeting.groupId === user.groupId);
  if (!canRemove) await redirectUnauthorized();

  await prisma.meeting.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: "MEETING_REMOVED",
    actorId: user.id,
    targetType: "Meeting",
    targetId: id,
  });

  revalidatePath("/calisma-grubum");
  redirect("/calisma-grubum?tab=toplantilar");
}
