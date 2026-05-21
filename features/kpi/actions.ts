"use server";

import { KpiMetricCode, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  canChangeKpiBaseline,
  canCreateOrApproveKpi,
  canReviseKpi,
  type SessionUser,
} from "@/lib/rbac";
import {
  MAX_ATTACHMENTS_PER_REQUEST,
  UploadError,
  storeAttachments,
} from "@/lib/upload";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";
import {
  completeCustomKpiSchema,
  createCustomKpiSchema,
  reviseCustomKpiBaselineSchema,
  reviseCustomKpiTargetSchema,
  setCustomKpiApprovalSchema,
  setFixedKpiTargetSchema,
} from "./schemas";

export type KpiFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const KPI_FORM_INITIAL: KpiFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function createCustomKpi(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  if (!user.groupId) {
    return { ok: false, message: "KPI girmek için bir çalışma grubuna atanmalısınız." };
  }
  if (!canCreateOrApproveKpi(user, user.groupId)) {
    return { ok: false, message: "Yeni KPI girişi sadece moderatör rolüne açıktır." };
  }

  const parsed = createCustomKpiSchema.safeParse({
    name: fd.get("name"),
    description: fd.get("description"),
    targetValue: fd.get("targetValue"),
    assigneeType: fd.get("assigneeType"),
    assigneeUserIds: fd
      .getAll("assigneeUserIds")
      .filter((v): v is string => typeof v === "string" && v.length > 0),
    assigneeGroupId: fd.get("assigneeGroupId"),
  });

  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const groupId = user.groupId;
  const input = parsed.data;

  if (input.assigneeType !== "GROUP") {
    const targetUsers = input.assigneeUserIds;
    if (targetUsers.length > 0) {
      const count = await prisma.user.count({
        where: { id: { in: targetUsers }, groupId, status: "ACTIVE" },
      });
      if (count !== targetUsers.length) {
        return { ok: false, errors: { assigneeUserIds: ["Seçilen sorumlular gruba ait olmalı."] } };
      }
    }
  } else if (input.assigneeGroupId !== groupId) {
    return { ok: false, errors: { assigneeGroupId: ["Sadece kendi grubunuzu seçebilirsiniz."] } };
  }

  const row = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const created = await tx.kpiCustom.create({
      data: {
        groupId,
        name: input.name,
        description: input.description ?? null,
        baselineValue: toDecimal(input.targetValue),
        baselineDate: now,
        targetValue: toDecimal(input.targetValue),
        targetDate: now,
        createdById: user.id,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        approvedById: user.id,
        approvedAt: now,
      },
    });

    if (input.assigneeType === "GROUP") {
      await tx.kpiCustomAssignee.create({
        data: {
          kpiId: created.id,
          assigneeType: "GROUP",
          groupId,
        },
      });
    } else {
      await tx.kpiCustomAssignee.createMany({
        data: input.assigneeUserIds.map((userId) => ({
          kpiId: created.id,
          assigneeType: input.assigneeType,
          userId,
        })),
      });
    }

    return created;
  });

  await audit({
    action: "KPI_CUSTOM_CREATED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: {
      groupId,
      assigneeType: input.assigneeType,
    },
  });
  await notifyAdminsAboutNonAdminActivity({
    actorId: user.id,
    actorRoles: user.roles,
    actorName: user.name,
    actorEmail: user.email,
    kind: "kpi_custom_admin",
    title: "Yeni KPI oluşturuldu",
    body: `${user.name?.trim() || user.email} · ${input.name}`,
    link: "/kpi",
  });

  revalidatePath("/kpi");
  revalidatePath("/kpi/yeni");
  revalidatePath("/calisma-grubum");
  return { ok: true, message: "KPI kaydı oluşturuldu ve yayına alındı." };
}

export async function setCustomKpiApproval(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  const parsed = setCustomKpiApprovalSchema.safeParse({
    kpiId: fd.get("kpiId"),
    decision: fd.get("decision"),
    reason: fd.get("reason"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await requireKpiForGroup(user, parsed.data.kpiId);
  if (!canCreateOrApproveKpi(user, row.groupId)) {
    return { ok: false, message: "Bu KPI için onay yetkiniz yok." };
  }

  const approvalStatus = parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.kpiCustom.update({
    where: { id: row.id },
    data: {
      approvalStatus,
      approvedById: user.id,
      approvedAt: new Date(),
      status: parsed.data.decision === "APPROVE" && row.status === "DRAFT" ? "ACTIVE" : row.status,
    },
  });

  await audit({
    action: parsed.data.decision === "APPROVE" ? "KPI_CUSTOM_APPROVED" : "KPI_CUSTOM_REJECTED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: { reason: parsed.data.reason ?? null },
  });

  await notifyKpiCreatedByAndAssignees({
    kpiId: row.id,
    actorId: user.id,
    title: parsed.data.decision === "APPROVE" ? "KPI onaylandı" : "KPI reddedildi",
    body:
      parsed.data.decision === "APPROVE"
        ? `${row.name} KPI kaydı onaylandı.`
        : `${row.name} KPI kaydı reddedildi.${parsed.data.reason ? ` Neden: ${parsed.data.reason}` : ""}`,
  });

  revalidateKpiPages();
  return {
    ok: true,
    message: parsed.data.decision === "APPROVE" ? "KPI onaylandı." : "KPI reddedildi.",
  };
}

export async function reviseCustomKpiTarget(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  const parsed = reviseCustomKpiTargetSchema.safeParse({
    kpiId: fd.get("kpiId"),
    targetValue: fd.get("targetValue"),
    reason: fd.get("reason"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await requireKpiForGroup(user, parsed.data.kpiId);
  if (!canReviseKpi(user, row.groupId)) {
    return { ok: false, message: "Bu KPI için hedef revizyon yetkiniz yok." };
  }

  const nextValue = toDecimal(parsed.data.targetValue)!;

  await prisma.$transaction(async (tx) => {
    await tx.kpiCustom.update({
      where: { id: row.id },
      data: {
        targetValue: nextValue,
      },
    });

    if (row.targetValue?.toString() !== nextValue.toString()) {
      await tx.kpiCustomRevision.create({
        data: {
          kpiId: row.id,
          field: "TARGET_VALUE",
          oldValue: row.targetValue?.toString() ?? undefined,
          newValue: nextValue.toString(),
          changedById: user.id,
          reason: parsed.data.reason ?? null,
        },
      });
    }
  });

  await audit({
    action: "KPI_CUSTOM_REVISED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: { type: "target", reason: parsed.data.reason ?? null },
  });

  await notifyKpiCreatedByAndAssignees({
    kpiId: row.id,
    actorId: user.id,
    title: "KPI hedefi revize edildi",
    body: parsed.data.reason ?? "Hedef değer güncellendi.",
  });

  revalidateKpiPages();
  return { ok: true, message: "KPI hedef değeri revize edildi." };
}

export async function reviseCustomKpiBaseline(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  const parsed = reviseCustomKpiBaselineSchema.safeParse({
    kpiId: fd.get("kpiId"),
    baselineValue: fd.get("baselineValue"),
    reason: fd.get("reason"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };
  if (!canChangeKpiBaseline(user)) {
    return { ok: false, message: "Baseline değiştirme yetkisi sadece admin rolündedir." };
  }

  const row = await requireKpiForGroup(user, parsed.data.kpiId);
  const nextValue = toDecimal(parsed.data.baselineValue)!;

  await prisma.$transaction(async (tx) => {
    await tx.kpiCustom.update({
      where: { id: row.id },
      data: {
        baselineValue: nextValue,
      },
    });

    if (row.baselineValue?.toString() !== nextValue.toString()) {
      await tx.kpiBaselineHistory.create({
        data: {
          kpiId: row.id,
          field: "TARGET_VALUE",
          oldValue: row.baselineValue?.toString() ?? undefined,
          newValue: nextValue.toString(),
          changedById: user.id,
          reason: parsed.data.reason ?? null,
        },
      });
    }
  });

  await audit({
    action: "KPI_BASELINE_CHANGED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: { reason: parsed.data.reason ?? null },
  });

  await notifyGroupModeratorsAndAdmins({
    groupId: row.groupId,
    actorId: user.id,
    kind: "kpi",
    title: "KPI baseline güncellendi",
    body: parsed.data.reason ?? "Baseline deger admin tarafindan revize edildi.",
    link: "/kpi/yeni",
  });
  await notifyKpiCreatedByAndAssignees({
    kpiId: row.id,
    actorId: user.id,
    title: "KPI baseline güncellendi",
    body: parsed.data.reason ?? "Baseline deger admin tarafindan revize edildi.",
  });

  revalidateKpiPages();
  return { ok: true, message: "KPI baseline değeri güncellendi." };
}

export async function completeCustomKpi(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  const parsed = completeCustomKpiSchema.safeParse({
    kpiId: fd.get("kpiId"),
    completionType: fd.get("completionType"),
    actualValue: fd.get("actualValue"),
    note: fd.get("note"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await requireKpiForGroup(user, parsed.data.kpiId);
  if (!canReviseKpi(user, row.groupId)) {
    return { ok: false, message: "Bu KPI için tamamlama yetkiniz yok." };
  }
  if (row.approvalStatus !== "APPROVED") {
    return { ok: false, message: "KPI tamamlanmadan önce onaylanmış olmalı." };
  }

  const actualValue = toDecimal(parsed.data.actualValue)!;
  const evidenceType = parsed.data.completionType;
  const nextStatus = evidenceType === "OVERACHIEVED" ? "OVERACHIEVED" : "COMPLETED";
  const files = fd.getAll("attachments").filter((v): v is File => v instanceof File);
  if (files.length < 1) {
    return { ok: false, message: "Tamamlama için en az bir kanıt doküman yüklenmelidir." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.kpiCustom.update({
        where: { id: row.id },
        data: {
          actualValue,
          status: nextStatus,
          completedAt: new Date(),
        },
      });
    });

    const uploaded = await storeAttachments({
      files,
      uploadedById: user.id,
      owner: {},
    });

    await prisma.kpiCustomEvidence.createMany({
      data: uploaded.map((item) => ({
        kpiId: row.id,
        attachmentId: item.id,
        evidenceType,
        uploadedById: user.id,
      })),
    });
  } catch (error) {
    if (error instanceof UploadError) {
      const msg =
        error.code === "too_many"
          ? `En fazla ${MAX_ATTACHMENTS_PER_REQUEST} dosya yükleyebilirsiniz.`
          : "Kanıt dosyaları yüklenemedi.";
      return { ok: false, message: msg };
    }
    throw error;
  }

  await audit({
    action: "KPI_EVIDENCE_ADDED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: { completionType: evidenceType, note: parsed.data.note ?? null },
  });

  await notifyKpiCreatedByAndAssignees({
    kpiId: row.id,
    actorId: user.id,
    title:
      evidenceType === "OVERACHIEVED"
        ? "KPI hedef üstü tamamlandı"
        : "KPI başarılı tamamlandı",
    body: parsed.data.note ?? "KPI tamamlama kaydı yapıldı ve kanıt eklendi.",
  });

  revalidateKpiPages();
  return { ok: true, message: "KPI tamamlanma kaydı ve kanıtları eklendi." };
}

function toDecimal(raw: string | undefined) {
  if (!raw) return null;
  // `optionalDecimal` Türkçe locale uyumu için virgül ondalık ayracını
  // da kabul ediyor (`10,5`). Decimal.js sadece nokta ayraçını parse
  // ediyor → virgülü normalize ediyoruz. Aksi halde `Invalid argument`
  // fırlatıp action 500 dönüyordu (üretimde "Server Components render
  // error" olarak görünür).
  const normalized = raw.replace(/,/g, ".");
  return new Prisma.Decimal(normalized);
}

async function requireKpiForGroup(user: SessionUser, kpiId: string) {
  const row = await prisma.kpiCustom.findUnique({
    where: { id: kpiId },
    select: {
      id: true,
      name: true,
      groupId: true,
      targetValue: true,
      targetDate: true,
      baselineValue: true,
      baselineDate: true,
      status: true,
      approvalStatus: true,
    },
  });
  if (!row || !row.groupId) {
    throw new Error("KPI kaydı bulunamadı.");
  }
  if (!user.roles.includes("ADMIN") && user.groupId !== row.groupId) {
    throw new Error("Bu KPI için erişim yetkiniz yok.");
  }
  return row;
}

function sameDate(a: Date | null, b: Date | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function revalidateKpiPages() {
  revalidatePath("/kpi");
  revalidatePath("/kpi/yeni");
  revalidatePath("/calisma-grubum");
}

async function notifyKpiCreatedByAndAssignees({
  kpiId,
  actorId,
  title,
  body,
}: {
  kpiId: string;
  actorId: string;
  title: string;
  body: string;
}) {
  const row = await prisma.kpiCustom.findUnique({
    where: { id: kpiId },
    select: {
      createdById: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!row) return;

  const targetUserIds = new Set<string>();
  targetUserIds.add(row.createdById);
  for (const assignee of row.assignees) {
    if (assignee.userId) targetUserIds.add(assignee.userId);
  }
  targetUserIds.delete(actorId);

  if (targetUserIds.size === 0) return;
  await prisma.notification.createMany({
    data: Array.from(targetUserIds).map((userId) => ({
      userId,
      kind: "kpi",
      title,
      body,
      link: "/kpi/yeni",
    })),
  });
}

async function notifyGroupModeratorsAndAdmins({
  groupId,
  actorId,
  kind,
  title,
  body,
  link,
}: {
  groupId: string;
  actorId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
}) {
  const recipients = await prisma.user.findMany({
    where: {
      id: { not: actorId },
      status: "ACTIVE",
      OR: [
        { roles: { some: { role: "ADMIN" } } },
        { groupId, roles: { some: { role: "MODERATOR" } } },
      ],
    },
    select: { id: true },
  });
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      userId: u.id,
      kind,
      title,
      body,
      link,
    })),
  });
}

export async function setFixedKpiTarget(
  _prev: KpiFormState,
  fd: FormData,
): Promise<KpiFormState> {
  const user = await requireActiveUser();
  const groupId = fd.get("groupId") as string;
  if (!groupId) {
    return { ok: false, message: "Çalışma grubu bilgisi eksik." };
  }
  if (!canCreateOrApproveKpi(user, groupId)) {
    return { ok: false, message: "Bu çalışma grubu için hedef belirleme yetkiniz yok." };
  }

  const parsed = setFixedKpiTargetSchema.safeParse({
    metricCode: fd.get("metricCode"),
    targetValue: fd.get("targetValue"),
  });

  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const input = parsed.data;
  const metricCode = input.metricCode as KpiMetricCode;

  const targetValue = toDecimal(input.targetValue)!;
  const targetDate = new Date();

  const existing = await prisma.kpiFixedTarget.findUnique({
    where: {
      groupId_metricCode: {
        groupId,
        metricCode,
      },
    },
  });

  const baselineValue = existing?.baselineValue ?? targetValue;
  const baselineDate = existing?.baselineDate ?? targetDate;

  await prisma.kpiFixedTarget.upsert({
    where: {
      groupId_metricCode: {
        groupId,
        metricCode,
      },
    },
    update: {
      targetValue,
      targetDate,
      baselineValue,
      baselineDate,
    },
    create: {
      groupId,
      metricCode,
      targetValue,
      targetDate,
      baselineValue,
      baselineDate,
    },
  });

  await audit({
    action: "KPI_FIXED_TARGET_SET",
    actorId: user.id,
    targetType: "KpiFixedTarget",
    targetId: `${groupId}:${metricCode}`,
    metadata: {
      groupId,
      metricCode,
      targetValue: targetValue.toString(),
      targetDate: targetDate.toISOString(),
      baselineValue: baselineValue?.toString() ?? null,
      baselineDate: baselineDate?.toISOString() ?? null,
    },
  });

  revalidatePath("/calisma-grubum");
  revalidatePath("/kpi");
  return { ok: true, message: "Hedef başarıyla güncellendi." };
}
