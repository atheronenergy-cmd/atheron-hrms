"use client";

import { ArrowRight, BarChart3, Building2, CalendarDays, Clock, FileText, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import type { HomeDashboardData } from "@/modules/dashboard/application/home-dashboard.service";
import { formatCompactCurrency } from "@/shared/utils/currency.utils";

const quickActions = [
  { label: "Add Employee", icon: Users, href: "/dashboard/employees/new" },
  { label: "Mark Attendance", icon: Clock, href: "/dashboard/attendance" },
  { label: "Process Payroll", icon: Wallet, href: "/dashboard/payroll" },
  { label: "Open Reports", icon: FileText, href: "/dashboard/reports" },
] as const;

export function HomeDashboard({ data, companyName }: { data: HomeDashboardData; companyName: string }) {
  const attendanceLabel = data.attendanceRate == null ? "—" : `${data.attendanceRate.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Live figures for ${companyName}. Attendance uses the company timezone.`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Employees" value={data.employees} description="Active workforce" icon={Users} />
        <StatCard
          title="Attendance"
          value={attendanceLabel}
          description={`${data.presentToday} present today`}
          icon={Clock}
        />
        <StatCard
          title="Payroll"
          value={formatCompactCurrency(data.payrollNetThisMonth, data.currency)}
          description="Processed net this month"
          icon={Wallet}
        />
        <StatCard title="Leave" value={data.pendingLeave} description="Waiting for approval" icon={CalendarDays} />
        <StatCard title="Departments" value={data.departments} description="Active departments" icon={Building2} />
        <StatCard title="Reports" value={data.reportsThisMonth} description="Generated this month" icon={BarChart3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Marked present and absent for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="present" fill="oklch(0.55 0.18 145)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" fill="oklch(0.7 0.15 25)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Payroll Trend</CardTitle>
            <CardDescription>Processed net pay by payroll month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => formatCompactCurrency(Number(value), data.currency)} />
                  <Tooltip formatter={(value) => formatCompactCurrency(Number(value ?? 0), data.currency)} />
                  <Line type="monotone" dataKey="amount" stroke="oklch(0.55 0.18 145)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest recorded actions in this company</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/audit">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <EmptyState title="No activity yet" description="Employee, attendance, leave, and payroll actions will show up here." />
            ) : (
              <div className="space-y-4">
                {data.activity.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.user}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Open work that still needs a decision</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting right now.</p>
            ) : (
              data.attention.map((item) => (
                <Button key={item.href} variant="outline" className="justify-between" asChild>
                  <Link href={item.href}>
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </Link>
                </Button>
              ))
            )}
            <div className="mt-2 grid gap-2">
              {quickActions.map((action) => (
                <Button key={action.href} variant="ghost" className="justify-start" asChild>
                  <Link href={action.href}>
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
