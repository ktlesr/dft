"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
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
    redirect("/yetkisiz");
  }
}

/* ══════════════════════════════════════════════════════════════════
 * 1) Proje Başvurusu
 * ══════════════════════════════════════════════════════════════════*/

export async function createProjectApplication(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = projectApplicationSchema.safeParse({
    projectName: fd.get("projectName"),
    program: fd.get("program"),
    callName: fd.get("callName"),
    applicationDate: fd.get("applicationDate"),
    budget: fd.get("budget"),
    requestedSupport: fd.get("requestedSupport"),
    kind: fd.get("kind"),
    partnerMemberIds: fd.getAll("partnerMemberIds").map(String),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // `status` is no longer asked in the UI — let the DB default (PLANLANIYOR)
  // apply. Admins or future edit flows can still change it.
  const row = await prisma.projectApplicationRecord.create({
    data: {
      ownerId: user.id,
      projectName: parsed.data.projectName,
      program: parsed.data.program ?? null,
      callName: parsed.data.callName ?? null,
      applicationDate: parsed.data.applicationDate ?? null,
      budget: decimalOrUndef(parsed.data.budget),
      requestedSupport: decimalOrUndef(parsed.data.requestedSupport),
      kind: parsed.data.kind,
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
 * 2) Başarılı Proje
 * ══════════════════════════════════════════════════════════════════*/

export async function createSuccessfulProject(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = successfulProjectSchema.safeParse({
    projectName: fd.get("projectName"),
    program: fd.get("program"),
    callName: fd.get("callName"),
    applicationDate: fd.get("applicationDate"),
    resultDate: fd.get("resultDate"),
    totalBudget: fd.get("totalBudget"),
    supportAmount: fd.get("supportAmount"),
    role: fd.get("role"),
    kind: fd.get("kind"),
    consortium: fd.get("consortium"),
    summary: fd.get("summary"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.successfulProjectRecord.create({
    data: {
      ownerId: user.id,
      projectName: parsed.data.projectName,
      program: parsed.data.program ?? null,
      callName: parsed.data.callName ?? null,
      applicationDate: parsed.data.applicationDate ?? null,
      resultDate: parsed.data.resultDate ?? null,
      totalBudget: decimalOrUndef(parsed.data.totalBudget),
      supportAmount: decimalOrUndef(parsed.data.supportAmount),
      role: parsed.data.role ?? null,
      kind: parsed.data.kind ?? null,
      consortium: parsed.data.consortium ?? null,
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
 * 3) Proje Fikri / Hazırlık
 * ══════════════════════════════════════════════════════════════════*/

export async function createProjectIdea(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = projectIdeaSchema.safeParse({
    title: fd.get("title"),
    potentialProgram: fd.get("potentialProgram"),
    callTopic: fd.get("callTopic"),
    stage: fd.get("stage"),
    potentialPartners: fd.get("potentialPartners"),
    summary: fd.get("summary"),
    nextStep: fd.get("nextStep"),
    targetDate: fd.get("targetDate"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.projectIdeaRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      potentialProgram: parsed.data.potentialProgram ?? null,
      callTopic: parsed.data.callTopic ?? null,
      stage: parsed.data.stage,
      potentialPartners: parsed.data.potentialPartners ?? null,
      summary: parsed.data.summary ?? null,
      nextStep: parsed.data.nextStep ?? null,
      targetDate: parsed.data.targetDate ?? null,
      notes: parsed.data.notes ?? null,
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
 * 4) Etkinlik
 * ══════════════════════════════════════════════════════════════════*/

export async function createEventRecord(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = eventSchema.safeParse({
    name: fd.get("name"),
    kind: fd.get("kind"),
    date: fd.get("date"),
    location: fd.get("location"),
    role: fd.get("role"),
    organizer: fd.get("organizer"),
    format: fd.get("format"),
    externalUrl: fd.get("externalUrl"),
    summary: fd.get("summary"),
    notes: fd.get("notes"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.eventRecord.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      kind: parsed.data.kind ?? null,
      date: parsed.data.date,
      location: parsed.data.location ?? null,
      role: parsed.data.role ?? null,
      organizer: parsed.data.organizer ?? null,
      format: parsed.data.format ?? null,
      externalUrl: parsed.data.externalUrl ?? null,
      summary: parsed.data.summary ?? null,
      notes: parsed.data.notes ?? null,
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
 * 5) Bilgi Çoğaltımı
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
 * 6) Eğitim / Sunum
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
 * 7) Doküman / İçerik
 * ══════════════════════════════════════════════════════════════════*/

export async function createContentRecord(
  _prev: RecordFormState,
  fd: FormData,
): Promise<RecordFormState> {
  const user = await requireActiveUser();
  const parsed = contentSchema.safeParse({
    title: fd.get("title"),
    kind: fd.get("kind"),
    date: fd.get("date"),
    summary: fd.get("summary"),
    tags: fd.get("tags"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const row = await prisma.contentRecord.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      kind: parsed.data.kind ?? null,
      date: parsed.data.date,
      summary: parsed.data.summary ?? null,
      tags: parsed.data.tags,
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
 * Soft delete (type-aware)
 * ══════════════════════════════════════════════════════════════════*/

export async function softDeleteRecord(type: string, id: string): Promise<void> {
  const user = await requireActiveUser();
  if (!isRecordType(type)) redirect("/yetkisiz");
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
  };

  const res = await actions[type]();
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
