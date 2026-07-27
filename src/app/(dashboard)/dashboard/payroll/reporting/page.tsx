import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_REPORTING_ROUTES } from "@/modules/payroll-reporting/domain/types";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Reporting" };

const links = [
  { href: PAYROLL_REPORTING_ROUTES.reports, label: "Reports" },
  { href: PAYROLL_REPORTING_ROUTES.salaryRegister, label: "Salary Register" },
  { href: PAYROLL_REPORTING_ROUTES.bankTransfers, label: "Bank Transfers" },
  { href: PAYROLL_REPORTING_ROUTES.accounting, label: "Accounting Export" },
  { href: PAYROLL_REPORTING_ROUTES.costCenters, label: "Cost Centers" },
  { href: PAYROLL_REPORTING_ROUTES.analytics, label: "Analytics" },
  { href: PAYROLL_REPORTING_ROUTES.executive, label: "Executive Dashboard" },
];

export default async function PayrollReportingDashboardPage() {
  const { companyId } = await requirePayrollReportingContext(PERMISSIONS.PAYROLL_REPORTING.VIEW);
  const [metrics, audit, reports] = await Promise.all([
    getPayrollReportingServices(companyId).analytics.computeMetrics({}),
    getPayrollReportingServices(companyId).audit.listRecent(5),
    getPayrollReportingServices(companyId).report.listReports(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Payroll Reporting & Banking" description="Reports, salary register, bank files, accounting exports and analytics" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Payroll</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.totalPayroll.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Average Salary</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.averageSalary.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Headcount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{metrics.headcount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Employer Contribution</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{metrics.employerContribution.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Reports</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {reports.length === 0 ? <p className="text-muted-foreground">No reports generated yet.</p> : reports.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2"><span>{r.title}</span><span className="text-muted-foreground">{r.reportType} · {r.rowCount} rows</span></div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
