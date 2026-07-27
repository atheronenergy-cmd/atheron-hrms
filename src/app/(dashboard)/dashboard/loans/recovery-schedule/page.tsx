import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Recovery Schedule" };

export default async function RecoverySchedulePage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.RECOVER);
  const rows = await getLoanRecoveryServices(companyId).emi.list({ status: "due" });

  return (
    <div className="space-y-6">
      <PageHeader title="Recovery Schedule" description="Due and overdue EMI recoveries pending payroll deduction" />
      <Card>
        <CardHeader><CardTitle className="text-base">Due Recoveries ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? <p className="text-muted-foreground">No due recoveries.</p> : rows.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{r.employeeLoan.loanNumber} · EMI #{r.emiNumber}</span>
              <span className="text-muted-foreground">Due {r.dueDate.toISOString().slice(0, 10)} · ₹{Number(r.installmentAmount).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
