import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Approval Queue" };

export default async function ApprovalQueuePage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.APPROVE);
  const queue = await getPayrollGovernanceServices(companyId).approval.getQueue();
  const history = await getPayrollGovernanceServices(companyId).approval.getHistory();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Approval Queue" description="Multi-level payroll approval: HR → Finance → Accounts → Director" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending ({queue.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {queue.length === 0 ? <p className="text-muted-foreground">No payrolls pending approval.</p> : queue.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2">
              <span>{a.payroll.payrollNumber} · Step {a.currentStep}/{a.totalSteps}</span>
              <span className="text-muted-foreground">₹{Number(a.payroll.totalNet).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.slice(0, 10).map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2">
              <span>{a.payroll.payrollNumber} · {a.status}</span>
              <span className="text-muted-foreground">{a.completedAt?.toISOString().slice(0, 10) ?? "In progress"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
