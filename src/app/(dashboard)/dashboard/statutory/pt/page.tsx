import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Professional Tax Settings" };

export default async function PTSettingsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.PT.MANAGE);
  const years = await getStatutoryServices(companyId).config.listFinancialYears();
  const current = years.find((y) => y.isCurrent) ?? years[0];
  const config = current ? (await getStatutoryServices(companyId).config.getActiveConfigs(current.id)).pt : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Professional Tax" description="State-wise slab configuration with financial year versioning" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">{config ? `${config.stateName} (${config.stateCode})` : "No PT Config"}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {config ? (
            config.slabs.map((s, i) => (
              <div key={i}>₹{s.from.toLocaleString()} – {s.to ? `₹${s.to.toLocaleString()}` : "Above"} → ₹{s.amount}</div>
            ))
          ) : (
            <p className="text-muted-foreground">Configure PT slabs per state for the active financial year.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
