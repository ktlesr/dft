import { describe, expect, it } from "vitest";

import { displayUrl } from "@/features/shared/linkified-text";
import { formatDateTime } from "@/lib/utils";

describe("formatDateTime", () => {
  it("formats dates in a fixed timezone for hydration-safe output", () => {
    expect(formatDateTime("2026-05-25T21:30:00.000Z")).toBe("26 May 2026 00:30");
  });
});

describe("displayUrl", () => {
  it("keeps the host and path while hiding a long query string", () => {
    expect(displayUrl("https://example.com/useful-links?token=very-long-value")).toBe(
      "example.com/useful-links…",
    );
  });
});
