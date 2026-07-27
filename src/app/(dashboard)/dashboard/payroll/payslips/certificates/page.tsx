import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Certificates" };

export default async function SalaryCertificatesPage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.SALARY_CERTIFICATE.GENERATE);
  const certificates = await getPayrollDocumentServices(companyId).certificate.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Certificates" description="Official salary certificates with digital verification" />
      <Card>
        <CardHeader><CardTitle className="text-base">Certificates ({certificates.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {certificates.length === 0 ? <p className="text-muted-foreground">Generate via POST /api/payroll-documents action=generate_certificate.</p> : certificates.map((c) => (
            <div key={c.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{c.documentNumber} · {c.employee.firstName} {c.employee.lastName}</span>
              <span className="text-muted-foreground">₹{Number(c.grossSalary).toLocaleString()} · {c.issuedDate.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
