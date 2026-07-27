"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { AttendanceStatusBadge } from "@/modules/attendance/components/attendance-status-badge";
import { WorkingHourDisplay } from "@/modules/attendance/components/attendance-calendar";
import type { AttendanceListItem } from "@/modules/attendance/domain/types";
import { ATTENDANCE_METHOD_LABELS } from "@/modules/attendance/domain/types";

type AttendanceTableProps = {
  items: AttendanceListItem[];
};

export function AttendanceTable({ items }: AttendanceTableProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.employeeName.toLowerCase().includes(q) || i.employeeCode.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-3">
      <Input placeholder="Search employee…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Employee</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Check In</th>
              <th className="px-3 py-2 text-left">Check Out</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No attendance records.</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{item.employeeCode}</div>
                  </td>
                  <td className="px-3 py-2">{item.date}</td>
                  <td className="px-3 py-2">{item.checkInAt ? format(new Date(item.checkInAt), "HH:mm") : "—"}</td>
                  <td className="px-3 py-2">{item.checkOutAt ? format(new Date(item.checkOutAt), "HH:mm") : "—"}</td>
                  <td className="px-3 py-2"><WorkingHourDisplay minutes={item.effectiveWorkMinutes} /></td>
                  <td className="px-3 py-2"><AttendanceStatusBadge status={item.status} /></td>
                  <td className="px-3 py-2">{item.checkInMethod ? ATTENDANCE_METHOD_LABELS[item.checkInMethod] ?? item.checkInMethod : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
