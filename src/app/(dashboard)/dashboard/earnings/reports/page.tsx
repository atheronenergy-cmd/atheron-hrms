import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Earnings Reports" };

const reports = ["overtime", "bonus", "incentive", "commission", "allowance", "production"] as const;

export default async function EarningsReportsPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.OVERTIME.VIEW);
  const data = await Promise.all(reports.map((r) => getEarningsServices(companyId).report.buildReport({ reportType: r })));

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings Reports" description="Export-ready OT, bonus, incentive, commission, and allowance reports" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((r) => (
          <Card key={r.reportType}><CardHeader><CardTitle className="text-base capitalize">{r.reportType} Report</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{r.rows.length} rows · Export ready</CardContent></Card>
        ))}
      </div>
    </div>
  );
}
