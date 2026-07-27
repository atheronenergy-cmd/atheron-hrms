"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { LeaveApprovalItem } from "@/modules/leave/domain/types";
import { processLeaveApprovalAction } from "@/modules/leave/actions/leave.actions";

export function LeaveApprovalQueue({ items }: { items: LeaveApprovalItem[] }) {
  const [pending, startTransition] = useTransition();

  function act(leaveId: string, version: number, action: "approve" | "reject" | "send_back") {
    startTransition(async () => {
      const result = await processLeaveApprovalAction({ leaveId, version, action });
      alert(result.message);
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending approvals.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{item.employeeName}</p>
              <p className="text-sm text-muted-foreground">
                {item.leaveTypeName} · {item.startDate} → {item.endDate} · {item.totalDays} day(s)
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} onClick={() => act(item.leaveId, item.version, "approve")}>Approve</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(item.leaveId, item.version, "reject")}>Reject</Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(item.leaveId, item.version, "send_back")}>Send Back</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
