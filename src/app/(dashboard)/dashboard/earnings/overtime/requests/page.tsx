import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Overtime Requests" };

export default async function OvertimeRequestsPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.OVERTIME.VIEW);
  const records = await getEarningsServices(companyId).overtime.listRecords();

  return (
    <div className="space-y-6">
      <PageHeader title="Overtime Requests" description="Approval workflow for overtime records" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Records</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {records.length === 0 ? <p className="text-muted-foreground">No overtime records.</p> : records.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2">
              <span>{r.employee.employeeCode} · {Number(r.otHours)}h</span>
              <span className="text-muted-foreground">{r.status} · ₹{Number(r.amount).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
