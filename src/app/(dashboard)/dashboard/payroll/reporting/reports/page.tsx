import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_REPORT_TYPES } from "@/modules/payroll-reporting/domain/types";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Reports" };

export default async function PayrollReportsPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.PAYROLL_REPORTING.VIEW);
  const reports = await getPayrollReportingServices(companyId).report.listReports(20);

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Reports" description="Monthly, department, branch, variance and comparison reports" />
      <Card>
        <CardHeader><CardTitle className="text-base">Available Report Types</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {PAYROLL_REPORT_TYPES.map((t) => (
            <div key={t} className="rounded-md border p-3 text-sm">
              <p className="font-medium capitalize">{t.replace(/_/g, " ")}</p>
              <p className="text-muted-foreground">POST /api/payroll-reporting action=generate_report</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Generated Reports ({reports.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {reports.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2"><span>{r.title}</span><span className="text-muted-foreground">{r.generatedAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
