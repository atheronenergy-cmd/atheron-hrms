import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Retro Payroll" };

export default async function RetroPayrollPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.RETRO.MANAGE);
  const retro = await getPayrollGovernanceServices(companyId).retro.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Retro Payroll" description="Late promotions, increments, attendance and statutory corrections" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Retro Adjustments ({retro.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {retro.length === 0 ? <p className="text-muted-foreground">No retro payroll records.</p> : retro.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2">
              <span>{r.employee.employeeCode} · {r.retroType}</span>
              <span className="text-muted-foreground">₹{Number(r.differenceAmount).toLocaleString()} · {r.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
