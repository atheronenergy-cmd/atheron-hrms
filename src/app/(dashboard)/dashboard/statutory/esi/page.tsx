import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "ESI Settings" };

export default async function ESISettingsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.ESI.MANAGE);
  const years = await getStatutoryServices(companyId).config.listFinancialYears();
  const current = years.find((y) => y.isCurrent) ?? years[0];
  const config = current ? (await getStatutoryServices(companyId).config.getActiveConfigs(current.id)).esi : null;

  return (
    <div className="space-y-6">
      <PageHeader title="ESI Settings" description="Configure ESI rates and eligibility ceiling with auto-detection" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Active Configuration ({current?.code ?? "None"})</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          {config ? (
            <>
              <div>Employee Rate: {config.employeeRate}%</div>
              <div>Employer Rate: {config.employerRate}%</div>
              <div>Eligibility Ceiling: ₹{config.eligibilityCeiling.toLocaleString()}</div>
            </>
          ) : (
            <p className="text-muted-foreground">No ESI configuration for current financial year.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
