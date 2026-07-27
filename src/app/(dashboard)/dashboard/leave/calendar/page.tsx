import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Leave Calendar" };

export default async function LeaveCalendarPage() {
  const { auth, companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.VIEW);
  const svc = getEmployeeLeaveServices(companyId);
  const employee = await svc.leave.resolveEmployee(auth.id).catch(() => null);
  const now = new Date();

  const [personal, company] = await Promise.all([
    employee
      ? svc.calendar.getCalendar({ view: "personal", year: now.getFullYear(), month: now.getMonth() + 1 }, employee.id)
      : Promise.resolve([]),
    svc.calendar.getCalendar({ view: "company", year: now.getFullYear(), month: now.getMonth() + 1 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Leave Calendar" description="Personal, department, branch, and company leave views" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">My Calendar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {personal.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave this month.</p>
            ) : (
              personal.map((d) => (
                <div key={`${d.date}-${d.leaveTypeCode}`} className="flex justify-between text-sm">
                  <span>{d.date}</span>
                  <span>{d.leaveTypeCode} · {d.status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Company Calendar</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {company.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved leave this month.</p>
            ) : (
              company.map((d) => (
                <div key={`${d.date}-${d.employeeId}-${d.leaveTypeCode}`} className="flex justify-between text-sm">
                  <span>{d.date} · {d.employeeName}</span>
                  <span>{d.leaveTypeCode}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
