import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profil/cv/:userId
 *
 * Stream a user's CV. Only the owner or an ADMIN can download — CVs are
 * treated as sensitive profile data and are not shown alongside avatars.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;

  const viewer = await getCurrentUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });
  if (viewer.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });
  if (viewer.id !== userId && !isAdmin(viewer)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const row = await prisma.profile.findUnique({
    where: { userId },
    select: { cvStorageKey: true, cvOriginalName: true },
  });
  if (!row?.cvStorageKey) return new NextResponse("Not found", { status: 404 });

  try {
    const { stream, size, mimeType } = await storage.get(row.cvStorageKey);
    const filename = row.cvOriginalName || "cv";
    return new NextResponse(stream, {
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // ENOENT → 404. DB'deki `Profile.cvStorageKey` referansına dokunmayız:
    // geçici bir storage erişim hatası (deploy / volume remount) bütün
    // CV referanslarını kalıcı yok etmesin diye bu route SADECE okur.
    const e2 = e as NodeJS.ErrnoException;
    if (e2?.code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error(
      "[api/profil/cv] storage.get failed",
      JSON.stringify({
        userId,
        storageKey: row.cvStorageKey,
        code: e2?.code,
        message: e2?.message,
      }),
    );
    return new NextResponse("Storage error", { status: 500 });
  }
}
