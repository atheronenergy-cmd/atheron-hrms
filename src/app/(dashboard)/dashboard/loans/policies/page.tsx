import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Loan Policies" };

export default async function LoanPoliciesPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.VIEW);
  const policies = await getLoanRecoveryServices(companyId).module.listPolicies();

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Policies" description="Maximum amounts, tenure, interest rules and eligibility" />
      <Card>
        <CardHeader><CardTitle className="text-base">Policies ({policies.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {policies.length === 0 ? <p className="text-muted-foreground">No policies configured.</p> : policies.map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{p.name} ({p.code})</span>
              <span className="text-muted-foreground">Loan max ₹{p.maxLoanAmount ? Number(p.maxLoanAmount).toLocaleString() : "—"} · Advance max ₹{p.maxAdvanceAmount ? Number(p.maxAdvanceAmount).toLocaleString() : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
