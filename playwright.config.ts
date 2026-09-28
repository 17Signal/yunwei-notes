import { defineConfig } from "@playwright/test";
import { hashSync } from "bcryptjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated, disposable PostgreSQL database before running browser tests.",
  );

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "pnpm prisma:migrate:deploy && pnpm build && pnpm start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: "browser-test-session-secret-not-for-production-use",
      // Next's dotenv expansion can also expand inherited hashes when a local
      // .env is present. Escaping works both with and without that local file.
      APP_PASSWORD_HASH: hashSync("browser-test-password", 4).replaceAll(
        "$",
        "\\$",
      ),
      COOKIE_SECURE: "false",
      UPLOAD_DIR: "./.artifacts/e2e-uploads",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
