import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceDashboardCards } from "@/modules/attendance/components/attendance-card";
import { AttendanceTable } from "@/modules/attendance/components/attendance-table";
import { ATTENDANCE_ROUTES } from "@/modules/attendance/domain/types";
import { requireAttendanceContext, getEmployeeAttendanceServices } from "@/modules/attendance/server/page-utils";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const { companyId } = await requireAttendanceContext(PERMISSIONS.ATTENDANCE.RECORD.READ);
  const { attendance, report, correction } = getEmployeeAttendanceServices(companyId);
  const today = new Date();

  const [stats, list, corrections] = await Promise.all([
    report.getDashboardStats(),
    attendance.list({
      page: 1,
      pageSize: 50,
      dateFrom: today,
      dateTo: today,
      sortBy: "date",
      sortOrder: "desc",
    }),
    correction.list(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title="Attendance" description="Track and manage employee attendance" />
        <Button variant="outline" asChild>
          <Link href={ATTENDANCE_ROUTES.gps}>GPS Attendance</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={ATTENDANCE_ROUTES.qr}>QR Attendance</Link>
        </Button>
      </div>
      <AttendanceDashboardCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Attendance Trend (7 days)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data yet.</p>
            ) : (
              stats.trend.map((t) => (
                <div key={t.date} className="flex items-center justify-between text-sm">
                  <span>{t.date}</span>
                  <span>Present {t.present} · Absent {t.absent}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Department Attendance (Today)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.byDepartment.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span>{d.name}</span>
                <span>{d.present}/{d.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Today's Attendance</CardTitle></CardHeader>
        <CardContent><AttendanceTable items={list.items} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending Corrections</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {corrections.filter((c) => !["hr_approved", "rejected", "cancelled"].includes(c.status)).length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending corrections.</p>
          ) : (
            corrections
              .filter((c) => !["hr_approved", "rejected", "cancelled"].includes(c.status))
              .map((c) => (
                <div key={c.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{c.employeeName}</p>
                  <p className="text-muted-foreground">{c.attendanceDate} · {c.correctionType} · {c.status}</p>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
