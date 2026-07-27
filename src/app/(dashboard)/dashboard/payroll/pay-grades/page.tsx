import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SALARY_ROUTES } from "@/modules/payroll/domain/types";
import { requireSalaryContext, getSalaryServices } from "@/modules/payroll/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Pay Grades" };

export default async function PayGradesPage() {
  const { companyId } = await requireSalaryContext(PERMISSIONS.PAYROLL.SALARY.VIEW);
  const grades = await getSalaryServices(companyId).structure.listPayGrades();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Pay Grades" description="Grade A, B, C and custom pay bands with CTC ranges" />
        <Button variant="outline" asChild><Link href={SALARY_ROUTES.dashboard}>Back</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Pay Grades ({grades.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {grades.map((g) => (
            <div key={g.id} className="flex justify-between border-b py-2 text-sm">
              <span>{g.name} ({g.code})</span>
              <span className="text-muted-foreground">Level {g.level} · {g.minCtc ? Number(g.minCtc) : "—"} – {g.maxCtc ? Number(g.maxCtc) : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
