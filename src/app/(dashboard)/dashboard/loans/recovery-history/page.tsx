import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Recovery History" };

export default async function RecoveryHistoryPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.RECOVER);
  const rows = await getLoanRecoveryServices(companyId).recovery.listHistory({ limit: 100 });

  return (
    <div className="space-y-6">
      <PageHeader title="Recovery History" description="Recovered, waived, and written-off amounts" />
      <Card>
        <CardHeader><CardTitle className="text-base">History ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.length === 0 ? <p className="text-muted-foreground">No recovery history yet.</p> : rows.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{r.entityType} · {r.recoveryType}</span>
              <span className="text-muted-foreground">₹{Number(r.amount).toLocaleString()} · balance ₹{Number(r.balanceAfter).toLocaleString()} · {r.createdAt.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
