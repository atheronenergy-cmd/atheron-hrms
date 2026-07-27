"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { OTPInput } from "@/modules/security/components/otp-input";
import { ROUTES } from "@/shared/constants/app";
import { AUTH_ROUTES } from "@/shared/constants/auth";

type TwoFactorVerifyFormProps = {
  pendingToken: string;
  callbackUrl?: string;
  rememberMe?: boolean;
};

export function TwoFactorVerifyForm({
  pendingToken,
  callbackUrl = ROUTES.dashboard,
  rememberMe = false,
}: TwoFactorVerifyFormProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials-2fa", {
      pendingToken,
      otp,
      useBackupCode: String(useBackupCode),
      rememberMe: String(rememberMe),
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Signed in successfully");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          {useBackupCode
            ? "Enter one of your backup recovery codes."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
        {useBackupCode ? (
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="XXXX-XXXX"
            autoComplete="off"
          />
        ) : (
          <OTPInput value={otp} onChange={setOtp} disabled={isSubmitting} />
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="useBackupCode"
          checked={useBackupCode}
          onCheckedChange={(checked) => {
            setUseBackupCode(checked === true);
            setOtp("");
          }}
        />
        <Label htmlFor="useBackupCode" className="text-sm font-normal cursor-pointer">
          Use a backup code instead
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || otp.length < (useBackupCode ? 4 : 6)}>
        {isSubmitting ? "Verifying…" : "Verify and sign in"}
      </Button>

      <Button type="button" variant="link" className="w-full" asChild>
        <a href={AUTH_ROUTES.login}>Back to sign in</a>
      </Button>
    </form>
  );
}
