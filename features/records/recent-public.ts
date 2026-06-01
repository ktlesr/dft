import "server-only";

import { CONTENT_KIND_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { ActiveRecordTypeSlug } from "./types";

/**
 * Public-feed shape for the dashboard "Son Paylaşımlar" tabs.
 *
 * IMPORTANT — what is NOT projected here:
 *   • monetary fields (budget, requestedSupport, totalBudget, supportAmount)
 *   • free-text notes / summaries that could leak strategy or personal data
 *   • stakeholder e-mail / LinkedIn (PII)
 *
 * Only fields safe to expose portal-wide land in `subtitle`. The dashboard
 * is rendered server-side inside the authenticated portal layout, so it
 * is never reachable by a non-logged-in caller — but defence-in-depth: we
 * still narrow the projection here so a future client-leaked dump cannot
 * exfiltrate sensitive columns.
 */
export type PublicRecordItem = {
  id: string;
  type: ActiveRecordTypeSlug;
  title: string;
  subtitle: string | null;
  authorName: string | null;
  groupCode: string | null;
  publishedAt: Date;
};

const ACTIVE = { deletedAt: null };

const ownerSelect = {
  name: true,
  email: true,
  group: { select: { code: true } },
} as const;

function authorLabel(owner: { name: string | null; email: string }): string | null {
  if (owner.name && owner.name.trim()) return owner.name.trim();
  // Düşüş senaryosu: ad boşsa e-postanın "@" öncesi kısmını göster, tam
  // e-postayı feed'e sızdırma.
  const local = owner.email.split("@")[0];
  return local ?? null;
}

/**
 * Latest `limit` records of `type` across the whole portal. Caller must
 * already be authenticated by the portal layout.
 */
export async function recentPublicRecords(
  type: ActiveRecordTypeSlug,
  limit = 5,
): Promise<PublicRecordItem[]> {
  const take = Math.min(Math.max(1, limit), 25);

  switch (type) {
    case "proje-fikri": {
      const rows = await prisma.projectIdeaRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          potentialProgram: true,
          grantProvider: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.title,
        subtitle: r.potentialProgram ?? r.grantProvider ?? null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }

    case "proje-basvurusu": {
      const rows = await prisma.projectApplicationRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          projectName: true,
          programName: true,
          program: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.projectName,
        subtitle: r.programName ?? r.program ?? null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }

    case "basarili-proje": {
      const rows = await prisma.successfulProjectRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          projectName: true,
          programName: true,
          program: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.projectName,
        subtitle: r.programName ?? r.program ?? null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }

    case "etkinlik": {
      const rows = await prisma.eventRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          name: true,
          organizer: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.name,
        subtitle: r.organizer ?? null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }

    case "dokuman-icerik": {
      const rows = await prisma.contentRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          kind: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.title,
        subtitle: r.kind ? (CONTENT_KIND_LABELS as Record<string, string>)[r.kind] ?? r.kind : null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }

    case "paydas": {
      // PII — yalnızca isim, ünvan ve kuruluş projeksiyonu. E-posta ve
      // LinkedIn dışarıda bırakılır.
      const rows = await prisma.stakeholderRecord.findMany({
        where: ACTIVE,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          fullName: true,
          positionTitle: true,
          organization: true,
          createdAt: true,
          owner: { select: ownerSelect },
        },
      });
      return rows.map((r) => ({
        id: r.id,
        type,
        title: r.fullName,
        subtitle: r.organization ?? r.positionTitle ?? null,
        authorName: authorLabel(r.owner),
        groupCode: r.owner.group?.code ?? null,
        publishedAt: r.createdAt,
      }));
    }
  }
}
