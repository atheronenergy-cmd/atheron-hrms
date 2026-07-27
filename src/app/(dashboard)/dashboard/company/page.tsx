import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { OrgDashboard } from "@/modules/organization/components/org-dashboard";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Company" };

const quickLinks = [
  { href: ORG_ROUTES.profile, title: "Company Profile", description: "Legal info, tax IDs, and contact details" },
  { href: ORG_ROUTES.branches, title: "Branches", description: "Locations, GPS geofences, and managers" },
  { href: ORG_ROUTES.departments, title: "Departments", description: "Organizational units" },
  { href: ORG_ROUTES.designations, title: "Designations", description: "Job titles and hierarchy" },
  { href: ORG_ROUTES.structure, title: "Organization Structure", description: "Company hierarchy view" },
  { href: ORG_ROUTES.schedules, title: "Working Schedules", description: "Office hours and weekly offs" },
  { href: ORG_ROUTES.holidays, title: "Holiday Calendar", description: "Public and company holidays" },
  { href: ORG_ROUTES.policies, title: "HR Policies", description: "Attendance, leave, and payroll rules" },
  { href: ORG_ROUTES.settings, title: "Company Settings", description: "Currency, notifications, documents" },
];

export default async function CompanyDashboardPage() {
  const { companyId } = await requireOrgContext(PERMISSIONS.COMPANY.PROFILE.READ);
  const { org, company } = await getOrgServices(companyId);
  const [stats, profile] = await Promise.all([org.getDashboardStats(), company.getCurrent()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Company Setup" description="Manage organization structure and policies" />
      <OrgDashboard stats={stats} companyName={profile?.name ?? "Company"} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
