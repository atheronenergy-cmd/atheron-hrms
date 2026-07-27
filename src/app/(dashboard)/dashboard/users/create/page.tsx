import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { roleAssignmentService } from "@/modules/user/application/role-assignment.service";
import { UserForm } from "@/modules/user/components/user-form";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Create user" };

export default async function CreateUserPage() {
  await guardPagePermission(PERMISSIONS.USER.ACCOUNT.CREATE);
  const auth = await requireAuth();
  const roles = await roleAssignmentService.listAvailableRoles(auth.companyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create user"
        description="Add a new system user and assign roles."
      />
      <UserForm
        mode="create"
        roles={roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))}
      />
    </div>
  );
}
