import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Analytics" };

export default async function PayrollAnalyticsPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.ANALYTICS.VIEW);
  const metrics = await getPayrollReportingServices(companyId).analytics.computeMetrics({});

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Analytics" description="Payroll trends, department cost, overtime and bonus analysis" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Highest Salary</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.highestSalary.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lowest Salary</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.lowestSalary.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overtime Cost</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.overtimeCost.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bonus Cost</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.bonusCost.toLocaleString()}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Department Cost</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(metrics.departmentCost).map(([dept, amount]) => (
            <div key={dept} className="flex justify-between border-b py-2"><span>{dept}</span><span>₹{amount.toLocaleString()}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
