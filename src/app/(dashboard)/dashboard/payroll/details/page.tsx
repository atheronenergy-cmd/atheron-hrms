import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Details" };

export default async function PayrollDetailsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.VIEW);
  const params = await searchParams;
  if (!params.id) {
    return <p className="text-sm text-muted-foreground">Payroll ID required.</p>;
  }

  const payroll = await getPayrollServices(companyId).payroll.get(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title={`Payroll ${payroll.payrollNumber}`} description={`Status: ${payroll.status}`} />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.history}>Back</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Gross</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(payroll.totalGross).toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Deductions</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(payroll.totalDeductions).toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(payroll.totalNet).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Employee Calculations ({payroll.payrollCalculations.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {payroll.payrollCalculations.map((c) => (
            <div key={c.id} className="rounded border p-3 text-sm">
              <div className="font-medium">{c.employee.firstName} {c.employee.lastName} ({c.employee.employeeCode})</div>
              <div className="text-muted-foreground">Gross {Number(c.grossSalary).toLocaleString()} · Net {Number(c.netSalary).toLocaleString()} · Paid days {Number(c.paidDays)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
