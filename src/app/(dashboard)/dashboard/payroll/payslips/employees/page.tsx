import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employee Payslips" };

export default async function EmployeePayslipsPage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const payslips = await getPayrollDocumentServices(companyId).payslip.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Payslips" description="All generated employee payslip records" />
      <Card>
        <CardHeader><CardTitle className="text-base">Payslips</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {payslips.map((p) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{p.employee.employeeCode} · {p.employee.firstName} {p.employee.lastName}</span>
              <span className="text-muted-foreground">{p.payroll.payrollPeriod?.name ?? p.payroll.payrollNumber} · Download: /api/payroll-documents/payslips/{p.id}/download</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
