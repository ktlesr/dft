import { describe, it, expect } from "vitest";

import { loginSchema, resetSchema } from "@/features/auth/schemas";
import { boardPostSchema } from "@/features/board/schemas";
import { meetingSchema } from "@/features/meeting/schemas";
import { minuteSchema } from "@/features/minute/schemas";
import { reportSchema } from "@/features/report/schemas";
import {
  contentSchema,
  eventSchema,
  projectApplicationSchema,
  projectIdeaSchema,
} from "@/features/records/schemas";

/* ── Auth ──────────────────────────────────────────────────────── */

describe("loginSchema", () => {
  // Faz 9: login artık yalnızca `ad.soyad` biçiminde kullanıcı adı kabul eder;
  // e-posta tabanlı giriş kapalıdır.

  it("lowercases and trims username", () => {
    const r = loginSchema.parse({ email: "  ALI.ERTURK ", password: "x" });
    expect(r.email).toBe("ali.erturk");
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "ali.erturk", password: "" }).success).toBe(false);
  });

  it("rejects email-style input (no @ allowed)", () => {
    expect(loginSchema.safeParse({ email: "ali@erturk.tr", password: "x" }).success).toBe(false);
  });

  it("rejects whitespace in username", () => {
    expect(loginSchema.safeParse({ email: "ali erturk", password: "x" }).success).toBe(false);
  });

  it("rejects leading / trailing dot", () => {
    expect(loginSchema.safeParse({ email: ".ali.erturk", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "ali.erturk.", password: "x" }).success).toBe(false);
  });
});

// signupSchema was removed — DFT Portal no longer exposes public signup.
// Password strength / confirm-match coverage lives in `resetSchema` tests
// (same `password` helper under the hood).

describe("resetSchema", () => {
  const good = {
    token: "x".repeat(32),
    password: "Str0ng#Passw0rd!",
    confirmPassword: "Str0ng#Passw0rd!",
  };

  it("accepts a compliant payload", () => {
    expect(resetSchema.safeParse(good).success).toBe(true);
  });

  it("rejects when confirmPassword differs", () => {
    const r = resetSchema.safeParse({ ...good, confirmPassword: "Str0ng#Different1" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("confirmPassword");
    }
  });

  it("rejects obviously short tokens", () => {
    const r = resetSchema.safeParse({ ...good, token: "short" });
    expect(r.success).toBe(false);
  });

  it("enforces password strength", () => {
    expect(
      resetSchema.safeParse({ ...good, password: "short1A!", confirmPassword: "short1A!" }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({ ...good, password: "nouppercase1!", confirmPassword: "nouppercase1!" }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({ ...good, password: "NoDigitsHere!", confirmPassword: "NoDigitsHere!" }).success,
    ).toBe(false);
    expect(
      resetSchema.safeParse({ ...good, password: "NoSymbol12345", confirmPassword: "NoSymbol12345" }).success,
    ).toBe(false);
  });
});

/* ── Board ─────────────────────────────────────────────────────── */

describe("boardPostSchema", () => {
  it("parses tags from comma-separated string and caps at 12", () => {
    const tags = Array.from({ length: 20 }, (_, i) => `t${i}`).join(",");
    const r = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Duyuru",
      body: "İçerik",
      tags,
      pinned: "",
    });
    expect(r.tags).toHaveLength(12);
  });

  it("pinned is coerced to boolean", () => {
    const on = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Başlık",
      body: "İçerik",
      pinned: "on",
    });
    expect(on.pinned).toBe(true);

    const off = boardPostSchema.parse({
      scope: "GENERAL",
      kind: "NEWS",
      title: "Başlık",
      body: "İçerik",
    });
    expect(off.pinned).toBe(false);
  });

  it("externalUrl must be http(s) if provided", () => {
    expect(
      boardPostSchema.safeParse({
        scope: "GENERAL",
        kind: "NEWS",
        title: "t",
        body: "yy",
        externalUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);

    expect(
      boardPostSchema.parse({
        scope: "GENERAL",
        kind: "NEWS",
        title: "Başlık",
        body: "İçerik",
        externalUrl: "https://example.com",
      }).externalUrl,
    ).toBe("https://example.com");
  });

  it("rejects invalid scope / kind", () => {
    expect(
      boardPostSchema.safeParse({
        scope: "SECRET",
        kind: "NEWS",
        title: "t",
        body: "yy",
      }).success,
    ).toBe(false);
  });
});

/* ── Meeting / Minute / Report ─────────────────────────────────── */

describe("meetingSchema", () => {
  const base = {
    title: "Aylık toplantı",
    startAt: "2026-06-15T14:00",
    pinToBoard: "on",
  };

  it("rejects endAt before startAt", () => {
    const r = meetingSchema.safeParse({
      ...base,
      endAt: "2026-06-15T10:00",
    });
    expect(r.success).toBe(false);
  });

  it("accepts endAt after startAt", () => {
    expect(
      meetingSchema.safeParse({ ...base, endAt: "2026-06-15T16:00" }).success,
    ).toBe(true);
  });

  it("coerces pinToBoard to boolean", () => {
    expect(meetingSchema.parse(base).pinToBoard).toBe(true);
    expect(meetingSchema.parse({ ...base, pinToBoard: undefined }).pinToBoard).toBe(false);
  });
});

describe("minuteSchema", () => {
  it("requires meetingId + non-empty content", () => {
    const r = minuteSchema.safeParse({
      meetingId: "",
      date: "2026-06-15",
      attendees: "",
      topics: "",
      decisions: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("rejects periodEnd before periodStart", () => {
    const r = reportSchema.safeParse({
      kind: "YOL_HARITASI",
      title: "Ilk rapor",
      body: "İçerik burada.",
      periodStart: "2026-06-01",
      periodEnd: "2026-05-01",
    });
    expect(r.success).toBe(false);
  });

  it("accepts an empty period (Kapanış Raporu)", () => {
    expect(
      reportSchema.safeParse({
        kind: "KAPANIS",
        title: "Kapanış",
        body: "Yıl sonu özet",
      }).success,
    ).toBe(true);
  });
});

/* ── Records ───────────────────────────────────────────────────── */

describe("record schemas", () => {
  it("projectApplicationSchema accepts a plain numeric string", () => {
    const r = projectApplicationSchema.parse({
      projectName: "Proje X",
      budget: "150000",
      memberFunction: "BIREYSEL",
      partnerMemberIds: [],
    });
    expect(r.budget).toBe("150000");
  });

  it("projectApplicationSchema accepts a single comma as decimal separator", () => {
    // Comma → dot normalisation handles the TR "150000,50" input form.
    const r = projectApplicationSchema.parse({
      projectName: "Proje X",
      budget: "150000,50",
      memberFunction: "BIREYSEL",
      partnerMemberIds: [],
    });
    expect(r.budget).toBe("150000.50");
  });

  it("projectApplicationSchema rejects non-numeric budget", () => {
    const r = projectApplicationSchema.safeParse({
      projectName: "Proje X",
      budget: "çok para",
      memberFunction: "BIREYSEL",
      partnerMemberIds: [],
    });
    expect(r.success).toBe(false);
  });

  it("eventSchema requires a date", () => {
    expect(
      eventSchema.safeParse({
        name: "Çalıştay",
        date: "",
        kind: "CALISTAY",
        format: "FIZIKI",
        role: "KATILIMCI",
      }).success,
    ).toBe(false);
  });

  it("eventSchema rejects unknown event kind", () => {
    expect(
      eventSchema.safeParse({
        name: "Çalıştay",
        date: "2026-06-15",
        kind: "INVALID_KIND",
        format: "FIZIKI",
        role: "KATILIMCI",
      }).success,
    ).toBe(false);
  });

  it("contentSchema accepts the other kind", () => {
    expect(
      contentSchema.safeParse({
        title: "Diğer içerik",
        kind: "DIGER",
      }).success,
    ).toBe(true);
  });

  it("contentSchema accepts the URL kind", () => {
    expect(
      contentSchema.safeParse({
        title: "Bağlantı içeriği",
        kind: "BAGLANTI_URL",
      }).success,
    ).toBe(true);
  });

  it("projectIdeaSchema accepts a minimal payload", () => {
    const r = projectIdeaSchema.parse({
      title: "Bir fikir",
    });
    expect(r.title).toBe("Bir fikir");
  });
});
