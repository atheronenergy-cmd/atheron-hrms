import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { roleAssignmentService } from "@/modules/user/application/role-assignment.service";
import { createUserService } from "@/modules/user/application/user.service";
import { createUserSecurityService } from "@/modules/user/application/user-security.service";
import { UserDetailView } from "@/modules/user/components/user-detail-view";
import { USER_ROUTES } from "@/modules/user/domain/types";
import { NotFoundError } from "@/shared/errors";

export const metadata = { title: "User profile" };

const RESERVED_USER_IDS = new Set(["new", "create", "edit"]);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: PageProps) {
  await guardPagePermission("user.account.read");
  const auth = await requireAuth();
  const { id } = await params;

  if (id === "new") redirect(USER_ROUTES.create);
  if (RESERVED_USER_IDS.has(id)) notFound();

  const userService = createUserService(auth.companyId ?? undefined);
  const securityService = createUserSecurityService(auth.companyId ?? undefined);

  let user;
  try {
    user = await userService.getUser(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const [permissions, userRoles, sessions, loginHistory, activityLogs, availableRoles] =
    await Promise.all([
      roleAssignmentService.getUserPermissions(id),
      roleAssignmentService.getUserRoles(id),
      securityService.getSessions(id),
      securityService.getLoginHistory(id),
      securityService.getActivityLogs(id),
      roleAssignmentService.listAvailableRoles(auth.companyId),
    ]);

  return (
    <UserDetailView
      user={user}
      permissions={permissions}
      userRoles={userRoles.map((ur) => ({
        id: ur.id,
        role: ur.role,
        branch: ur.branch,
        assignedAt: ur.assignedAt,
      }))}
      sessions={sessions}
      loginHistory={loginHistory}
      activityLogs={activityLogs}
      availableRoles={availableRoles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
      }))}
    />
  );
}
