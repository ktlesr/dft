"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type KpiMetricCode, type KpiSourceType, type Role } from "@prisma/client";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canEditOwnRecord } from "@/lib/rbac";
import { MAX_ATTACHMENTS_PER_REQUEST, UploadError, storeAttachments } from "@/lib/upload";
import { sendMail } from "@/lib/mail";
import { writeKpiMetricEvent } from "@/lib/kpi/events";
import { KPI_EVENT_ATTENDED_ROLE, KPI_EVENT_ORGANIZED_ROLE } from "@/lib/kpi/constants";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";
import { z } from "zod";

import {
  contentSchema,
  disseminationSchema,
  eventSchema,
  projectApplicationSchema,
  projectIdeaSchema,
  stakeholderSchema,
  successfulProjectSchema,
  trainingSchema,
} from "./schemas";
import { isRecordType, type RecordTypeSlug } from "./types";

export type RecordFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: RecordFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function uploadMessage(err: UploadError): string {
  switch (err.code) {
    case "too_large":
      return "Bir dosya izin verilen boyutu aşıyor.";
    case "mime_not_allowed":
      return "Bir dosyanın türü desteklenmiyor.";
    case "too_many":
      return `En fazla ${MAX_ATTACHMENTS_PER_REQUEST} dosya yükleyebilirsiniz.`;
    default:
      return "Dosya yükleme başarısız.";
  }
}

function filesFromFormData(fd: FormData): File[] {
  const raw = fd.getAll("attachments");
  return raw.filter((v): v is File => v instanceof File);
}

function decimalOrUndef(v: unknown): Prisma.Decimal | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  try {
    return new Prisma.Decimal(v as string);
  } catch {
    return undefined;
  }
}

/**
 * Faz 8: yeni `memberFunction` (3 seçenek) ile legacy `kind` enum
 * (2 seçenek) arasındaki köprü. Yeni form `memberFunction` yazar; legacy
 * `kind` kolonu eski rollere geriye dönük uyumluluk için doldurulur.
 */
function legacyKindForMemberFunction(
  fn: "BIREYSEL" | "DFT_ILE_BIRLIKTE" | "DANISMANLIK",
): "BIREYSEL" | "DFT_ILE_BIRLIKTE" {
  return fn === "DFT_ILE_BIRLIKTE" ? "DFT_ILE_BIRLIKTE" : "BIREYSEL";
}

async function trackKpiEvent(input: {
  metricCode: KpiMetricCode;
  sourceType: KpiSourceType;
  sourceId: string;
  actorUserId: string;
  groupId: string | null;
  delta: 1 | -1;
}) {
  await writeKpiMetricEvent(input);
}

function actorLabel(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

async function notifyAdminsForRecordCreate(input: {
  user: { id: string; roles: readonly Role[]; name: string | null; email: string };
  recordLabel: string;
  recordTitle: string;
  link: string;
}) {
  await notifyAdminsAboutNonAdminActivity({
    actorId: input.user.id,
    actorRoles: input.user.roles,
    actorName: input.user.name,
    actorEmail: input.user.email,
    kind: "record_admin",
    title: "Yeni kayıt eklendi",
    body: `${actorLabel(input.user)} · ${input.recordLabel}: ${input.recordTitle}`,
    link: input.link,
  });
}

/* ────────── owner-only helpers used by update/delete ────────── */

function projectApplicationMetricCode(memberFunction: string | null | undefined): KpiMetricCode {
  return memberFunction === "DANISMANLIK"
    ? "KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL"
    : "KPI_PROJECT_APPLICATION_DIRECT_TOTAL";
}

function eventMetricCode(role: string | null | undefined): KpiMetricCode | null {
  if (role === KPI_EVENT_ATTENDED_ROLE) return "KPI_EVENT_ATTENDED_TOTAL";
  if (role === KPI_EVENT_ORGANIZED_ROLE) return "KPI_EVENT_ORGANIZED_TOTAL";
  return null;
}

async function mustOwnOr403<T extends { ownerId: string; deletedAt: Date | null } | null>(
  row: T,
  userId: string,
  userRoles: readonly string[],
) {
  if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
  if (
    !canEditOwnRecord(
      { id: userId, email: "", name: "", image: null, status: "ACTIVE", roles: userRoles as never, groupId: null, groupCode: null },
      row.ownerId,
    )
  ) {
    await redirectUnauthorized();
  }
}

/* ══════════════════════════════════════════════════════════════════
 * 1) Proje Başvurusu (Faz 8)
 * ══════════════════════════════════════════════════════════════════*/

export async function createProjectApplication(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = projectApplicationSchema.safeParse({
    projectName: fd.get("projectName"),
    fundCategory: fd.get("fundCategory"),
    fundSubType: fd.get("fundSubType"),
    grantProvider: fd.get("grantProvider"),
    programName: fd.get("programName"),
    applicantOrg: fd.get("applicantOrg"),
    applicantRole: fd.get("applicantRole"),
    budget: fd.get("budget"),
    requestedSupport: fd.get("requestedSupport"),
    currency: fd.get("currency"),
    applicationDate: fd.get("applicationDate"),
    isPhased: fd.get("isPhased"),
    applicationPhase: fd.get("applicationPhase"),
    memberFunction: fd.get("memberFunction"),
    partnerMemberIds: fd.getAll("partnerMemberIds").map(String),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.projectApplicationRecord.create({
    data: {
      ownerId: user.id,
      projectName: parsed.data.projectName,
      // Legacy köprüleri — eski sorgular kırılmasın diye doldurulur.
      program: parsed.data.programName ?? null,
      callName: null,
      kind: legacyKindForMemberFunction(parsed.data.memberFunction),
      // Yeni Faz 8 alanları
      fundCategory: parsed.data.fundCategory ?? null,
      fundSubType: parsed.data.fundSubType ?? null,
      grantProvider: parsed.data.grantProvider ?? null,
      programName: parsed.data.programName ?? null,
      applicantOrg: parsed.data.applicantOrg ?? null,
      applicantRole: parsed.data.applicantRole ?? null,
      memberFunction: parsed.data.memberFunction,
      budget: decimalOrUndef(parsed.data.budget),
      requestedSupport: decimalOrUndef(parsed.data.requestedSupport),
      currency: parsed.data.currency ?? "TRY",
      applicationDate: parsed.data.applicationDate ?? null,
      isPhased: parsed.data.isPhased,
      applicationPhase: parsed.data.applicationPhase ?? null,
      partnerMemberIds: parsed.data.partnerMemberIds,
      notes: parsed.data.notes ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { projectAppId: row.id },
    });
  } catch (e) {
    await prisma.projectApplicationRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  const metricCode = parsed.data.memberFunction === "DANISMANLIK"
    ? "KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL"
    : "KPI_PROJECT_APPLICATION_DIRECT_TOTAL";

  await trackKpiEvent({
    metricCode,
    sourceType: "PROJECT_APPLICATION",
    sourceId: row.id,
    actorUserId: user.id,
    groupId: user.groupId,
    delta: 1,
  });
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ProjectApplicationRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Proje Başvurusu",
    recordTitle: parsed.data.projectName,
    link: `/kayitlarim/proje-basvurusu/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/proje-basvurusu/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 2) Başarılı Proje (Faz 8)
 * ══════════════════════════════════════════════════════════════════*/

export async function createSuccessfulProject(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = successfulProjectSchema.safeParse({
    projectName: fd.get("projectName"),
    fundCategory: fd.get("fundCategory"),
    fundSubType: fd.get("fundSubType"),
    grantProvider: fd.get("grantProvider"),
    programName: fd.get("programName"),
    applicantOrg: fd.get("applicantOrg"),
    applicantRole: fd.get("applicantRole"),
    totalBudget: fd.get("totalBudget"),
    supportAmount: fd.get("supportAmount"),
    currency: fd.get("currency"),
    applicationDate: fd.get("applicationDate"),
    acceptanceDate: fd.get("acceptanceDate"),
    memberFunction: fd.get("memberFunction"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.successfulProjectRecord.create({
    data: {
      ownerId: user.id,
      projectName: parsed.data.projectName,
      // Legacy köprüler
      program: parsed.data.programName ?? null,
      role: null,
      kind: null,
      // Yeni Faz 8 alanları
      fundCategory: parsed.data.fundCategory ?? null,
      fundSubType: parsed.data.fundSubType ?? null,
      grantProvider: parsed.data.grantProvider ?? null,
      programName: parsed.data.programName ?? null,
      applicantOrg: parsed.data.applicantOrg ?? null,
      applicantRole: parsed.data.applicantRole ?? null,
      memberFunction: parsed.data.memberFunction,
      totalBudget: decimalOrUndef(parsed.data.totalBudget),
      supportAmount: decimalOrUndef(parsed.data.supportAmount),
      currency: parsed.data.currency ?? "TRY",
      applicationDate: parsed.data.applicationDate ?? null,
      // resultDate eski sütun. `acceptanceDate` (Proje Kabul Tarihi) ana yeni
      // alandır; legacy sütun olarak `resultDate`'ı da aynı değerle dolduruyoruz.
      resultDate: parsed.data.acceptanceDate ?? null,
      acceptanceDate: parsed.data.acceptanceDate ?? null,
      summary: parsed.data.summary ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { successProjectId: row.id },
    });
  } catch (e) {
    await prisma.successfulProjectRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await trackKpiEvent({
    metricCode: "KPI_SUCCESSFUL_PROJECT_TOTAL",
    sourceType: "SUCCESSFUL_PROJECT",
    sourceId: row.id,
    actorUserId: user.id,
    groupId: user.groupId,
    delta: 1,
  });
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "SuccessfulProjectRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Başarılı Proje",
    recordTitle: parsed.data.projectName,
    link: `/kayitlarim/basarili-proje/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/basarili-proje/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 3) Proje Fikri (Faz 8)
 * ══════════════════════════════════════════════════════════════════*/

export async function createProjectIdea(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = projectIdeaSchema.safeParse({
    title: fd.get("title"),
    grantProvider: fd.get("grantProvider"),
    potentialProgram: fd.get("potentialProgram"),
    budget: fd.get("budget"),
    currency: fd.get("currency"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.projectIdeaRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      grantProvider: parsed.data.grantProvider ?? null,
      potentialProgram: parsed.data.potentialProgram ?? null,
      budget: decimalOrUndef(parsed.data.budget),
      currency: parsed.data.currency ?? "TRY",
      summary: parsed.data.summary ?? null,
      // stage NOT NULL (default FIKIR). Yeni form aşama sormaz.
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { projectIdeaId: row.id },
    });
  } catch (e) {
    await prisma.projectIdeaRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await trackKpiEvent({
    metricCode: "KPI_PROJECT_IDEA_TOTAL",
    sourceType: "PROJECT_IDEA",
    sourceId: row.id,
    actorUserId: user.id,
    groupId: user.groupId,
    delta: 1,
  });
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ProjectIdeaRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Proje Fikri",
    recordTitle: parsed.data.title,
    link: `/kayitlarim/proje-fikri/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/proje-fikri/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 4) Etkinlik (Faz 8)
 * ══════════════════════════════════════════════════════════════════*/

export async function createEventRecord(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = eventSchema.safeParse({
    name: fd.get("name"),
    organizer: fd.get("organizer"),
    date: fd.get("date"),
    endAt: fd.get("endAt"),
    kind: fd.get("kind"),
    format: fd.get("format"),
    role: fd.get("role"),
    externalUrl: fd.get("externalUrl"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.eventRecord.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      organizer: parsed.data.organizer ?? null,
      // `date` legacy alanı artık başlangıç tarih+saatini taşıyor.
      date: parsed.data.date,
      endAt: parsed.data.endAt ?? null,
      // `kind`, `format`, `role` enum kodlarını string olarak saklarız.
      kind: parsed.data.kind,
      format: parsed.data.format,
      role: parsed.data.role,
      externalUrl: parsed.data.externalUrl ?? null,
      summary: parsed.data.summary ?? null,
      location: null,
      notes: null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { eventId: row.id },
    });
  } catch (e) {
    await prisma.eventRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  if (parsed.data.role === KPI_EVENT_ATTENDED_ROLE) {
    await trackKpiEvent({
      metricCode: "KPI_EVENT_ATTENDED_TOTAL",
      sourceType: "EVENT",
      sourceId: row.id,
      actorUserId: user.id,
      groupId: user.groupId,
      delta: 1,
    });
  }
  if (parsed.data.role === KPI_EVENT_ORGANIZED_ROLE) {
    await trackKpiEvent({
      metricCode: "KPI_EVENT_ORGANIZED_TOTAL",
      sourceType: "EVENT",
      sourceId: row.id,
      actorUserId: user.id,
      groupId: user.groupId,
      delta: 1,
    });
  }
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "EventRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Etkinlik",
    recordTitle: parsed.data.name,
    link: `/kayitlarim/etkinlik/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/etkinlik/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 5) Bilgi Çoğaltımı (legacy — yeni form sunmuyor)
 * ══════════════════════════════════════════════════════════════════*/

export async function createDissemination(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = disseminationSchema.safeParse({
    title: fd.get("title"),
    date: fd.get("date"),
    location: fd.get("location"),
    kind: fd.get("kind"),
    audience: fd.get("audience"),
    participantCount: fd.get("participantCount"),
    relatedTopic: fd.get("relatedTopic"),
    summary: fd.get("summary"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.disseminationRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      date: parsed.data.date,
      location: parsed.data.location ?? null,
      kind: parsed.data.kind ?? null,
      audience: parsed.data.audience ?? null,
      participantCount: parsed.data.participantCount ?? null,
      relatedTopic: parsed.data.relatedTopic ?? null,
      summary: parsed.data.summary ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { disseminationId: row.id },
    });
  } catch (e) {
    await prisma.disseminationRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "DisseminationRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Bilgi Çoğaltımı",
    recordTitle: parsed.data.title,
    link: `/kayitlarim/bilgi-cogaltimi/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/bilgi-cogaltimi/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 6) Eğitim / Sunum (legacy)
 * ══════════════════════════════════════════════════════════════════*/

export async function createTraining(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = trainingSchema.safeParse({
    title: fd.get("title"),
    date: fd.get("date"),
    location: fd.get("location"),
    audience: fd.get("audience"),
    participantCount: fd.get("participantCount"),
    role: fd.get("role"),
    summary: fd.get("summary"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.trainingPresentationRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      date: parsed.data.date,
      location: parsed.data.location ?? null,
      audience: parsed.data.audience ?? null,
      participantCount: parsed.data.participantCount ?? null,
      role: parsed.data.role ?? null,
      summary: parsed.data.summary ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { trainingId: row.id },
    });
  } catch (e) {
    await prisma.trainingPresentationRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "TrainingPresentationRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Eğitim / Sunum",
    recordTitle: parsed.data.title,
    link: `/kayitlarim/egitim-sunum/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/egitim-sunum/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 7) Dijital İçerik (Faz 8)
 * ══════════════════════════════════════════════════════════════════*/

export async function createContentRecord(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = contentSchema.safeParse({
    title: fd.get("title"),
    kind: fd.get("kind"),
    externalUrl: fd.get("externalUrl"),
    tags: fd.get("tags"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.contentRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      kind: parsed.data.kind,
      // `date` NOT NULL — yeni form sormaz; oluşturma zamanını koyarız.
      date: new Date(),
      externalUrl: parsed.data.externalUrl ?? null,
      tags: parsed.data.tags,
      summary: parsed.data.summary ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { contentId: row.id },
    });
  } catch (e) {
    await prisma.contentRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await trackKpiEvent({
    metricCode: "KPI_CONTENT_TOTAL",
    sourceType: "CONTENT",
    sourceId: row.id,
    actorUserId: user.id,
    groupId: user.groupId,
    delta: 1,
  });
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ContentRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Dijital İçerik",
    recordTitle: parsed.data.title,
    link: `/kayitlarim/dokuman-icerik/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/dokuman-icerik/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * 8) Paydaş (Faz 8 — yeni)
 * ══════════════════════════════════════════════════════════════════*/

export async function createStakeholder(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = stakeholderSchema.safeParse({
    fullName: fd.get("fullName"),
    positionTitle: fd.get("positionTitle"),
    kind: fd.get("kind"),
    organization: fd.get("organization"),
    linkedinUrl: fd.get("linkedinUrl"),
    email: fd.get("email"),
    city: fd.get("city"),
    country: fd.get("country"),
    tags: fd.get("tags"),
    description: fd.get("description"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.stakeholderRecord.create({
    data: {
      ownerId: user.id,
      fullName: parsed.data.fullName,
      positionTitle: parsed.data.positionTitle ?? null,
      kind: parsed.data.kind,
      organization: parsed.data.organization ?? null,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      email: parsed.data.email ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country ?? null,
      tags: parsed.data.tags,
      description: parsed.data.description ?? null,
    },
  });

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { stakeholderId: row.id },
    });
  } catch (e) {
    await prisma.stakeholderRecord.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await trackKpiEvent({
    metricCode: "KPI_STAKEHOLDER_TOTAL",
    sourceType: "STAKEHOLDER",
    sourceId: row.id,
    actorUserId: user.id,
    groupId: user.groupId,
    delta: 1,
  });
  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "StakeholderRecord", targetId: row.id });
  await notifyAdminsForRecordCreate({
    user,
    recordLabel: "Paydaş",
    recordTitle: parsed.data.fullName,
    link: `/kayitlarim/paydas/${row.id}`,
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/paydas/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * Soft delete (type-aware)
 * ══════════════════════════════════════════════════════════════════*/

export async function updateProjectApplication(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.projectApplicationRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = projectApplicationSchema.safeParse({
    projectName: fd.get("projectName"),
    fundCategory: fd.get("fundCategory"),
    fundSubType: fd.get("fundSubType"),
    grantProvider: fd.get("grantProvider"),
    programName: fd.get("programName"),
    applicantOrg: fd.get("applicantOrg"),
    applicantRole: fd.get("applicantRole"),
    budget: fd.get("budget"),
    requestedSupport: fd.get("requestedSupport"),
    currency: fd.get("currency"),
    applicationDate: fd.get("applicationDate"),
    isPhased: fd.get("isPhased"),
    applicationPhase: fd.get("applicationPhase"),
    memberFunction: fd.get("memberFunction"),
    partnerMemberIds: fd.getAll("partnerMemberIds").map(String),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { projectAppId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.projectApplicationRecord.update({
    where: { id },
    data: {
      projectName: parsed.data.projectName,
      program: parsed.data.programName ?? null,
      kind: legacyKindForMemberFunction(parsed.data.memberFunction),
      fundCategory: parsed.data.fundCategory ?? null,
      fundSubType: parsed.data.fundSubType ?? null,
      grantProvider: parsed.data.grantProvider ?? null,
      programName: parsed.data.programName ?? null,
      applicantOrg: parsed.data.applicantOrg ?? null,
      applicantRole: parsed.data.applicantRole ?? null,
      memberFunction: parsed.data.memberFunction,
      budget: decimalOrUndef(parsed.data.budget),
      requestedSupport: decimalOrUndef(parsed.data.requestedSupport),
      currency: parsed.data.currency ?? "TRY",
      applicationDate: parsed.data.applicationDate ?? null,
      isPhased: parsed.data.isPhased,
      applicationPhase: parsed.data.applicationPhase ?? null,
      partnerMemberIds: parsed.data.partnerMemberIds,
      notes: parsed.data.notes ?? null,
    },
  });

  const oldMetricCode = projectApplicationMetricCode(row?.memberFunction);
  const newMetricCode = projectApplicationMetricCode(parsed.data.memberFunction);
  if (oldMetricCode !== newMetricCode) {
    await trackKpiEvent({
      metricCode: oldMetricCode,
      sourceType: "PROJECT_APPLICATION",
      sourceId: id,
      actorUserId: user.id,
      groupId: user.groupId,
      delta: -1,
    });
    await trackKpiEvent({
      metricCode: newMetricCode,
      sourceType: "PROJECT_APPLICATION",
      sourceId: id,
      actorUserId: user.id,
      groupId: user.groupId,
      delta: 1,
    });
  }
  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "ProjectApplicationRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/proje-basvurusu/${id}`);
  redirect(`/kayitlarim/proje-basvurusu/${id}`);
}

export async function updateSuccessfulProject(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.successfulProjectRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = successfulProjectSchema.safeParse({
    projectName: fd.get("projectName"),
    fundCategory: fd.get("fundCategory"),
    fundSubType: fd.get("fundSubType"),
    grantProvider: fd.get("grantProvider"),
    programName: fd.get("programName"),
    applicantOrg: fd.get("applicantOrg"),
    applicantRole: fd.get("applicantRole"),
    totalBudget: fd.get("totalBudget"),
    supportAmount: fd.get("supportAmount"),
    currency: fd.get("currency"),
    applicationDate: fd.get("applicationDate"),
    acceptanceDate: fd.get("acceptanceDate"),
    memberFunction: fd.get("memberFunction"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { successProjectId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.successfulProjectRecord.update({
    where: { id },
    data: {
      projectName: parsed.data.projectName,
      program: parsed.data.programName ?? null,
      fundCategory: parsed.data.fundCategory ?? null,
      fundSubType: parsed.data.fundSubType ?? null,
      grantProvider: parsed.data.grantProvider ?? null,
      programName: parsed.data.programName ?? null,
      applicantOrg: parsed.data.applicantOrg ?? null,
      applicantRole: parsed.data.applicantRole ?? null,
      memberFunction: parsed.data.memberFunction,
      totalBudget: decimalOrUndef(parsed.data.totalBudget),
      supportAmount: decimalOrUndef(parsed.data.supportAmount),
      currency: parsed.data.currency ?? "TRY",
      applicationDate: parsed.data.applicationDate ?? null,
      resultDate: parsed.data.acceptanceDate ?? null,
      acceptanceDate: parsed.data.acceptanceDate ?? null,
      summary: parsed.data.summary ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "SuccessfulProjectRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/basarili-proje/${id}`);
  redirect(`/kayitlarim/basarili-proje/${id}`);
}

export async function updateProjectIdea(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.projectIdeaRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = projectIdeaSchema.safeParse({
    title: fd.get("title"),
    grantProvider: fd.get("grantProvider"),
    potentialProgram: fd.get("potentialProgram"),
    budget: fd.get("budget"),
    currency: fd.get("currency"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { projectIdeaId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.projectIdeaRecord.update({
    where: { id },
    data: {
      title: parsed.data.title,
      grantProvider: parsed.data.grantProvider ?? null,
      potentialProgram: parsed.data.potentialProgram ?? null,
      budget: decimalOrUndef(parsed.data.budget),
      currency: parsed.data.currency ?? "TRY",
      summary: parsed.data.summary ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "ProjectIdeaRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/proje-fikri/${id}`);
  redirect(`/kayitlarim/proje-fikri/${id}`);
}

export async function updateEventRecord(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.eventRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = eventSchema.safeParse({
    name: fd.get("name"),
    organizer: fd.get("organizer"),
    date: fd.get("date"),
    endAt: fd.get("endAt"),
    kind: fd.get("kind"),
    format: fd.get("format"),
    role: fd.get("role"),
    externalUrl: fd.get("externalUrl"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { eventId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.eventRecord.update({
    where: { id },
    data: {
      name: parsed.data.name,
      organizer: parsed.data.organizer ?? null,
      date: parsed.data.date,
      endAt: parsed.data.endAt ?? null,
      kind: parsed.data.kind,
      format: parsed.data.format,
      role: parsed.data.role,
      externalUrl: parsed.data.externalUrl ?? null,
      summary: parsed.data.summary ?? null,
    },
  });

  const oldMetricCode = eventMetricCode(row?.role);
  const newMetricCode = eventMetricCode(parsed.data.role);
  if (oldMetricCode !== newMetricCode) {
    if (oldMetricCode) {
      await trackKpiEvent({
        metricCode: oldMetricCode,
        sourceType: "EVENT",
        sourceId: id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
    }
    if (newMetricCode) {
      await trackKpiEvent({
        metricCode: newMetricCode,
        sourceType: "EVENT",
        sourceId: id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: 1,
      });
    }
  }
  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "EventRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/etkinlik/${id}`);
  redirect(`/kayitlarim/etkinlik/${id}`);
}

export async function updateDissemination(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.disseminationRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = disseminationSchema.safeParse({
    title: fd.get("title"),
    date: fd.get("date"),
    location: fd.get("location"),
    kind: fd.get("kind"),
    audience: fd.get("audience"),
    participantCount: fd.get("participantCount"),
    relatedTopic: fd.get("relatedTopic"),
    summary: fd.get("summary"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { disseminationId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.disseminationRecord.update({
    where: { id },
    data: {
      title: parsed.data.title,
      date: parsed.data.date,
      location: parsed.data.location ?? null,
      kind: parsed.data.kind ?? null,
      audience: parsed.data.audience ?? null,
      participantCount: parsed.data.participantCount ?? null,
      relatedTopic: parsed.data.relatedTopic ?? null,
      summary: parsed.data.summary ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "DisseminationRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/bilgi-cogaltimi/${id}`);
  redirect(`/kayitlarim/bilgi-cogaltimi/${id}`);
}

export async function updateTraining(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.trainingPresentationRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = trainingSchema.safeParse({
    title: fd.get("title"),
    date: fd.get("date"),
    location: fd.get("location"),
    audience: fd.get("audience"),
    participantCount: fd.get("participantCount"),
    role: fd.get("role"),
    summary: fd.get("summary"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { trainingId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.trainingPresentationRecord.update({
    where: { id },
    data: {
      title: parsed.data.title,
      date: parsed.data.date,
      location: parsed.data.location ?? null,
      audience: parsed.data.audience ?? null,
      participantCount: parsed.data.participantCount ?? null,
      role: parsed.data.role ?? null,
      summary: parsed.data.summary ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "TrainingPresentationRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/egitim-sunum/${id}`);
  redirect(`/kayitlarim/egitim-sunum/${id}`);
}

export async function updateContentRecord(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.contentRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = contentSchema.safeParse({
    title: fd.get("title"),
    kind: fd.get("kind"),
    externalUrl: fd.get("externalUrl"),
    tags: fd.get("tags"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { contentId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.contentRecord.update({
    where: { id },
    data: {
      title: parsed.data.title,
      kind: parsed.data.kind,
      externalUrl: parsed.data.externalUrl ?? null,
      tags: parsed.data.tags,
      summary: parsed.data.summary ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "ContentRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/dokuman-icerik/${id}`);
  redirect(`/kayitlarim/dokuman-icerik/${id}`);
}

export async function updateStakeholder(
  id: string,
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const row = await prisma.stakeholderRecord.findUnique({ where: { id } });
  await mustOwnOr403(row, user.id, user.roles);

  const parsed = stakeholderSchema.safeParse({
    fullName: fd.get("fullName"),
    positionTitle: fd.get("positionTitle"),
    kind: fd.get("kind"),
    organization: fd.get("organization"),
    linkedinUrl: fd.get("linkedinUrl"),
    email: fd.get("email"),
    city: fd.get("city"),
    country: fd.get("country"),
    tags: fd.get("tags"),
    description: fd.get("description"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  try {
    await storeAttachments({
      files: filesFromFormData(fd),
      uploadedById: user.id,
      owner: { stakeholderId: id },
    });
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: uploadMessage(e) };
    throw e;
  }

  await prisma.stakeholderRecord.update({
    where: { id },
    data: {
      fullName: parsed.data.fullName,
      positionTitle: parsed.data.positionTitle ?? null,
      kind: parsed.data.kind,
      organization: parsed.data.organization ?? null,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      email: parsed.data.email ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country ?? null,
      tags: parsed.data.tags,
      description: parsed.data.description ?? null,
    },
  });

  await audit({ action: "RECORD_UPDATED", actorId: user.id, targetType: "StakeholderRecord", targetId: id });
  revalidatePath("/kayitlarim");
  revalidatePath(`/kayitlarim/paydas/${id}`);
  redirect(`/kayitlarim/paydas/${id}`);
}

export async function softDeleteRecord(type: string, id: string): Promise<void> {
  const user = await requireActiveUser();
  if (!isRecordType(type)) await redirectUnauthorized();
  const typedType = type as RecordTypeSlug;
  const now = new Date();

  const actions: Record<RecordTypeSlug, () => Promise<{ ownerId: string }>> = {
    "proje-basvurusu": async () => {
      const row = await prisma.projectApplicationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.projectApplicationRecord.update({ where: { id }, data: { deletedAt: now } });
      const metricCode = row.memberFunction === "DANISMANLIK"
        ? "KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL"
        : "KPI_PROJECT_APPLICATION_DIRECT_TOTAL";
      await trackKpiEvent({
        metricCode,
        sourceType: "PROJECT_APPLICATION",
        sourceId: row.id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
      return { ownerId: row.ownerId };
    },
    "basarili-proje": async () => {
      const row = await prisma.successfulProjectRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.successfulProjectRecord.update({ where: { id }, data: { deletedAt: now } });
      await trackKpiEvent({
        metricCode: "KPI_SUCCESSFUL_PROJECT_TOTAL",
        sourceType: "SUCCESSFUL_PROJECT",
        sourceId: row.id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
      return { ownerId: row.ownerId };
    },
    "proje-fikri": async () => {
      const row = await prisma.projectIdeaRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.projectIdeaRecord.update({ where: { id }, data: { deletedAt: now } });
      await trackKpiEvent({
        metricCode: "KPI_PROJECT_IDEA_TOTAL",
        sourceType: "PROJECT_IDEA",
        sourceId: row.id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
      return { ownerId: row.ownerId };
    },
    etkinlik: async () => {
      const row = await prisma.eventRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.eventRecord.update({ where: { id }, data: { deletedAt: now } });
      if (row.role === KPI_EVENT_ATTENDED_ROLE) {
        await trackKpiEvent({
          metricCode: "KPI_EVENT_ATTENDED_TOTAL",
          sourceType: "EVENT",
          sourceId: row.id,
          actorUserId: user.id,
          groupId: user.groupId,
          delta: -1,
        });
      }
      if (row.role === KPI_EVENT_ORGANIZED_ROLE) {
        await trackKpiEvent({
          metricCode: "KPI_EVENT_ORGANIZED_TOTAL",
          sourceType: "EVENT",
          sourceId: row.id,
          actorUserId: user.id,
          groupId: user.groupId,
          delta: -1,
        });
      }
      return { ownerId: row.ownerId };
    },
    "bilgi-cogaltimi": async () => {
      const row = await prisma.disseminationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.disseminationRecord.update({ where: { id }, data: { deletedAt: now } });
      return { ownerId: row.ownerId };
    },
    "egitim-sunum": async () => {
      const row = await prisma.trainingPresentationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.trainingPresentationRecord.update({ where: { id }, data: { deletedAt: now } });
      return { ownerId: row.ownerId };
    },
    "dokuman-icerik": async () => {
      const row = await prisma.contentRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.contentRecord.update({ where: { id }, data: { deletedAt: now } });
      await trackKpiEvent({
        metricCode: "KPI_CONTENT_TOTAL",
        sourceType: "CONTENT",
        sourceId: row.id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
      return { ownerId: row.ownerId };
    },
    paydas: async () => {
      const row = await prisma.stakeholderRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.stakeholderRecord.update({ where: { id }, data: { deletedAt: now } });
      await trackKpiEvent({
        metricCode: "KPI_STAKEHOLDER_TOTAL",
        sourceType: "STAKEHOLDER",
        sourceId: row.id,
        actorUserId: user.id,
        groupId: user.groupId,
        delta: -1,
      });
      return { ownerId: row.ownerId };
    },
  };

  const res = await actions[typedType]();
  await audit({
    action: "RECORD_DELETED",
    actorId: user.id,
    targetType: type,
    targetId: id,
    metadata: { ownerId: res.ownerId },
  });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect("/kayitlarim");
}

// Silence unused — we intentionally keep sendMail imported for future use
// (e.g. notifying admins of new applications in a later phase).
void sendMail;
void OK;
