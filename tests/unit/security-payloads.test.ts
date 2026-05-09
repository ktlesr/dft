/**
 * Security payload tests — pen-test style negative cases against the Zod
 * schemas at the perimeter. Each test asserts that a known-bad input
 * (XSS URL, CRLF injection, control chars, oversized field, …) is REJECTED
 * by the schema, so the static review's claim that "URLs require https?://
 * and React escapes the rest" stays true under hostile input.
 *
 * These are pure-function tests — no DB, no network. They exercise
 * `safeParse` and assert `success === false` (or, for transformations,
 * the sanitised output).
 */

import { describe, it, expect } from "vitest";

import { loginSchema, forgotSchema } from "@/features/auth/schemas";
import { boardPostSchema } from "@/features/board/schemas";
import { meetingSchema } from "@/features/meeting/schemas";
import { eventSchema, projectApplicationSchema } from "@/features/records/schemas";

/* ── URL hostile inputs ────────────────────────────────────────── */

const URL_PAYLOADS_BLOCKED = [
  // Classic XSS schemes
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "JAVASCRIPT:alert(1)",
  "  javascript:alert(1)  ", // leading whitespace (trim-then-validate)
  "data:text/html,<script>alert(1)</script>",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "ftp://attacker.example/x",
  // Schemeless / protocol-relative — opens via current scheme but is not
  // anchored to http(s) explicitly.
  "//attacker.example/path",
  "/etc/passwd",
  // Whitespace bypass attempts (common WAF defeat vector)
  "java\tscript:alert(1)",
  "java\nscript:alert(1)",
  // Mixed-scheme polyglot — "javascript" appears via inline anchor;
  // anchor parsing happens in the browser but our regex requires the
  // string to *start* with http(s)://, so this should be rejected.
  "javascript://example.com/%0aalert(1)",
  // Empty bytes / null byte
  "https://example.com\x00.evil.tld",
  "http://example.com\r\nLocation: http://attacker",
  // No scheme at all
  "example.com",
  "www.example.com",
];

const URL_PAYLOADS_ALLOWED = [
  "https://example.com",
  "http://example.com/path?x=1#frag",
  "https://example.com/öz-türkçe-yol", // unicode rejected by current ASCII regex; see test
];

describe("URL fields — javascript:/data:/scheme bypass attempts", () => {
  it.each(URL_PAYLOADS_BLOCKED)("boardPost.externalUrl rejects %j", (bad) => {
    const r = boardPostSchema.safeParse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Başlık",
      body: "İçerik",
      externalUrl: bad,
    });
    expect(r.success).toBe(false);
  });

  it.each(URL_PAYLOADS_BLOCKED)("meeting.onlineUrl rejects %j", (bad) => {
    const r = meetingSchema.safeParse({
      title: "Toplantı",
      startAt: "2026-06-15T14:00",
      onlineUrl: bad,
    });
    expect(r.success).toBe(false);
  });

  it.each(URL_PAYLOADS_BLOCKED)("event.externalUrl rejects %j", (bad) => {
    const r = eventSchema.safeParse({
      name: "Etkinlik",
      date: "2026-06-15",
      externalUrl: bad,
    });
    expect(r.success).toBe(false);
  });

  it("allows http(s) URLs", () => {
    expect(
      boardPostSchema.safeParse({
        scope: "GENERAL",
        kind: "NEWS",
        title: "Başlık",
        body: "İçerik",
        externalUrl: "https://example.com/path?x=1#frag",
      }).success,
    ).toBe(true);
  });

  it("documents the current ASCII-only URL regex", () => {
    // Regression note: the current regex character class is ASCII-only,
    // so unicode hostnames are rejected. Not a security issue (over-strict
    // allow-list), but pin behavior so a future change is intentional.
    const r = boardPostSchema.safeParse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Başlık",
      body: "İçerik",
      externalUrl: "https://example.com/öz-türkçe-yol",
    });
    expect(r.success).toBe(false);
  });
});

/* ── Email injection ───────────────────────────────────────────── */

describe("email — header / CRLF injection attempts", () => {
  const EMAIL_BAD = [
    "user@example.com\r\nBcc: attacker@evil.com",
    "user@example.com%0d%0aBcc:%20attacker@evil.com",
    "user@example.com\nX-Header: pwn",
    "user@example.com\x00@evil.tld",
    "user@example.com;DROP TABLE users--",
    "<script>alert(1)</script>@example.com",
    'user"@example.com',
    "@example.com",
    "user@",
    "plainstring",
  ];

  it.each(EMAIL_BAD)("login email rejects %j", (bad) => {
    expect(loginSchema.safeParse({ email: bad, password: "x" }).success).toBe(false);
  });

  it.each(EMAIL_BAD)("forgot email rejects %j", (bad) => {
    expect(forgotSchema.safeParse({ email: bad }).success).toBe(false);
  });

  it("normalises email to lowercase + trims", () => {
    const r = loginSchema.parse({ email: "  ADMIN+Test@DFT.LOCAL  ", password: "x" });
    expect(r.email).toBe("admin+test@dft.local");
  });
});

/* ── Length limits — DoS-adjacent but data-integrity ───────────── */

describe("oversized inputs are bounded", () => {
  it("body capped at 10000 chars on board posts", () => {
    const r = boardPostSchema.safeParse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "ok",
      body: "x".repeat(10_001),
    });
    expect(r.success).toBe(false);
  });

  it("title capped at 200", () => {
    const r = boardPostSchema.safeParse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "x".repeat(201),
      body: "ok",
    });
    expect(r.success).toBe(false);
  });

  it("assessment capped at 10000", () => {
    const r = boardPostSchema.safeParse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "ok",
      body: "ok",
      assessment: "x".repeat(10_001),
    });
    expect(r.success).toBe(false);
  });

  it("meeting agenda capped at 5000", () => {
    const r = meetingSchema.safeParse({
      title: "Toplantı",
      startAt: "2026-06-15T14:00",
      agenda: "x".repeat(5_001),
    });
    expect(r.success).toBe(false);
  });
});

/* ── Tag list — nested separator / overflow ────────────────────── */

describe("tags input — overflow / weird separators", () => {
  it("limits tags to 12 entries even with 100 in the input", () => {
    const tags = Array.from({ length: 100 }, (_, i) => `t${i}`).join(",");
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "ok",
      body: "ok",
      tags,
    });
    expect(r.tags).toHaveLength(12);
  });

  it("strips empty tokens from whitespace-only entries", () => {
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "ok",
      body: "ok",
      tags: "a,,  ,b,   ,c",
    });
    expect(r.tags).toEqual(["a", "b", "c"]);
  });

  // A single very long tag still gets through (no per-tag cap), but
  // total count is bounded. Pin the behaviour so future hardening is
  // an explicit decision.
  it("does not cap individual tag length (pin current behavior)", () => {
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "ok",
      body: "ok",
      tags: "x".repeat(500),
    });
    expect(r.tags).toEqual(["x".repeat(500)]);
  });
});

/* ── Enum tampering — forged client values ─────────────────────── */

describe("enum tampering rejected", () => {
  it("boardPostSchema rejects unknown scope", () => {
    expect(
      boardPostSchema.safeParse({
        scope: "ADMIN_ONLY",
        kind: "NEWS",
        title: "ok",
        body: "ok",
      }).success,
    ).toBe(false);
  });

  it("boardPostSchema rejects unknown kind", () => {
    expect(
      boardPostSchema.safeParse({
        scope: "GENERAL",
        kind: "MALICIOUS",
        title: "ok",
        body: "ok",
      }).success,
    ).toBe(false);
  });

  it("project application kind enum is closed", () => {
    expect(
      projectApplicationSchema.safeParse({
        projectName: "Proje X",
        kind: "DESTRUCTIVE",
        partnerMemberIds: [],
      }).success,
    ).toBe(false);
  });
});

/* ── Numeric bypass — overflow / scientific notation ────────────── */

describe("decimal field — overflow / odd notations", () => {
  const BAD_NUMS = [
    "Infinity",
    "-Infinity",
    "NaN",
    "1e308", // scientific (regex requires plain digits)
    "0x10",
    "1,000,000", // multi-comma not allowed (only single comma → dot)
    "1 000",
    "1.2.3",
    "--5",
  ];

  it.each(BAD_NUMS)("budget rejects %j", (bad) => {
    expect(
      projectApplicationSchema.safeParse({
        projectName: "Proje X",
        budget: bad,
        kind: "BIREYSEL",
        partnerMemberIds: [],
      }).success,
    ).toBe(false);
  });

  it("allows negative integers via regex (pin current behavior)", () => {
    // The regex accepts `-?\d+(\.\d+)?` — a negative budget passes
    // schema and only Decimal column constraints would catch it.
    // Pin the behavior so a future check is an explicit decision.
    const r = projectApplicationSchema.safeParse({
      projectName: "Proje X",
      budget: "-100",
      kind: "BIREYSEL",
      partnerMemberIds: [],
    });
    expect(r.success).toBe(true);
  });
});

/* ── Date — strange but parseable strings ──────────────────────── */

describe("date inputs — strict-but-permissive boundary", () => {
  it("rejects garbage date strings", () => {
    expect(
      meetingSchema.safeParse({
        title: "ok",
        startAt: "tomorrow",
      }).success,
    ).toBe(false);
  });

  it("rejects empty required date", () => {
    expect(
      eventSchema.safeParse({
        name: "ok",
        date: "",
      }).success,
    ).toBe(false);
  });
});

/* ── Plain text fields — markup is stored as-is, NOT executed ──── */

describe("plain-text inputs accept markup characters", () => {
  // Defense-in-depth note: the *render* layer is what protects against
  // XSS (React JSX expressions auto-escape; no `dangerouslySetInnerHTML`
  // anywhere). The schema is intentionally NOT a sanitiser — it must
  // pass `<script>` through unchanged so the original text is preserved
  // for legitimate uses (e.g. discussing CVE-1999-XXXX in a body).
  //
  // These tests pin that contract. If anyone later "fixes" the schema
  // to strip tags here, this test will fail and force a discussion.
  it("body retains <script> as literal text (escape happens at render)", () => {
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Güvenlik notu",
      body: "İlgili CVE: <script>alert(1)</script>",
    });
    expect(r.body).toContain("<script>");
  });

  it("title retains html entities verbatim", () => {
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "&lt;img onerror=alert(1)&gt;",
      body: "ok",
    });
    expect(r.title).toBe("&lt;img onerror=alert(1)&gt;");
  });
});
