"use client";

import type { MapMarker } from "@/modules/attendance/gps/infrastructure/map-provider";
import { abstractMapProvider, computeMapBounds } from "@/modules/attendance/gps/infrastructure/map-provider";

type LocationMapProps = {
  markers: MapMarker[];
  providerId?: string;
  height?: number;
};

export function LocationMap({ markers, providerId = "abstract", height = 320 }: LocationMapProps) {
  const bounds = computeMapBounds(markers);
  const provider = providerId === "abstract" ? abstractMapProvider : abstractMapProvider;

  return (
    <div className="rounded-lg border bg-muted/30" style={{ minHeight: height }}>
      <div className="flex h-full flex-col gap-3 p-4">
        <p className="text-sm font-medium">Map ({provider.name})</p>
        <p className="text-xs text-muted-foreground">
          Provider-agnostic view — connect Google Maps, Mapbox, or OpenStreetMap via map provider registry.
        </p>
        {bounds && (
          <p className="text-xs text-muted-foreground">
            Bounds: N {bounds.north.toFixed(4)} · S {bounds.south.toFixed(4)} · E {bounds.east.toFixed(4)} · W {bounds.west.toFixed(4)}
          </p>
        )}
        <div className="grid flex-1 gap-2 overflow-auto sm:grid-cols-2">
          {markers.map((marker) => (
            <div key={marker.id} className="rounded-md border bg-background p-3 text-xs">
              <p className="font-medium">{marker.label}</p>
              <p className="text-muted-foreground capitalize">{marker.type}</p>
              <p>
                {marker.coordinates.latitude.toFixed(5)}, {marker.coordinates.longitude.toFixed(5)}
              </p>
              {marker.radiusMeters != null && <p>Radius: {marker.radiusMeters}m</p>}
            </div>
          ))}
          {markers.length === 0 && <p className="text-sm text-muted-foreground">No locations to display.</p>}
        </div>
      </div>
    </div>
  );
}
