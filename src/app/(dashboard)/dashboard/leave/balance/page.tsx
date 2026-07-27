import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LeaveBalanceCards } from "@/modules/leave/components/leave-card";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Leave Balance" };

export default async function LeaveBalancePage() {
  const { auth, companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.VIEW);
  const svc = getEmployeeLeaveServices(companyId);
  const employee = await svc.leave.resolveEmployee(auth.id).catch(() => null);
  const balances = employee ? await svc.balance.getEmployeeBalances(employee.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Leave Balance" description="Opening, credited, used, pending, and closing balances" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Current Year Balances</CardTitle></CardHeader>
        <CardContent><LeaveBalanceCards balances={balances} /></CardContent>
      </Card>
    </div>
  );
}
