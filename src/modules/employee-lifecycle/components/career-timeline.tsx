"use client";

import { format } from "date-fns";

import type { JourneyEventItem } from "@/modules/employee-lifecycle/domain/types";
import { LIFECYCLE_EVENT_LABELS } from "@/modules/employee-lifecycle/domain/types";

type CareerTimelineProps = {
  events: JourneyEventItem[];
};

export function CareerTimeline({ events }: CareerTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No career events recorded yet.</p>;
  }

  return (
    <ol className="relative border-s border-muted ms-3 space-y-6">
      {events.map((event) => (
        <li key={event.id} className="ms-6">
          <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border bg-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {LIFECYCLE_EVENT_LABELS[event.eventType] ?? event.eventType} · {event.stage} ·{" "}
              {format(new Date(event.eventDate), "dd MMM yyyy")}
            </p>
            {event.description ? <p className="text-sm text-muted-foreground">{event.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export { CareerTimeline as TimelineComponent };
