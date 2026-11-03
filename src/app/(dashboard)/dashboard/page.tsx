import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { prisma } from "@/infrastructure/database/prisma-client";
import { getHomeDashboard } from "@/modules/dashboard/application/home-dashboard.service";
import { HomeDashboard } from "@/modules/dashboard/components/home-dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();

  if (!user.companyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Company overview" />
        <EmptyState
          title="No company is linked to this account"
          description="A company context is required before live workforce, attendance, and payroll figures can be shown."
        />
      </div>
    );
  }

  const company = await prisma.company.findFirst({
    where: { id: user.companyId, deletedAt: null },
    select: { name: true, timezone: true, currencyCode: true },
  });

  if (!company) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Company overview" />
        <EmptyState title="Company not found" description="The company linked to this account is no longer available." />
      </div>
    );
  }

  const data = await getHomeDashboard(user.companyId, company.timezone, company.currencyCode);
  return <HomeDashboard data={data} companyName={company.name} />;
}
