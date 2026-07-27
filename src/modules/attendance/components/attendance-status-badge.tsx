import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_STATUS_LABELS } from "@/modules/attendance/domain/types";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  present: "default",
  overtime: "default",
  work_from_home: "default",
  outdoor_duty: "default",
  late: "secondary",
  half_day: "secondary",
  on_leave: "outline",
  holiday: "outline",
  weekly_off: "outline",
  absent: "destructive",
  early_leaving: "destructive",
};

export function AttendanceStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{ATTENDANCE_STATUS_LABELS[status] ?? status}</Badge>;
}

export { AttendanceStatusBadge as StatusBadge };
