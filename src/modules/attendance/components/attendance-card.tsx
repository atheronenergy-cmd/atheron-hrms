import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceDashboardStats } from "@/modules/attendance/domain/types";

type AttendanceCardProps = {
  title: string;
  value: number | string;
  description?: string;
};

export function AttendanceCard({ title, value, description }: AttendanceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

export function AttendanceDashboardCards({ stats }: { stats: AttendanceDashboardStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <AttendanceCard title="Today's Present" value={stats.todayPresent} />
      <AttendanceCard title="Today's Absent" value={stats.todayAbsent} />
      <AttendanceCard title="Late Employees" value={stats.todayLate} />
      <AttendanceCard title="On Leave" value={stats.onLeave} />
      <AttendanceCard title="Overtime" value={stats.overtimeCount} />
    </div>
  );
}
