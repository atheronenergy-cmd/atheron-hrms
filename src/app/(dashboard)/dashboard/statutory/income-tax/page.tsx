import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Income Tax Settings" };

export default async function IncomeTaxSettingsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.TDS.MANAGE);
  const years = await getStatutoryServices(companyId).config.listFinancialYears();
  const current = years.find((y) => y.isCurrent) ?? years[0];
  const configs = current ? await getStatutoryServices(companyId).config.getActiveConfigs(current.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Income Tax (TDS)" description="Old and new tax regime slabs, rebate, surcharge, and cess" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["incomeTaxNew", "incomeTaxOld"] as const).map((key) => {
          const cfg = configs?.[key];
          const title = key === "incomeTaxNew" ? "New Regime" : "Old Regime";
          return (
            <Card key={key}>
              <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {cfg ? (
                  <>
                    <div>Standard Deduction: ₹{cfg.standardDeduction.toLocaleString()}</div>
                    <div>Cess: {cfg.cessRate}%</div>
                    <div>Slabs: {cfg.slabs.length}</div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Not configured</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
