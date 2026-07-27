import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { createUserService } from "@/modules/user/application/user.service";
import { UserForm } from "@/modules/user/components/user-form";
import { NotFoundError } from "@/shared/errors";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Edit user" };

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditUserPage({ params }: PageProps) {
  await guardPagePermission(PERMISSIONS.USER.ACCOUNT.UPDATE);
  const auth = await requireAuth();
  const { id } = await params;

  const userService = createUserService(auth.companyId ?? undefined);

  let user;
  try {
    user = await userService.getUser(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit user" description={`Update profile for ${user.name}`} />
      <UserForm
        mode="edit"
        roles={[]}
        defaultValues={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          remarks: user.remarks,
          version: user.version,
        }}
      />
    </div>
  );
}
