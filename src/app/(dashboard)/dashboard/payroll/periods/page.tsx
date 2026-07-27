import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Periods" };

export default async function PayrollPeriodsPage() {
  const { companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.VIEW);
  const list = await getPayrollServices(companyId).period.list({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Period Management" description="Monthly, weekly, bi-weekly, and custom periods" />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Periods ({list.totalItems})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.items.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm">
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.periodType} · {p.status} · {p.payrollYear}{p.payrollMonth ? `/${p.payrollMonth}` : ""}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
