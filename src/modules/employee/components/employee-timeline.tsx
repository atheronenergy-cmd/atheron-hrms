"use client";

import { format } from "date-fns";

import { TIMELINE_EVENT_LABELS, type EmployeeTimelineItem } from "@/modules/employee/domain/types";

type EmployeeTimelineProps = {
  events: EmployeeTimelineItem[];
};

export function EmployeeTimeline({ events }: EmployeeTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>;
  }

  return (
    <ol className="relative border-s border-muted ms-3 space-y-6">
      {events.map((event) => (
        <li key={event.id} className="ms-6">
          <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border bg-background" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {TIMELINE_EVENT_LABELS[event.eventType] ?? event.eventType} ·{" "}
              {format(new Date(event.occurredAt), "dd MMM yyyy, HH:mm")}
            </p>
            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
