import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Bonus Management" };

export default async function BonusPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.BONUS.MANAGE);
  const rules = await getEarningsServices(companyId).earnings.listRules("bonus");
  return (
    <div className="space-y-6">
      <PageHeader title="Bonus Management" description="Festival, performance, annual, and custom bonus rules" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Bonus Rules</CardTitle></CardHeader><CardContent className="text-sm">{rules.length === 0 ? "No bonus rules." : rules.map((r) => <div key={r.id} className="border-b py-2">{r.name} · {r.bonusType}</div>)}</CardContent></Card>
    </div>
  );
}
