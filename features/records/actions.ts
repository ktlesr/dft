"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canEditOwnRecord } from "@/lib/rbac";
import { MAX_ATTACHMENTS_PER_REQUEST, UploadError, storeAttachments } from "@/lib/upload";
import { sendMail } from "@/lib/mail";
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

/* ────────── owner-only helpers used by update/delete ────────── */

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
    applicationDate: fd.get("applicationDate"),
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
      applicationDate: parsed.data.applicationDate ?? null,
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ProjectApplicationRecord", targetId: row.id });
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "SuccessfulProjectRecord", targetId: row.id });
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ProjectIdeaRecord", targetId: row.id });
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
      date: parsed.data.date,
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "EventRecord", targetId: row.id });
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "ContentRecord", targetId: row.id });
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

  await audit({ action: "RECORD_CREATED", actorId: user.id, targetType: "StakeholderRecord", targetId: row.id });
  revalidatePath("/kayitlarim");
  revalidatePath("/panel");
  redirect(`/kayitlarim/paydas/${row.id}`);
}

/* ══════════════════════════════════════════════════════════════════
 * Soft delete (type-aware)
 * ══════════════════════════════════════════════════════════════════*/

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
      return { ownerId: row.ownerId };
    },
    "basarili-proje": async () => {
      const row = await prisma.successfulProjectRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.successfulProjectRecord.update({ where: { id }, data: { deletedAt: now } });
      return { ownerId: row.ownerId };
    },
    "proje-fikri": async () => {
      const row = await prisma.projectIdeaRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.projectIdeaRecord.update({ where: { id }, data: { deletedAt: now } });
      return { ownerId: row.ownerId };
    },
    etkinlik: async () => {
      const row = await prisma.eventRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.eventRecord.update({ where: { id }, data: { deletedAt: now } });
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
      return { ownerId: row.ownerId };
    },
    paydas: async () => {
      const row = await prisma.stakeholderRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) redirect("/kayitlarim?hata=bulunamadi");
      await mustOwnOr403(row, user.id, user.roles);
      await prisma.stakeholderRecord.update({ where: { id }, data: { deletedAt: now } });
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
