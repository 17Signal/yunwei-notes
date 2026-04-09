import { validateSetupEnv as validateSetupEnvShared } from "./preflight.shared.mjs";

export type SetupEnv = Record<string, string | undefined>;

export type SetupValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateSetupEnv(env: SetupEnv): SetupValidationResult {
  return validateSetupEnvShared(env) as SetupValidationResult;
}
