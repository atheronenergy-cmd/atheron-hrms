import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "PF Settings" };

export default async function PFSettingsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.PF.MANAGE);
  const years = await getStatutoryServices(companyId).config.listFinancialYears();
  const current = years.find((y) => y.isCurrent) ?? years[0];
  const config = current ? (await getStatutoryServices(companyId).config.getActiveConfigs(current.id)).pf : null;

  return (
    <div className="space-y-6">
      <PageHeader title="PF Settings" description="Configure EPF rates, wage ceiling, EPS, and VPF" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Active Configuration ({current?.code ?? "None"})</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          {config ? (
            <>
              <div>Employee Rate: {config.employeeContributionRate}%</div>
              <div>Employer Rate: {config.employerContributionRate}%</div>
              <div>EPS Rate: {config.epsRate}%</div>
              <div>Admin Charges: {config.adminChargeRate}%</div>
              <div>Wage Ceiling: ₹{config.wageCeiling.toLocaleString()}</div>
              <div>VPF Allowed: {config.vpfAllowed ? "Yes" : "No"}</div>
            </>
          ) : (
            <p className="text-muted-foreground">No PF configuration for current financial year. Use API POST /api/statutory/config/pf or seed defaults.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
