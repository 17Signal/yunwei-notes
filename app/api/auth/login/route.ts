import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { readJson, apiError, apiOk } from "@/lib/api";
import {
  createSessionToken,
  getCookieConfig,
  verifyAppPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { checkLoginLimit } from "@/lib/login-limiter";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await readJson(request);
    } catch {
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    }

    const { password } = loginSchema.parse(body);
    const retryAfter = checkLoginLimit();
    if (retryAfter) {
      const response = apiError(
        429,
        "登录尝试过于频繁，请稍后再试。",
        "LOGIN_RATE_LIMITED",
      );
      response.headers.set("Retry-After", String(retryAfter));
      return response;
    }

    const valid = await verifyAppPassword(password);
    if (!valid) {
      return apiError(401, "Invalid password.", "INVALID_PASSWORD");
    }

    const token = await createSessionToken();
    const response = apiOk({ authenticated: true });
    const cookie = getCookieConfig();
    response.cookies.set(cookie.name, token, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    if (error instanceof ZodError) {
      return apiError(
        400,
        "Invalid request payload.",
        "VALIDATION_ERROR",
        error.flatten(),
      );
    }
    if (error instanceof Error) {
      console.error("Login failed:", error.message);
      if (process.env.NODE_ENV !== "production") {
        return apiError(500, "Unable to login.", "LOGIN_FAILED", {
          message: error.message,
        });
      }
    }
    return apiError(500, "Unable to login.", "LOGIN_FAILED");
  }
}
