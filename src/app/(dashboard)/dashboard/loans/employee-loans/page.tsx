import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employee Loans" };

export default async function EmployeeLoansPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.VIEW);
  const loans = await getLoanRecoveryServices(companyId).loan.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Loans" description="Active and historical employee loan records" />
      <Card>
        <CardHeader><CardTitle className="text-base">Loans ({loans.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loans.length === 0 ? <p className="text-muted-foreground">No loans found.</p> : loans.map((l) => (
            <div key={l.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{l.loanNumber} · {l.employee.firstName} {l.employee.lastName} ({l.employee.employeeCode})</span>
              <span className="text-muted-foreground">{l.loanType.name} · ₹{Number(l.outstandingBalance).toLocaleString()} · {l.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
