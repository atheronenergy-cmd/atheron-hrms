"use client";

import { AlertTriangle, MapPin } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { LocationPermissionState } from "@/modules/attendance/gps/domain/types";

type LocationPermissionAlertProps = {
  permissionState: LocationPermissionState;
};

const MESSAGES: Record<LocationPermissionState, { title: string; description: string }> = {
  granted: { title: "Location enabled", description: "GPS is ready for attendance." },
  denied: { title: "Location denied", description: "Enable location permission in device settings to mark GPS attendance." },
  revoked: { title: "Permission revoked", description: "Location access was revoked. Re-enable permission to continue." },
  unavailable: { title: "GPS unavailable", description: "Turn on GPS/location services on your device." },
};

export function LocationPermissionAlert({ permissionState }: LocationPermissionAlertProps) {
  if (permissionState === "granted") return null;
  const message = MESSAGES[permissionState];
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        {message.description}
      </AlertDescription>
    </Alert>
  );
}
