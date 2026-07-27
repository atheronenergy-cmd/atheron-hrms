import { Badge } from "@/components/ui/badge";
import type { LeaveListItem } from "@/modules/leave/domain/types";
import { LEAVE_STATUS_LABELS } from "@/modules/leave/domain/types";

export function LeaveTable({ items }: { items: LeaveListItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No leave records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Employee</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Dates</th>
            <th className="py-2 pr-4">Days</th>
            <th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4">
                <div className="font-medium">{item.employeeName}</div>
                <div className="text-xs text-muted-foreground">{item.employeeCode}</div>
              </td>
              <td className="py-2 pr-4">{item.leaveTypeName}</td>
              <td className="py-2 pr-4">
                {item.startDate}
                {item.endDate !== item.startDate ? ` → ${item.endDate}` : ""}
                {item.halfDayType !== "none" ? ` (${item.halfDayType.replace("_", " ")})` : ""}
              </td>
              <td className="py-2 pr-4">{item.totalDays}</td>
              <td className="py-2 pr-4">
                <Badge variant="outline">{LEAVE_STATUS_LABELS[item.status] ?? item.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
