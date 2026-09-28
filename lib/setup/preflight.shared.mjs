const REQUIRED_SETUP_ENV_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "APP_PASSWORD_HASH",
];
const MIN_SESSION_SECRET_LENGTH = 32;

export function validateSetupEnv(env) {
  const errors = [];

  for (const key of REQUIRED_SETUP_ENV_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      errors.push(`${key} is required.`);
    }
  }

  const sessionSecret = env.SESSION_SECRET?.trim();
  if (sessionSecret && sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    errors.push(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long.`,
    );
  }
  if (sessionSecret?.startsWith("replace-with-")) {
    errors.push(
      "SESSION_SECRET must be generated, not the example placeholder.",
    );
  }
  const hash = env.APP_PASSWORD_HASH?.trim().replaceAll("\\$", "$");
  if (
    hash &&
    !/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(hash)
  ) {
    errors.push(
      "APP_PASSWORD_HASH must be a valid bcrypt hash. Run pnpm init:env to generate one.",
    );
  }
  if (env.DATABASE_URL?.trim()) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname)
        throw new Error();
    } catch {
      errors.push("DATABASE_URL must be a PostgreSQL connection URL.");
    }
  }
  if (env.COOKIE_SECURE && !["true", "false"].includes(env.COOKIE_SECURE)) {
    errors.push("COOKIE_SECURE must be true or false.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
