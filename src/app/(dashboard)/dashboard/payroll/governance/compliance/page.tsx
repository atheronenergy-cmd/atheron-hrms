import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Compliance Snapshot" };

export default async function ComplianceSnapshotPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.VIEW);
  const snapshots = await getPayrollGovernanceServices(companyId).compliance.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Compliance Snapshots" description="Immutable PF, ESI, PT, TDS and rules version capture" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Snapshots ({snapshots.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshots.length === 0 ? <p className="text-muted-foreground">No compliance snapshots yet.</p> : snapshots.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-2">
              <span>{s.snapshotNumber}</span>
              <span className="text-muted-foreground font-mono text-xs">{s.contentHash.slice(0, 12)}…</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
