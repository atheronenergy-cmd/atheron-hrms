import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { prisma } from "@/infrastructure/database/prisma-client";
import { getDocumentServices } from "@/modules/document/server/page-utils";
import { EmployeeLoginCard } from "@/modules/employee/components/employee-login-card";
import { EmployeeProfileView } from "@/modules/employee/components/employee-profile-view";
import {
  getEmployeeServices,
  requireEmployeeContext,
} from "@/modules/employee/server/page-utils";
import {
  getEmployeeFinancialServices,
  resolveFinancialViewOptions,
} from "@/modules/employee-financial/server/page-utils";
import { getEmployeeLifecycleServices } from "@/modules/employee-lifecycle/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Employee Profile" };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { auth, companyId } = await requireEmployeeContext(PERMISSIONS.EMPLOYEE.PROFILE.READ);
  const { id } = await params;
  const { employee } = getEmployeeServices(companyId);
  const { documents, categories } = getDocumentServices(companyId);
  const { financial } = getEmployeeFinancialServices(companyId);
  const { lifecycle } = getEmployeeLifecycleServices(companyId);

  const [canViewFinancial, canViewLifecycle, canUpdate, login] = await Promise.all([
    authorizationService.hasPermission(auth.id, PERMISSIONS.EMPLOYEE.BANK.READ, companyId),
    authorizationService.hasPermission(auth.id, PERMISSIONS.EMPLOYEE.LIFECYCLE.READ, companyId),
    authorizationService.hasPermission(auth.id, PERMISSIONS.EMPLOYEE.PROFILE.UPDATE, companyId),
    prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
      select: { email: true, user: { select: { email: true } } },
    }),
  ]);

  const loaded = await Promise.all([
    employee.getById(id),
    employee.getTimeline(id),
    documents.getPhotoUrl(id),
    categories.list(),
    documents.list({ employeeId: id, page: 1, pageSize: 200, sortBy: "createdAt", sortOrder: "desc" }),
    canViewFinancial
      ? resolveFinancialViewOptions(auth.id, companyId).then((view) => financial.getSummary(id, view))
      : Promise.resolve(null),
    canViewLifecycle ? lifecycle.getSummary(id) : Promise.resolve(null),
  ]).catch(() => null);

  if (!loaded) notFound();
  const [profile, timeline, photoUrl, categoryList, documentList, financialSummary, lifecycleSummary] = loaded;

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Profile" description={profile.employeeCode} />
      <EmployeeLoginCard
        employeeId={id}
        email={login?.email ?? profile.email}
        linkedEmail={login?.user?.email ?? null}
        canManage={canUpdate}
      />
      <EmployeeProfileView
        employee={profile}
        timeline={timeline}
        photoUrl={photoUrl}
        documentCategories={categoryList}
        documents={documentList.items}
        financialSummary={financialSummary}
        canViewFinancial={canViewFinancial}
        lifecycleSummary={lifecycleSummary}
        canViewLifecycle={canViewLifecycle}
      />
    </div>
  );
}
