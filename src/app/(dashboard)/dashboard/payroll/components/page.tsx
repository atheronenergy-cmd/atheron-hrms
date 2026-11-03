import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { SalaryComponentForm, StandardComponentsButton } from "@/modules/payroll/components/payroll-editor";
import { SalaryComponentTable } from "@/modules/payroll/components/salary-table";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Components" };

export default async function SalaryComponentsPage() {
  const { auth, companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const canCreate = await authorizationService.hasPermission(auth.id, PERMISSIONS.PAYROLL.SALARY.CREATE, companyId);
  const services = getSalaryServices(companyId);
  const [list, structures] = await Promise.all([
    services.component.list({ page: 1, pageSize: 100 }),
    services.structure.list({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }),
  ]);
  const structureOptions = structures.items.map((item) => ({ id: item.id, label: `${item.name} (${item.code})` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Salary Components" description="Earnings and deductions used when payroll is calculated" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      {canCreate ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Add pay lines</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <StandardComponentsButton structures={structureOptions} />
            <SalaryComponentForm structures={structureOptions} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-base">Components ({list.meta.totalItems})</CardTitle></CardHeader>
        <CardContent><SalaryComponentTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
