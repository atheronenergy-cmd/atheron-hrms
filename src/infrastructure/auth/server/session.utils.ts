import { redirect } from "next/navigation";

import { auth } from "@/infrastructure/auth/auth";
import type { AuthUser } from "@/shared/constants/auth";
import { AUTH_ROUTES } from "@/shared/constants/auth";
import { AuthenticationError } from "@/shared/errors";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    companyId: session.user.companyId ?? null,
    emailVerified: session.user.emailVerified ?? null,
    status: "active",
  };
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError("Session required");
  }
  return session;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationError("Authentication required");
  }
  return user;
}

export async function requireGuest() {
  const session = await auth();
  if (session?.user?.id) {
    redirect(AUTH_ROUTES.dashboard);
  }
}

export { auth };
