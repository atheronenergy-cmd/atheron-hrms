import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SalaryRevisionTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Revisions" };

export default async function SalaryRevisionsPage() {
  const { companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const list = await getSalaryServices(companyId).employeeSalary.listRevisions({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Salary Revision History" description="Complete audit trail of salary changes with approval workflow" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Revisions ({list.totalItems})</CardTitle></CardHeader>
        <CardContent><SalaryRevisionTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
