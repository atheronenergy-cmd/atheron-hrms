import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LifecycleNotificationItem } from "@/modules/employee-lifecycle/domain/types";

export function WorkflowCard({ notifications }: { notifications: LifecycleNotificationItem[] }) {
  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pending Notifications</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-md border p-3">
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
