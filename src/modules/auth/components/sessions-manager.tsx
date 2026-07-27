"use client";

import { formatDistanceToNow } from "date-fns";
import { Monitor, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  logoutAllSessionsAction,
  revokeSessionAction,
} from "@/modules/auth/actions/session.actions";
import type { SessionInfo } from "@/shared/constants/auth";

type SessionsManagerProps = {
  sessions: SessionInfo[];
};

export function SessionsManager({ sessions }: SessionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      const result = await revokeSessionAction(sessionId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleLogoutAll() {
    startTransition(async () => {
      const result = await logoutAllSessionsAction();
      if (!result.success) {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active sessions"
        description="Manage devices where you're signed in. Revoke any session you don't recognize."
      />

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleLogoutAll} disabled={isPending}>
          Sign out all other devices
        </Button>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active sessions found.
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {session.deviceLabel?.toLowerCase().includes("mobile") ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                    {session.deviceLabel ?? "Unknown device"}
                    {session.isCurrent && <Badge variant="secondary">Current</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {session.ipAddress ? `IP: ${session.ipAddress}` : "IP unavailable"}
                  </CardDescription>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevoke(session.id)}
                    disabled={isPending}
                    aria-label="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>Last active {formatDistanceToNow(session.lastActivityAt, { addSuffix: true })}</p>
                <p>Signed in {formatDistanceToNow(session.createdAt, { addSuffix: true })}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
