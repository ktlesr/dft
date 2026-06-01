"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { storeAttachments, UploadError } from "@/lib/upload";
import { reportTemplateSchema, type ReportTemplateFormState } from "./schemas";

const TEMPLATE_MIME = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type { ReportTemplateFormState } from "./schemas";

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function updateReportTemplate(
  id: string,
  _prev: ReportTemplateFormState,
  fd: FormData,
): Promise<ReportTemplateFormState> {
  const user = await requireAdmin();
  const row = await prisma.reportTemplate.findUnique({ where: { id } });
  if (!row || row.deletedAt) return { ok: false, message: "Şablon bulunamadı." };

  const parsed = reportTemplateSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description"),
    scope: fd.get("scope"),
    targetGroupIds: fd.getAll("targetGroupIds").map((v) => String(v)),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const files = filesFrom(fd);
  for (const file of files) {
    if (!TEMPLATE_MIME.has(file.type)) {
      return { ok: false, message: "Yalnızca docx, xlsx, pptx veya pdf dosyaları yüklenebilir." };
    }
  }

  try {
    await storeAttachments({
      files,
      uploadedById: user.id,
      owner: { reportTemplateId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: "Dosya yükleme başarısız oldu." };
    throw e;
  }

  await prisma.reportTemplate.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scope: parsed.data.scope,
      targetGroupIds: parsed.data.scope === "GROUPS" ? parsed.data.targetGroupIds : [],
    },
  });
  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "ReportTemplate", targetId: id });
  revalidatePath("/yonetim/sablonlar");
  revalidatePath("/calisma-grubum");
  return { ok: true, message: "Şablon başarıyla güncellendi." };
}

function filesFrom(fd: FormData): File[] {
  return fd.getAll("attachments").filter((v): v is File => v instanceof File && v.size > 0);
}

export async function createReportTemplate(
  _prev: ReportTemplateFormState,
  fd: FormData,
): Promise<ReportTemplateFormState> {
  const user = await requireAdmin();

  const parsed = reportTemplateSchema.safeParse({
    title: fd.get("title"),
    description: fd.get("description"),
    scope: fd.get("scope"),
    targetGroupIds: fd.getAll("targetGroupIds").map((v) => String(v)),
  });
  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error) };
  }

  const files = filesFrom(fd);
  if (files.length === 0) {
    return { ok: false, message: "En az bir şablon dosyası yükleyin." };
  }

  for (const file of files) {
    if (!TEMPLATE_MIME.has(file.type)) {
      return { ok: false, message: "Yalnızca docx, xlsx, pptx veya pdf dosyaları yüklenebilir." };
    }
  }

  const row = await prisma.reportTemplate.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scope: parsed.data.scope,
      targetGroupIds: parsed.data.scope === "GROUPS" ? parsed.data.targetGroupIds : [],
      createdById: user.id,
    },
  });

  try {
    await storeAttachments({
      files,
      uploadedById: user.id,
      owner: { reportTemplateId: row.id },
    });
  } catch (e) {
    await prisma.reportTemplate.delete({ where: { id: row.id } });
    if (e instanceof UploadError) {
      return { ok: false, message: "Dosya yükleme başarısız oldu. Dosyaları kontrol edip tekrar deneyin." };
    }
    throw e;
  }

  await audit({
    action: "REPORT_TEMPLATE_CREATED",
    actorId: user.id,
    targetType: "ReportTemplate",
    targetId: row.id,
    metadata: { scope: row.scope, targetGroupCount: row.targetGroupIds.length },
  });

  revalidatePath("/yonetim/sablonlar");
  revalidatePath("/calisma-grubum");
  return { ok: true, message: "Şablon başarıyla eklendi." };
}
