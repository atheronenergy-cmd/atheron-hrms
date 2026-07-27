import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext, getPayrollServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Generate Payroll" };

export default async function PayrollGeneratePage() {
  const { companyId } = await requirePayrollContext(PERMISSIONS.PAYROLL.GENERATE);
  const periods = await getPayrollServices(companyId).period.list({ page: 1, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Generation" description="Generate payroll for employee, department, branch, or company" />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Available Periods ({periods.totalItems})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {periods.items.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm">
              <span>{p.name}</span>
              <span className="text-muted-foreground">{p.periodType} · {p.startDate.toISOString().slice(0, 10)} → {p.endDate.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">Use the payroll API or actions to preview and generate against a selected period.</p>
    </div>
  );
}
