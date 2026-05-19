import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy (renamed from "middleware" in Next 16) — two responsibilities:
 *
 * 1. Auth gate (defense-in-depth): redirect unauthenticated traffic away
 *    from protected routes based on session cookie presence. The
 *    authoritative status/role/group check still happens in
 *    `app/(portal)/layout.tsx` via `requireActiveUser()`.
 *
 * 2. Per-request CSP nonce + security headers: generate a fresh nonce,
 *    expose it via `x-nonce` so server components can mint inline
 *    `<script nonce>` tags, and emit a strict Content-Security-Policy
 *    without the `unsafe-inline` escape hatch.
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
  "/not",
  "/bildirimler",
  "/ara",
  "/yonetim",
];

// Paths that *look* like they'd be protected but must stay public (e.g. the
// /kayit signup page vs. /kayit/yeni record-creation portal route).
const PUBLIC_EXACT = new Set<string>(["/kayit"]);

/**
 * Cryptographically random 128-bit nonce, base64-encoded. Runs on the edge,
 * so `crypto.getRandomValues` is used instead of `node:crypto`.
 */
function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa is available in the edge runtime.
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  // In dev, Next serves HMR via eval; we allow `unsafe-eval` only there.
  const scriptDev = isDev ? " 'unsafe-eval'" : "";
  // `strict-dynamic` lets nonce'd scripts load further scripts without us
  // having to whitelist every third-party host — recommended by the OWASP
  // CSP cheat sheet as the scalable production posture.
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptDev}`,
    // shadcn + Tailwind inject runtime styles (e.g. Radix's `data-state`
    // driven styling via `@radix-ui/react-*` portals). styled-jsx and
    // next-themes also write inline styles during hydration. We keep
    // `unsafe-inline` for `style-src` because it doesn't expose XSS on
    // its own — only attribute injection, which React escapes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

const STATIC_SECURITY_HEADERS: Array<[string, string]> = [
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  ["X-DNS-Prefetch-Control", "off"],
  ["X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet"],
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Auth gate ──────────────────────────────────────────────────
  const isPublicExact = PUBLIC_EXACT.has(pathname);
  const isProtected =
    !isPublicExact &&
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !hasSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // ── CSP + security headers ─────────────────────────────────────
  const nonce = mintNonce();
  const csp = buildCsp(nonce);

  // Propagate the nonce to the downstream render via request headers so
  // `headers().get('x-nonce')` inside RSCs can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set("Content-Security-Policy", csp);
  for (const [k, v] of STATIC_SECURITY_HEADERS) {
    res.headers.set(k, v);
  }
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Apply to everything except:
     *  - _next static / image assets (no HTML to guard)
     *  - favicon / robots / brand assets
     *
     * API routes are included so they pick up the security headers
     * (auth inside the routes themselves).
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|dft-logo.svg|yesil-dft.svg).*)",
  ],
};
