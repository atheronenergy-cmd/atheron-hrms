import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { GpsDashboard } from "@/modules/attendance/gps/components/gps-dashboard";
import { getGpsServices, requireGpsAttendanceContext } from "@/modules/attendance/gps/server/page-utils";
import { ATTENDANCE_ROUTES } from "@/modules/attendance/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "GPS Attendance" };

export default async function GpsAttendancePage() {
  const { companyId } = await requireGpsAttendanceContext(PERMISSIONS.GPS_ATTENDANCE.RECORD.READ);
  const dashboard = await getGpsServices(companyId).gps.getDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="GPS Attendance" description="Live location tracking, geo-fencing, and visit history" />
        <Button variant="outline" asChild>
          <Link href={ATTENDANCE_ROUTES.list}>Back to Attendance</Link>
        </Button>
      </div>
      <GpsDashboard data={dashboard} />
    </div>
  );
}
