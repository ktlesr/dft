"use server";

import { KpiMetricCode, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser, requireAdmin } from "@/lib/current-user";
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
import { FIXED_KPI_CODES } from "@/lib/kpi/constants";

// Tip ve başlangıç sabiti `form-state.ts`'e taşındı; Next.js 16 `"use server"`
// modülünden non-async export'u yasakladığı için.
//
// ÖNEMLİ: Buradan `export type { KpiFormState }` re-export'u YAPMIYORUZ.
// Turbopack o pattern'i runtime'da değer referansı olarak çözdüğü için
// "KpiFormState is not defined" hatası fırlatıyor (.next/server/chunks/ssr/
// _0onha0p._.js'de görüldü). Tüketici dosyalar tipi doğrudan
// `./form-state`'den import etsin.
import type { KpiFormState } from "./form-state";

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

function decimalFromAdminForm(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^-?\d+([.,]\d+)?$/.test(raw)) return null;
  return new Prisma.Decimal(raw.replace(/,/g, "."));
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
  revalidatePath("/yonetim/kpi-hedefleri");
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

/**
 * Sabit KPI'lar için grup hedef değerini set eder (moderator için kendi
 * grubunda). Action gövdesi try/catch ile sarmalandı: Prisma veya Decimal
 * fırlatırsa generic "Server Components render error" yerine kullanıcıya
 * görünür `state.message` döner ve dialog açık kalır → "tekrar dene"
 * tam-sayfa hatası yaşanmaz. Gerçek hata server console'a düşer.
 */
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

  // Metric code'un gerçekten Prisma enum'unda olduğunu doğrula — schema
  // sadece "min 1 char" diyor; geçersiz değer Prisma'da TypeError fırlatır.
  if (!FIXED_KPI_CODES.includes(metricCode as (typeof FIXED_KPI_CODES)[number])) {
    return { ok: false, message: "Geçersiz metrik kodu." };
  }

  let targetValue;
  try {
    targetValue = toDecimal(input.targetValue);
    if (!targetValue) {
      return { ok: false, errors: { targetValue: ["Hedef değer zorunludur."] } };
    }
  } catch (e) {
    console.error("[setFixedKpiTarget] toDecimal failed", {
      raw: input.targetValue,
      error: (e as Error)?.message,
    });
    return { ok: false, message: "Sayısal değer çözümlenemedi. Yalnızca rakam girin (örn. 10000)." };
  }

  const targetDate = new Date();

  try {
    const existing = await prisma.kpiFixedTarget.findUnique({
      where: { groupId_metricCode: { groupId, metricCode } },
    });

    const baselineValue = existing?.baselineValue ?? targetValue;
    const baselineDate = existing?.baselineDate ?? targetDate;

    await prisma.kpiFixedTarget.upsert({
      where: { groupId_metricCode: { groupId, metricCode } },
      update: { targetValue, targetDate, baselineValue, baselineDate },
      create: { groupId, metricCode, targetValue, targetDate, baselineValue, baselineDate },
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
  } catch (e) {
    // Prisma / DB hatası: server log'una detay düş, kullanıcıya temiz mesaj.
    const err = e as { code?: string; message?: string };
    console.error("[setFixedKpiTarget] DB write failed", {
      groupId,
      metricCode,
      targetValue: targetValue?.toString(),
      code: err?.code,
      message: err?.message,
    });
    return {
      ok: false,
      message: "Hedef kaydedilemedi. Lütfen tekrar deneyin; sorun devam ederse yöneticiye bildirin.",
    };
  }

  revalidatePath("/calisma-grubum");
  revalidatePath("/kpi");
  return { ok: true, message: "Hedef başarıyla güncellendi." };
}

export async function adminUpdateFixedKpiTarget(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  const groupId = String(fd.get("groupId") ?? "");
  const metricCode = String(fd.get("metricCode") ?? "") as KpiMetricCode;
  const intent = String(fd.get("intent") ?? "update");

  if (!groupId || !FIXED_KPI_CODES.includes(metricCode as (typeof FIXED_KPI_CODES)[number])) {
    return;
  }

  const groupExists = await prisma.group.count({ where: { id: groupId } });
  if (groupExists === 0) return;

  const now = new Date();
  const baselineValue = intent === "reset" ? new Prisma.Decimal(0) : decimalFromAdminForm(fd.get("baselineValue"));
  const targetValue = intent === "reset" ? new Prisma.Decimal(0) : decimalFromAdminForm(fd.get("targetValue"));
  if (!baselineValue || !targetValue) return;

  await prisma.kpiFixedTarget.upsert({
    where: { groupId_metricCode: { groupId, metricCode } },
    update: {
      baselineValue,
      baselineDate: now,
      targetValue,
      targetDate: now,
    },
    create: {
      groupId,
      metricCode,
      baselineValue,
      baselineDate: now,
      targetValue,
      targetDate: now,
    },
  });

  await audit({
    action: "KPI_FIXED_TARGET_SET",
    actorId: user.id,
    targetType: "KpiFixedTarget",
    targetId: `${groupId}:${metricCode}`,
    metadata: {
      source: "admin_panel",
      intent,
      groupId,
      metricCode,
      baselineValue: baselineValue.toString(),
      targetValue: targetValue.toString(),
    },
  });

  revalidateKpiPages();
}

export async function adminUpdateCustomKpiTargets(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  const kpiId = String(fd.get("kpiId") ?? "");
  const intent = String(fd.get("intent") ?? "update");
  if (!kpiId) return;

  const row = await prisma.kpiCustom.findUnique({
    where: { id: kpiId },
    select: {
      id: true,
      baselineValue: true,
      targetValue: true,
      deletedAt: true,
    },
  });
  if (!row || row.deletedAt) return;

  const baselineValue = intent === "reset" ? new Prisma.Decimal(0) : decimalFromAdminForm(fd.get("baselineValue"));
  const targetValue = intent === "reset" ? new Prisma.Decimal(0) : decimalFromAdminForm(fd.get("targetValue"));
  if (!baselineValue || !targetValue) return;

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.kpiCustom.update({
      where: { id: row.id },
      data: {
        baselineValue,
        baselineDate: now,
        targetValue,
        targetDate: now,
      },
    });

    if (row.baselineValue?.toString() !== baselineValue.toString()) {
      await tx.kpiBaselineHistory.create({
        data: {
          kpiId: row.id,
          field: "TARGET_VALUE",
          oldValue: row.baselineValue?.toString() ?? undefined,
          newValue: baselineValue.toString(),
          changedById: user.id,
          reason: intent === "reset" ? "Admin panelinden baseline sifirlandi." : "Admin panelinden baseline degistirildi.",
        },
      });
    }

    if (row.targetValue?.toString() !== targetValue.toString()) {
      await tx.kpiCustomRevision.create({
        data: {
          kpiId: row.id,
          field: "TARGET_VALUE",
          oldValue: row.targetValue?.toString() ?? undefined,
          newValue: targetValue.toString(),
          changedById: user.id,
          reason: intent === "reset" ? "Admin panelinden hedef sifirlandi." : "Admin panelinden hedef degistirildi.",
        },
      });
    }
  });

  await audit({
    action: "KPI_CUSTOM_REVISED",
    actorId: user.id,
    targetType: "KpiCustom",
    targetId: row.id,
    metadata: {
      source: "admin_panel",
      intent,
      baselineValue: baselineValue.toString(),
      targetValue: targetValue.toString(),
    },
  });

  revalidateKpiPages();
}
