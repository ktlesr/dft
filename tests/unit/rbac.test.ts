import { describe, it, expect } from "vitest";

import {
  canAccessKpiModule,
  canChangeKpiBaseline,
  canCreateOrApproveKpi,
  canCreateMeeting,
  canCreateMinute,
  canCreateReport,
  canReviseKpi,
  canEditOwnRecord,
  canSeeGroupResource,
  hasRole,
  isAdmin,
  isModerator,
  isRapporteur,
  type SessionUser,
} from "@/lib/rbac";

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u-1",
    email: "u@dft.local",
    name: null,
    image: null,
    status: "ACTIVE",
    roles: ["USER"],
    groupId: "g-uak",
    groupCode: "UAK",
    ...overrides,
  };
}

describe("role predicates", () => {
  it("hasRole matches any listed role", () => {
    const u = user({ roles: ["USER", "MODERATOR"] });
    expect(hasRole(u, "MODERATOR")).toBe(true);
    expect(hasRole(u, "RAPPORTEUR", "MODERATOR")).toBe(true);
    expect(hasRole(u, "ADMIN")).toBe(false);
  });

  it("role shortcuts", () => {
    expect(isAdmin(user({ roles: ["ADMIN", "USER"] }))).toBe(true);
    expect(isAdmin(user({ roles: ["USER"] }))).toBe(false);
    expect(isModerator(user({ roles: ["MODERATOR"] }))).toBe(true);
    expect(isRapporteur(user({ roles: ["RAPPORTEUR"] }))).toBe(true);
  });
});

describe("canCreateMeeting", () => {
  it("admin can always create (cross-group)", () => {
    expect(canCreateMeeting(user({ roles: ["ADMIN"] }), "g-other")).toBe(true);
  });

  it("moderator only inside own group", () => {
    const mod = user({ roles: ["MODERATOR"] });
    expect(canCreateMeeting(mod, "g-uak")).toBe(true);
    expect(canCreateMeeting(mod, "g-other")).toBe(false);
  });

  it("plain user cannot create", () => {
    expect(canCreateMeeting(user(), "g-uak")).toBe(false);
  });
});

describe("canCreateMinute / canCreateReport", () => {
  it("rapporteur only in own group", () => {
    const rap = user({ roles: ["RAPPORTEUR"] });
    expect(canCreateMinute(rap, "g-uak")).toBe(true);
    expect(canCreateMinute(rap, "g-other")).toBe(false);
    expect(canCreateReport(rap, "g-uak")).toBe(true);
    expect(canCreateReport(rap, "g-other")).toBe(false);
  });

  it("admin cross-group", () => {
    const admin = user({ roles: ["ADMIN"] });
    expect(canCreateMinute(admin, "g-other")).toBe(true);
    expect(canCreateReport(admin, "g-other")).toBe(true);
  });

  it("moderator alone cannot write minutes or reports", () => {
    const mod = user({ roles: ["MODERATOR"] });
    expect(canCreateMinute(mod, "g-uak")).toBe(false);
    expect(canCreateReport(mod, "g-uak")).toBe(false);
  });
});

describe("canSeeGroupResource", () => {
  it("general scope (null group) always visible", () => {
    expect(canSeeGroupResource(user(), null)).toBe(true);
  });

  it("same-group only for non-admin", () => {
    expect(canSeeGroupResource(user(), "g-uak")).toBe(true);
    expect(canSeeGroupResource(user(), "g-other")).toBe(false);
  });

  it("admin bypasses group check", () => {
    const admin = user({ roles: ["ADMIN"], groupId: "g-uak" });
    expect(canSeeGroupResource(admin, "g-other")).toBe(true);
  });
});

describe("canEditOwnRecord", () => {
  it("owner can always edit", () => {
    expect(canEditOwnRecord(user({ id: "u-1" }), "u-1")).toBe(true);
  });

  it("non-owner non-admin cannot", () => {
    expect(canEditOwnRecord(user({ id: "u-2" }), "u-1")).toBe(false);
  });

  it("admin can edit anyone's record", () => {
    expect(canEditOwnRecord(user({ id: "u-2", roles: ["ADMIN"] }), "u-1")).toBe(true);
  });
});

describe("KPI permissions", () => {
  it("kpi module is visible to admin and moderator", () => {
    expect(canAccessKpiModule(user({ roles: ["ADMIN"] }))).toBe(true);
    expect(canAccessKpiModule(user({ roles: ["MODERATOR"] }))).toBe(true);
    expect(canAccessKpiModule(user({ roles: ["USER"] }))).toBe(false);
  });

  it("moderator can create/approve KPI only in own group", () => {
    const mod = user({ roles: ["MODERATOR"], groupId: "g-uak" });
    expect(canCreateOrApproveKpi(mod, "g-uak")).toBe(true);
    expect(canCreateOrApproveKpi(mod, "g-other")).toBe(false);
    expect(canCreateOrApproveKpi(user({ roles: ["ADMIN"] }), "g-uak")).toBe(false);
  });

  it("admin and same-group moderator can revise", () => {
    expect(canReviseKpi(user({ roles: ["ADMIN"] }), "g-other")).toBe(true);
    expect(canReviseKpi(user({ roles: ["MODERATOR"], groupId: "g-uak" }), "g-uak")).toBe(
      true,
    );
    expect(canReviseKpi(user({ roles: ["MODERATOR"], groupId: "g-uak" }), "g-other")).toBe(
      false,
    );
  });

  it("only admin can change baseline", () => {
    expect(canChangeKpiBaseline(user({ roles: ["ADMIN"] }))).toBe(true);
    expect(canChangeKpiBaseline(user({ roles: ["MODERATOR"] }))).toBe(false);
  });
});
