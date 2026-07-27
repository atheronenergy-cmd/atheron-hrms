import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Executive Dashboard" };

export default async function ExecutiveDashboardPage() {
  const { companyId, auth } = await requirePayrollReportingContext(PERMISSIONS.ANALYTICS.VIEW);
  const data = await getPayrollReportingServices(companyId).analytics.getExecutiveDashboard({ refresh: true }, auth.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Executive Dashboard" description="Payroll KPIs, forecast, department comparison and cost center analysis" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Payroll</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{data.kpis.totalPayroll.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Growth</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.kpis.payrollGrowth}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Next Month Forecast</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{data.forecast.nextMonthEstimate.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Headcount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.kpis.headcount}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Payroll Trend</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.charts.monthlyTrend.map((m) => (
            <div key={m.month} className="flex justify-between border-b py-2"><span>{m.month}</span><span>₹{m.amount.toLocaleString()}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
