import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Performance Rewards" };

export default async function PerformancePage() {
  await requireEarningsContext(PERMISSIONS.INCENTIVE.MANAGE);
  return (
    <div className="space-y-6">
      <PageHeader title="Performance Rewards" description="Performance score-based rewards integrated into payroll" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Performance Metrics</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Configure performance metrics and reward amounts per review cycle.</CardContent></Card>
    </div>
  );
}
