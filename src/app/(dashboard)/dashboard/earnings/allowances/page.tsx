import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EARNINGS_ROUTES } from "@/modules/earnings/domain/types";
import { getEarningsServices, requireEarningsContext } from "@/modules/earnings/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Allowance Rules" };

export default async function AllowancesPage() {
  const { companyId } = await requireEarningsContext(PERMISSIONS.ALLOWANCE.MANAGE);
  const rules = await getEarningsServices(companyId).earnings.listRules("allowance");
  return (
    <div className="space-y-6">
      <PageHeader title="Allowance Rules" description="Travel, fuel, food, uniform, and custom allowances" />
      <p className="text-sm"><Link href={EARNINGS_ROUTES.dashboard} className="text-primary hover:underline">← Earnings Dashboard</Link></p>
      <Card><CardHeader><CardTitle className="text-base">Rules</CardTitle></CardHeader><CardContent className="text-sm">{rules.length === 0 ? "No allowance rules." : rules.map((r) => <div key={r.id} className="border-b py-2">{r.name} · {r.allowanceType}</div>)}</CardContent></Card>
    </div>
  );
}
