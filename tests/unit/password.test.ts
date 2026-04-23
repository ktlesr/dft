import { describe, it, expect } from "vitest";

import { hashPassword, verifyPassword, isStrongPassword } from "@/lib/password";

describe("isStrongPassword", () => {
  it("accepts a compliant password", () => {
    expect(isStrongPassword("Admin!2026Dev")).toBe(true);
    expect(isStrongPassword("Str0ng#Passw0rd!")).toBe(true);
  });

  it("rejects passwords shorter than 10 chars", () => {
    expect(isStrongPassword("Short1!a")).toBe(false);
  });

  it("rejects passwords missing character classes", () => {
    expect(isStrongPassword("alllower1!ok")).toBe(false); // no uppercase
    expect(isStrongPassword("ALLUPPER1!OK")).toBe(false); // no lowercase
    expect(isStrongPassword("NoDigits!AAAA")).toBe(false); // no digit
    expect(isStrongPassword("NoSymbol12345")).toBe(false); // no special
  });

  it("rejects empty and whitespace-only", () => {
    expect(isStrongPassword("")).toBe(false);
    expect(isStrongPassword("          ")).toBe(false);
  });
});

describe("argon2id hash/verify", () => {
  it("verifies the same password it hashed", async () => {
    const hashed = await hashPassword("HunterTheSecond!2026");
    await expect(verifyPassword(hashed, "HunterTheSecond!2026")).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hashed = await hashPassword("HunterTheSecond!2026");
    await expect(verifyPassword(hashed, "hunterthesecond!2026")).resolves.toBe(false);
    await expect(verifyPassword(hashed, "Wrong!Password2026")).resolves.toBe(false);
  });

  it("returns false on malformed hashes instead of throwing", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const a = await hashPassword("SameInputHere!1");
    const b = await hashPassword("SameInputHere!1");
    expect(a).not.toEqual(b);
  });
}, { timeout: 20_000 });
