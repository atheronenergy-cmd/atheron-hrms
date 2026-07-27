import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Production Incentives" };

export default async function ProductionPage() {
  await requireEarningsContext(PERMISSIONS.INCENTIVE.MANAGE);
  return (
    <div className="space-y-6">
      <PageHeader title="Production Incentives" description="Manufacturing KPIs: output, quality, efficiency, reject percentage" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Production Metrics</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Record production metrics via API to drive incentive calculation during payroll.</CardContent></Card>
    </div>
  );
}
