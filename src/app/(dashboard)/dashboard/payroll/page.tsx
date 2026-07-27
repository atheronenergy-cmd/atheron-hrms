import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll" };

const links = [
  { href: PAYROLL_ROUTES.generate, label: "Generate" },
  { href: PAYROLL_ROUTES.history, label: "History" },
  { href: PAYROLL_ROUTES.periods, label: "Periods" },
  { href: PAYROLL_ROUTES.structures, label: "Structures" },
  { href: PAYROLL_ROUTES.employeeSalary, label: "Employee Salary" },
];

export default async function PayrollPage() {
  const { companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.VIEW);
  const [stats, recent] = await Promise.all([
    getPayrollServices(companyId).payroll.getDashboardStats(),
    getPayrollServices(companyId).payroll.list({ page: 1, pageSize: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Payroll" description="Enterprise payroll calculation engine" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Pending</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Approved</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.approvedCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Employees Processed</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.employeesProcessed}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Gross</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalGross.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Net</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalNet.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Errors</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingErrors}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Payroll Runs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recent.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs yet.</p>
          ) : (
            recent.items.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm">
                <Link href={`${PAYROLL_ROUTES.details}?id=${p.id}`} className="font-medium hover:underline">{p.payrollNumber}</Link>
                <span className="text-muted-foreground">{p.status} · Net {Number(p.totalNet).toLocaleString()}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
