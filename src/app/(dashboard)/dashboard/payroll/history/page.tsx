import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll History" };

export default async function PayrollHistoryPage() {
  const { companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.VIEW);
  const list = await getPayrollServices(companyId).payroll.list({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll History" description="All payroll runs with status and totals" />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Payroll Runs ({list.meta.totalItems})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Number</th><th className="py-2">Status</th><th className="py-2">Employees</th><th className="py-2">Gross</th><th className="py-2">Net</th><th className="py-2">Errors</th></tr></thead>
            <tbody>
              {list.items.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2"><Link href={`${PAYROLL_ROUTES.details}?id=${p.id}`} className="hover:underline">{p.payrollNumber}</Link></td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2">{p.employeeCount}</td>
                  <td className="py-2">{Number(p.totalGross).toLocaleString()}</td>
                  <td className="py-2">{Number(p.totalNet).toLocaleString()}</td>
                  <td className="py-2">{p.errorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
