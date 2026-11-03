import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SelfServiceGate } from "@/components/layout/self-service-gate";
import { AuthorizationProvider } from "@/components/providers/authorization-provider";
import { requireAuth } from "@/infrastructure/auth/server";
import { getAuthorizationContext } from "@/infrastructure/authorization/server/guards";
import { isSelfServicePath, SELF_SERVICE_HOME } from "@/shared/constants/self-service";
import { serializeAuthorizationContext } from "@/shared/permissions/serialization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const authContext = await getAuthorizationContext();
  if (authContext?.scope === "self") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (pathname.startsWith("/dashboard") && !isSelfServicePath(pathname)) {
      redirect(SELF_SERVICE_HOME);
    }
  }
  const serialized = authContext
    ? serializeAuthorizationContext(authContext)
    : {
        userId: "",
        companyId: null,
        permissions: [],
        roles: [],
        scope: "self" as const,
        branchIds: [],
        employeeId: null,
      };

  return (
    <AuthorizationProvider context={serialized}>
      <SelfServiceGate />
      <AppShell>{children}</AppShell>
    </AuthorizationProvider>
  );
}
