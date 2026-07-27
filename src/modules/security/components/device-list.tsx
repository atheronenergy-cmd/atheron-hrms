"use client";

import { formatDistanceToNow } from "date-fns";
import { Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  logoutDeviceAction,
  setDeviceTrustedAction,
} from "@/modules/security/actions/device.actions";
import type { DeviceInfo } from "@/modules/security/application/device.service";

type DeviceListProps = {
  devices: DeviceInfo[];
  canManage?: boolean;
};

export function DeviceList({ devices, canManage = true }: DeviceListProps) {
  const [isPending, startTransition] = useTransition();

  function handleTrust(deviceId: string, trusted: boolean) {
    startTransition(async () => {
      const result = await setDeviceTrustedAction(deviceId, trusted);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleLogout(deviceId: string) {
    startTransition(async () => {
      const result = await logoutDeviceAction(deviceId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No devices tracked.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {devices.map((device) => (
        <Card key={device.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                {device.os?.toLowerCase().includes("android") ||
                device.os?.toLowerCase().includes("ios") ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                {device.deviceLabel ?? "Unknown device"}
                {device.isTrusted && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> Trusted
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {[device.browser, device.os].filter(Boolean).join(" · ")}
                {device.ipAddress ? ` · ${device.ipAddress}` : ""}
              </CardDescription>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleTrust(device.id, !device.isTrusted)}
                >
                  {device.isTrusted ? "Untrust" : "Trust"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleLogout(device.id)}
                >
                  Sign out
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Last active {formatDistanceToNow(device.lastSeenAt, { addSuffix: true })}</p>
            <p>First seen {formatDistanceToNow(device.firstSeenAt, { addSuffix: true })}</p>
            {device.activeSessions > 0 && <p>{device.activeSessions} active session(s)</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
