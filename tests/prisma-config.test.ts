import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getPrismaDatasourceUrl } from "@/lib/prisma-config";

describe("getPrismaDatasourceUrl", () => {
  it("returns DATABASE_URL when it is provided", () => {
    expect(
      getPrismaDatasourceUrl({
        DATABASE_URL: "postgresql://postgres:secret@localhost:5432/notes_selfhosted?schema=public",
      })
    ).toBe("postgresql://postgres:secret@localhost:5432/notes_selfhosted?schema=public");
  });

  it("falls back to a placeholder URL when DATABASE_URL is missing", () => {
    expect(getPrismaDatasourceUrl({})).toBe(
      "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public"
    );
  });
});

describe("prisma.config.ts", () => {
  it("uses a relative import so Prisma can load it during Docker builds", () => {
    const configSource = readFileSync(resolve(process.cwd(), "prisma.config.ts"), "utf8");

    expect(configSource).not.toContain('from "@/');
    expect(configSource).toContain('from "./lib/prisma-config"');
  });
});
