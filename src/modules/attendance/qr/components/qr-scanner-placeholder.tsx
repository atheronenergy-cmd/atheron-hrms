"use client";

import { ScanLine } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QrScannerPlaceholder() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ScanLine className="h-4 w-4" />
          QR Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Mobile camera scanner placeholder — wire native scanner SDK here.</p>
        <p>Use POST /api/attendance/qr/scan with the scanned token payload.</p>
      </CardContent>
    </Card>
  );
}
