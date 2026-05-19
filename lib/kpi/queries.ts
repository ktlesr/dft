import "server-only";

import type { KpiMetricCode } from "@prisma/client";

import type { CurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import {
  FIXED_KPI_CODES,
  FIXED_KPI_LABELS,
  type FixedKpiCode,
} from "@/lib/kpi/constants";

type GroupOption = {
  id: string;
  code: string;
  name: string;
};

export type FixedKpiSummaryItem = {
  code: FixedKpiCode;
  label: string;
  value: number;
  lastOccurredAt: Date | null;
};

export type FixedKpiGroupRow = {
  groupId: string;
  groupCode: string;
  groupName: string;
  values: Record<FixedKpiCode, number>;
  total: number;
};

export type FixedKpiOverview = {
  availableGroups: GroupOption[];
  selectedGroupId: string | null;
  selectedGroupCode: string | null;
  summaries: FixedKpiSummaryItem[];
  groupRows: FixedKpiGroupRow[];
};

export type CustomKpiListItem = {
  id: string;
  groupId: string;
  groupCode: string;
  groupName: string;
  name: string;
  description: string | null;
  baselineValue: string | null;
  baselineDate: Date | null;
  targetValue: string | null;
  targetDate: Date | null;
  actualValue: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "OVERACHIEVED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  createdByName: string;
  assignees: Array<{
    type: "USER_SINGLE" | "USER_MULTI" | "GROUP";
    label: string;
  }>;
  revisions: Array<{
    id: string;
    field: "TARGET_VALUE" | "TARGET_DATE";
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    changedByName: string;
    createdAt: Date;
  }>;
  baselineHistory: Array<{
    id: string;
    field: "TARGET_VALUE" | "TARGET_DATE";
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    changedByName: string;
    createdAt: Date;
  }>;
  evidences: Array<{
    id: string;
    evidenceType: "COMPLETED" | "OVERACHIEVED";
    uploadedByName: string;
    createdAt: Date;
    attachment: {
      id: string;
      originalName: string;
      size: number;
    };
  }>;
};

export type KpiAssignableUser = {
  id: string;
  label: string;
};

type Scope = {
  availableGroups: GroupOption[];
  selectedGroupId: string | null;
  selectedGroupCode: string | null;
  whereGroupId: string | null;
};

export async function getFixedKpiOverview(
  user: CurrentUser,
  requestedGroupId?: string | null,
): Promise<FixedKpiOverview> {
  const scope = await resolveScope(user, requestedGroupId);

  const [metricRows, groupRowsRaw] = await Promise.all([
    prisma.kpiMetricEvent.groupBy({
      by: ["metricCode"],
      where: {
        metricCode: { in: FIXED_KPI_CODES as unknown as KpiMetricCode[] },
        ...(scope.whereGroupId ? { groupId: scope.whereGroupId } : {}),
      },
      _sum: { delta: true },
      _max: { occurredAt: true },
    }),
    prisma.kpiMetricEvent.groupBy({
      by: ["groupId", "metricCode"],
      where: {
        metricCode: { in: FIXED_KPI_CODES as unknown as KpiMetricCode[] },
        ...(scope.whereGroupId ? { groupId: scope.whereGroupId } : {}),
      },
      _sum: { delta: true },
    }),
  ]);

  const summaries = FIXED_KPI_CODES.map((code) => {
    const row = metricRows.find((r) => r.metricCode === code);
    return {
      code,
      label: FIXED_KPI_LABELS[code],
      value: clampValue(row?._sum.delta),
      lastOccurredAt: row?._max.occurredAt ?? null,
    };
  });

  const baseByGroup = new Map<string, FixedKpiGroupRow>();
  for (const g of scope.availableGroups) {
    baseByGroup.set(g.id, {
      groupId: g.id,
      groupCode: g.code,
      groupName: g.name,
      values: emptyMetricMap(),
      total: 0,
    });
  }

  for (const row of groupRowsRaw) {
    const target = baseByGroup.get(row.groupId);
    if (!target) continue;
    const code = row.metricCode as FixedKpiCode;
    const value = clampValue(row._sum.delta);
    target.values[code] = value;
    target.total += value;
  }

  const groupRows = Array.from(baseByGroup.values());
  groupRows.sort((a, b) => b.total - a.total || a.groupCode.localeCompare(b.groupCode, "tr"));

  return {
    availableGroups: scope.availableGroups,
    selectedGroupId: scope.selectedGroupId,
    selectedGroupCode: scope.selectedGroupCode,
    summaries,
    groupRows,
  };
}

async function resolveScope(user: CurrentUser, requestedGroupId?: string | null): Promise<Scope> {
  if (isAdmin(user)) {
    const groups = await prisma.group.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });
    const hasRequested = !!requestedGroupId && groups.some((g) => g.id === requestedGroupId);
    const selectedGroup = hasRequested
      ? groups.find((g) => g.id === requestedGroupId) ?? null
      : null;
    return {
      availableGroups: groups,
      selectedGroupId: selectedGroup?.id ?? null,
      selectedGroupCode: selectedGroup?.code ?? null,
      whereGroupId: selectedGroup?.id ?? null,
    };
  }

  if (isModerator(user) && user.groupId && user.groupCode && user.groupName) {
    return {
      availableGroups: [{ id: user.groupId, code: user.groupCode, name: user.groupName }],
      selectedGroupId: user.groupId,
      selectedGroupCode: user.groupCode,
      whereGroupId: user.groupId,
    };
  }

  return {
    availableGroups: [],
    selectedGroupId: null,
    selectedGroupCode: null,
    whereGroupId: null,
  };
}

function emptyMetricMap(): Record<FixedKpiCode, number> {
  return {
    KPI_PROJECT_IDEA_TOTAL: 0,
    KPI_PROJECT_APPLICATION_TOTAL: 0,
    KPI_SUCCESSFUL_PROJECT_TOTAL: 0,
    KPI_EVENT_ATTENDED_TOTAL: 0,
    KPI_EVENT_ORGANIZED_TOTAL: 0,
    KPI_CONTENT_TOTAL: 0,
    KPI_STAKEHOLDER_TOTAL: 0,
  };
}

function clampValue(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0));
}

export async function listCustomKpisForUser(user: CurrentUser): Promise<CustomKpiListItem[]> {
  if (!isAdmin(user) && !isModerator(user)) return [];

  const rows = await prisma.kpiCustom.findMany({
    where: {
      deletedAt: null,
      ...(isAdmin(user) ? {} : { groupId: user.groupId ?? "__none__" }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { id: true, code: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      assignees: {
        select: {
          assigneeType: true,
          user: { select: { name: true, email: true } },
          group: { select: { code: true } },
        },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          field: true,
          oldValue: true,
          newValue: true,
          reason: true,
          createdAt: true,
          changedBy: { select: { name: true, email: true } },
        },
      },
      baselineHistory: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          field: true,
          oldValue: true,
          newValue: true,
          reason: true,
          createdAt: true,
          changedBy: { select: { name: true, email: true } },
        },
      },
      evidences: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          evidenceType: true,
          createdAt: true,
          uploadedBy: { select: { name: true, email: true } },
          attachment: { select: { id: true, originalName: true, size: true } },
        },
      },
    },
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    groupId: row.groupId,
    groupCode: row.group.code,
    groupName: row.group.name,
    name: row.name,
    description: row.description,
    baselineValue: row.baselineValue?.toString() ?? null,
    baselineDate: row.baselineDate,
    targetValue: row.targetValue?.toString() ?? null,
    targetDate: row.targetDate,
    actualValue: row.actualValue?.toString() ?? null,
    status: row.status,
    approvalStatus: row.approvalStatus,
    createdAt: row.createdAt,
    createdByName: row.createdBy.name?.trim() || row.createdBy.email,
    assignees: row.assignees.map((a) => ({
      type: a.assigneeType,
      label:
        a.assigneeType === "GROUP"
          ? (a.group?.code ?? "Grup")
          : (a.user?.name?.trim() || a.user?.email || "Kullanici"),
    })),
    revisions: row.revisions.map((r) => ({
      id: r.id,
      field: r.field,
      oldValue: jsonAsString(r.oldValue),
      newValue: jsonAsString(r.newValue),
      reason: r.reason ?? null,
      changedByName: r.changedBy.name?.trim() || r.changedBy.email,
      createdAt: r.createdAt,
    })),
    baselineHistory: row.baselineHistory.map((r) => ({
      id: r.id,
      field: r.field,
      oldValue: jsonAsString(r.oldValue),
      newValue: jsonAsString(r.newValue),
      reason: r.reason ?? null,
      changedByName: r.changedBy.name?.trim() || r.changedBy.email,
      createdAt: r.createdAt,
    })),
    evidences: row.evidences.map((e) => ({
      id: e.id,
      evidenceType: e.evidenceType,
      uploadedByName: e.uploadedBy.name?.trim() || e.uploadedBy.email,
      createdAt: e.createdAt,
      attachment: {
        id: e.attachment.id,
        originalName: e.attachment.originalName,
        size: e.attachment.size,
      },
    })),
  }));
}

export async function listAssignableUsersForGroup(groupId: string): Promise<KpiAssignableUser[]> {
  const rows = await prisma.user.findMany({
    where: {
      groupId,
      status: "ACTIVE",
      NOT: { email: { equals: "admin@dft.ktlsr.com", mode: "insensitive" } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.name?.trim() || row.email,
  }));
}

function jsonAsString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
