import "server-only";

import { prisma } from "@/lib/prisma";
import type { NoticeScope, Prisma } from "@prisma/client";

export type NoticeWithAuthor = Prisma.NoticeGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true; image: true } };
    group: { select: { id: true; code: true; name: true } };
  };
}>;

type ListOpts = {
  scope: NoticeScope;
  /** GROUP scope için zorunlu — listeyi bu gruba kısıtlar. */
  groupId?: string;
  /** Admin tüm grupların bildirimlerini görmek isterse `true`. */
  allGroups?: boolean;
  query?: string;
  take?: number;
};

/**
 * List notices for a given scope.
 * - GENERAL: tüm aktif üyelere görünür; groupId yok sayılır.
 * - GROUP : groupId zorunludur (admin için `allGroups: true` ile tümü).
 */
export async function listNotices(opts: ListOpts): Promise<NoticeWithAuthor[]> {
  const q = opts.query?.trim();
  const where: Prisma.NoticeWhereInput = {
    scope: opts.scope,
    deletedAt: null,
    ...(opts.scope === "GROUP"
      ? opts.allGroups
        ? { groupId: { not: null } }
        : { groupId: opts.groupId ?? "__none__" }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.notice.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: opts.take ?? 50,
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      group: { select: { id: true, code: true, name: true } },
    },
  });
}
