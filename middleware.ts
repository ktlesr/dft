import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-safe auth gate (defense in depth).
 *
 * Only checks **presence** of the session cookie so we can run at the edge
 * without DB access. The authoritative status/role/group checks happen in
 * `app/(portal)/layout.tsx` via `requireActiveUser()`.
 *
 * This middleware keeps unauthenticated traffic from even reaching the
 * portal render path.
 */

const SESSION_COOKIES = [
  "__Secure-dft-portal.session",
  "dft-portal.session",
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSession(req: NextRequest) {
  for (const name of SESSION_COOKIES) {
    if (req.cookies.get(name)?.value) return true;
  }
  return false;
}

// Routes that always require authentication. Keep in sync with nav-config.
const PROTECTED_PREFIXES = [
  "/panel",
  "/panolar",
  "/kayit",
  "/kayitlarim",
  "/calisma-grubum",
  "/belgeler",
  "/profilim",
  "/toplanti-bildirimi",
  "/toplanti",
  "/tutanak",
  "/rapor",
  "/bildirimler",
  "/yonetim",
];

// Paths that *look* like they'd be protected but must stay public (e.g. the
// /kayit signup page vs. /kayit/yeni record-creation portal route).
const PUBLIC_EXACT = new Set<string>(["/kayit"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (hasSession(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/giris";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Apply to everything except:
     *  - /api routes (they have their own auth)
     *  - _next static / image assets
     *  - favicon / robots / brand assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)",
  ],
};
