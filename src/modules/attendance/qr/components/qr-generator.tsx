"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QR_CODE_TYPE_LABELS, QR_EXPIRY_OPTIONS } from "@/modules/attendance/qr/domain/types";

type QrGeneratorProps = {
  onGenerated?: () => void;
};

export function QrGenerator({ onGenerated }: QrGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("Office Check-In");
  const [codeType, setCodeType] = useState("office");
  const [expirySeconds, setExpirySeconds] = useState<number>(60);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  function handleGenerate() {
    startTransition(async () => {
      const response = await fetch("/api/attendance/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, codeType, expirySeconds }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error(result.message ?? "Failed to generate QR");
        return;
      }
      setQrDataUrl(result.data.qrDataUrl);
      toast.success("QR code generated");
      onGenerated?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>QR Type</Label>
          <Select value={codeType} onValueChange={setCodeType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(QR_CODE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Expiry</Label>
          <Select value={String(expirySeconds)} onValueChange={(v) => setExpirySeconds(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QR_EXPIRY_OPTIONS.map((sec) => (
                <SelectItem key={sec} value={String(sec)}>
                  {sec < 60 ? `${sec} seconds` : `${sec / 60} minutes`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generating…" : "Generate QR"}
      </Button>
      {qrDataUrl && (
        <div className="rounded-lg border p-4 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Generated QR code" className="h-56 w-56" />
        </div>
      )}
    </div>
  );
}
