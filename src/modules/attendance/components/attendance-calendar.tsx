"use client";

import { format } from "date-fns";

import { AttendanceStatusBadge } from "@/modules/attendance/components/attendance-status-badge";
import type { AttendanceCalendarDay } from "@/modules/attendance/domain/types";

type AttendanceCalendarProps = {
  days: AttendanceCalendarDay[];
  year: number;
  month: number;
};

export function AttendanceCalendar({ days, year, month }: AttendanceCalendarProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells: Array<{ date: string | null; day?: AttendanceCalendarDay }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: dayMap.get(date) });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => (
          <div key={idx} className="min-h-20 rounded-md border p-2 text-xs">
            {cell.date ? (
              <>
                <div className="font-medium">{Number(cell.date.slice(-2))}</div>
                {cell.day ? (
                  <div className="mt-1 space-y-1">
                    <AttendanceStatusBadge status={cell.day.status} />
                    {cell.day.lateMinutes > 0 ? <p className="text-muted-foreground">Late {cell.day.lateMinutes}m</p> : null}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">—</p>
                )}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkingHourDisplay({ minutes }: { minutes: number }) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return <span>{h}h {m}m</span>;
}
