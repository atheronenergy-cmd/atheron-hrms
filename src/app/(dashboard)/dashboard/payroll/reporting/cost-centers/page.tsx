import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Cost Centers" };

export default async function CostCentersPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.COST_CENTER.MANAGE);
  const centers = await getPayrollReportingServices(companyId).costCenter.list();

  return (
    <div className="space-y-6">
      <PageHeader title="Cost Centers" description="Cost center, sub cost center, project, business unit and location hierarchy" />
      <Card>
        <CardHeader><CardTitle className="text-base">Cost Centers ({centers.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {centers.length === 0 ? <p className="text-muted-foreground">No cost centers configured.</p> : centers.map((c) => (
            <div key={c.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{c.name} ({c.code})</span>
              <span className="text-muted-foreground">{c.centerType} · {c._count.employees} employees</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
