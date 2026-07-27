import { PageHeader } from "@/components/ui/page-header";
import { BranchForm } from "@/modules/organization/components/branch-form";
import { requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "New Branch" };

export default async function NewBranchPage() {
  await requireOrgContext(PERMISSIONS.BRANCH.PROFILE.CREATE);
  return (
    <div className="space-y-6">
      <PageHeader title="Create Branch" description="Add a new office location" />
      <BranchForm mode="create" />
    </div>
  );
}
