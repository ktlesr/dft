"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateReport, isAdmin } from "@/lib/rbac";
import { storeAttachments, UploadError } from "@/lib/upload";
import { reportSchema } from "./schemas";

export type ReportFormState = {
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

export async function createReport(
  _prev: ReportFormState,
  fd: FormData,
): Promise<ReportFormState> {
  const user = await requireActiveUser();
  if (!user.groupId || !canCreateReport(user, user.groupId)) {
    return { ok: false, message: "Rapor oluşturma yetkiniz yok." };
  }

  const parsed = reportSchema.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    periodStart: fd.get("periodStart"),
    periodEnd: fd.get("periodEnd"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // body/outputs are no longer collected from the form — the rapor flow
  // was simplified to "summary + attachments" only. body is nullable in
  // the DB (Faz B migration), so we simply omit it.
  const row = await prisma.report.create({
    data: {
      groupId: user.groupId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      periodStart: parsed.data.periodStart ?? null,
      periodEnd: parsed.data.periodEnd ?? null,
      summary: parsed.data.summary ?? null,
      body: null,
      outputs: null,
      authorId: user.id,
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { reportId: row.id },
    });
  } catch (e) {
    await prisma.report.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  // Notify group members.
  const members = await prisma.user.findMany({
    where: { groupId: user.groupId, status: "ACTIVE", id: { not: user.id } },
    select: { id: true },
  });
  if (members.length > 0) {
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.id,
        kind: "report",
        title: "Yeni grup raporu",
        body: parsed.data.title,
        link: `/rapor/${row.id}`,
      })),
    });
  }

  await audit({
    action: "REPORT_CREATED",
    actorId: user.id,
    targetType: "Report",
    targetId: row.id,
    metadata: { kind: parsed.data.kind },
  });

  revalidatePath("/calisma-grubum");
  redirect(`/rapor/${row.id}`);
}

export async function removeReport(id: string): Promise<void> {
  const user = await requireActiveUser();
  const row = await prisma.report.findUnique({ where: { id } });
  if (!row || row.deletedAt) redirect("/calisma-grubum");
  const canRemove =
    isAdmin(user) || (row.authorId === user.id && row.groupId === user.groupId);
  if (!canRemove) await redirectUnauthorized();

  await prisma.report.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ action: "REPORT_UPDATED", actorId: user.id, targetType: "Report", targetId: id, metadata: { removed: true } });
  revalidatePath("/calisma-grubum");
  redirect("/calisma-grubum");
}
