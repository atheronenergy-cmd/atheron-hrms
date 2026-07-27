import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Statutory Reports" };

const reportTypes = [
  { type: "pf" as const, label: "PF Report" },
  { type: "esi" as const, label: "ESI Report" },
  { type: "pt" as const, label: "PT Report" },
  { type: "tds" as const, label: "TDS Report" },
  { type: "employer" as const, label: "Employer Contribution Report" },
];

export default async function StatutoryReportsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.VIEW);
  const reports = await Promise.all(
    reportTypes.map(async (r) => ({
      ...r,
      payload: await getStatutoryServices(companyId).report.buildReport({ reportType: r.type }),
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Statutory Reports" description="Export-ready PF, ESI, PT, TDS, and employer contribution reports" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.type}>
            <CardHeader><CardTitle className="text-base">{r.label}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              FY {r.payload.financialYearCode} · {r.payload.rows.length} rows · Export ready
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
