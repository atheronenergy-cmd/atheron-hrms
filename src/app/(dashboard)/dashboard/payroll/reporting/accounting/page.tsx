import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ACCOUNTING_PROVIDERS } from "@/modules/payroll-reporting/domain/types";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Accounting Export" };

export default async function AccountingExportPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.ACCOUNTING.EXPORT);
  const exports = await getPayrollReportingServices(companyId).accounting.list();
  const journals = await getPayrollReportingServices(companyId).journal.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Accounting Export" description="Tally, Zoho, ERPNext, QuickBooks and journal entry exports via provider abstraction" />
      <Card>
        <CardHeader><CardTitle className="text-base">Supported Providers</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ACCOUNTING_PROVIDERS.map((p) => (
            <span key={p} className="rounded-md border px-2 py-1 text-xs">{p.replace("_", " ")}</span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Exports ({exports.length}) · Journal Entries ({journals.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {exports.map((e) => (
            <div key={e.id} className="flex justify-between border-b py-2"><span>{e.exportNumber}</span><span className="text-muted-foreground">{e.providerCode}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
