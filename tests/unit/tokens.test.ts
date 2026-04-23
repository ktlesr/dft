import { describe, it, expect } from "vitest";

import { createToken, hashToken, safeEqual } from "@/lib/tokens";

describe("createToken", () => {
  it("returns a URL-safe token (no +, /, =) of meaningful length", () => {
    const { token } = createToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url alphabet
  });

  it("hash of the raw token matches hashToken() output", () => {
    const { token, tokenHash } = createToken();
    expect(hashToken(token)).toEqual(tokenHash);
  });

  it("produces unique tokens across calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 32; i++) {
      const { token } = createToken();
      expect(seen.has(token)).toBe(false);
      seen.add(token);
    }
  });

  it("hashes are deterministic for the same input", () => {
    expect(hashToken("fixed-input")).toEqual(hashToken("fixed-input"));
    expect(hashToken("a")).not.toEqual(hashToken("b"));
  });
});

describe("safeEqual", () => {
  it("true for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("", "")).toBe(true);
  });

  it("false for different strings (same length)", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
  });

  it("false for different lengths (short-circuits)", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});
