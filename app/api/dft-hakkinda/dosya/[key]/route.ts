import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { storage } from "@/lib/storage";
import { listAboutStorageKeys } from "@/features/about/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dft-hakkinda/dosya/:key
 *
 * Streams an attachment registered under the "DFT Hakkında" AppSetting.
 * Authorization rules:
 *  - viewer must be authenticated and ACTIVE,
 *  - requested storage key must be present in the persisted attachments
 *    list (allowlist) — prevents callers from probing arbitrary keys
 *    on the storage backend.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });

  const allowed = await listAboutStorageKeys();
  if (!allowed.has(key)) return new NextResponse("Not found", { status: 404 });

  try {
    const { stream, size, mimeType, originalName } = await storage.get(key);
    const headers = new Headers({
      "Content-Type": mimeType || "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return new NextResponse(stream, { headers });
  } catch {
    return new NextResponse("Storage error", { status: 500 });
  }
}
