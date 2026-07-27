import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveApplyForm } from "@/modules/leave/components/leave-apply-form";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Apply Leave" };

export default async function LeaveApplyPage() {
  const { companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.APPLY);
  const leaveTypes = await getEmployeeLeaveServices(companyId).leave.listLeaveTypes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Apply Leave" description="Submit a new leave request" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <LeaveApplyForm leaveTypes={leaveTypes.map((t) => ({ id: t.id, code: t.code, name: t.name }))} />
    </div>
  );
}
