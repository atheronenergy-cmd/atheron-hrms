"use client";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SecurityEventRow = {
  id: string;
  eventType: string;
  severity: string;
  ipAddress: string | null;
  createdAt: Date;
  user?: { name: string; email: string } | null;
};

type SecurityEventTableProps = {
  events: SecurityEventRow[];
};

const severityVariant: Record<string, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  critical: "destructive",
};

export function SecurityEventTable({ events }: SecurityEventTableProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No security events recorded.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{formatEventType(event.eventType)}</TableCell>
            <TableCell>
              {event.user ? (
                <span className="text-sm">
                  {event.user.name}
                  <span className="block text-muted-foreground text-xs">{event.user.email}</span>
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Badge variant={severityVariant[event.severity] ?? "secondary"}>{event.severity}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{event.ipAddress ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(event.createdAt), "dd MMM yyyy HH:mm")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
