"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { isSelfServicePath, SELF_SERVICE_HOME } from "@/shared/constants/self-service";
import { usePermissions } from "@/shared/permissions/use-permission";

/** Sends employee logins back to their own attendance if they open a staff page. */
export function SelfServiceGate() {
  const pathname = usePathname();
  const router = useRouter();
  const scope = usePermissions().scope;

  useEffect(() => {
    if (scope === "self" && pathname.startsWith("/dashboard") && !isSelfServicePath(pathname)) {
      router.replace(SELF_SERVICE_HOME);
    }
  }, [pathname, router, scope]);

  return null;
}
