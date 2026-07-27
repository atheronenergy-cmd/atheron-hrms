import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { PolicyForm } from "@/modules/organization/components/entity-forms";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPolicyPage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.HR.POLICY.MANAGE);
  const { id } = await params;
  const { policy } = await getOrgServices(companyId);
  const item = await policy.getById(id).catch(() => null);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit HR Policy" description={item.name} />
      <PolicyForm
        mode="edit"
        defaultValues={{
          id: item.id,
          version: item.version,
          category: item.category,
          name: item.name,
          code: item.code,
          description: item.description ?? "",
          rules: (item.rules ?? {}) as Record<string, unknown>,
          status: item.status,
        }}
      />
    </div>
  );
}
