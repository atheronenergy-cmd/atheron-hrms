import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthorizationContext } from "@/infrastructure/authorization/server/guards";
import { ATTENDANCE_ROUTES } from "@/modules/attendance/domain/types";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { LOAN_RECOVERY_ROUTES } from "@/modules/loan-recovery/domain/types";
import { PAYROLL_DOCUMENT_ROUTES } from "@/modules/payroll-documents/domain/types";
import { PAYROLL_REPORTING_ROUTES } from "@/modules/payroll-reporting/domain/types";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import { type AuthorizationContext, hasPermission } from "@/shared/permissions/engine";

export const metadata = { title: "Reports" };

const REPORT_LINKS = [
  {
    title: "Payroll reports",
    description: "Monthly, department, branch, and employee payroll reports",
    href: PAYROLL_REPORTING_ROUTES.reports,
    permission: PERMISSIONS.PAYROLL_REPORTING.VIEW,
  },
  {
    title: "Salary register",
    description: "Register used for salary disbursement review",
    href: PAYROLL_REPORTING_ROUTES.salaryRegister,
    permission: PERMISSIONS.PAYROLL_REPORTING.VIEW,
  },
  {
    title: "Payroll analytics",
    description: "Cost, variance, and executive payroll metrics",
    href: PAYROLL_REPORTING_ROUTES.analytics,
    permission: PERMISSIONS.ANALYTICS.VIEW,
  },
  {
    title: "Statutory reports",
    description: "PF, ESI, professional tax, and income-tax outputs",
    href: STATUTORY_ROUTES.reports,
    permission: PERMISSIONS.STATUTORY.VIEW,
  },
  {
    title: "Payslips",
    description: "Generated payslips, downloads, and distribution",
    href: PAYROLL_DOCUMENT_ROUTES.dashboard,
    permission: PERMISSIONS.PAYSLIP.VIEW,
  },
  {
    title: "Attendance",
    description: "Today's attendance and department coverage",
    href: ATTENDANCE_ROUTES.list,
    permission: PERMISSIONS.REPORT.ATTENDANCE.READ,
  },
  {
    title: "Leave",
    description: "Pending, approved, and team leave",
    href: LEAVE_ROUTES.dashboard,
    permission: PERMISSIONS.LEAVE.VIEW,
  },
  {
    title: "Loans and recoveries",
    description: "Outstanding loans, EMI, and recovery history",
    href: LOAN_RECOVERY_ROUTES.reports,
    permission: PERMISSIONS.LOAN.VIEW,
  },
  {
    title: "Earnings",
    description: "Overtime, bonus, incentive, and allowance totals",
    href: EARNINGS_ROUTES.reports,
    permission: PERMISSIONS.OVERTIME.VIEW,
  },
] as const;

function visibleLinks(context: AuthorizationContext | null) {
  if (!context) return [];
  return REPORT_LINKS.filter((link) => hasPermission(context, link.permission));
}

export default async function ReportsPage() {
  const context = await getAuthorizationContext();
  const links = visibleLinks(context);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Open the live reports already available for this company" />
      {links.length === 0 ? (
        <EmptyState
          title="No reports available"
          description="Your account does not have permission to open attendance, leave, payroll, or statutory reports."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
