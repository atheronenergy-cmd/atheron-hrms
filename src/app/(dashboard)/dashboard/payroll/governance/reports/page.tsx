import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { GOVERNANCE_REPORT_TYPES, PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Governance Reports" };

export default async function GovernanceReportsPage() {
  await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.VIEW);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Governance Reports" description="Approval history, locks, versions, retro, arrears, FY summary and compliance" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Available Reports</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {GOVERNANCE_REPORT_TYPES.map((type) => (
            <div key={type} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{type.replace(/_/g, " ")}</p>
              <p className="text-muted-foreground text-xs">GET /api/payroll-governance?reportType={type}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
