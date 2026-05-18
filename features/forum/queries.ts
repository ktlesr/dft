import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const AUTHOR_SELECT = {
  select: { id: true, name: true, email: true, image: true },
} as const;

export type DiscussionListItem = Prisma.DiscussionGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true; image: true } };
    _count: { select: { replies: true } };
  };
}>;

export type DiscussionWithReplies = Prisma.DiscussionGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true; image: true } };
    group: { select: { id: true; code: true; name: true } };
    replies: {
      include: {
        author: { select: { id: true; name: true; email: true; image: true } };
      };
    };
  };
}>;

type ListOpts = {
  groupId: string;
  take?: number;
};

/** Belirli bir grubun açık tartışmaları — yeni cevaplar üstte. */
export async function listGroupDiscussions(opts: ListOpts): Promise<DiscussionListItem[]> {
  return prisma.discussion.findMany({
    where: { groupId: opts.groupId, deletedAt: null },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: opts.take ?? 50,
    include: {
      author: AUTHOR_SELECT,
      _count: { select: { replies: { where: { deletedAt: null } } } },
    },
  });
}

/** Tek tartışma + yanıtları. */
export async function getDiscussion(id: string): Promise<DiscussionWithReplies | null> {
  return prisma.discussion.findUnique({
    where: { id },
    include: {
      author: AUTHOR_SELECT,
      group: { select: { id: true, code: true, name: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: AUTHOR_SELECT },
      },
    },
  });
}
