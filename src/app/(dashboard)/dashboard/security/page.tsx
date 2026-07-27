import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { securityService } from "@/modules/security/application/security.service";
import { SecurityDashboard } from "@/modules/security/components/security-dashboard";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Security Dashboard" };

export default async function SecurityPage() {
  await guardPagePermission(PERMISSIONS.SETTINGS.SECURITY.READ);
  const user = await requireAuth();
  const stats = await securityService.getDashboardStats(user.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Monitor sessions, login activity, and security events"
      />
      <SecurityDashboard stats={stats} />
    </div>
  );
}
