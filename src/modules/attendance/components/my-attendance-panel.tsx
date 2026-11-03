"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MyAttendancePanelProps = {
  employeeName: string;
  employeeCode: string;
  checkedIn: boolean;
  statusLabel: string;
};

const SHARE_INTERVAL_MS = 60_000;

async function readPosition() {
  if (!navigator.geolocation) throw new Error("GPS is not available on this device.");
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
  return position.coords;
}

export function MyAttendancePanel({ employeeName, employeeCode, checkedIn, statusLabel }: MyAttendancePanelProps) {
  const [sharing, setSharing] = useState(checkedIn);
  const [busy, setBusy] = useState(false);
  const warned = useRef(false);

  useEffect(() => {
    if (!sharing) return;
    let stopped = false;

    async function ping() {
      try {
        const coords = await readPosition();
        if (stopped) return;
        const response = await fetch("/api/attendance/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ping",
            permissionState: "granted",
            coordinates: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              altitude: coords.altitude ?? undefined,
              timestamp: new Date().toISOString(),
            },
          }),
        });
        const result = await response.json();
        if (!result.success && !warned.current) {
          warned.current = true;
          toast.error(result.message ?? "Location update failed.");
        }
      } catch {
        if (!warned.current) {
          warned.current = true;
          toast.error("Unable to update your live location.");
        }
      }
    }

    const timer = window.setInterval(() => void ping(), SHARE_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [sharing]);

  async function mark(action: "in" | "out") {
    setBusy(true);
    try {
      const coords = await readPosition();
      const response = await fetch("/api/attendance/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          permissionState: "granted",
          coordinates: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            altitude: coords.altitude ?? undefined,
            timestamp: new Date().toISOString(),
          },
          deviceInfo: { deviceModel: navigator.userAgent },
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.message ?? "Attendance was not saved.");
        return;
      }
      toast.success(result.message);
      setSharing(action === "in");
      warned.current = false;
    } catch {
      toast.error("Allow location access, then try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{employeeName}</CardTitle>
        <CardDescription>
          {employeeCode} · {statusLabel}
          {sharing ? " · Live location is on while this page stays open." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={() => void mark("in")} disabled={busy || sharing} className="gap-2">
          <MapPin className="h-4 w-4" />
          {busy ? "Saving…" : "Check in"}
        </Button>
        <Button variant="outline" onClick={() => void mark("out")} disabled={busy || !sharing}>
          Check out
        </Button>
      </CardContent>
    </Card>
  );
}
