import { describe, expect, it } from "vitest";

import { validateSetupEnv } from "../lib/setup/preflight";

describe("validateSetupEnv", () => {
  it("collects missing required environment variables", () => {
    const result = validateSetupEnv({});

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("DATABASE_URL is required.");
    expect(result.errors).toContain("SESSION_SECRET is required.");
    expect(result.errors).toContain("APP_PASSWORD_HASH is required.");
  });

  it("rejects short session secrets", () => {
    const result = validateSetupEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public",
      SESSION_SECRET: "too-short",
      APP_PASSWORD_HASH: "\\$2b\\$12\\$exampleexampleexampleexampleexampleexampleexample",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SESSION_SECRET must be at least 32 characters long.");
  });

  it("accepts a valid minimum configuration", () => {
    const result = validateSetupEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public",
      SESSION_SECRET: "12345678901234567890123456789012",
      APP_PASSWORD_HASH: "\\$2b\\$12\\$exampleexampleexampleexampleexampleexampleexample",
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
