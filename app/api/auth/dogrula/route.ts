import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/dogrula?token=...&email=...
 *
 * Marks an email as verified if the one-time token is valid. The token
 * is stored hashed in DB; we compare the hash of the incoming token.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();
  const base = process.env.APP_URL ?? req.nextUrl.origin;

  if (!token || !email) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama-hata", base));
  }

  const tokenHash = hashToken(token);
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token: tokenHash } },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/giris?e=dogrulama-hata", base));
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token: tokenHash } },
    }),
  ]);

  return NextResponse.redirect(new URL("/giris?e=dogrulandi", base));
}
