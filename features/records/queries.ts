import "server-only";

import { prisma } from "@/lib/prisma";
import type { RecordTypeSlug } from "./types";

/**
 * Minimal row shape shared across the 7 record types for the unified
 * "Kayıtlarım" table. Each query projects to these fields so the table
 * can render without per-type branches.
 */
export type UnifiedRecordRow = {
  id: string;
  type: RecordTypeSlug;
  title: string;
  subtitle: string | null;
  status: string | null;
  date: Date | null;
  updatedAt: Date;
};

const ACTIVE = { deletedAt: null };

export async function countsByType(ownerId: string): Promise<Record<RecordTypeSlug, number>> {
  const [a, b, c, d, e, f, g] = await Promise.all([
    prisma.projectApplicationRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.successfulProjectRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.projectIdeaRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.eventRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.disseminationRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.trainingPresentationRecord.count({ where: { ownerId, ...ACTIVE } }),
    prisma.contentRecord.count({ where: { ownerId, ...ACTIVE } }),
  ]);
  return {
    "proje-basvurusu": a,
    "basarili-proje": b,
    "proje-fikri": c,
    etkinlik: d,
    "bilgi-cogaltimi": e,
    "egitim-sunum": f,
    "dokuman-icerik": g,
  };
}

export async function listMyRecords(
  ownerId: string,
  opts: { type?: RecordTypeSlug; query?: string; take?: number } = {},
): Promise<UnifiedRecordRow[]> {
  const q = opts.query?.trim();
  const take = opts.take ?? 200;

  const projectApp = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.projectApplicationRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { projectName: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "proje-basvurusu" as const,
      title: r.projectName,
      subtitle: r.program ?? r.callName ?? null,
      status: r.status,
      date: r.applicationDate,
      updatedAt: r.updatedAt,
    }));

  const successProject = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.successfulProjectRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { projectName: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "basarili-proje" as const,
      title: r.projectName,
      subtitle: r.program ?? r.callName ?? null,
      status: null,
      date: r.resultDate ?? r.applicationDate,
      updatedAt: r.updatedAt,
    }));

  const projectIdea = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.projectIdeaRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "proje-fikri" as const,
      title: r.title,
      subtitle: r.potentialProgram ?? r.callTopic ?? null,
      status: r.stage,
      date: r.targetDate,
      updatedAt: r.updatedAt,
    }));

  const events = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.eventRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "etkinlik" as const,
      title: r.name,
      subtitle: r.location ?? r.kind ?? null,
      status: r.role,
      date: r.date,
      updatedAt: r.updatedAt,
    }));

  const dissemination = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.disseminationRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "bilgi-cogaltimi" as const,
      title: r.title,
      subtitle: r.location ?? r.kind ?? null,
      status: r.audience,
      date: r.date,
      updatedAt: r.updatedAt,
    }));

  const training = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.trainingPresentationRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "egitim-sunum" as const,
      title: r.title,
      subtitle: r.location ?? r.audience ?? null,
      status: r.role,
      date: r.date,
      updatedAt: r.updatedAt,
    }));

  const content = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.contentRecord.findMany({
        where: {
          ownerId,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
      })
    ).map((r) => ({
      id: r.id,
      type: "dokuman-icerik" as const,
      title: r.title,
      subtitle: r.kind ?? null,
      status: null,
      date: r.date,
      updatedAt: r.updatedAt,
    }));

  const picks: Record<RecordTypeSlug, () => Promise<UnifiedRecordRow[]>> = {
    "proje-basvurusu": projectApp,
    "basarili-proje": successProject,
    "proje-fikri": projectIdea,
    etkinlik: events,
    "bilgi-cogaltimi": dissemination,
    "egitim-sunum": training,
    "dokuman-icerik": content,
  };

  if (opts.type) return picks[opts.type]();

  const all = await Promise.all(Object.values(picks).map((fn) => fn()));
  const merged = all.flat();
  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return merged.slice(0, take);
}
