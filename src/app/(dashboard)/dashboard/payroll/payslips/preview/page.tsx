import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payslip Preview" };

export default async function PayslipPreviewPage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const payslips = await getPayrollDocumentServices(companyId).payslip.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Payslip Preview" description="Corporate A4 print-ready payslip layout generated from payroll calculations" />
      <Card>
        <CardHeader><CardTitle className="text-base">Latest Payslips ({payslips.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {payslips.length === 0 ? <p className="text-muted-foreground">Generate payslips via POST /api/payroll-documents action=generate_payslip.</p> : payslips.slice(0, 20).map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{p.payslipNumber} · {p.employee.firstName} {p.employee.lastName}</span>
              <span className="text-muted-foreground">₹{Number(p.netSalary).toLocaleString()} · v{p.versionNumber} · {p.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
