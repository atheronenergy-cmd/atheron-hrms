"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disableTwoFactorAction,
  enableTwoFactorAction,
  regenerateBackupCodesAction,
  startTwoFactorSetupAction,
} from "@/modules/security/actions/two-factor.actions";
import { OTPInput } from "@/modules/security/components/otp-input";

type TwoFactorSetupProps = {
  enabled: boolean;
  remainingBackupCodes: number;
};

export function TwoFactorSetup({ enabled, remainingBackupCodes }: TwoFactorSetupProps) {
  const [isPending, startTransition] = useTransition();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableToken, setDisableToken] = useState("");

  function handleStartSetup() {
    startTransition(async () => {
      const result = await startTwoFactorSetupAction();
      if (result.success && result.data) {
        setQrCode(result.data.qrCodeDataUrl);
        setSecret(result.data.secret);
        toast.success("Scan the QR code with your authenticator app");
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleEnable() {
    startTransition(async () => {
      const result = await enableTwoFactorAction(token);
      if (result.success && result.data) {
        setBackupCodes(result.data.backupCodes);
        setQrCode(null);
        setSecret(null);
        setToken("");
        toast.success("Two-factor authentication enabled");
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDisable() {
    startTransition(async () => {
      const result = await disableTwoFactorAction(disableToken);
      if (result.success) {
        setDisableToken("");
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateBackupCodesAction(token);
      if (result.success && result.data) {
        setBackupCodes(result.data.backupCodes);
        toast.success("Backup codes regenerated");
      } else {
        toast.error(result.message);
      }
    });
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Two-factor authentication is enabled. {remainingBackupCodes} backup code(s) remaining.
          </AlertDescription>
        </Alert>

        {backupCodes && (
          <Card>
            <CardHeader>
              <CardTitle>Save your backup codes</CardTitle>
              <CardDescription>Each code can only be used once. Store them securely.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code) => (
                <div key={code} className="rounded border px-2 py-1">
                  {code}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Regenerate backup codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OTPInput value={token} onChange={setToken} disabled={isPending} />
            <Button onClick={handleRegenerate} disabled={isPending || token.length < 6}>
              Regenerate codes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disable two-factor authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OTPInput value={disableToken} onChange={setDisableToken} disabled={isPending} />
            <Button variant="destructive" onClick={handleDisable} disabled={isPending || disableToken.length < 6}>
              Disable 2FA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!qrCode ? (
        <Button onClick={handleStartSetup} disabled={isPending}>
          Set up authenticator app
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scan QR code</CardTitle>
            <CardDescription>
              Use Google Authenticator, Microsoft Authenticator, or any RFC 6238 compatible app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="2FA QR code" className="mx-auto h-48 w-48" />
            {secret && (
              <div className="space-y-2">
                <Label>Manual entry key</Label>
                <Input value={secret} readOnly className="font-mono text-xs" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Verification code</Label>
              <OTPInput value={token} onChange={setToken} disabled={isPending} />
            </div>
            <Button onClick={handleEnable} disabled={isPending || token.length < 6}>
              Enable 2FA
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
