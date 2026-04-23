import "server-only";

import { prisma } from "@/lib/prisma";
import type { BoardPostKind, BoardScope } from "@prisma/client";

type BoardListOpts = {
  scope: BoardScope;
  groupId?: string | null;
  kind?: BoardPostKind;
  query?: string;
  take?: number;
};

export async function listBoardPosts(opts: BoardListOpts) {
  const where = {
    scope: opts.scope,
    status: "PUBLISHED" as const,
    deletedAt: null,
    ...(opts.scope === "GROUP" ? { groupId: opts.groupId ?? "__none__" } : {}),
    ...(opts.kind ? { kind: opts.kind } : {}),
    ...(opts.query
      ? {
          OR: [
            { title: { contains: opts.query, mode: "insensitive" as const } },
            { body: { contains: opts.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return prisma.boardPost.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: opts.take ?? 50,
    include: {
      author: { select: { id: true, name: true, email: true, image: true } },
      attachments: { select: { id: true, originalName: true, size: true } },
    },
  });
}
