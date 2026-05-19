import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import type { Role, UserStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: UserStatus;
  roles: Role[];
  groupId: string | null;
  groupCode: string | null;
  groupName: string | null;
  groupDescription: string | null;
};

/**
 * React-cached so multiple callers within the same request share a single
 * DB read. Session JWT is consulted first; actual row is fetched to keep
 * role / group / status fresh even on stale tokens (admin actions take effect
 * within the token-refresh window — see `lib/auth.ts`).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;

  const row = await prisma.user.findUnique({
    where: { id: uid },
    include: { roles: true, group: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    status: row.status,
    roles: row.roles.map((r) => r.role),
    groupId: row.groupId,
    groupCode: row.group?.code ?? null,
    groupName: row.group?.name ?? null,
    groupDescription: row.group?.description ?? null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function requireActiveUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.status === "PENDING_APPROVAL") redirect("/onay-bekleniyor");
  if (user.status === "SUSPENDED" || user.status === "REJECTED") redirect("/yetkisiz");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireActiveUser();
  if (!roles.some((r) => user.roles.includes(r))) {
    await redirectUnauthorized();
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

function appendUnauthorizedFlag(pathWithQuery: string) {
  const u = new URL(pathWithQuery, "http://local");
  u.searchParams.set("yetkisiz", "1");
  return `${u.pathname}${u.search}`;
}

function toPathWithQuery(raw: string | null) {
  if (!raw) return null;
  try {
    const u = raw.startsWith("/") ? new URL(raw, "http://local") : new URL(raw);
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

export async function redirectUnauthorized(fallback = "/panel"): Promise<never> {
  const h = await headers();
  const refererPath = toPathWithQuery(h.get("referer"));
  const currentPath = toPathWithQuery(h.get("next-url"));

  if (
    refererPath &&
    refererPath !== currentPath &&
    !refererPath.startsWith("/yetkisiz")
  ) {
    redirect(appendUnauthorizedFlag(refererPath));
  }

  redirect(appendUnauthorizedFlag(fallback));
}
