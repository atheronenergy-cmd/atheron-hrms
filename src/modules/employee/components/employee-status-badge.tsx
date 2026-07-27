import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUS_LABELS } from "@/modules/employee/domain/types";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  probation: "outline",
  on_notice: "outline",
  on_leave: "secondary",
  resigned: "destructive",
  terminated: "destructive",
  separated: "destructive",
  suspended: "destructive",
  retired: "secondary",
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant[status] ?? "secondary"}>
      {EMPLOYEE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
