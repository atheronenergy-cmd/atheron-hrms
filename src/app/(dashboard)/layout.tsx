import { AppShell } from "@/components/layout/app-shell";
import { AuthorizationProvider } from "@/components/providers/authorization-provider";
import { requireAuth } from "@/infrastructure/auth/server";
import { getAuthorizationContext } from "@/infrastructure/authorization/server/guards";
import { serializeAuthorizationContext } from "@/shared/permissions/serialization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const authContext = await getAuthorizationContext();
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
      <AppShell>{children}</AppShell>
    </AuthorizationProvider>
  );
}
