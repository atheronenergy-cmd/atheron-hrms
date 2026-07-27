import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Financial Year" };

export default async function FinancialYearPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.YEAR.CLOSE);
  const years = await getPayrollGovernanceServices(companyId).financialYear.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Financial Year Processing" description="Open, close, lock and archive payroll years with year-end preparation" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payroll Years</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {years.length === 0 ? <p className="text-muted-foreground">No payroll years configured.</p> : years.map((y) => (
            <div key={y.id} className="flex justify-between border-b py-2">
              <span>{y.code} · {y.label}</span>
              <span className="text-muted-foreground">{y.status} · {y.startDate.toISOString().slice(0, 10)} – {y.endDate.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
