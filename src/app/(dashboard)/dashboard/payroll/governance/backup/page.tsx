import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Backup" };

export default async function PayrollBackupPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.BACKUP.MANAGE);
  const backups = await getPayrollGovernanceServices(companyId).backup.list();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Backup & Restore" description="Backup payroll with checksum validation and controlled restore" />
        <Button variant="outline" size="sm" asChild><Link href={PAYROLL_GOVERNANCE_ROUTES.dashboard}>Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Backups ({backups.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {backups.length === 0 ? <p className="text-muted-foreground">No backups created yet.</p> : backups.map((b) => (
            <div key={b.id} className="flex justify-between border-b py-2">
              <span>{b.backupNumber}</span>
              <span className="text-muted-foreground">{b.status} · {b.createdAt.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
