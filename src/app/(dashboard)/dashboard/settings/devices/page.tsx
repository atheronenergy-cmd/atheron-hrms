import { PageHeader } from "@/components/ui/page-header";
import { requireAuth, requireSession } from "@/infrastructure/auth/server";
import { deviceService } from "@/modules/security/application/device.service";
import { DeviceList } from "@/modules/security/components/device-list";

export const metadata = { title: "Devices" };

export default async function DevicesPage() {
  await requireAuth();
  const session = await requireSession();
  const devices = await deviceService.listUserDevices(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trusted devices"
        description="Devices that have accessed your account"
      />
      <DeviceList devices={devices} />
    </div>
  );
}
