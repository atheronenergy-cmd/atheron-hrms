import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Advance" };

export default async function SalaryAdvancePage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.ADVANCE.MANAGE);
  const advances = await getLoanRecoveryServices(companyId).advance.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Advance" description="One-time, recurring, festival, emergency and travel advances" />
      <Card>
        <CardHeader><CardTitle className="text-base">Advances ({advances.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {advances.length === 0 ? <p className="text-muted-foreground">No salary advances found.</p> : advances.map((a) => (
            <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{a.advanceNumber} · {a.employee.firstName} {a.employee.lastName}</span>
              <span className="text-muted-foreground">{a.advanceType} · ₹{Number(a.outstandingBalance).toLocaleString()} / ₹{Number(a.amount).toLocaleString()} · {a.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
