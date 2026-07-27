import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { prisma } from "@/infrastructure/database/prisma-client";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Versions" };

export default async function PayrollVersionsPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.VIEW);
  const versions = await prisma.payrollVersion.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { payroll: { select: { payrollNumber: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Versions" description="Version history with difference logs and rollback protection" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Versions</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {versions.length === 0 ? <p className="text-muted-foreground">No versions recorded yet.</p> : versions.map((v) => (
            <div key={v.id} className="flex justify-between border-b py-2">
              <span>{v.payroll.payrollNumber} · v{v.versionNumber}</span>
              <span className="text-muted-foreground">{v.changeReason ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
