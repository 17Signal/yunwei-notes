import { spawnSync } from "node:child_process";
import { mkdir, access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";

import { validateSetupEnv } from "../lib/setup/preflight.shared.mjs";

const ENV_FILE_NAME = ".env";
const DEFAULT_UPLOAD_DIR = "./data/uploads";
const SETUP_COMMAND = "pnpm run setup";

async function runSetup() {
  const envPath = path.resolve(process.cwd(), ENV_FILE_NAME);

  try {
    await access(envPath);
  } catch {
    console.error("Missing .env file.");
    console.error(`Copy .env.example to .env, then run ${SETUP_COMMAND} again.`);
    process.exit(1);
  }

  let envFileText = "";
  try {
    envFileText = await readFile(envPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read ${ENV_FILE_NAME}: ${message}`);
    process.exit(1);
  }

  const parsedEnv = dotenv.parse(envFileText);
  const validation = validateSetupEnv(parsedEnv);
  if (!validation.ok) {
    console.error("Setup environment validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    console.error(`Update your .env values and run ${SETUP_COMMAND} again.`);
    process.exit(1);
  }

  for (const [key, value] of Object.entries(parsedEnv)) {
    process.env[key] = value;
  }

  const uploadDir = path.resolve(process.cwd(), parsedEnv.UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR);
  await mkdir(uploadDir, { recursive: true });
  console.log(`Upload directory ready: ${uploadDir}`);

  const prismaGenerate = spawnSync("pnpm prisma:generate", {
    stdio: "inherit",
    shell: true,
  });

  if (prismaGenerate.error) {
    console.error(`Failed to start pnpm prisma:generate: ${prismaGenerate.error.message}`);
    process.exit(1);
  }

  if (prismaGenerate.status !== 0) {
    console.error("Failed to run pnpm prisma:generate.");
    process.exit(prismaGenerate.status ?? 1);
  }

  console.log("Setup complete.");
  console.log("Next steps:");
  console.log("- Local development: pnpm prisma:migrate:dev && pnpm dev");
  console.log("- Production deploy: pnpm prisma:migrate:deploy && pnpm start");
}

runSetup().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Setup failed: ${message}`);
  process.exit(1);
});
