import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const testDir = path.dirname(testFilePath);
const repoRoot = path.resolve(testDir, "..");
const setupScriptPath = path.join(repoRoot, "scripts", "setup.mjs");
const packageJsonPath = path.join(repoRoot, "package.json");

function runSetupInDir(cwd: string, env: NodeJS.ProcessEnv = {}) {
  return spawnSync("node", [setupScriptPath], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

describe("setup script smoke checks", () => {
  it("wires package script name to setup entrypoint", async () => {
    const packageJsonRaw = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.setup).toBe("node scripts/setup.mjs");
  });

  it("fails with actionable output when .env is missing", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "yunwei-setup-missing-env-"));
    try {
      const result = runSetupInDir(tmpDir);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Missing .env file.");
      expect(result.stderr).toContain("Copy .env.example to .env, then run pnpm run setup again.");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not allow inherited shell env vars to bypass .env validation", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "yunwei-setup-env-bypass-"));
    try {
      await writeFile(
        path.join(tmpDir, ".env"),
        [
          "SESSION_SECRET=12345678901234567890123456789012",
          "APP_PASSWORD_HASH=\\$2b\\$12\\$exampleexampleexampleexampleexampleexampleexample",
        ].join("\n"),
        "utf8"
      );

      const result = runSetupInDir(tmpDir, {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Setup environment validation failed:");
      expect(result.stderr).toContain("- DATABASE_URL is required.");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
