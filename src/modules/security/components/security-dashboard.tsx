"use client";

import { Lock, MonitorSmartphone, ShieldAlert, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityDashboardStats } from "@/modules/security/application/security.service";
import { SecurityCard } from "@/modules/security/components/security-card";
import { SecurityEventTable } from "@/modules/security/components/security-event-table";

type SecurityDashboardProps = {
  stats: SecurityDashboardStats;
};

export function SecurityDashboard({ stats }: SecurityDashboardProps) {
  const twoFactorPct =
    stats.totalUsers > 0
      ? Math.round((stats.twoFactorEnabledUsers / stats.totalUsers) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SecurityCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon={MonitorSmartphone}
        />
        <SecurityCard
          title="Failed Logins (24h)"
          value={stats.failedLoginAttempts24h}
          icon={ShieldAlert}
          variant={stats.failedLoginAttempts24h > 10 ? "warning" : "default"}
        />
        <SecurityCard
          title="Locked Accounts"
          value={stats.lockedAccounts}
          icon={Lock}
          variant={stats.lockedAccounts > 0 ? "critical" : "default"}
        />
        <SecurityCard
          title="2FA Enabled"
          value={`${stats.twoFactorEnabledUsers} (${twoFactorPct}%)`}
          icon={ShieldCheck}
        />
        <SecurityCard title="Total Users" value={stats.totalUsers} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Login activity (7 days)</CardTitle>
            <CardDescription>Successful vs failed login attempts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.loginActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login data available.</p>
            ) : (
              stats.loginActivity.map((day) => (
                <div key={day.date} className="flex items-center justify-between text-sm">
                  <span>{day.date}</span>
                  <span>
                    <span className="text-green-600">{day.success} ok</span>
                    {" · "}
                    <span className="text-destructive">{day.failure} failed</span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device distribution</CardTitle>
            <CardDescription>Operating systems in use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.deviceDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No device data available.</p>
            ) : (
              stats.deviceDistribution.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent security events</CardTitle>
        </CardHeader>
        <CardContent>
          <SecurityEventTable events={stats.recentSecurityEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
