"use client";

import { Button } from "@/components/ui/button";
import { updateClearanceItemAction } from "@/modules/employee-lifecycle/actions/employee-lifecycle.actions";
import type { ExitClearanceRecord } from "@/modules/employee-lifecycle/domain/types";
import { LifecycleStatusBadge } from "@/modules/employee-lifecycle/components/lifecycle-status-badge";

type ClearanceChecklistProps = {
  clearance: ExitClearanceRecord;
  onUpdated?: () => void;
};

export function ClearanceChecklist({ clearance, onUpdated }: ClearanceChecklistProps) {
  return (
    <div className="space-y-2">
      {clearance.items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
          <div>
            <p className="font-medium capitalize">{item.department}</p>
            <p className="text-sm text-muted-foreground">{item.checklistItem}</p>
          </div>
          <div className="flex items-center gap-2">
            <LifecycleStatusBadge status={item.status} />
            {item.status === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const result = await updateClearanceItemAction({
                    itemId: item.id,
                    clearanceId: clearance.id,
                    version: clearance.version,
                    status: "completed",
                  });
                  if (result.success) onUpdated?.();
                }}
              >
                Complete
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
