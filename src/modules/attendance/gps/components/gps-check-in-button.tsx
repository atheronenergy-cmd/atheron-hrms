"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { LocationPermissionState } from "@/modules/attendance/gps/domain/types";

type GpsCheckInButtonProps = {
  employeeId?: string;
  activityType?: string;
  label?: string;
  onSuccess?: () => void;
};

export function GpsCheckInButton({
  employeeId,
  activityType = "office_check_in",
  label = "GPS Check-In",
  onSuccess,
}: GpsCheckInButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("unavailable");

  async function handleCheckIn() {
    startTransition(async () => {
      try {
        let permission: LocationPermissionState = "unavailable";
        let coords: GeolocationCoordinates | null = null;

        if (!navigator.geolocation) {
          setPermissionState("unavailable");
          toast.error("GPS is not available on this device.");
          return;
        }

        coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              permission = "granted";
              resolve(pos.coords);
            },
            (err) => {
              permission = err.code === err.PERMISSION_DENIED ? "denied" : "unavailable";
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 15000 },
          );
        }).catch(() => null);

        setPermissionState(permission);
        if (!coords) {
          toast.error("Unable to capture location.");
          return;
        }

        const response = await fetch("/api/attendance/gps/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            activityType,
            permissionState: permission,
            coordinates: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              altitude: coords.altitude ?? undefined,
              timestamp: new Date().toISOString(),
            },
            deviceInfo: {
              deviceModel: navigator.userAgent,
              networkType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType,
            },
          }),
        });

        const result = await response.json();
        if (!result.success) {
          toast.error(result.message ?? "Check-in failed");
          return;
        }

        toast.success(result.message ?? "GPS check-in recorded");
        onSuccess?.();
      } catch {
        toast.error("GPS check-in failed.");
      }
    });
  }

  return (
    <Button onClick={handleCheckIn} disabled={isPending || permissionState === "denied"} className="gap-2">
      <MapPin className="h-4 w-4" />
      {isPending ? "Capturing location…" : label}
    </Button>
  );
}
