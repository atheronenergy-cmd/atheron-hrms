import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Incentive Rules" };

export default async function IncentivesPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.INCENTIVE.MANAGE);
  const rules = await getEarningsServices(companyId).earnings.listRules("incentive");
  return (
    <div className="space-y-6">
      <PageHeader title="Incentive Rules" description="Sales, production, attendance, referral, and custom incentives" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader><CardContent className="text-sm">{rules.length === 0 ? "No incentive rules." : rules.map((r) => <div key={r.id} className="border-b py-2">{r.name} · {r.incentiveType}</div>)}</CardContent></Card>
    </div>
  );
}
