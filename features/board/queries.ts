import "server-only";

import { prisma } from "@/lib/prisma";
import type { BoardPostKind, BoardScope } from "@prisma/client";

type BoardListOpts = {
  scope: BoardScope;
  groupId?: string | null;
  /** Single kind (legacy) — overridden by `kinds` when both provided. */
  kind?: BoardPostKind;
  /** Filter posts whose kind is in this set. */
  kinds?: BoardPostKind[];
  query?: string;
  /** When true, restrict to posts whose author has an ADMIN role assignment. */
  authorIsAdmin?: boolean;
  take?: number;
};

export async function listBoardPosts(opts: BoardListOpts) {
  const kindFilter =
    opts.kinds && opts.kinds.length > 0
      ? { kind: { in: opts.kinds } }
      : opts.kind
        ? { kind: opts.kind }
        : {};

  const where = {
    scope: opts.scope,
    status: "PUBLISHED" as const,
    deletedAt: null,
    ...(opts.scope === "GROUP" ? { groupId: opts.groupId ?? "__none__" } : {}),
    ...kindFilter,
    ...(opts.authorIsAdmin
      ? { author: { roles: { some: { role: "ADMIN" as const } } } }
      : {}),
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
      // mimeType: PostCard'da görsel-tipi ekleri kapak olarak gösterebilmek için.
      attachments: { select: { id: true, originalName: true, size: true, mimeType: true } },
    },
  });
}
