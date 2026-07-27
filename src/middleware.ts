import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/infrastructure/auth/auth.config";
import { contentSecurityPolicy, securityHeaders } from "@/infrastructure/security/security";
import {
  AUTH_ROUTES,
  GUEST_ONLY_ROUTES,
  PROTECTED_ROUTE_PREFIXES,
  PUBLIC_ROUTES,
} from "@/shared/constants/auth";
import { generateRequestId } from "@/shared/utils/id.utils";

const { auth } = NextAuth(authConfig);

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith("/api/auth"),
  );
}

function isGuestOnlyRoute(pathname: string): boolean {
  return GUEST_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default auth((req) => {
  const requestId = generateRequestId();
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

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

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  if (req.auth?.user?.id) {
    response.headers.set("x-user-id", req.auth.user.id);
  }
  if (req.auth?.user?.companyId) {
    response.headers.set("x-company-id", req.auth.user.companyId);
  }

  if (!isPublicRoute(pathname)) {
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
