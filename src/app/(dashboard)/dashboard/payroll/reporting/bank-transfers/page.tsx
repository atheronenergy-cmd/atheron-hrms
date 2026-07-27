import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { BANK_PROVIDERS } from "@/modules/payroll-reporting/domain/types";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Bank Transfers" };

export default async function BankTransfersPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.BANK_TRANSFER.GENERATE);
  const batches = await getPayrollReportingServices(companyId).bankTransfer.listBatches();

  return (
    <div className="space-y-6">
      <PageHeader title="Bank Transfers" description="Provider-abstracted NEFT/RTGS/CSV bank file generation with UPI-ready architecture" />
      <Card>
        <CardHeader><CardTitle className="text-base">Supported Providers</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {BANK_PROVIDERS.map((p) => (
            <span key={p} className="rounded-md border px-2 py-1 text-xs uppercase">{p.replace("_", " ")}</span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Transfer Batches ({batches.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {batches.length === 0 ? <p className="text-muted-foreground">No bank batches yet.</p> : batches.map((b) => (
            <div key={b.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{b.batchNumber} · {b.providerCode}</span>
              <span className="text-muted-foreground">₹{Number(b.totalAmount).toLocaleString()} · {b.recordCount} records · {b.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
