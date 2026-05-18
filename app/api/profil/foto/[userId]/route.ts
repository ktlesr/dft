import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profil/foto/:userId
 *
 * Stream a user's profile photo. Any ACTIVE user in the portal can view
 * any other user's avatar — this is intentional because avatars appear on
 * board posts, meeting lists, etc. Stored files are written with
 * `User.image = storage:<storageKey>`.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;

  const viewer = await getCurrentUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });
  if (viewer.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });
  if (!row?.image?.startsWith("storage:")) return new NextResponse("Not found", { status: 404 });
  const key = row.image.slice("storage:".length);

  try {
    const { stream, size, mimeType } = await storage.get(key);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": mimeType || "image/jpeg",
        "Content-Length": String(size),
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    // Dosya storage'da yoksa (ör. volume mount yok / upload klasörü
    // sıfırlandı), DB'deki ölü referansı temizleyip 404 dön. Böylece
    // browser <img> fallback'i (avatar baş harfleri) doğal görünür ve
    // konsoldaki sürekli 500 gürültüsü biter.
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      await prisma.user
        .update({ where: { id: userId }, data: { image: null } })
        .catch(() => undefined);
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse("Storage error", { status: 500 });
  }
}
