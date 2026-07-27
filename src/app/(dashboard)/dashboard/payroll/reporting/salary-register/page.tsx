import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPayrollReportingServices, requirePayrollReportingContext } from "@/modules/payroll-reporting/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Salary Register" };

export default async function SalaryRegisterPage() {
  await requirePayrollReportingContext(PERMISSIONS.PAYROLL_REPORTING.EXPORT);

  return (
    <div className="space-y-6">
      <PageHeader title="Salary Register" description="Employee-wise basic, allowances, gross, deductions, employer contributions and net salary" />
      <Card>
        <CardHeader><CardTitle className="text-base">Register Columns</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Employee · Department · Designation · Basic · Allowances · Gross · Deductions · Employer Contributions · Net Salary · Payment Status
          <p className="mt-4">Generate via POST /api/payroll-reporting with action=salary_register and payrollId.</p>
        </CardContent>
      </Card>
    </div>
  );
}
