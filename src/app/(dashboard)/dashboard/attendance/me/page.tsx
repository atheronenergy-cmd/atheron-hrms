import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";
import { prisma } from "@/infrastructure/database/prisma-client";
import { MyAttendancePanel } from "@/modules/attendance/components/my-attendance-panel";
import { ATTENDANCE_STATUS_LABELS } from "@/modules/attendance/domain/types";
import { zonedIsoDate } from "@/shared/utils/date.utils";

export const metadata = { title: "My Attendance" };

function utcDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

export default async function MyAttendancePage() {
  const user = await requireAuth();
  if (!user.companyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="Mark your attendance and share your location" />
        <EmptyState title="No company is linked" description="This login is not attached to a company." />
      </div>
    );
  }

  const [employee, company] = await Promise.all([
    prisma.employee.findFirst({
      where: { userId: user.id, companyId: user.companyId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    }),
    prisma.company.findFirst({
      where: { id: user.companyId, deletedAt: null },
      select: { timezone: true },
    }),
  ]);

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Attendance" description="Mark your attendance and share your location" />
        <EmptyState
          title="This login is not linked to an employee"
          description="Ask HR to open your employee profile and choose Create login. Use the same email as this account."
        />
      </div>
    );
  }

  const today = utcDate(zonedIsoDate(new Date(), company?.timezone ?? "Asia/Kolkata"));
  const attendance = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, companyId: user.companyId, date: today, deletedAt: null },
    select: { status: true, checkInAt: true, checkOutAt: true },
  });
  const checkedIn = Boolean(attendance?.checkInAt && !attendance.checkOutAt);
  const statusLabel = attendance ? (ATTENDANCE_STATUS_LABELS[attendance.status] ?? attendance.status) : "Not marked today";

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Check in from wherever you are. Your location is saved, and management can see your latest position."
      />
      <MyAttendancePanel
        employeeName={[employee.firstName, employee.lastName].filter(Boolean).join(" ")}
        employeeCode={employee.employeeCode}
        checkedIn={checkedIn}
        statusLabel={statusLabel}
      />
    </div>
  );
}
