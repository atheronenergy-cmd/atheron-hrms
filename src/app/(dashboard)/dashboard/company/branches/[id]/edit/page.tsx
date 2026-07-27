import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { BranchForm } from "@/modules/organization/components/branch-form";
import { getOrgServices, requireOrgContext } from "@/modules/organization/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Edit Branch" };

type PageProps = { params: Promise<{ id: string }> };

export default async function EditBranchPage({ params }: PageProps) {
  const { companyId } = await requireOrgContext(PERMISSIONS.BRANCH.PROFILE.UPDATE);
  const { id } = await params;
  const { branch } = await getOrgServices(companyId);
  const item = await branch.getById(id).catch(() => null);
  if (!item) notFound();

  const address = (item.address ?? {}) as { city?: string };

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Branch" description={item.name} />
      <BranchForm
        mode="edit"
        defaultValues={{
          id: item.id,
          version: item.version,
          name: item.name,
          code: item.code,
          phone: item.phone ?? "",
          email: item.email ?? "",
          latitude: item.latitude ? Number(item.latitude) : undefined,
          longitude: item.longitude ? Number(item.longitude) : undefined,
          geofenceRadiusMeters: item.geofenceRadiusMeters ?? undefined,
          gpsAttendanceEnabled: item.gpsAttendanceEnabled,
          allowOutsideLocation: item.allowOutsideLocation,
          locationRequired: item.locationRequired,
          isHeadOffice: item.isHeadOffice,
          status: item.status,
          address: { city: address.city },
        }}
      />
    </div>
  );
}
