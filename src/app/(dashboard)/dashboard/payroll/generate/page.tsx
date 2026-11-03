import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { GeneratePayrollForm } from "@/modules/payroll/components/payroll-editor";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Generate Payroll" };

export default async function PayrollGeneratePage() {
  const { auth, companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.GENERATE);
  const canGenerate = await authorizationService.hasPermission(auth.id, PERMISSIONS.PAYROLL.GENERATE, companyId);
  const [periods, employees] = await Promise.all([
    getPayrollServices(companyId).period.list({ page: 1, pageSize: 50 }),
    prisma.employee.findMany({
      where: { companyId, deletedAt: null, employmentStatus: "active" },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
      orderBy: { employeeCode: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Generation" description="Run payroll for one employee or every active employee in the month" />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.dashboard}>Back</Link></Button>
      </div>
      {canGenerate ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Run payroll</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <GeneratePayrollForm
              periods={periods.items.map((period) => ({
                id: period.id,
                label: `${period.name} · ${period.startDate.toISOString().slice(0, 10)} to ${period.endDate.toISOString().slice(0, 10)}`,
              }))}
              employees={employees.map((employee) => ({
                id: employee.id,
                label: `${employee.employeeCode} · ${[employee.firstName, employee.lastName].filter(Boolean).join(" ")}`,
              }))}
            />
            <p className="text-sm text-muted-foreground">
              A company-wide run stops if any active employee has no approved salary. Run one employee first while salaries are still being added.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-base">Available Periods ({periods.meta.totalItems})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {periods.items.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm">
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.periodType} · {p.startDate.toISOString().slice(0, 10)} → {p.endDate.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
