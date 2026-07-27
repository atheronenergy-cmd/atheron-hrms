"use client";

import { Cake, CalendarHeart, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeDashboardStats } from "@/modules/employee/domain/types";

type EmployeeDashboardProps = {
  stats: EmployeeDashboardStats;
};

const cards = [
  { key: "totalEmployees" as const, label: "Total Employees", icon: Users },
  { key: "activeCount" as const, label: "Active", icon: UserCheck },
  { key: "inactiveCount" as const, label: "Inactive", icon: UserMinus },
  { key: "probationCount" as const, label: "On Probation", icon: UserPlus },
  { key: "newJoinersCount" as const, label: "New Joiners (30d)", icon: UserPlus },
];

export function EmployeeDashboard({ stats }: EmployeeDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats[key]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cake className="h-4 w-4" /> Upcoming Birthdays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No birthdays in the next 7 days</p>
            ) : (
              stats.upcomingBirthdays.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.fullName}</span>
                  <span className="text-muted-foreground">{item.date}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarHeart className="h-4 w-4" /> Work Anniversaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.upcomingAnniversaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No anniversaries in the next 7 days</p>
            ) : (
              stats.upcomingAnniversaries.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.fullName}</span>
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
