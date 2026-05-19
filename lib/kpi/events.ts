import "server-only";

import { Prisma, type KpiMetricCode, type KpiSourceType } from "@prisma/client";

import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type Delta = 1 | -1;

type WriteKpiMetricEventInput = {
  metricCode: KpiMetricCode;
  sourceType: KpiSourceType;
  sourceId: string;
  actorUserId: string;
  groupId: string | null;
  delta: Delta;
  occurredAt?: Date;
};

export async function writeKpiMetricEvent(input: WriteKpiMetricEventInput): Promise<void> {
  try {
    const groupId = await resolveGroupId(input);
    if (!groupId) return;

    const row = await prisma.kpiMetricEvent.create({
      data: {
        metricCode: input.metricCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actorUserId: input.actorUserId,
        groupId,
        delta: input.delta,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });

    await audit({
      action: "KPI_METRIC_EVENT_CREATED",
      actorId: input.actorUserId,
      targetType: "KpiMetricEvent",
      targetId: row.id,
      metadata: {
        metricCode: input.metricCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        delta: input.delta,
        groupId,
      },
    });
  } catch (err) {
    if (isDuplicate(err)) return;
    // eslint-disable-next-line no-console -- non-blocking metrics path
    console.error("[kpi] writeKpiMetricEvent failed:", err);
  }
}

async function resolveGroupId(input: WriteKpiMetricEventInput): Promise<string | null> {
  if (input.delta === -1) {
    const seed = await prisma.kpiMetricEvent.findFirst({
      where: {
        metricCode: input.metricCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        delta: 1,
      },
      select: { groupId: true },
      orderBy: { createdAt: "asc" },
    });
    if (seed?.groupId) return seed.groupId;
  }
  return input.groupId;
}

function isDuplicate(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
