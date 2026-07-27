import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Document History" };

export default async function DocumentHistoryPage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const [audit, emails] = await Promise.all([
    getPayrollDocumentServices(companyId).audit.listRecent(30),
    getPayrollDocumentServices(companyId).email.listHistory({ limit: 30 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Document History" description="Payslip generation, download, export and email delivery history" />
      <Card>
        <CardHeader><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString()}</span></div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Email Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {emails.map((e) => (
            <div key={e.id} className="flex justify-between border-b py-2"><span>{e.recipientEmail} · {e.status}</span><span className="text-muted-foreground">{e.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
