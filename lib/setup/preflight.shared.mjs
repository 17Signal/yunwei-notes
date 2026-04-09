const REQUIRED_SETUP_ENV_KEYS = ["DATABASE_URL", "SESSION_SECRET", "APP_PASSWORD_HASH"];
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
    errors.push(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long.`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
