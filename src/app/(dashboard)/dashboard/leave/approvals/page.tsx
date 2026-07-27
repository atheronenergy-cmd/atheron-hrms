import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveApprovalQueue } from "@/modules/leave/components/leave-approval-queue";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Leave Approvals" };

export default async function LeaveApprovalsPage() {
  const { companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.APPROVE);
  const items = await getEmployeeLeaveServices(companyId).approval.listPending();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Approval Queue" description="Review and action pending leave requests" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pending Approvals</CardTitle></CardHeader>
        <CardContent><LeaveApprovalQueue items={items} /></CardContent>
      </Card>
    </div>
  );
}
