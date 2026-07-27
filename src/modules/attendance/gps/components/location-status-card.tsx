"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpsLocationStatus } from "@/modules/attendance/gps/domain/types";
import { DistanceIndicator } from "@/modules/attendance/gps/components/distance-indicator";

type LocationStatusCardProps = {
  status: GpsLocationStatus;
  distanceMeters?: number;
};

export function LocationStatusCard({ status, distanceMeters }: LocationStatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Location Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={status.gpsAttendanceEnabled ? "default" : "secondary"}>
            GPS {status.gpsAttendanceEnabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant="outline">Permission: {status.permissionState}</Badge>
        </div>
        {status.geoFence ? (
          <div className="space-y-1">
            <p className="font-medium">{status.geoFence.branchName}</p>
            <p className="text-muted-foreground">
              {status.geoFence.latitude.toFixed(5)}, {status.geoFence.longitude.toFixed(5)} · Radius {status.geoFence.radiusMeters}m
            </p>
            {distanceMeters != null && (
              <DistanceIndicator
                distanceMeters={distanceMeters}
                allowedRadiusMeters={status.geoFence.radiusMeters}
                allowOutside={status.allowOutsideLocation}
              />
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No geo-fence configured for branch.</p>
        )}
        {status.lastLocation && (
          <p className="text-muted-foreground">
            Last: {status.lastLocation.capturedAt.slice(0, 16).replace("T", " ")} · {status.lastLocation.activityType}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
