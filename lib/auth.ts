import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

const textEncoder = new TextEncoder();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be provided and be at least 32 characters long.");
  }
  return secret;
}

function getAppPasswordHash(): string {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) {
    throw new Error("APP_PASSWORD_HASH is missing.");
  }
  return hash;
}

function getSecretKey(): Uint8Array {
  return textEncoder.encode(getSessionSecret());
}

export async function verifyAppPassword(password: string): Promise<boolean> {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.compare(password, getAppPasswordHash());
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("notes-user")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export function getCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}
