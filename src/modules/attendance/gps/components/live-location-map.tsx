"use client";

import { useEffect, useRef, useState } from "react";

import type { LiveLocationShare } from "@/modules/attendance/gps/domain/types";

import "leaflet/dist/leaflet.css";

type LiveLocationMapProps = {
  shares: LiveLocationShare[];
};

type LeafletModule = typeof import("leaflet");

export function LiveLocationMap({ shares }: LiveLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").CircleMarker>>(new Map());
  const leafletRef = useRef<LeafletModule | null>(null);
  const fittedKey = useRef("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(containerRef.current).setView([20.5937, 78.9629], 5);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !leaflet || !map) return;

    const located = shares.filter((share) => share.latitude != null && share.longitude != null);
    const seen = new Set<string>();

    for (const share of located) {
      seen.add(share.employeeId);
      const point: [number, number] = [share.latitude!, share.longitude!];
      const existing = markersRef.current.get(share.employeeId);
      const label = `${escapeHtml(share.employeeName)}<br/>${escapeHtml(share.employeeCode)}`;
      if (existing) {
        existing.setLatLng(point);
        existing.setPopupContent(`<strong>${label}</strong>`);
      } else {
        const marker = leaflet.circleMarker(point, {
          radius: 9,
          color: "#1d4ed8",
          weight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.9,
        });
        marker.bindPopup(`<strong>${label}</strong>`);
        marker.addTo(map);
        markersRef.current.set(share.employeeId, marker);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    const key = located.map((share) => share.employeeId).sort().join(",");
    if (located.length > 0 && key !== fittedKey.current) {
      fittedKey.current = key;
      const bounds = leaflet.latLngBounds(located.map((share) => [share.latitude!, share.longitude!] as [number, number]));
      map.fitBounds(bounds.pad(0.4), { maxZoom: 16 });
    }
  }, [ready, shares]);

  return <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-lg border" />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char] ?? char;
  });
}
