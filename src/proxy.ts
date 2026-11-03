import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/infrastructure/auth/auth.config";
import { buildContentSecurityPolicy, securityHeaders } from "@/infrastructure/security/security";
import { AUTH_ROUTES, GUEST_ONLY_ROUTES, PROTECTED_ROUTE_PREFIXES } from "@/shared/constants/auth";
import { generateRequestId } from "@/shared/utils/id.utils";

const { auth } = NextAuth(authConfig);

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicApi(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname === "/api/payroll-documents/verify"
  );
}

export default auth((req) => {
  const requestId = generateRequestId();
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  if (pathname.startsWith("/api/") && !isPublicApi(pathname) && !isLoggedIn) {
    return NextResponse.json(
      { success: false, error: { code: "AUTHENTICATION_ERROR", message: "Authentication required" } },
      { status: 401 },
    );
  }

  if (isProtectedRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL(AUTH_ROUTES.login, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyRoute(pathname) && isLoggedIn && pathname !== AUTH_ROUTES.verifyTwoFactor) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.dashboard, req.nextUrl.origin));
  }

  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.dashboard, req.nextUrl.origin));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
