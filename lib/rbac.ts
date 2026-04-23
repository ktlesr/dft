import type { GroupCode, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  roles: Role[];
  groupId: string | null;
  groupCode: GroupCode | null;
};

export const hasRole = (user: Pick<SessionUser, "roles">, ...roles: Role[]) =>
  roles.some((r) => user.roles.includes(r));

export const isAdmin = (user: Pick<SessionUser, "roles">) => user.roles.includes("ADMIN");
export const isModerator = (user: Pick<SessionUser, "roles">) => user.roles.includes("MODERATOR");
export const isRapporteur = (user: Pick<SessionUser, "roles">) => user.roles.includes("RAPPORTEUR");

export function canCreateMeeting(user: SessionUser, targetGroupId: string) {
  if (isAdmin(user)) return true;
  if (!isModerator(user)) return false;
  return user.groupId === targetGroupId;
}

export function canCreateMinute(user: SessionUser, targetGroupId: string) {
  if (isAdmin(user)) return true;
  if (!isRapporteur(user)) return false;
  return user.groupId === targetGroupId;
}

export function canCreateReport(user: SessionUser, targetGroupId: string) {
  if (isAdmin(user)) return true;
  if (!isRapporteur(user)) return false;
  return user.groupId === targetGroupId;
}

export function canSeeGroupResource(user: SessionUser, targetGroupId: string | null) {
  if (isAdmin(user)) return true;
  if (!targetGroupId) return true; // general
  return user.groupId === targetGroupId;
}

export function canEditOwnRecord(user: SessionUser, ownerId: string) {
  return isAdmin(user) || user.id === ownerId;
}

export class ForbiddenError extends Error {
  constructor(message = "Bu işlem için yetkiniz yok.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Oturum açmanız gerekiyor.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
