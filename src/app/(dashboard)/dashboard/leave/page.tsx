import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveBalanceCards, LeaveDashboardCards, UpcomingHolidaysCard } from "@/modules/leave/components/leave-card";
import { LeaveTable } from "@/modules/leave/components/leave-table";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Leave" };

const navLinks = [
  { href: LEAVE_ROUTES.apply, label: "Apply Leave" },
  { href: LEAVE_ROUTES.myLeave, label: "My Leave" },
  { href: LEAVE_ROUTES.team, label: "Team Leave" },
  { href: LEAVE_ROUTES.approvals, label: "Approvals" },
  { href: LEAVE_ROUTES.balance, label: "Balance" },
  { href: LEAVE_ROUTES.calendar, label: "Calendar" },
  { href: LEAVE_ROUTES.policies, label: "Policies" },
];

export default async function LeavePage() {
  const { auth, companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.VIEW);
  const svc = getEmployeeLeaveServices(companyId);
  const employee = await svc.leave.resolveEmployee(auth.id).catch(() => null);

  const [stats, recent] = await Promise.all([
    svc.report.getDashboardStats(employee?.id),
    svc.leave.list({ page: 1, pageSize: 10, sortBy: "startDate", sortOrder: "desc" }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Leave Management" description="Enterprise leave dashboard, balances, and approvals" />
        <div className="flex flex-wrap gap-2">
          {navLinks.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild>
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <LeaveDashboardCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">My Balance</CardTitle></CardHeader>
          <CardContent><LeaveBalanceCards balances={stats.myBalances} /></CardContent>
        </Card>
        <UpcomingHolidaysCard holidays={stats.upcomingHolidays} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Leave Requests</CardTitle></CardHeader>
        <CardContent><LeaveTable items={recent.items} /></CardContent>
      </Card>
    </div>
  );
}
