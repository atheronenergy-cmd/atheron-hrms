import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveTable } from "@/modules/leave/components/leave-table";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "My Leave" };

export default async function MyLeavePage() {
  const { auth, companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.VIEW);
  const svc = getEmployeeLeaveServices(companyId);
  const employee = await svc.leave.resolveEmployee(auth.id);
  const list = await svc.leave.list({ page: 1, pageSize: 50, employeeId: employee.id, sortBy: "startDate", sortOrder: "desc" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="My Leave" description="Your leave history and status" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Leave Requests</CardTitle></CardHeader>
        <CardContent><LeaveTable items={list.items} /></CardContent>
      </Card>
    </div>
  );
}
