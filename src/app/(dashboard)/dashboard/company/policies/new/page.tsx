import { PageHeader } from "@/components/ui/page-header";
import { PolicyForm } from "@/modules/organization/components/entity-forms";
import { requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export default async function NewPolicyPage() {
  await requireOrgContext(PERMISSIONS.HR.POLICY.MANAGE);
  return (
    <div className="space-y-6">
      <PageHeader title="Create HR Policy" />
      <PolicyForm mode="create" />
    </div>
  );
}
