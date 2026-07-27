import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Archive" };

export default async function PayrollArchivePage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const archives = await getPayrollDocumentServices(companyId).archive.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Archive" description="Immutable archived PDF and Excel payroll documents" />
      <Card>
        <CardHeader><CardTitle className="text-base">Archive ({archives.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {archives.length === 0 ? <p className="text-muted-foreground">No archived documents yet.</p> : archives.map((a) => (
            <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{a.archiveType.toUpperCase()} · v{a.versionNumber}</span>
              <span className="text-muted-foreground">{a.hash.slice(0, 16)} · {a.archivedAt.toISOString().slice(0, 10)} · {a.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
