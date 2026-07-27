import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveDashboardStats } from "@/modules/leave/domain/types";

type LeaveCardProps = { title: string; value: number | string; description?: string };

export function LeaveCard({ title, value, description }: LeaveCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

export function LeaveDashboardCards({ stats }: { stats: LeaveDashboardStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <LeaveCard title="Pending Requests" value={stats.pendingCount} />
      <LeaveCard title="Approved" value={stats.approvedCount} />
      <LeaveCard title="Rejected" value={stats.rejectedCount} />
      <LeaveCard title="Team On Leave Today" value={stats.teamOnLeaveToday} />
      <LeaveCard title="Pending Approvals" value={stats.pendingApprovals} />
      <LeaveCard title="My Balance Types" value={stats.myBalances.length} description="Active leave types with balance" />
    </div>
  );
}

export function LeaveBalanceCards({ balances }: { balances: LeaveDashboardStats["myBalances"] }) {
  if (balances.length === 0) {
    return <p className="text-sm text-muted-foreground">No leave balances found for this year.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => (
        <LeaveCard
          key={b.leaveTypeId}
          title={`${b.leaveTypeName} (${b.leaveTypeCode})`}
          value={b.closingBalance}
          description={`Used ${b.used} · Pending ${b.pending} · Credited ${b.credited}`}
        />
      ))}
    </div>
  );
}

export function UpcomingHolidaysCard({ holidays }: { holidays: LeaveDashboardStats["upcomingHolidays"] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Upcoming Holidays</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming holidays.</p>
        ) : (
          holidays.map((h) => (
            <div key={h.date} className="flex items-center justify-between text-sm">
              <span>{h.name}</span>
              <span className="text-muted-foreground">{h.date}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
