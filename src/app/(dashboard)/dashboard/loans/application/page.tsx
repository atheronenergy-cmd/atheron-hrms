import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LOAN_TYPE_CATEGORIES } from "@/modules/loan-recovery/domain/types";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Loan Application" };

export default async function LoanApplicationPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.CREATE);
  const types = await getLoanRecoveryServices(companyId).loan.listLoanTypes();

  return (
    <div className="space-y-6">
      <PageHeader title="Loan Application" description="Configure loan types and submit employee loan applications via API" />
      <Card>
        <CardHeader><CardTitle className="text-base">Supported Loan Categories</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LOAN_TYPE_CATEGORIES.map((c) => (
            <span key={c} className="rounded-md border px-2 py-1 text-xs capitalize">{c.replace("_", " ")}</span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Configured Loan Types ({types.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {types.length === 0 ? <p className="text-muted-foreground">No loan types configured. Create via POST /api/loans action=create_loan_type.</p> : types.map((t) => (
            <div key={t.id} className="flex justify-between border-b py-2">
              <span>{t.name} ({t.code})</span>
              <span className="text-muted-foreground">{t.category} · {t.interestType} · max ₹{t.maxAmount ? Number(t.maxAmount).toLocaleString() : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
