import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Financial Year" };

export default async function FinancialYearPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.MANAGE);
  const years = await getStatutoryServices(companyId).config.listFinancialYears();

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Year" description="Version statutory rules per financial year — previous payroll never changes" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Configured Years</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {years.length === 0 ? (
            <p className="text-muted-foreground">No financial years configured. Run seed or create via API.</p>
          ) : (
            years.map((fy) => (
              <div key={fy.id} className="flex justify-between border-b py-2">
                <span>{fy.code} · {fy.label}{fy.isCurrent ? " (Current)" : ""}</span>
                <span className="text-muted-foreground">{fy.startDate.toISOString().slice(0, 10)} – {fy.endDate.toISOString().slice(0, 10)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
