import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_ROUTES } from "@/modules/payroll/domain/types";
import { requirePayrollContext } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Preview" };

export default async function PayrollPreviewPage() {
  await requirePayrollContext(PERMISSIONS.PAYROLL.VIEW);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Payroll Preview" description="Preview salary components, attendance, leave, gross, and net before saving" />
        <Button variant="outline" asChild><Link href={PAYROLL_ROUTES.generate}>Generate</Link></Button>
      </div>
      <p className="text-sm text-muted-foreground">Run preview via Generate Payroll with previewOnly=true, or POST /api/payroll/preview.</p>
    </div>
  );
}
