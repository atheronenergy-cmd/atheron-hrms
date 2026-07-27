"use client";

import { format, formatDistanceToNow } from "date-fns";
import { KeyRound, LogOut, Mail, Pencil, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PermissionButton } from "@/components/permissions/permission-button";
import { PermissionGuard } from "@/components/permissions/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  assignRoleAction,
  changeUserStatusAction,
  removeRoleAction,
  resendInvitationAction,
  resetUserPasswordAction,
  revokeUserSessionsAction,
} from "@/modules/user/actions/user.actions";
import { PermissionList } from "@/modules/user/components/permission-list";
import { RoleBadge } from "@/modules/user/components/role-badge";
import { RoleSelector } from "@/modules/user/components/role-selector";
import { UserAvatar } from "@/modules/user/components/user-avatar";
import { UserStatusBadge } from "@/modules/user/components/user-status-badge";
import type { UserDetail, UserPermissionSummary } from "@/modules/user/domain/types";
import { USER_ROUTES } from "@/modules/user/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type UserRoleRow = {
  id: string;
  role: { id: string; name: string; slug: string };
  branch: { id: string; name: string } | null;
  assignedAt: Date;
};

type SessionRow = {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActivityAt: Date;
  createdAt: Date;
};

type LoginRow = {
  id: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

type ActivityRow = {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: Date;
};

type UserDetailViewProps = {
  user: UserDetail;
  permissions: UserPermissionSummary;
  userRoles: UserRoleRow[];
  sessions: SessionRow[];
  loginHistory: LoginRow[];
  activityLogs: ActivityRow[];
  availableRoles: { id: string; name: string; slug: string }[];
};

export function UserDetailView({
  user,
  permissions,
  userRoles,
  sessions,
  loginHistory,
  activityLogs,
  availableRoles,
}: UserDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newRoleIds, setNewRoleIds] = useState<string[]>([]);

  const assignedRoleIds = userRoles.map((ur) => ur.role.id);
  const unassignedRoles = availableRoles.filter((r) => !assignedRoleIds.includes(r.id));

  async function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await changeUserStatusAction({
        userId: user.id,
        status,
        version: user.version,
      });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <UserStatusBadge status={user.status} />
              {user.roles.map((r) => (
                <RoleBadge key={r.id} name={r.name} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionButton permission={PERMISSIONS.USER.ACCOUNT.UPDATE} variant="outline" asChild>
            <Link href={USER_ROUTES.edit(user.id)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          </PermissionButton>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Info label="Email" value={user.email} />
              <Info label="Phone" value={user.phone ?? "—"} />
              <Info
                label="Account created"
                value={format(user.createdAt, "dd MMM yyyy HH:mm")}
              />
              <Info
                label="Last login"
                value={
                  user.lastLoginAt
                    ? formatDistanceToNow(user.lastLoginAt, { addSuffix: true })
                    : "Never"
                }
              />
              <Info
                label="Email verified"
                value={user.emailVerified ? format(user.emailVerified, "dd MMM yyyy") : "No"}
              />
              {user.remarks && (
                <div className="sm:col-span-2">
                  <Info label="Remarks" value={user.remarks} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              ) : (
                userRoles.map((ur) => (
                  <div
                    key={ur.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <RoleBadge name={ur.role.name} />
                      {ur.branch && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Branch: {ur.branch.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned {formatDistanceToNow(ur.assignedAt, { addSuffix: true })}
                      </p>
                    </div>
                    <PermissionGuard permission={PERMISSIONS.USER.ROLE.ASSIGN}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={async () => {
                          const result = await removeRoleAction({
                            userId: user.id,
                            userRoleId: ur.id,
                          });
                          if (result.success) {
                            toast.success(result.message);
                            router.refresh();
                          } else toast.error(result.message);
                        }}
                      >
                        Remove
                      </Button>
                    </PermissionGuard>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <PermissionGuard permission={PERMISSIONS.USER.ROLE.ASSIGN}>
            {unassignedRoles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assign role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RoleSelector
                    roles={unassignedRoles}
                    selectedIds={newRoleIds}
                    onChange={setNewRoleIds}
                  />
                  <Button
                    disabled={isPending || newRoleIds.length === 0}
                    onClick={async () => {
                      for (const roleId of newRoleIds) {
                        await assignRoleAction({ userId: user.id, roleId });
                      }
                      toast.success("Roles assigned");
                      setNewRoleIds([]);
                      router.refresh();
                    }}
                  >
                    Assign selected
                  </Button>
                </CardContent>
              </Card>
            )}
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionList summary={permissions} />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          ) : (
            sessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="py-4 text-sm">
                  <p className="font-medium">{s.deviceLabel ?? "Unknown device"}</p>
                  <p className="text-muted-foreground">IP: {s.ipAddress ?? "—"}</p>
                  <p className="text-muted-foreground">
                    Last active {formatDistanceToNow(s.lastActivityAt, { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <SectionHeader title="Login history" />
          {loginHistory.map((entry) => (
            <div key={entry.id} className="flex justify-between text-sm border-b pb-2">
              <span className={entry.success ? "text-emerald-600" : "text-destructive"}>
                {entry.success ? "Success" : entry.failureReason ?? "Failed"}
              </span>
              <span className="text-muted-foreground">
                {format(entry.createdAt, "dd MMM yyyy HH:mm")}
              </span>
            </div>
          ))}
          <SectionHeader title="Recent activity" className="mt-6" />
          {activityLogs.map((log) => (
            <div key={log.id} className="flex justify-between text-sm border-b pb-2">
              <span>{log.action}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(log.createdAt, { addSuffix: true })}
              </span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <PermissionButton
              permission={PERMISSIONS.USER.ACCOUNT.UPDATE}
              variant="outline"
              disabled={isPending}
              onClick={async () => {
                const result = await resetUserPasswordAction(user.id);
                toast[result.success ? "success" : "error"](result.message);
              }}
            >
              <KeyRound className="mr-2 h-4 w-4" /> Reset password
            </PermissionButton>
            <PermissionButton
              permission={PERMISSIONS.USER.ACCOUNT.UPDATE}
              variant="outline"
              disabled={isPending}
              onClick={async () => {
                const result = await revokeUserSessionsAction(user.id);
                toast[result.success ? "success" : "error"](result.message);
                router.refresh();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout all sessions
            </PermissionButton>
            {user.status === "pending_verification" && (
              <PermissionButton
                permission={PERMISSIONS.USER.ACCOUNT.CREATE}
                variant="outline"
                disabled={isPending}
                onClick={async () => {
                  const result = await resendInvitationAction(user.id);
                  toast[result.success ? "success" : "error"](result.message);
                }}
              >
                <Mail className="mr-2 h-4 w-4" /> Resend invitation
              </PermissionButton>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(["active", "inactive", "suspended"] as const).map((status) => (
                <PermissionButton
                  key={status}
                  permission={PERMISSIONS.USER.ACCOUNT.UPDATE}
                  variant={user.status === status ? "default" : "outline"}
                  size="sm"
                  disabled={isPending || user.status === status}
                  onClick={() => handleStatusChange(status)}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </PermissionButton>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
