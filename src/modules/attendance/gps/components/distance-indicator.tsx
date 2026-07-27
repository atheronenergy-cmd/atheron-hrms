"use client";

import { cn } from "@/lib/utils";

type DistanceIndicatorProps = {
  distanceMeters: number;
  allowedRadiusMeters: number;
  allowOutside?: boolean;
};

export function DistanceIndicator({ distanceMeters, allowedRadiusMeters, allowOutside = false }: DistanceIndicatorProps) {
  const within = distanceMeters <= allowedRadiusMeters;
  const ratio = allowedRadiusMeters > 0 ? Math.min(distanceMeters / allowedRadiusMeters, 1.5) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(within || allowOutside ? "text-emerald-600" : "text-destructive")}>
          {Math.round(distanceMeters)}m from office
        </span>
        <span className="text-muted-foreground">Allowed: {allowedRadiusMeters}m</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", within || allowOutside ? "bg-emerald-500" : "bg-destructive")}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
