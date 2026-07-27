import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_DOCUMENT_ROUTES } from "@/modules/payroll-documents/domain/types";
import { getPayrollDocumentServices, requirePayrollDocumentContext, resolveEmployeeForPayslips } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "My Payslips" };

export default async function MyPayslipsPage() {
  const { auth, companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const employee = await resolveEmployeeForPayslips(auth.id, companyId);
  const payslips = employee ? await getPayrollDocumentServices(companyId).payslip.list({ employeeId: employee.id }) : [];
  const certificates = employee ? await getPayrollDocumentServices(companyId).certificate.list(employee.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Payslips" description="View and download your payslips and salary certificates" />
      {!employee ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No employee profile linked to your account.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Payslip History ({payslips.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {payslips.length === 0 ? <p className="text-muted-foreground">No payslips available yet.</p> : payslips.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                  <span>{p.payroll.payrollPeriod?.name ?? p.payslipNumber} · ₹{Number(p.netSalary).toLocaleString()}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/payroll-documents/payslips/${p.id}/download`}>Download PDF</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Salary Certificates ({certificates.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {certificates.map((c) => (
                <div key={c.id} className="flex justify-between border-b py-2">
                  <span>{c.documentNumber}</span>
                  <span className="text-muted-foreground">{c.issuedDate.toISOString().slice(0, 10)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">Verify documents at {PAYROLL_DOCUMENT_ROUTES.verify}</p>
        </>
      )}
    </div>
  );
}
