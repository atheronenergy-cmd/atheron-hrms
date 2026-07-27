import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Templates" };

export default async function SalaryTemplatesPage() {
  const { companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const list = await getSalaryServices(companyId).template.list({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Salary Templates" description="Assign structures to department, designation, branch, or employee" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Templates ({list.totalItems})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.items.length === 0 ? <p className="text-sm text-muted-foreground">No templates configured.</p> : list.items.map((t) => (
            <div key={t.id} className="flex justify-between border-b py-2 text-sm">
              <span>{t.name}</span>
              <span className="text-muted-foreground">{t.scope} · {t.salaryStructure.code}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
