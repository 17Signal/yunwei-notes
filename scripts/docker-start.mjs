import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

import { Pool } from "pg";

import { getDockerStartupCommands, waitForDatabase } from "../lib/docker/startup.shared.mjs";

function ensureDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Docker startup.");
  }
  return databaseUrl;
}

async function createDatabaseConnection(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
  });

  try {
    await pool.query("SELECT 1");
    return pool;
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
}

function runBlockingCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runServerCommand(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  child.on("error", (error) => {
    console.error(`Failed to start app server: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

async function runDockerStart() {
  const databaseUrl = ensureDatabaseUrl();

  console.log("Waiting for PostgreSQL to become ready...");
  await waitForDatabase({
    connect: async () => createDatabaseConnection(databaseUrl),
    onRetry: ({ attempt, maxAttempts, error }) => {
      console.log(`PostgreSQL not ready yet (${attempt}/${maxAttempts}): ${error.message}`);
    },
  });

  const [migrateStep, startStep] = getDockerStartupCommands();

  console.log("Applying Prisma migrations...");
  runBlockingCommand(migrateStep.command, migrateStep.args);

  console.log("Starting Next.js server...");
  runServerCommand(startStep.command, startStep.args);
}

runDockerStart().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Docker startup failed: ${message}`);
  process.exit(1);
});
