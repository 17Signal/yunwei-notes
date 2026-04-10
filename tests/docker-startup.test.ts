import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  getDockerStartupCommands,
  waitForDatabase,
} from "@/lib/docker/startup.shared.mjs";

const testFilePath = fileURLToPath(import.meta.url);
const testDir = path.dirname(testFilePath);
const repoRoot = path.resolve(testDir, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const dockerfilePath = path.join(repoRoot, "Dockerfile");
const composePath = path.join(repoRoot, "compose.yaml");

describe("docker startup helpers", () => {
  it("keeps the database internal and restarts the app service automatically", async () => {
    const composeFile = await readFile(composePath, "utf8");

    expect(composeFile).not.toContain('"5432:5432"');
    expect(composeFile).toMatch(/app:\s+restart:\s+unless-stopped/s);
  });

  it("does not persist build-only auth placeholders via ENV instructions", async () => {
    const dockerfile = await readFile(dockerfilePath, "utf8");

    expect(dockerfile).not.toContain('ENV SESSION_SECRET=');
    expect(dockerfile).not.toContain('ENV APP_PASSWORD_HASH=');
  });

  it("wires package script name to docker startup entrypoint", async () => {
    const packageJsonRaw = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["docker:start"]).toBe("node scripts/docker-start.mjs");
  });

  it("runs migrations before starting the app", () => {
    expect(getDockerStartupCommands()).toEqual([
      {
        command: "pnpm",
        args: ["prisma:migrate:deploy"],
        name: "migrate",
      },
      {
        command: "pnpm",
        args: ["start", "--hostname", "0.0.0.0", "--port", "3000"],
        name: "start",
      },
    ]);
  });

  it("waits for the database to become reachable", async () => {
    const connect = vi
      .fn<() => Promise<{ end: () => Promise<void> }>>()
      .mockRejectedValueOnce(new Error("db not ready"))
      .mockRejectedValueOnce(new Error("still starting"))
      .mockResolvedValue({
        end: vi.fn().mockResolvedValue(undefined),
      });

    await expect(
      waitForDatabase({
        connect,
        maxAttempts: 3,
        retryDelayMs: 0,
      })
    ).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledTimes(3);
  });

  it("fails after the configured number of retries", async () => {
    const connect = vi.fn<() => Promise<{ end: () => Promise<void> }>>().mockRejectedValue(new Error("offline"));

    await expect(
      waitForDatabase({
        connect,
        maxAttempts: 2,
        retryDelayMs: 0,
      })
    ).rejects.toThrow("Database did not become ready after 2 attempts. Last error: offline");

    expect(connect).toHaveBeenCalledTimes(2);
  });
});
