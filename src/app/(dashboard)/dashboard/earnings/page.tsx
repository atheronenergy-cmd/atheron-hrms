import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Earnings" };

const links = [
  { href: EARNINGS_ROUTES.overtime, label: "Overtime" },
  { href: EARNINGS_ROUTES.overtimeRequests, label: "OT Requests" },
  { href: EARNINGS_ROUTES.bonus, label: "Bonus" },
  { href: EARNINGS_ROUTES.incentives, label: "Incentives" },
  { href: EARNINGS_ROUTES.commission, label: "Commission" },
  { href: EARNINGS_ROUTES.allowances, label: "Allowances" },
  { href: EARNINGS_ROUTES.production, label: "Production" },
  { href: EARNINGS_ROUTES.performance, label: "Performance" },
  { href: EARNINGS_ROUTES.reports, label: "Reports" },
];

export default async function EarningsDashboardPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.OVERTIME.VIEW);
  const [stats, audit] = await Promise.all([
    getEarningsServices(companyId).report.getDashboardStats(),
    getEarningsServices(companyId).audit.listRecent(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Earnings Engine" description="Overtime, bonus, incentive, commission, and allowance management" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending OT</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingOt}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Approved OT</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.approvedOt}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Bonus</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.monthlyBonus.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Incentives</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.monthlyIncentives.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Commission</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalCommission.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Allowances</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAllowances.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Production Rewards</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.productionRewards}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 ? <p className="text-muted-foreground">No earnings audit events yet.</p> : audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.entityType} · {a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
