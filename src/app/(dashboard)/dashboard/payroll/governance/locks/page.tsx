import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Lock Manager" };

export default async function PayrollLockManagerPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.LOCK);
  const [locks, reopenLogs] = await Promise.all([
    getPayrollGovernanceServices(companyId).lock.listActive(),
    getPayrollGovernanceServices(companyId).lock.getReopenHistory(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Lock Manager" description="Locked payrolls are immutable — unlock requires reason and approval" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Locks ({locks.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {locks.length === 0 ? <p className="text-muted-foreground">No active locks.</p> : locks.map((l) => (
            <div key={l.id} className="flex justify-between border-b py-2">
              <span>{l.payroll.payrollNumber} · {l.lockType}</span>
              <span className="text-muted-foreground">{l.lockedAt.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Reopen History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {reopenLogs.slice(0, 10).map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2">
              <span>{r.action}: {r.previousStatus} → {r.newStatus}</span>
              <span className="text-muted-foreground">{r.createdAt.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
