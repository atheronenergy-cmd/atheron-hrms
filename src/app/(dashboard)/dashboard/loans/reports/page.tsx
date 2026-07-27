import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Loan Reports" };

const reportTypes = [
  "loan_register",
  "outstanding",
  "recovery",
  "advance",
  "emi",
  "foreclosure",
  "department_loan",
] as const;

export default async function LoanReportsPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.VIEW);
  const svc = getLoanRecoveryServices(companyId);
  const summaries = await Promise.all(reportTypes.map(async (t) => ({ type: t, count: (await svc.report.buildReport({ reportType: t })).length })));

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Reports" description="Loan register, outstanding, recovery, advance, EMI, foreclosure and department reports" />
      <Card>
        <CardHeader><CardTitle className="text-base">Available Reports</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {summaries.map((s) => (
            <div key={s.type} className="rounded-md border p-3 text-sm">
              <p className="font-medium capitalize">{s.type.replace(/_/g, " ")}</p>
              <p className="text-muted-foreground">{s.count} records · GET /api/loans?reportType={s.type}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
