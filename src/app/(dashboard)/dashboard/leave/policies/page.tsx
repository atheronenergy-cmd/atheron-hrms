import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LEAVE_ROUTES } from "@/modules/leave/domain/types";
import { requireLeaveContext, getEmployeeLeaveServices } from "@/modules/leave/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Leave Policies" };

export default async function LeavePoliciesPage() {
  const { companyId } = await requireLeaveContext(PERMISSIONS.LEAVE.POLICY.MANAGE);
  const [types, policies] = await Promise.all([
    getEmployeeLeaveServices(companyId).policy.listLeaveTypes(),
    getEmployeeLeaveServices(companyId).policy.listPolicies(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Leave Policies" description="Configure leave types and accrual policies" />
        <Button variant="outline" asChild><Link href={LEAVE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Leave Types ({types.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {types.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm border-b py-2">
              <span>{t.name}</span>
              <span className="text-muted-foreground">{t.code} · {t.isPaid ? "Paid" : "Unpaid"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Policies ({policies.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No policies configured yet.</p>
          ) : (
            policies.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b py-2">
                <span>{p.name}</span>
                <span className="text-muted-foreground">{p.leaveType?.code ?? "All"} · {p.accrualPeriod}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
