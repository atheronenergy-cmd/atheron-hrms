import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Arrears" };

export default async function PayrollArrearsPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.ARREAR.MANAGE);
  const arrears = await getPayrollGovernanceServices(companyId).arrear.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Arrear Management" description="Salary, allowance, bonus and OT arrears merged into future payroll" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Arrears ({arrears.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {arrears.length === 0 ? <p className="text-muted-foreground">No arrears recorded.</p> : arrears.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2">
              <span>{a.employee.employeeCode} · {a.arrearType}</span>
              <span className="text-muted-foreground">₹{Number(a.amount).toLocaleString()} · {a.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
