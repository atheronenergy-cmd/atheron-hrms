import { Suspense } from "react";

import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { roleAssignmentService } from "@/modules/user/application/role-assignment.service";
import { createUserService } from "@/modules/user/application/user.service";
import { UserTable } from "@/modules/user/components/user-table";
import { userListQuerySchema } from "@/modules/user/validation/schemas";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Users" };

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  await guardPagePermission(PERMISSIONS.USER.ACCOUNT.READ);
  const auth = await requireAuth();
  const params = await searchParams;
  const query = userListQuerySchema.parse(params);

  const userService = createUserService(auth.companyId ?? undefined);
  const [data, roles] = await Promise.all([
    userService.listUsers(query),
    roleAssignmentService.listAvailableRoles(auth.companyId),
  ]);

  return (
    <Suspense>
      <UserTable
        data={data}
        roles={roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))}
      />
    </Suspense>
  );
}
