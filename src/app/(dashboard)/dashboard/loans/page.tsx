import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LOAN_RECOVERY_ROUTES } from "@/modules/loan-recovery/domain/types";
import { getLoanRecoveryServices, requireLoanRecoveryContext } from "@/modules/loan-recovery/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Loans & Recovery" };

const links = [
  { href: LOAN_RECOVERY_ROUTES.loans, label: "Employee Loans" },
  { href: LOAN_RECOVERY_ROUTES.application, label: "Loan Application" },
  { href: LOAN_RECOVERY_ROUTES.advances, label: "Salary Advance" },
  { href: LOAN_RECOVERY_ROUTES.emiSchedule, label: "EMI Schedule" },
  { href: LOAN_RECOVERY_ROUTES.recoverySchedule, label: "Recovery Schedule" },
  { href: LOAN_RECOVERY_ROUTES.recoveryHistory, label: "Recovery History" },
  { href: LOAN_RECOVERY_ROUTES.policies, label: "Loan Policies" },
  { href: LOAN_RECOVERY_ROUTES.reports, label: "Reports" },
];

export default async function LoansDashboardPage() {
  const { companyId } = await requireLoanRecoveryContext(PERMISSIONS.LOAN.VIEW);
  const [stats, audit] = await Promise.all([
    getLoanRecoveryServices(companyId).report.getDashboardStats(),
    getLoanRecoveryServices(companyId).audit.listRecent(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Loan & Recovery" description="Employee loans, salary advances, EMI and payroll recovery" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Loans</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.activeLoans}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingApprovals}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{stats.outstandingBalance.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Monthly EMI Collection</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{stats.monthlyEmiCollection.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Salary Advances</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.salaryAdvances}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Overdue Recoveries</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.overdueRecoveries}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 ? <p className="text-muted-foreground">No loan audit events yet.</p> : audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.entityType} · {a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
