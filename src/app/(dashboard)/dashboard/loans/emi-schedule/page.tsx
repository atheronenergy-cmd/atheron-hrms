import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "EMI Schedule" };

export default async function EmiSchedulePage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.VIEW);
  const rows = await getLoanRecoveryServices(companyId).emi.list({});

  return (
    <div className="space-y-6">
      <PageHeader title="EMI Schedule" description="Generated EMI schedules with principal, interest and outstanding balance" />
      <Card>
        <CardHeader><CardTitle className="text-base">EMI Entries ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? <p className="text-muted-foreground">No EMI schedules generated yet.</p> : rows.slice(0, 100).map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{r.employeeLoan.loanNumber} · EMI #{r.emiNumber}</span>
              <span className="text-muted-foreground">{r.dueDate.toISOString().slice(0, 10)} · ₹{Number(r.installmentAmount).toLocaleString()} · {r.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
