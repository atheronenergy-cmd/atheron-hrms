"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatCompactCurrency } from "@/shared/utils/currency.utils";

const attendanceData = [
  { day: "Mon", present: 142, absent: 8 },
  { day: "Tue", present: 138, absent: 12 },
  { day: "Wed", present: 145, absent: 5 },
  { day: "Thu", present: 140, absent: 10 },
  { day: "Fri", present: 135, absent: 15 },
  { day: "Sat", present: 45, absent: 3 },
];

const payrollTrend = [
  { month: "Jan", amount: 4200000 },
  { month: "Feb", amount: 4350000 },
  { month: "Mar", amount: 4280000 },
  { month: "Apr", amount: 4500000 },
  { month: "May", amount: 4620000 },
  { month: "Jun", amount: 4580000 },
];

const recentActivity = [
  { action: "Leave request submitted", user: "Priya Sharma", time: "2 min ago" },
  { action: "New employee onboarded", user: "HR Team", time: "15 min ago" },
  { action: "Payroll run initiated", user: "Accounts", time: "1 hour ago" },
  { action: "Attendance regularized", user: "Raj Patel", time: "2 hours ago" },
  { action: "Department updated", user: "Admin", time: "3 hours ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your organization's HR metrics"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Quick Action
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Employees" value="150" description="Active workforce" icon={Users} trend={{ value: 4.2 }} />
        <StatCard title="Attendance" value="94.2%" description="Today's rate" icon={Clock} trend={{ value: 1.5 }} />
        <StatCard title="Payroll" value={formatCompactCurrency(4580000)} description="This month" icon={Wallet} />
        <StatCard title="Leave" value="12" description="Pending requests" icon={CalendarDays} trend={{ value: -2.1 }} />
        <StatCard title="Departments" value="8" description="Active departments" icon={Building2} />
        <StatCard title="Reports" value="24" description="Generated this month" icon={BarChart3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Daily present vs absent — placeholder data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
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
            <CardDescription>Monthly payroll — placeholder data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => formatCompactCurrency(v)} />
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
              <CardDescription>Latest actions across the system</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/audit">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks — placeholders</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(
              [
                { label: "Add Employee", icon: Users, href: "/dashboard/employees" as const },
                { label: "Mark Attendance", icon: Clock, href: "/dashboard/attendance" as const },
                { label: "Process Payroll", icon: Wallet, href: "/dashboard/payroll" as const },
                { label: "Generate Report", icon: FileText, href: "/dashboard/reports" as const },
              ] as const
            ).map((action) => (
              <Button key={action.label} variant="outline" className="justify-start" asChild>
                <Link href={action.href}>
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Charts Placeholder</CardTitle>
          <CardDescription>Advanced analytics widgets will be added in Phase 6</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Analytics coming soon"
            description="Dashboard widgets and custom charts will be available after the Analytics module is implemented."
          />
        </CardContent>
      </Card>
    </div>
  );
}
