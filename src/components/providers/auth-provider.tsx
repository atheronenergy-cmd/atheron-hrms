"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

type AuthProviderProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <NextAuthSessionProvider session={session} refetchInterval={60 * 15} refetchOnWindowFocus>
      {children}
    </NextAuthSessionProvider>
  );
}
