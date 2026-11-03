"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LIVE_LOCATION_EVENT } from "@/modules/attendance/live-location-events";

const SEND_EVERY_MS = 5_000;

type Coords = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
};

function readPosition() {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );
  });
}

async function sendPing(coords: Coords) {
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
        altitude: coords.altitude,
        timestamp: new Date().toISOString(),
      },
    }),
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message ?? "Location update failed.");
}

export function LiveLocationSharer() {
  const [sharing, setSharing] = useState(false);
  const warned = useRef(false);
  const lastSent = useRef(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/attendance/me")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.success) setSharing(Boolean(result.data?.checkedIn));
      })
      .catch(() => undefined);

    function onSharing(event: Event) {
      const detail = (event as CustomEvent<{ sharing: boolean }>).detail;
      warned.current = false;
      setSharing(Boolean(detail?.sharing));
    }

    window.addEventListener(LIVE_LOCATION_EVENT, onSharing);
    return () => {
      cancelled = true;
      window.removeEventListener(LIVE_LOCATION_EVENT, onSharing);
    };
  }, []);

  useEffect(() => {
    if (!sharing) {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }
    lastSent.current = 0;
    if (!navigator.geolocation) {
      toast.error("GPS is not available on this device.");
      return;
    }

    let stopped = false;

    async function publish(coords: GeolocationCoordinates) {
      const now = Date.now();
      if (now - lastSent.current < SEND_EVERY_MS) return;
      lastSent.current = now;
      try {
        await sendPing({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude ?? undefined,
        });
      } catch (error) {
        if (!warned.current && !stopped) {
          warned.current = true;
          toast.error(error instanceof Error ? error.message : "Unable to update your live location.");
        }
      }
    }

    void readPosition().then(
      (coords) => {
        if (!stopped) void publish(coords);
      },
      () => {
        if (!warned.current) {
          warned.current = true;
          toast.error("Allow location access so your live location can be shared.");
        }
      },
    );

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!stopped) void publish(position.coords);
      },
      () => {
        if (!warned.current && !stopped) {
          warned.current = true;
          toast.error("Live location stopped because the browser blocked GPS.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    return () => {
      stopped = true;
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [sharing]);

  if (!sharing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 rounded-full border bg-background px-3 py-1.5 text-xs shadow-md">
      Live location is on until check-out
    </div>
  );
}
