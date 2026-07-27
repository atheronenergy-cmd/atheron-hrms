import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SalaryComponentTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Components" };

export default async function SalaryComponentsPage() {
  const { companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const list = await getSalaryServices(companyId).component.list({ page: 1, pageSize: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Salary Components" description="Configurable earnings and deductions — fixed, percentage, formula, manual, computed" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Components ({list.totalItems})</CardTitle></CardHeader>
        <CardContent><SalaryComponentTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
