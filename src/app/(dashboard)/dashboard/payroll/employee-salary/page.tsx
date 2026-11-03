import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { EmployeeSalaryForm } from "@/modules/payroll/components/payroll-editor";
import { EmployeeSalaryTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employee Salary" };

export default async function EmployeeSalaryPage() {
  const { auth, companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const [canAssign, canApprove] = await Promise.all([
    authorizationService.hasPermission(auth.id, PERMISSIONS.PAYROLL.SALARY.ASSIGN, companyId),
    authorizationService.hasPermission(auth.id, PERMISSIONS.PAYROLL.SALARY.APPROVE, companyId),
  ]);
  const services = getSalaryServices(companyId);
  const [list, structures, employees] = await Promise.all([
    services.employeeSalary.list({ page: 1, pageSize: 50 }),
    services.structure.list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }),
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
        <PageHeader title="Employee Salary" description="Assign a structure and monthly pay, then approve it so payroll can use it" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      {canAssign ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Assign salary</CardTitle></CardHeader>
          <CardContent>
            <EmployeeSalaryForm
              employees={employees.map((employee) => ({
                id: employee.id,
                label: `${employee.employeeCode} · ${[employee.firstName, employee.lastName].filter(Boolean).join(" ")}`,
              }))}
              structures={structures.items.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` }))}
            />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-base">Salary Assignments ({list.meta.totalItems})</CardTitle></CardHeader>
        <CardContent><EmployeeSalaryTable items={list.items} canApprove={canApprove} /></CardContent>
      </Card>
    </div>
  );
}
