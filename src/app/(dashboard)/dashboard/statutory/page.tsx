import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Statutory Payroll" };

const links = [
  { href: STATUTORY_ROUTES.pf, label: "PF Settings" },
  { href: STATUTORY_ROUTES.esi, label: "ESI Settings" },
  { href: STATUTORY_ROUTES.pt, label: "PT Settings" },
  { href: STATUTORY_ROUTES.incomeTax, label: "Income Tax" },
  { href: STATUTORY_ROUTES.investmentDeclarations, label: "Investments" },
  { href: STATUTORY_ROUTES.financialYear, label: "Financial Year" },
  { href: STATUTORY_ROUTES.reports, label: "Reports" },
];

export default async function StatutoryDashboardPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.VIEW);
  const [stats, audit] = await Promise.all([
    getStatutoryServices(companyId).config.getDashboardStats(),
    getStatutoryServices(companyId).audit.listRecent(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Statutory Payroll" description="Indian statutory configuration and compliance engine" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild>
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active FY</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.activeFinancialYear ?? "—"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">PF Configured</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pfConfigured ? "Yes" : "No"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">ESI Configured</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.esiConfigured ? "Yes" : "No"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">PT Configured</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.ptConfigured ? "Yes" : "No"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">TDS Configured</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.tdsConfigured ? "Yes" : "No"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Declarations</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingDeclarations}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 ? (
            <p className="text-muted-foreground">No statutory audit events yet.</p>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="flex justify-between border-b py-2">
                <span>{a.entityType} · {a.action}</span>
                <span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
