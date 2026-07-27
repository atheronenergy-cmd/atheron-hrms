import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { STATUTORY_ROUTES } from "@/modules/statutory/domain/types";
import { getStatutoryServices, requireStatutoryContext } from "@/modules/statutory/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Investment Declarations" };

export default async function InvestmentDeclarationsPage() {
  const { companyId } = await requireStatutoryContext(PERMISSIONS.STATUTORY.VIEW);
  const declarations = await getStatutoryServices(companyId).statutory.listInvestmentDeclarations();

  return (
    <div className="space-y-6">
      <PageHeader title="Investment Declarations" description="80C, 80D, home loan, NPS, and proof upload architecture" />
      <p className="text-sm"><Link href={STATUTORY_ROUTES.dashboard} className="text-primary hover:underline">← Statutory Dashboard</Link></p>
      <Card>
        <CardHeader><CardTitle className="text-base">Declarations</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {declarations.length === 0 ? (
            <p className="text-muted-foreground">No investment declarations yet.</p>
          ) : (
            declarations.map((d) => (
              <div key={d.id} className="flex justify-between border-b py-2">
                <span>{d.employee.employeeCode} · 80C ₹{Number(d.section80C).toLocaleString()}</span>
                <span className="text-muted-foreground">{d.declarationStatus}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
