"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GpsDashboardData } from "@/modules/attendance/gps/domain/types";
import { GPS_ACTIVITY_LABELS } from "@/modules/attendance/gps/domain/types";
import { LocationMap } from "@/modules/attendance/gps/components/location-map";
import type { MapMarker } from "@/modules/attendance/gps/infrastructure/map-provider";

type GpsDashboardProps = {
  data: GpsDashboardData;
};

export function GpsDashboard({ data }: GpsDashboardProps) {
  const markers: MapMarker[] = [
    ...data.branches
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({
        id: b.id,
        coordinates: { latitude: b.latitude!, longitude: b.longitude! },
        label: b.name,
        type: "branch" as const,
        radiusMeters: b.radiusMeters ?? undefined,
      })),
    ...data.recentLocations.slice(0, 10).map((loc) => ({
      id: loc.id,
      coordinates: { latitude: loc.latitude, longitude: loc.longitude },
      label: loc.employeeName,
      type: "employee" as const,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Today GPS Punches</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.todayGpsPunches}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Invalid Attempts</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.invalidAttempts}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Branches with GPS</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.branches.filter((b) => b.gpsEnabled).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Locations</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data.recentLocations.length}</p></CardContent>
        </Card>
      </div>

      <LocationMap markers={markers} />

      <Card>
        <CardHeader><CardTitle className="text-base">Location History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.recentLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location history yet.</p>
          ) : (
            data.recentLocations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{loc.employeeName}</p>
                  <p className="text-muted-foreground">
                    {GPS_ACTIVITY_LABELS[loc.activityType] ?? loc.activityType} · {loc.capturedAt.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</p>
                  {loc.riskScore > 0 && <p className="text-destructive">Risk {loc.riskScore}</p>}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
