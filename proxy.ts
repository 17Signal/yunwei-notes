import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/session",
]);

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return true;
  }

  return pathname === "/icon.svg";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    // Next normalizes loopback hostnames in nextUrl. Compare against the actual
    // Host header; reverse proxies must preserve it and set X-Forwarded-Proto.
    const host = request.headers.get("host") ?? request.nextUrl.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      request.nextUrl.protocol.slice(0, -1);
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== `${protocol}://${host}`)
    ) {
      return NextResponse.json(
        { error: "不允许跨站修改数据。", code: "INVALID_ORIGIN" },
        { status: 403 },
      );
    }
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySessionToken(token) : false;

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Authentication required.",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
