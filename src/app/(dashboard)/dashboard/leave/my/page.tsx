import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getAuthorizationContext } from "@/infrastructure/authorization/server/guards";
import { LeaveBalanceCards } from "@/modules/leave/components/leave-card";
import { LeaveTable } from "@/modules/leave/components/leave-table";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "My Leave" };

export default async function MyLeavePage() {
  const { auth, companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.VIEW);
  const authContext = await getAuthorizationContext();
  const isEmployee = authContext?.scope === "self";
  const svc = getEmployeeLeaveServices(companyId);
  const employee = await svc.leave.resolveEmployee(auth.id).catch(() => null);
  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Leave" description="Your balances, requests, and leave status" />
        <EmptyState
          title="This login is not linked to an employee"
          description="Leave shown here belongs to the employee record linked to this account."
        />
      </div>
    );
  }
  const [list, stats] = await Promise.all([
    svc.leave.list({ page: 1, pageSize: 50, employeeId: employee.id, sortBy: "startDate", sortOrder: "desc" }),
    svc.report.getDashboardStats(employee.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="My Leave" description="Your balances, requests, and leave status" />
        <div className="flex gap-2">
          <Button asChild>
            <Link href={LEAVE_ROUTES.apply}>Apply Leave</Link>
          </Button>
          {isEmployee ? null : (
            <Button variant="outline" asChild>
              <Link href={LEAVE_ROUTES.dashboard}>Back</Link>
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">My Balance</CardTitle></CardHeader>
        <CardContent><LeaveBalanceCards balances={stats.myBalances} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Leave Requests</CardTitle></CardHeader>
        <CardContent><LeaveTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
