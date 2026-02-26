import "dotenv/config";

import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/login/route";
import { createSessionToken, verifySessionToken } from "@/lib/auth";

describe("auth login route", () => {
  it("can create and verify a session token", async () => {
    const token = await createSessionToken();
    const valid = await verifySessionToken(token);
    expect(valid).toBe(true);
  });

  it("returns 401 for invalid password instead of 500", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "invalid-password" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      error: "Invalid password.",
      code: "INVALID_PASSWORD",
    });
  });
});
