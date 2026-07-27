import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeSalaryTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employee Salary" };

export default async function EmployeeSalaryPage() {
  const { companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const list = await getSalaryServices(companyId).employeeSalary.list({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Employee Salary" description="Structure assignments with CTC, effective dates, and approval status" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Salary Assignments ({list.totalItems})</CardTitle></CardHeader>
        <CardContent><EmployeeSalaryTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
