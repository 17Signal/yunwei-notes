import { randomBytes } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import bcrypt from "bcryptjs";

const password = process.argv[2];
const envExamplePath = path.resolve(process.cwd(), ".env.example");
const envPath = path.resolve(process.cwd(), ".env");

if (!password) {
  console.error('Usage: node scripts/init-env.mjs "your-password"');
  process.exit(1);
}

try {
  await access(envPath);
  console.error(".env already exists. Refusing to overwrite it.");
  process.exit(1);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
    throw error;
  }
}

let envTemplate = "";
try {
  envTemplate = await readFile(envExamplePath, "utf8");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to read .env.example: ${message}`);
  process.exit(1);
}

const sessionSecret = randomBytes(36)
  .toString("base64")
  .replace(/[^A-Za-z0-9]/g, "")
  .slice(0, 48);

const hash = await bcrypt.hash(password, 12);
const envSafeHash = hash.replaceAll("$", "\\$");

const envContent = envTemplate
  .replace('SESSION_SECRET="replace-with-32+chars-random-string"', `SESSION_SECRET="${sessionSecret}"`)
  .replace('APP_PASSWORD_HASH="\\$2b\\$12\\$replace_with_bcrypt_hash"', `APP_PASSWORD_HASH="${envSafeHash}"`);

await writeFile(envPath, envContent, "utf8");

console.log(".env created successfully.");
console.log("Next step: run pnpm run setup");
