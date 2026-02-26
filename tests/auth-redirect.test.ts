import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "../lib/auth-redirect";

describe("sanitizeNextPath", () => {
  it("returns safe internal path", () => {
    expect(sanitizeNextPath("/notes?page=1")).toBe("/notes?page=1");
  });

  it("falls back to root for empty or external-looking paths", () => {
    expect(sanitizeNextPath(undefined)).toBe("/");
    expect(sanitizeNextPath("https://evil.test")).toBe("/");
    expect(sanitizeNextPath("//evil.test")).toBe("/");
  });
});
