import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Overtime" };

export default async function OvertimePage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.OVERTIME.MANAGE);
  const rules = await getEarningsServices(companyId).earnings.listRules("overtime");

  return (
    <div className="space-y-6">
      <PageHeader title="Overtime Engine" description="Configurable hourly, holiday, night shift, and custom multipliers" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Overtime Rules</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rules.length === 0 ? <p className="text-muted-foreground">No overtime rules configured.</p> : rules.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2"><span>{r.name} ({r.code}) · {r.overtimeType}</span><span>{Number(r.multiplier)}x</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
