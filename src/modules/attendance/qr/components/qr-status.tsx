"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QR_SCAN_RESULT_LABELS } from "@/modules/attendance/qr/domain/types";
import type { QrScanResultData } from "@/modules/attendance/qr/domain/types";

type QrStatusProps = {
  result?: QrScanResultData | null;
};

export function QrStatus({ result }: QrStatusProps) {
  if (!result) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Scan Result</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Scan a QR code to see status.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Scan Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Badge variant={result.success ? "default" : "destructive"}>
          {QR_SCAN_RESULT_LABELS[result.result] ?? result.result}
        </Badge>
        <p>{result.message}</p>
        {result.punchType && <p className="text-muted-foreground">Punch: {result.punchType}</p>}
        <div className="space-y-1">
          {result.steps.map((step) => (
            <div key={step.step} className="flex justify-between gap-2">
              <span>{step.step}</span>
              <span className={step.passed ? "text-emerald-600" : "text-destructive"}>
                {step.passed ? "OK" : "Fail"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
