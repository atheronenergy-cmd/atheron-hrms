import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { QrDashboard } from "@/modules/attendance/qr/components/qr-dashboard";
import { getQrServices, requireQrAttendanceContext } from "@/modules/attendance/qr/server/page-utils";
import { ATTENDANCE_ROUTES } from "@/modules/attendance/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "QR Attendance" };

export default async function QrAttendancePage() {
  const { companyId } = await requireQrAttendanceContext(PERMISSIONS.QR.CODE.READ);
  const dashboard = await getQrServices(companyId).report.getDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="QR Attendance" description="Secure dynamic QR codes integrated with the attendance engine" />
        <Button variant="outline" asChild>
          <Link href={ATTENDANCE_ROUTES.list}>Back to Attendance</Link>
        </Button>
      </div>
      <QrDashboard data={dashboard} />
    </div>
  );
}
