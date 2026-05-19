import type { GroupNoteKind, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  roles: Role[];
  groupId: string | null;
  groupCode: string | null;
};

export const hasRole = (user: Pick<SessionUser, "roles">, ...roles: Role[]) =>
  roles.some((r) => user.roles.includes(r));

export const isAdmin = (user: Pick<SessionUser, "roles">) => user.roles.includes("ADMIN");
export const isModerator = (user: Pick<SessionUser, "roles">) => user.roles.includes("MODERATOR");
export const isRapporteur = (user: Pick<SessionUser, "roles">) => user.roles.includes("RAPPORTEUR");
export const isAdvisor = (user: Pick<SessionUser, "roles">) => user.roles.includes("ADVISOR");
export const isKsManager = (user: Pick<SessionUser, "roles">) => user.roles.includes("KS");
export const canAccessKpiModule = (user: Pick<SessionUser, "roles">) =>
  isAdmin(user) || isModerator(user);

export function canCreateMeeting(user: SessionUser, targetGroupId: string) {
  if (isAdmin(user)) return true;
  if (!isModerator(user)) return false;
  return user.groupId === targetGroupId;
}

/**
 * Bildirim oluşturma yetkisi.
 * - GENERAL kapsam → yalnızca admin
 * - GROUP kapsam   → admin VEYA targetGroupId ile aynı gruptaki moderatör
 */
export function canCreateNotice(
  user: SessionUser,
  scope: "GENERAL" | "GROUP",
  targetGroupId: string | null,
) {
  if (isAdmin(user)) return true;
  if (scope === "GENERAL") return false;
  if (!isModerator(user)) return false;
  return !!targetGroupId && user.groupId === targetGroupId;
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

export function canCreateGroupNote(
  user: SessionUser,
  targetGroupId: string,
  kind: GroupNoteKind,
) {
  if (isAdmin(user)) return true;
  if (user.groupId !== targetGroupId) return false;
  if (kind === "ADVISOR_NOTE") return isAdvisor(user);
  return isKsManager(user);
}

export function canSeeGroupResource(user: SessionUser, targetGroupId: string | null) {
  if (isAdmin(user)) return true;
  if (!targetGroupId) return true; // general
  return user.groupId === targetGroupId;
}

export function canEditOwnRecord(user: SessionUser, ownerId: string) {
  return isAdmin(user) || user.id === ownerId;
}

export function canCreateOrApproveKpi(user: SessionUser, targetGroupId: string) {
  if (!isModerator(user)) return false;
  return user.groupId === targetGroupId;
}

export function canReviseKpi(user: SessionUser, targetGroupId: string) {
  if (isAdmin(user)) return true;
  return canCreateOrApproveKpi(user, targetGroupId);
}

export function canChangeKpiBaseline(user: Pick<SessionUser, "roles">) {
  return isAdmin(user);
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
