import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const testDir = path.dirname(testFilePath);
const repoRoot = path.resolve(testDir, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const envExamplePath = path.join(repoRoot, ".env.example");
const initEnvScriptPath = path.join(repoRoot, "scripts", "init-env.mjs");

function runInitEnv(cwd: string, password?: string) {
  const args = [initEnvScriptPath];
  if (password) {
    args.push(password);
  }

  return spawnSync("node", args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

describe("init env script", () => {
  it("wires package script name to init env entrypoint", async () => {
    const packageJsonRaw = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["init:env"]).toBe("node scripts/init-env.mjs");
  });

  it("creates .env from .env.example with generated secret and password hash", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "yunwei-init-env-create-"));

    try {
      const envExample = await readFile(envExamplePath, "utf8");
      await writeFile(path.join(tmpDir, ".env.example"), envExample, "utf8");

      const result = runInitEnv(tmpDir, "test-password");

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(".env created successfully.");
      expect(result.stdout).toContain("Next step: run pnpm run setup");

      const envFile = await readFile(path.join(tmpDir, ".env"), "utf8");
      expect(envFile).toContain('DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public"');
      expect(envFile).not.toContain('SESSION_SECRET="replace-with-32+chars-random-string"');
      expect(envFile).toMatch(/SESSION_SECRET="[A-Za-z0-9]{32,}"/);
      expect(envFile).not.toContain('APP_PASSWORD_HASH="\\$2b\\$12\\$replace_with_bcrypt_hash"');
      expect(envFile).toMatch(/APP_PASSWORD_HASH="\\\$2[aby]\\\$12\\\$[^"\r\n]+"/);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("fails without overwriting when .env already exists", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "yunwei-init-env-existing-"));

    try {
      const envExample = await readFile(envExamplePath, "utf8");
      await writeFile(path.join(tmpDir, ".env.example"), envExample, "utf8");
      await writeFile(path.join(tmpDir, ".env"), 'SESSION_SECRET="keep-me"\n', "utf8");

      const result = runInitEnv(tmpDir, "test-password");

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(".env already exists. Refusing to overwrite it.");

      const envFile = await readFile(path.join(tmpDir, ".env"), "utf8");
      expect(envFile).toBe('SESSION_SECRET="keep-me"\n');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("fails with usage guidance when password is missing", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "yunwei-init-env-no-password-"));

    try {
      const envExample = await readFile(envExamplePath, "utf8");
      await writeFile(path.join(tmpDir, ".env.example"), envExample, "utf8");

      const result = runInitEnv(tmpDir);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Usage: node scripts/init-env.mjs "your-password"');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
