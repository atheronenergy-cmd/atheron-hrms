"use client";

import { Building2, Calendar, Clock, FileText, GitBranch, Layers, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgDashboardStats } from "@/modules/organization/domain/types";
import { ORG_ROUTES } from "@/modules/organization/domain/types";

type OrgDashboardProps = {
  stats: OrgDashboardStats;
  companyName: string;
};

const links = [
  { href: ORG_ROUTES.branches, label: "Branches", key: "branchCount" as const, icon: GitBranch },
  { href: ORG_ROUTES.departments, label: "Departments", key: "departmentCount" as const, icon: Layers },
  { href: ORG_ROUTES.designations, label: "Designations", key: "designationCount" as const, icon: Building2 },
  { href: ORG_ROUTES.policies, label: "Active Policies", key: "activePolicyCount" as const, icon: FileText },
  { href: ORG_ROUTES.holidays, label: "Holidays", key: "holidayCount" as const, icon: Calendar },
  { href: ORG_ROUTES.schedules, label: "Schedules", key: "scheduleCount" as const, icon: Clock },
];

export function OrgDashboard({ stats, companyName }: OrgDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{companyName}</CardTitle>
          <CardDescription>Organization overview and quick navigation</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {links.map(({ href, label, key, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats[key]}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employeeCount}</div>
            <Link href="/dashboard/employees" className="text-xs text-primary mt-1 hover:underline">
              View employees
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
