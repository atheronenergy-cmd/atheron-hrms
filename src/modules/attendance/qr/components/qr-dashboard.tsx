"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QrDashboardData } from "@/modules/attendance/qr/domain/types";
import { QR_CODE_TYPE_LABELS } from "@/modules/attendance/qr/domain/types";
import { QrGenerator } from "@/modules/attendance/qr/components/qr-generator";
import { QrScannerPlaceholder } from "@/modules/attendance/qr/components/qr-scanner-placeholder";
import { ScanHistory } from "@/modules/attendance/qr/components/scan-history";

type QrDashboardProps = {
  data: QrDashboardData;
};

export function QrDashboard({ data }: QrDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active QR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.activeCodes}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expired QR</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.expiredCodes}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Today Scans</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.todayScans}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Failed Scans</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.failedScans}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Fraud Attempts</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.fraudAttempts}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Generate QR</CardTitle></CardHeader>
          <CardContent><QrGenerator /></CardContent>
        </Card>
        <QrScannerPlaceholder />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active QR Codes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.activeQrCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active QR codes.</p>
          ) : (
            data.activeQrCodes.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{q.name}</p>
                  <p className="text-muted-foreground">{QR_CODE_TYPE_LABELS[q.codeType] ?? q.codeType}</p>
                </div>
                <p className="text-muted-foreground">Expires {q.expiresAt.slice(11, 19)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ScanHistory items={data.recentScans} />
    </div>
  );
}
