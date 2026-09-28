import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { readJson } from "@/lib/api";
import { createLoginLimiter } from "@/lib/login-limiter";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import {
  createSessionToken,
  getCookieConfig,
  verifySessionToken,
} from "@/lib/auth";
import { proxy } from "@/proxy";

afterEach(() => vi.unstubAllEnvs());
describe("request security", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "/api/auth/session",
    "/login",
  ])("rejects unsafe login redirects %s", (value) =>
    expect(sanitizeNextPath(value)).toBe("/"),
  );
  it("limits bcrypt attempts and resets after the window", () => {
    const check = createLoginLimiter(2, 1000);
    expect(check(0)).toBe(0);
    expect(check(1)).toBe(0);
    expect(check(2)).toBe(1);
    expect(check(1000)).toBe(0);
  });
  it("rejects cross-origin writes before authentication", async () => {
    const response = await proxy(
      new NextRequest("https://notes.local/api/auth/login", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(response.status).toBe(403);
  });
  it("protects API paths with apparent file extensions", async () => {
    expect(
      (await proxy(new NextRequest("https://notes.local/api/notes/test.png")))
        .status,
    ).toBe(401);
  });
  it("accepts same-origin requests when Next normalizes the loopback hostname", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3100/api/auth/login", {
        method: "POST",
        headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      }),
    );
    expect(response.status).toBe(200);
  });
  it("supports explicit HTTP cookies and production secure cookies", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COOKIE_SECURE", "");
    expect(getCookieConfig().options.secure).toBe(true);
    vi.stubEnv("COOKIE_SECURE", "false");
    expect(getCookieConfig().options.secure).toBe(false);
  });
  it("requires the intended JWT subject, role and expiry", async () => {
    const secret = "a-test-secret-that-is-at-least-32-characters";
    vi.stubEnv("SESSION_SECRET", secret);
    expect(await verifySessionToken(await createSessionToken())).toBe(true);
    const forged = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("someone-else")
      .sign(new TextEncoder().encode(secret));
    expect(await verifySessionToken(forged)).toBe(false);
  });
  it("bounds streamed JSON and rejects malformed payloads", async () => {
    const request = (body: string) =>
      new Request("http://notes.local", { method: "POST", body });
    await expect(readJson(request('{"ok":true}'))).resolves.toEqual({
      ok: true,
    });
    await expect(readJson(request("{"))).rejects.toBeInstanceOf(SyntaxError);
    await expect(
      readJson(request("x".repeat(1024 * 1024 + 1))),
    ).rejects.toThrow("exceeds");
  });
});
