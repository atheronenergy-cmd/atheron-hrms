import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Commission Rules" };

export default async function CommissionPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.COMMISSION.MANAGE);
  const rules = await getEarningsServices(companyId).earnings.listRules("commission");
  return (
    <div className="space-y-6">
      <PageHeader title="Commission Rules" description="Fixed, percentage, slab, and target-based sales commission" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader><CardContent className="text-sm">{rules.length === 0 ? "No commission rules." : rules.map((r) => <div key={r.id} className="border-b py-2">{r.name} · {r.commissionType}</div>)}</CardContent></Card>
    </div>
  );
}
