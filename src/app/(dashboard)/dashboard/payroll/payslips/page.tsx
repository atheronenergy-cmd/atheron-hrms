import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PAYROLL_DOCUMENT_ROUTES } from "@/modules/payroll-documents/domain/types";
import { getPayrollDocumentServices, requirePayrollDocumentContext } from "@/modules/payroll-documents/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Payslip Documents" };

const links = [
  { href: PAYROLL_DOCUMENT_ROUTES.preview, label: "Preview" },
  { href: PAYROLL_DOCUMENT_ROUTES.employees, label: "Employee Payslips" },
  { href: PAYROLL_DOCUMENT_ROUTES.archive, label: "Archive" },
  { href: PAYROLL_DOCUMENT_ROUTES.certificates, label: "Salary Certificates" },
  { href: PAYROLL_DOCUMENT_ROUTES.history, label: "Document History" },
];

export default async function PayslipDashboardPage() {
  const { companyId } = await requirePayrollDocumentContext(PERMISSIONS.PAYSLIP.VIEW);
  const [stats, audit] = await Promise.all([
    getPayrollDocumentServices(companyId).report.getDashboardStats(),
    getPayrollDocumentServices(companyId).audit.listRecent(5),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Payslip Documents" description="Generate, archive, and distribute enterprise payroll documents" />
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild><Link href={l.href}>{l.label}</Link></Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Payslips</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalPayslips}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Generated This Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.generatedThisMonth}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Generation</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingGeneration}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Archived Documents</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.archivedDocuments}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Emails Sent</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.emailsSent}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Email Failures</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.emailsFailed}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Salary Certificates</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.certificatesIssued}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Document Audit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {audit.length === 0 ? <p className="text-muted-foreground">No document events yet.</p> : audit.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-2"><span>{a.entityType} · {a.action}</span><span className="text-muted-foreground">{a.createdAt.toISOString().slice(0, 10)}</span></div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
