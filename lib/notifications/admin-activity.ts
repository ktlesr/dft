import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotifyAdminsInput = {
  actorId: string;
  actorRoles: readonly Role[];
  actorName: string | null;
  actorEmail: string;
  title: string;
  body?: string | null;
  link?: string | null;
  kind?: string;
};

/**
 * Sends an in-app notification to active admins when a non-admin performs
 * a noteworthy action.
 */
export async function notifyAdminsAboutNonAdminActivity(input: NotifyAdminsInput) {
  if (input.actorRoles.includes("ADMIN")) return;

  const recipients = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: input.actorId },
      roles: { some: { role: "ADMIN" } },
    },
    select: { id: true },
  });
  if (recipients.length === 0) return;

  const actorLabel = input.actorName?.trim() || input.actorEmail;

  await prisma.notification.createMany({
    data: recipients.map((admin) => ({
      userId: admin.id,
      kind: input.kind ?? "admin_activity",
      title: input.title,
      body: input.body ?? actorLabel,
      link: input.link ?? "/panel",
    })),
  });
}
