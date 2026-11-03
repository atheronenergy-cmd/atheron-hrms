"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveLocationMap } from "@/modules/attendance/gps/components/live-location-map";
import type { LiveLocationShare } from "@/modules/attendance/gps/domain/types";

const POLL_MS = 5_000;

function updatedLabel(capturedAt: string | null, now: number) {
  if (!capturedAt) return "Waiting for the first location";
  const seconds = Math.max(0, Math.round((now - new Date(capturedAt).getTime()) / 1000));
  if (seconds < 15) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.round(minutes / 60)}h ago`;
}

export function LiveLocationBoard({ initial }: { initial: LiveLocationShare[] }) {
  const [shares, setShares] = useState(initial);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      try {
        const response = await fetch("/api/attendance/location/live");
        const result = await response.json();
        if (!stopped && result.success && Array.isArray(result.data)) {
          setShares(result.data);
          setNow(Date.now());
        }
      } catch {
        // Keep the last successful snapshot on screen.
      }
    }

    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-4">
      <LiveLocationMap shares={shares} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sharing now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No live locations. An employee appears here after check-in and drops off at check-out.
            </p>
          ) : (
            shares.map((share) => (
              <div key={share.employeeId} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {share.employeeName}
                    {share.employeeCode ? ` · ${share.employeeCode}` : ""}
                  </p>
                  <p className="text-muted-foreground">{updatedLabel(share.capturedAt, now)}</p>
                </div>
                {share.latitude != null && share.longitude != null ? (
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={`https://www.google.com/maps?q=${share.latitude},${share.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open map
                  </a>
                ) : (
                  <span className="text-muted-foreground">Waiting</span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
