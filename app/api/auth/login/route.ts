import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError, apiOk } from "@/lib/api";
import { createSessionToken, getCookieConfig, verifyAppPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    }

    const { password } = loginSchema.parse(body);

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
    if (error instanceof ZodError) {
      return apiError(400, "Invalid request payload.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Error) {
      console.error("Login failed:", error.message);
      if (process.env.NODE_ENV !== "production") {
        return apiError(500, "Unable to login.", "LOGIN_FAILED", { message: error.message });
      }
    }
    return apiError(500, "Unable to login.", "LOGIN_FAILED");
  }
}
