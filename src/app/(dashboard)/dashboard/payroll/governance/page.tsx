import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_GOVERNANCE_ROUTES } from "@/modules/payroll-governance/domain/types";
import { getPayrollGovernanceServices, requirePayrollGovernanceContext } from "@/modules/payroll-governance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payroll Governance" };

const links = [
  { href: PAYROLL_GOVERNANCE_ROUTES.approval, label: "Approval Queue" },
  { href: PAYROLL_GOVERNANCE_ROUTES.locks, label: "Lock Manager" },
  { href: PAYROLL_GOVERNANCE_ROUTES.versions, label: "Versions" },
  { href: PAYROLL_GOVERNANCE_ROUTES.retro, label: "Retro Payroll" },
  { href: PAYROLL_GOVERNANCE_ROUTES.arrears, label: "Arrears" },
  { href: PAYROLL_GOVERNANCE_ROUTES.financialYear, label: "Financial Year" },
  { href: PAYROLL_GOVERNANCE_ROUTES.compliance, label: "Compliance" },
  { href: PAYROLL_GOVERNANCE_ROUTES.backup, label: "Backup" },
  { href: PAYROLL_GOVERNANCE_ROUTES.reports, label: "Reports" },
];

export default async function PayrollGovernanceDashboardPage() {
  const { companyId } = await requirePayrollGovernanceContext(PERMISSIONS.PAYROLL.VIEW);
  const svc = getPayrollGovernanceServices(companyId);
  const [queue, locks, audit, years] = await Promise.all([
    svc.approval.getQueue(),
    svc.lock.listActive(),
    svc.audit.listRecent(5),
    svc.financialYear.list(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Payroll Governance" description="Approval workflows, locking, versioning, retro payroll, arrears and financial year control" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{queue.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active Locks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{locks.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Years</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{years.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Governance Events</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{audit.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 ? <p className="text-muted-foreground">No governance events yet.</p> : audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
