"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QrScanHistoryItem } from "@/modules/attendance/qr/domain/types";
import { QR_SCAN_RESULT_LABELS } from "@/modules/attendance/qr/domain/types";

type ScanHistoryProps = {
  items: QrScanHistoryItem[];
};

export function ScanHistory({ items }: ScanHistoryProps) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Scan History</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans recorded yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{item.employeeName}</p>
                <p className="text-muted-foreground">
                  {item.scannedAt.slice(0, 16).replace("T", " ")} · {item.punchType ?? "—"}
                </p>
              </div>
              <div className="text-right">
                <p>{QR_SCAN_RESULT_LABELS[item.result] ?? item.result}</p>
                {item.failureReason && <p className="text-xs text-muted-foreground">{item.failureReason}</p>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
