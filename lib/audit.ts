import "server-only";

import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientIp, getUserAgent } from "@/lib/rate-limit";

type AuditInput = {
  action: AuditAction;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Record a single audit event. Never throws — audit failures should not
 * affect the main request. IP + UA are picked from headers automatically.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const [ipAddress, userAgent] = await Promise.all([getClientIp(), getUserAgent()]);
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata ?? Prisma_SKIP,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console -- observability of the observability path
    console.error("[audit] failed to write:", err);
  }
}

// Prisma doesn't accept `undefined` in optional JSON fields in all cases;
// centralise the “omit” sentinel to avoid mistakes at call sites.
const Prisma_SKIP = undefined as unknown as Prisma.InputJsonValue;
