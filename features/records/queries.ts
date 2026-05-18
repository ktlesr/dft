import "server-only";

import { prisma } from "@/lib/prisma";
import type { RecordTypeSlug } from "./types";

/**
 * Minimal row shape shared across the record types for the unified
 * "Paylaşımlar" table. Each query projects to these fields so the table
 * can render without per-type branches.
 *
 * `owner` is populated for system-wide listings only. PII safety: we
 * project the display name + group code, never the e-mail or sensitive
 * personal fields.
 */
export type UnifiedRecordRow = {
  id: string;
  type: RecordTypeSlug;
  title: string;
  subtitle: string | null;
  status: string | null;
  date: Date | null;
  updatedAt: Date;
  owner?: { name: string | null; groupCode: string | null } | null;
};

const ACTIVE = { deletedAt: null };

const OWNER_SELECT = {
  select: {
    name: true,
    email: true,
    group: { select: { code: true } },
  },
} as const;

function ownerView(o: { name: string | null; email: string; group: { code: string } | null }) {
  return {
    name: o.name?.trim() || (o.email.split("@")[0] ?? null),
    groupCode: o.group?.code ?? null,
  };
}

/* ────────── Count helpers ────────── */

async function countsInternal(
  ownerId: string | null,
): Promise<Record<RecordTypeSlug, number>> {
  const where = ownerId ? { ownerId, ...ACTIVE } : ACTIVE;
  const [a, b, c, d, e, f, g, h] = await Promise.all([
    prisma.projectApplicationRecord.count({ where }),
    prisma.successfulProjectRecord.count({ where }),
    prisma.projectIdeaRecord.count({ where }),
    prisma.eventRecord.count({ where }),
    prisma.disseminationRecord.count({ where }),
    prisma.trainingPresentationRecord.count({ where }),
    prisma.contentRecord.count({ where }),
    prisma.stakeholderRecord.count({ where }),
  ]);
  return {
    "proje-basvurusu": a,
    "basarili-proje": b,
    "proje-fikri": c,
    etkinlik: d,
    "bilgi-cogaltimi": e,
    "egitim-sunum": f,
    "dokuman-icerik": g,
    paydas: h,
  };
}

export function countsByType(ownerId: string) {
  return countsInternal(ownerId);
}

export function countsByTypeForAll() {
  return countsInternal(null);
}

/* ────────── List helpers ────────── */

type ListOpts = {
  type?: RecordTypeSlug;
  query?: string;
  take?: number;
};

/**
 * Internal: optional `ownerId` filter. `null` = system-wide listing
 * (caller's responsibility to ensure authentication).
 */
async function listInternal(
  ownerId: string | null,
  opts: ListOpts = {},
): Promise<UnifiedRecordRow[]> {
  const q = opts.query?.trim();
  const take = opts.take ?? 200;
  const ownerWhere: { ownerId?: string } = ownerId ? { ownerId } : {};
  const includeOwner = ownerId ? undefined : { owner: OWNER_SELECT };

  const projectApp = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.projectApplicationRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { projectName: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "proje-basvurusu" as const,
      title: r.projectName,
      subtitle: r.programName ?? r.program ?? r.callName ?? null,
      status: r.status,
      date: r.applicationDate,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const successProject = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.successfulProjectRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { projectName: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "basarili-proje" as const,
      title: r.projectName,
      subtitle: r.programName ?? r.program ?? r.callName ?? null,
      status: null,
      date: r.acceptanceDate ?? r.resultDate ?? r.applicationDate,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const projectIdea = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.projectIdeaRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "proje-fikri" as const,
      title: r.title,
      subtitle: r.potentialProgram ?? r.grantProvider ?? null,
      status: r.stage,
      date: r.targetDate,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const events = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.eventRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "etkinlik" as const,
      title: r.name,
      subtitle: r.organizer ?? r.kind ?? null,
      status: r.role,
      date: r.date,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const dissemination = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.disseminationRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "bilgi-cogaltimi" as const,
      title: r.title,
      subtitle: r.location ?? r.kind ?? null,
      status: r.audience,
      date: r.date,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const training = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.trainingPresentationRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "egitim-sunum" as const,
      title: r.title,
      subtitle: r.location ?? r.audience ?? null,
      status: r.role,
      date: r.date,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const content = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.contentRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { date: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "dokuman-icerik" as const,
      title: r.title,
      subtitle: r.kind ?? null,
      status: null,
      date: r.date,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const stakeholder = async (): Promise<UnifiedRecordRow[]> =>
    (
      await prisma.stakeholderRecord.findMany({
        where: {
          ...ownerWhere,
          ...ACTIVE,
          ...(q ? { fullName: { contains: q, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take,
        include: includeOwner,
      })
    ).map((r) => ({
      id: r.id,
      type: "paydas" as const,
      title: r.fullName,
      subtitle: r.organization ?? r.positionTitle ?? null,
      status: r.kind,
      date: null,
      updatedAt: r.updatedAt,
      owner: hasOwner(r) ? ownerView(r.owner) : undefined,
    }));

  const picks: Record<RecordTypeSlug, () => Promise<UnifiedRecordRow[]>> = {
    "proje-basvurusu": projectApp,
    "basarili-proje": successProject,
    "proje-fikri": projectIdea,
    etkinlik: events,
    "bilgi-cogaltimi": dissemination,
    "egitim-sunum": training,
    "dokuman-icerik": content,
    paydas: stakeholder,
  };

  if (opts.type) return picks[opts.type]();

  const all = await Promise.all(Object.values(picks).map((fn) => fn()));
  const merged = all.flat();
  merged.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return merged.slice(0, take);
}

/** True when the row has an `owner` relation projected. Used as a tagged guard. */
function hasOwner(
  r: unknown,
): r is { owner: { name: string | null; email: string; group: { code: string } | null } } {
  return (
    typeof r === "object" &&
    r !== null &&
    "owner" in r &&
    typeof (r as { owner: unknown }).owner === "object" &&
    (r as { owner: unknown }).owner !== null
  );
}

export function listMyRecords(ownerId: string, opts: ListOpts = {}) {
  return listInternal(ownerId, opts);
}

export function listAllRecords(opts: ListOpts = {}) {
  return listInternal(null, opts);
}
