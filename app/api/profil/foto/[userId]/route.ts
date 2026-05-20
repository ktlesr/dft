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
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId } = await ctx.params;
  // `?size=lg` → 1024px lightbox sürümü; default ise 256px avatar.
  // Eski uploads'larda `imageLarge` yoktur → küçük resme düşeriz.
  const wantLarge = req.nextUrl.searchParams.get("size") === "lg";

  const viewer = await getCurrentUser();
  if (!viewer) return new NextResponse("Unauthorized", { status: 401 });
  if (viewer.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, imageLarge: true },
  });
  const candidate = (wantLarge ? row?.imageLarge : null) ?? row?.image ?? null;
  if (!candidate?.startsWith("storage:")) return new NextResponse("Not found", { status: 404 });
  const key = candidate.slice("storage:".length);

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
    // ENOENT → 404 (browser <img> fallback'i / initials doğal tetiklenir).
    // Burada DB'deki `User.image` referansına DOKUNMUYORUZ: deploy / volume
    // remount sırasında dosya geçici görünmezse, DB temizlemek bütün
    // referansları kalıcı yok eder ve volume düzeldikten sonra resimler
    // geri gelmez. Geçici ENOENT'lerin kalıcı veri kaybına dönüşmemesi için
    // bu route SADECE okur; ölü referans temizliği bir bakım işine bırakılır.
    const e2 = e as NodeJS.ErrnoException;
    if (e2?.code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error(
      "[api/profil/foto] storage.get failed",
      JSON.stringify({
        userId,
        storageKey: key,
        code: e2?.code,
        message: e2?.message,
      }),
    );
    return new NextResponse("Storage error", { status: 500 });
  }
}
