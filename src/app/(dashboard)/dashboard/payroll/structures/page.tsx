import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SalaryStructureForm } from "@/modules/payroll/components/payroll-editor";
import { SalaryStructureTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Structures" };

export default async function SalaryStructuresPage() {
  const { auth, companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const canCreate = await authorizationService.hasPermission(auth.id, PERMISSIONS.PAYROLL.SALARY.CREATE, companyId);
  const list = await getSalaryServices(companyId).structure.list({ page: 1, pageSize: 50, sortBy: "name", sortOrder: "asc" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Salary Structures" description="Reusable salary structures for all payroll processing" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      {canCreate ? (
        <Card>
          <CardHeader><CardTitle className="text-base">New structure</CardTitle></CardHeader>
          <CardContent><SalaryStructureForm /></CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-base">Structures ({list.meta.totalItems})</CardTitle></CardHeader>
        <CardContent><SalaryStructureTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
